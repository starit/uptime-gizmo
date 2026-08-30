const express = require("express");
const { R } = require("redbean-node");
const Monitor = require("../model/monitor");
const apicache = require("../modules/apicache");
const { apiAuth, requireWrite } = require("../auth");
const { UptimeCalculator } = require("../uptime-calculator");
const { log } = require("../../src/util");
const { VALUE_TYPES, VALUE_OPERATORS, BLOCK_TAGS } = require("../modules/web3-rpc");
const { DNS_RESOLVE_TYPES } = require("../monitor-types/dns");
const { llmCredentialSummaries } = require("../utils/llm-credentials");
const { Notification } = require("../notification");
const { NOTIFICATION_FIELDS: PROVIDER_FIELDS } = require("../notification-fields");

const router = express.Router();

/*
 * startMonitor and restartMonitor live in server.js, which requires this
 * module, so importing them back would be circular. They are injected instead —
 * explicit about the dependency and safe to load in any order.
 */
let lifecycle = {
    startMonitor: async () => {},
    restartMonitor: async () => {},
    pauseMonitor: async () => {},
    /*
     * Pushing the change to any browser the owner has open.
     *
     * The socket handlers do this through helpers that take a Socket, but only
     * ever read its userID from it. Passing a stand-in object would work and
     * would break the day that stops being true, so server.js supplies these
     * instead, where the real server object is in scope.
     */
    notifyMonitorChanged: async () => {},
    notifyMonitorDeleted: async () => {},
};

/**
 * Supply the monitor lifecycle functions this router needs.
 * @param {object} hooks startMonitor and restartMonitor
 * @returns {object} the configured router
 */
router.useLifecycle = function (hooks) {
    lifecycle = hooks;
    return router;
};

/*
 * Versioned management API.
 *
 * Every route here sits behind apiAuth, which attaches a principal carrying the
 * calling key's owner and whether it is read-only. Mutating routes must also
 * carry requireWrite; a route that forgets it is a bug, so mutations are
 * registered through a helper below rather than by hand.
 *
 * See docs/plans/rest-api.md and docs/plans/mcp-and-agent-api.md.
 */

/**
 * Wrap an async handler so a rejection becomes a 500 rather than an unhandled
 * rejection that takes the process with it.
 * @param {Function} handler async express handler
 * @returns {Function} handler safe to register
 */
function route(handler) {
    return (req, res) => {
        Promise.resolve(handler(req, res)).catch((e) => {
            log.error("api", `Unhandled error in ${req.method} ${req.path}: ${e.message}`);
            res.status(500).json({
                ok: false,
                error: { code: "internal_error", message: "Unexpected error" },
            });
        });
    };
}

/**
 * Bound a `limit` query parameter.
 * @param {any} value raw query value
 * @param {number} fallback used when absent or unparseable
 * @param {number} max hard ceiling
 * @returns {number} a usable limit
 */
function boundedLimit(value, fallback, max) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback;
    }
    return Math.min(parsed, max);
}

/*
 * One definition of the monitor contract, used for both directions.
 *
 * The monitor table has 114 columns, a dozen of which hold secrets. A single
 * table means a field cannot be readable but not writable by accident, or
 * writable but invisible, and adding one is a single deliberate edit rather
 * than two edits that can disagree.
 *
 * `column` is the database name; the key is the API name. `secret` fields are
 * never returned, whatever else they allow.
 *
 * Writable types live in API_MONITOR_TYPES, which is also the OpenAPI enum.
 * Web3 value type, operator and block tag are VALUE_TYPES, VALUE_OPERATORS and
 * BLOCK_TAGS from web3-rpc.js, and dnsResolveType is DNS_RESOLVE_TYPES from
 * dns.js — the same lists the check engine enforces.
 * Copies (the MCP tool schema, the sync skill, the edit form) are asserted
 * against these lists rather than maintained alongside them. The exotic
 * transports (grpc, kafka, radius, snmp, mqtt) are deliberately absent rather
 * than half-supported: an invented name, or a type the UI can create but this
 * API cannot configure, is refused rather than stored as a monitor that then
 * fails every check with "Unknown Monitor Type".
 */
const API_MONITOR_TYPES = [
    "http",
    "keyword",
    "ping",
    "port",
    "dns",
    "group",
    "web3-balance",
    "web3-rpc",
    "web3-contract",
    "llm",
];

const MONITOR_FIELDS = {
    id: { column: "id", type: "int" },
    name: { column: "name", type: "string", writable: true, required: true },
    type: { column: "type", type: "string", writable: true, required: true, enum: API_MONITOR_TYPES },
    active: { column: "active", type: "bool", writable: true },
    description: { column: "description", type: "string", writable: true },
    externalRef: {
        column: "external_ref",
        type: "string",
        writable: true,
        createOnly: true,
        validate: (value) => {
            if (value === null || value.length < 1 || value.length > 128) {
                throw new Error("externalRef must contain between 1 and 128 characters");
            }
            if (!/^[A-Za-z0-9][A-Za-z0-9:._-]*$/.test(value)) {
                throw new Error("externalRef contains unsupported characters");
            }
        },
        description:
            "Optional caller correlation key. Unique per account and immutable after creation; repeating a create with the same value returns the existing monitor.",
    },
    // Which group this monitor sits under. Validated separately: the allow-list
    // coerces a value but cannot check that the group exists, belongs to the
    // caller, and is not a descendant of the monitor being moved.
    parent: { column: "parent", type: "int", writable: true },
    url: { column: "url", type: "string", writable: true },
    hostname: { column: "hostname", type: "string", writable: true },
    port: { column: "port", type: "int", writable: true },
    interval: { column: "interval", type: "int", writable: true },
    retryInterval: { column: "retry_interval", type: "int", writable: true },
    resendInterval: { column: "resend_interval", type: "int", writable: true },
    maxretries: { column: "maxretries", type: "int", writable: true },
    timeout: { column: "timeout", type: "number", writable: true },
    method: { column: "method", type: "string", writable: true },
    maxredirects: { column: "maxredirects", type: "int", writable: true },
    ignoreTls: { column: "ignore_tls", type: "bool", writable: true },
    upsideDown: { column: "upside_down", type: "bool", writable: true },
    keyword: { column: "keyword", type: "string", writable: true },
    invertKeyword: { column: "invert_keyword", type: "bool", writable: true },
    acceptedStatuscodes: { column: "accepted_statuscodes_json", type: "jsonArray", writable: true },
    dnsResolveType: { column: "dns_resolve_type", type: "string", writable: true, enum: DNS_RESOLVE_TYPES },
    dnsResolveServer: { column: "dns_resolve_server", type: "string", writable: true },
    /*
     * Web3 (EVM JSON-RPC). The network is referenced by id — it is instance-level
     * infrastructure carrying a credential, so it is configured in settings and
     * listed by GET /api/v1/web3-networks, which is where a caller gets the id.
     * Validated separately: the allow-list can coerce an integer but cannot
     * check that the network exists and belongs to the caller. Solana and other
     * non-EVM chains are not these fields.
     */
    web3NetworkId: { column: "web3_network_id", type: "int", writable: true },
    web3Address: { column: "web3_address", type: "string", writable: true },
    web3TokenContract: { column: "web3_token_contract", type: "string", writable: true },
    web3TokenDecimals: { column: "web3_token_decimals", type: "int", writable: true },
    /*
     * Both thresholds are strings rather than numbers, and have to stay that
     * way. A uint256 at 18 decimals is past where a double represents
     * consecutive integers, so they are scaled and compared in BigInt; a number
     * here would round the value before the comparison ever ran.
     */
    web3MinBalance: { column: "web3_min_balance", type: "string", writable: true },
    web3MaxBlockAge: { column: "web3_max_block_age", type: "int", writable: true },
    web3CallTo: { column: "web3_call_to", type: "string", writable: true },
    web3CallData: { column: "web3_call_data", type: "string", writable: true },
    web3ValueOffset: { column: "web3_value_offset", type: "int", writable: true },
    web3ValueType: { column: "web3_value_type", type: "string", writable: true, enum: VALUE_TYPES },
    web3ValueDecimals: { column: "web3_value_decimals", type: "int", writable: true },
    web3ValueOperator: { column: "web3_value_operator", type: "string", writable: true, enum: VALUE_OPERATORS },
    web3ValueThreshold: { column: "web3_value_threshold", type: "string", writable: true },
    web3BlockTag: { column: "web3_block_tag", type: "string", writable: true, enum: BLOCK_TAGS },
    /*
     * The llm type. Its endpoint, request timeout and content assertion are
     * `url`, `timeout` and `keyword`/`invertKeyword` above, which mean the same
     * thing here as they do for an HTTP keyword monitor.
     *
     * llmApiKey is marked secret rather than omitted, for the reason the
     * notification fields are: an omitted column is one a later edit can add
     * back with nothing to object. It is not writable either — accepting a
     * credential through this API is a decision this project has not taken, and
     * every other credential-bearing resource is entered by a human.
     *
     * llmCredentialId is how a monitor created here reaches an endpoint that
     * does need a key: it names one already saved in Settings → AI, and the key
     * itself never travels through this API. The ids are listed by
     * GET /api/v1/ai-credentials, which is where a caller gets one.
     */
    llmCredentialId: { column: "llm_credential_id", type: "string", writable: true },
    llmModel: { column: "llm_model", type: "string", writable: true },
    llmPrompt: { column: "llm_prompt", type: "string", writable: true },
    llmMaxTokens: { column: "llm_max_tokens", type: "int", writable: true },
    llmMaxLatency: { column: "llm_max_latency", type: "int", writable: true },
    llmApiKey: { column: "llm_api_key", type: "string", secret: true },
    createdDate: { column: "created_date", type: "string" },
};

/*
 * The column default for retry_interval is 0, which Monitor.validate() rejects
 * because it is below MIN_INTERVAL_SECOND. A create that omitted it would fail
 * on a rule the caller never saw, so the API supplies a working value.
 */
const CREATE_DEFAULTS = {
    interval: 60,
    retry_interval: 60,
};

/**
 * Coerce a value to the type a field declares.
 * @param {any} value raw value from the request
 * @param {string} type declared field type
 * @param {string} name API field name, for error messages
 * @returns {any} the coerced value
 * @throws {Error} when the value cannot be used
 */
function coerce(value, type, name) {
    if (type === "int" || type === "number") {
        const parsed = type === "int" ? Number.parseInt(value, 10) : Number.parseFloat(value);
        if (!Number.isFinite(parsed)) {
            throw new Error(`${name} must be a number`);
        }
        return parsed;
    }

    if (type === "bool") {
        return value === true || value === 1 || value === "true" || value === "1";
    }

    if (type === "jsonArray") {
        if (!Array.isArray(value)) {
            throw new Error(`${name} must be an array`);
        }
        return JSON.stringify(value);
    }

    if (value === null) {
        return null;
    }
    return String(value);
}

/**
 * Build a projection function for a field table.
 *
 * Generic on purpose: nothing about the allow-list is monitor-specific, and a
 * second hand-written copy per resource is exactly how a secret ends up
 * published in one of them.
 * @param {object} fields a field table
 * @returns {Function} bean to API projection
 */
function makeProjection(fields) {
    return (bean) => projectWith(fields, bean);
}

/**
 * Project a bean using a field table.
 * @param {object} fields a field table
 * @param {object} bean database bean
 * @returns {object} safe projection
 */
function projectWith(fields, bean) {
    const out = {};
    for (const [ name, field ] of Object.entries(fields)) {
        if (field.secret) {
            continue;
        }
        let value;
        if (field.derive) {
            try {
                value = field.derive(bean);
            } catch (e) {
                value = null;
            }
        } else {
            value = bean[field.column];
        }
        if (field.type === "bool") {
            value = Boolean(value);
        }
        if (field.type === "jsonArray" && typeof value === "string") {
            try {
                value = JSON.parse(value);
            } catch (e) {
                value = null;
            }
        }
        out[name] = value === undefined ? null : value;
    }
    return out;
}

const monitorToAPI = makeProjection(MONITOR_FIELDS);

/**
 * Turn a request body into the columns it is allowed to set.
 *
 * An allow-list, so a field absent from the table is dropped rather than
 * written. That is what stops a caller assigning user_id, or any of the other
 * hundred columns, by including it in the payload.
 * @param {object} fields the resource's field table
 * @param {object} body request body
 * @param {boolean} partial true for PATCH, where required fields may be absent
 * @returns {object} column/value pairs safe to assign
 * @throws {Error} when a supplied value is unusable or a required one is missing
 */
function parseWith(fields, body, partial) {
    if (!body || typeof body !== "object") {
        throw new Error("A JSON object body is required");
    }

    const columns = {};

    for (const [ name, field ] of Object.entries(fields)) {
        if (!field.writable) {
            continue;
        }
        if (partial && field.createOnly && name in body) {
            throw new Error(`${name} cannot be changed after creation`);
        }
        if (!(name in body)) {
            if (!partial && field.required) {
                throw new Error(`${name} is required`);
            }
            continue;
        }
        const coerced = coerce(body[name], field.type, name);
        if (Array.isArray(field.enum) && !field.enum.includes(coerced)) {
            throw new Error(`${name} must be one of ${field.enum.join(", ")}`);
        }
        if (field.validate) {
            field.validate(coerced);
        }
        columns[field.column] = coerced;
    }

    if (Object.keys(columns).length === 0) {
        throw new Error("No writable fields were supplied");
    }

    return columns;
}

/**
 * Turn a request body into the columns a monitor may set.
 * @param {object} body request body
 * @param {boolean} partial true for PATCH
 * @returns {object} column/value pairs
 */
function monitorFromAPI(body, partial) {
    return parseWith(MONITOR_FIELDS, body, partial);
}

/*
 * Tags. Small enough to need no pagination.
 */
const TAG_FIELDS = {
    id: { column: "id", type: "int" },
    name: { column: "name", type: "string", writable: true, required: true },
    color: { column: "color", type: "string", writable: true, required: true },
    createdDate: { column: "created_date", type: "string" },
};

/*
 * Status pages, read-only for now. `password` is a credential and stays out;
 * custom CSS and analytics identifiers are configuration an operator has
 * already published on the page itself.
 */
const STATUS_PAGE_FIELDS = {
    id: { column: "id", type: "int" },
    slug: { column: "slug", type: "string" },
    title: { column: "title", type: "string" },
    description: { column: "description", type: "string" },
    theme: { column: "theme", type: "string" },
    published: { column: "published", type: "bool" },
    showTags: { column: "show_tags", type: "bool" },
    showPoweredBy: { column: "show_powered_by", type: "bool" },
    autoRefreshInterval: { column: "auto_refresh_interval", type: "int" },
    password: { column: "password", type: "string", secret: true },
    createdDate: { column: "created_date", type: "string" },
};

/*
 * Notifications, proxies, Docker hosts and remote browsers.
 *
 * These four differ from the resources above: their secrets are not always a
 * whole column. `notification.config` is a JSON blob holding the entire channel
 * configuration, which for most of the 100-odd providers includes the token or
 * webhook URL; `docker_host.docker_daemon` may be a socket path or may be
 * tcp://user:pass@host; `remote_browser.url` commonly carries a token in a query
 * parameter. The field table marks whole columns, which cannot express
 * "sensitive depending on its value".
 *
 * So only the fields that are safe whatever the value holds are exposed. An
 * agent can see that a notification channel exists and is active — enough to
 * reason about whether a monitor has a way to alert — without reading how it
 * authenticates.
 *
 * The excluded columns are listed here and marked secret rather than omitted:
 * omitting them would let a later edit add one back with nothing to object.
 */
const NOTIFICATION_FIELDS = {
    id: { column: "id", type: "int" },
    name: { column: "name", type: "string" },
    /*
     * Which provider this channel uses, lifted out of the config blob.
     *
     * The blob itself stays secret because for most providers it *is* the
     * credential — a Slack webhook URL is enough to post as that bot, a Telegram
     * config carries the bot token. Which provider it is carries none of that,
     * and it is the part an agent actually needs: "this monitor alerts to a
     * pager" and "this monitor alerts to an inbox" are different answers.
     *
     * Reading one named key rather than passing the object through is the whole
     * point; a redaction list over an object of unknown shape, across a hundred
     * providers, would be wrong the first time a provider added a field.
     */
    type: {
        derive: (bean) => {
            const parsed = JSON.parse(bean.config);
            return typeof parsed?.type === "string" ? parsed.type : null;
        },
        type: "string",
    },
    active: { column: "active", type: "bool" },
    isDefault: { column: "is_default", type: "bool" },
    config: { column: "config", type: "string", secret: true },
};

const PROXY_FIELDS = {
    id: { column: "id", type: "int" },
    protocol: { column: "protocol", type: "string" },
    host: { column: "host", type: "string" },
    port: { column: "port", type: "int" },
    active: { column: "active", type: "bool" },
    auth: { column: "auth", type: "bool" },
    // The username is returned, the password is not: the password is the secret
    // half of the pair. The settings UI already receives both over the socket,
    // so withholding the username here bought nothing.
    username: { column: "username", type: "string" },
    password: { column: "password", type: "string", secret: true },
};

const DOCKER_HOST_FIELDS = {
    id: { column: "id", type: "int" },
    name: { column: "name", type: "string" },
    dockerType: { column: "docker_type", type: "string" },
    dockerDaemon: { column: "docker_daemon", type: "string", secret: true },
};

const REMOTE_BROWSER_FIELDS = {
    id: { column: "id", type: "int" },
    name: { column: "name", type: "string" },
    url: { column: "url", type: "string", secret: true },
};

/*
 * Web3 networks. Read-only, and the RPC URL never leaves the server: a hosted
 * endpoint carries its API key in the URL, so it is the same shape of secret as
 * remote_browser.url above.
 *
 * The rest of the row is what a caller needs and none of what it must not have:
 * the id to reference from a monitor, the name to recognise it by, and the chain
 * id so it can tell which chain it is about to monitor.
 */
const WEB3_NETWORK_FIELDS = {
    id: { column: "id", type: "int" },
    name: { column: "name", type: "string" },
    chainId: { column: "chain_id", type: "string" },
    active: { column: "active", type: "bool" },
    rpcUrl: { column: "rpc_url", type: "string", secret: true },
};

const tagToAPI = makeProjection(TAG_FIELDS);
const notificationToAPI = makeProjection(NOTIFICATION_FIELDS);
const proxyToAPI = makeProjection(PROXY_FIELDS);
const dockerHostToAPI = makeProjection(DOCKER_HOST_FIELDS);
const remoteBrowserToAPI = makeProjection(REMOTE_BROWSER_FIELDS);
const web3NetworkToAPI = makeProjection(WEB3_NETWORK_FIELDS);
const statusPageToAPI = makeProjection(STATUS_PAGE_FIELDS);

/*
 * Cursor pagination.
 *
 * Ordering by id rather than name so the cursor is stable: a rename would move a
 * row in a name-ordered page and a caller walking the pages would skip or repeat
 * it. Callers who want alphabetical order can sort a full page themselves.
 */
router.get(
    "/api/v1/monitors",
    apiAuth,
    route(async (req, res) => {
        const rawExternalRef = req.query.externalRef;
        if (rawExternalRef !== undefined) {
            let externalRef;
            try {
                externalRef = coerce(rawExternalRef, MONITOR_FIELDS.externalRef.type, "externalRef");
                MONITOR_FIELDS.externalRef.validate(externalRef);
            } catch (e) {
                badRequest(res, e);
                return;
            }
            const row = await R.findOne("monitor", " user_id = ? AND external_ref = ? ", [
                req.principal?.estateID ?? null,
                externalRef,
            ]);
            res.json({
                ok: true,
                data: row ? [ monitorToAPI(row) ] : [],
                page: { limit: 1, hasMore: false, nextCursor: null },
            });
            return;
        }

        const limit = boundedLimit(req.query.limit, 100, 500);
        const cursor = Number.parseInt(req.query.cursor, 10);
        const after = Number.isFinite(cursor) ? cursor : 0;

        // One extra row tells us whether another page exists without a count.
        const rows = await R.getAll(
            "SELECT * FROM monitor WHERE user_id = ? AND id > ? ORDER BY id LIMIT ?",
            [ req.principal?.estateID ?? null, after, limit + 1 ]
        );

        const hasMore = rows.length > limit;
        const page = hasMore ? rows.slice(0, limit) : rows;

        res.json({
            ok: true,
            data: R.convertToBeans("monitor", page).map(monitorToAPI),
            // Stated rather than implied: a caller that ignores this sees a
            // partial list, and nothing else would tell it so.
            page: {
                limit,
                hasMore,
                nextCursor: hasMore ? page[page.length - 1].id : null,
            },
        });
    })
);

router.get(
    "/api/v1/monitors/:id",
    apiAuth,
    route(async (req, res) => {
        const bean = await R.findOne("monitor", " id = ? AND user_id = ? ", [
            req.params.id,
            req.principal?.estateID ?? null,
        ]);

        if (!bean) {
            res.status(404).json({
                ok: false,
                error: { code: "not_found", message: "No such monitor" },
            });
            return;
        }

        res.json({ ok: true, data: monitorToAPI(bean) });
    })
);

/*
 * How a monitor has behaved over time, which is what a chart is drawn from.
 *
 * The engine already keeps rolled-up counts per minute, hour and day for its
 * own pages; until now they had no way out through this API, so a caller could
 * read the state a monitor is in but not how it got there.
 *
 * Windows are named rather than free-form (a start and an end would invite
 * requests for a year at minute resolution, which is 525,600 buckets), and each
 * window fixes its own bucket size, so a caller never has to reconcile a
 * resolution it asked for against the one it received.
 */
const UPTIME_WINDOWS = {
    "3h": { bucket: "minute", count: 180 },
    "6h": { bucket: "minute", count: 360 },
    "24h": { bucket: "minute", count: 1440 },
    "7d": { bucket: "hour", count: 168 },
    "30d": { bucket: "hour", count: 720 },
    "1y": { bucket: "day", count: 365 },
};

const UPTIME_BUCKET_SECONDS = {
    minute: 60,
    hour: 3600,
    day: 86400,
};

router.get(
    "/api/v1/monitors/:id/uptime",
    apiAuth,
    route(async (req, res) => {
        const monitor = await R.findOne("monitor", " id = ? AND user_id = ? ", [
            req.params.id,
            req.principal?.estateID ?? null,
        ]);

        if (!monitor) {
            res.status(404).json({
                ok: false,
                error: { code: "not_found", message: "No such monitor" },
            });
            return;
        }

        const window = req.query.window ?? "24h";
        const shape = UPTIME_WINDOWS[window];

        if (!shape) {
            res.status(400).json({
                ok: false,
                error: {
                    code: "invalid_request",
                    message: `window must be one of ${Object.keys(UPTIME_WINDOWS).join(", ")}`,
                },
            });
            return;
        }

        let calculator;
        try {
            calculator = await UptimeCalculator.getUptimeCalculator(monitor.id);
        } catch (e) {
            /*
             * A monitor that has never been checked has no calculator. That is
             * an empty chart, not an error: the caller asked a fair question
             * about a monitor with nothing to say yet.
             */
            log.debug("api", `No uptime data for monitor ${monitor.id}: ${e.message}`);
            res.json({
                ok: true,
                data: {
                    window,
                    bucket: shape.bucket,
                    bucketSeconds: UPTIME_BUCKET_SECONDS[shape.bucket],
                    points: [],
                    summary: { uptime: null, avgPing: null },
                },
            });
            return;
        }

        /*
         * Oldest first. The calculator walks backwards from now, which is the
         * reverse of how every chart reads, and sorting is the kind of step a
         * caller forgets exactly once.
         */
        const points = calculator
            .getDataArray(shape.count, shape.bucket)
            .map(uptimePointToAPI)
            .sort((a, b) => a.timestamp - b.timestamp);

        res.json({
            ok: true,
            data: {
                window,
                bucket: shape.bucket,
                bucketSeconds: UPTIME_BUCKET_SECONDS[shape.bucket],
                points,
                summary: summarizeUptime(points),
            },
        });
    })
);

/**
 * Summarise the buckets inside the window.
 *
 * Computed from the same buckets the caller receives rather than asked of the
 * calculator, whose own summary substitutes the last bucket it saw when the
 * window holds nothing — data from outside the period that was asked about,
 * and, in a process that has not seen a check since starting, a flat zero that
 * is indistinguishable from a total outage.
 *
 * A window with no checks in it reports null on both counts, which is the same
 * rule the buckets follow: nothing recorded is not the same as nothing working.
 * @param {object[]} points The window's buckets, as this API reports them
 * @returns {object} uptime and avgPing over the window
 */
function summarizeUptime(points) {
    let up = 0;
    let down = 0;
    let pingTotal = 0;
    let pingWeight = 0;

    for (const point of points) {
        up += point.up;
        down += point.down;
        if (point.avgPing !== null) {
            // Weighted by the checks behind each average, the way the
            // calculator accumulates it, so a bucket holding six checks does
            // not count the same as one holding sixty.
            pingTotal += point.avgPing * point.up;
            pingWeight += point.up;
        }
    }

    const checks = up + down;
    return {
        uptime: checks === 0 ? null : up / checks,
        avgPing: pingWeight === 0 ? null : pingTotal / pingWeight,
    };
}

/**
 * Present one rolled-up bucket.
 *
 * Named explicitly rather than passed through, because the stored shape carries
 * whatever the calculator happened to put on it — including the ping fields it
 * leaves undefined for a bucket with no successful check.
 * @param {object} point A bucket from UptimeCalculator
 * @returns {object} The bucket as this API reports it
 */
function uptimePointToAPI(point) {
    const up = point.up ?? 0;
    const down = point.down ?? 0;
    const maintenance = point.maintenance ?? 0;
    const total = up + down;

    return {
        timestamp: point.timestamp,
        up,
        down,
        maintenance,
        /*
         * The share of checks that succeeded in this bucket, or null when
         * nothing was checked. Zero would read as an outage, and a gap in
         * monitoring is not the same thing as a monitor being down.
         */
        uptime: total === 0 ? null : up / total,
        avgPing: point.avgPing ?? null,
        minPing: point.minPing ?? null,
        maxPing: point.maxPing ?? null,
    };
}

/*
 * The individual checks behind the aggregate, newest first.
 *
 * A chart drawn from buckets cannot say what actually happened at 14:02, and
 * the message attached to a failed check is usually the first thing anyone
 * wants. Returned as its own route so a caller reading a chart every few
 * seconds is not also carrying beat detail it will not draw.
 */
router.get(
    "/api/v1/monitors/:id/heartbeats",
    apiAuth,
    route(async (req, res) => {
        const monitor = await R.findOne("monitor", " id = ? AND user_id = ? ", [
            req.params.id,
            req.principal?.estateID ?? null,
        ]);

        if (!monitor) {
            res.status(404).json({
                ok: false,
                error: { code: "not_found", message: "No such monitor" },
            });
            return;
        }

        const limit = parseBoundedInteger(req.query.limit, 100, 1, 500);

        if (limit === null) {
            res.status(400).json({
                ok: false,
                error: { code: "invalid_request", message: "limit must be an integer between 1 and 500" },
            });
            return;
        }

        const rows = await R.getAll(
            `SELECT status, time, ping, msg, important, duration
             FROM heartbeat WHERE monitor_id = ? ORDER BY time DESC LIMIT ?`,
            [ monitor.id, limit ]
        );

        res.json({
            ok: true,
            data: rows.map((row) => ({
                status: row.status,
                time: row.time,
                ping: row.ping,
                message: row.msg,
                important: Boolean(row.important),
                duration: row.duration,
            })),
        });
    })
);

/**
 * Read a query parameter that must be a whole number inside a range.
 *
 * Returns null for anything that is not, including "12abc" and "1e3", rather
 * than the partial number parseInt would find: a caller that sent a malformed
 * limit meant something, and quietly using half of it is worse than saying no.
 * @param {*} raw The raw query value
 * @param {number} fallback Used when the parameter was not supplied
 * @param {number} min Smallest accepted value
 * @param {number} max Largest accepted value
 * @returns {number|null} The value, or null if it was not acceptable
 */
function parseBoundedInteger(raw, fallback, min, max) {
    if (raw === undefined) {
        return fallback;
    }
    if (typeof raw !== "string" || !/^[0-9]+$/.test(raw)) {
        return null;
    }
    const value = Number(raw);
    return value >= min && value <= max ? value : null;
}

/*
 * The question an agent actually asks, answered in one call: what is the state
 * of everything right now. Assembled here rather than left to the caller, so a
 * client cannot get the correlation wrong.
 */
router.get(
    "/api/v1/overview",
    apiAuth,
    route(async (req, res) => {
        const rows = await R.getAll("SELECT * FROM monitor WHERE user_id = ? ORDER BY name", [
            req.principal?.estateID ?? null,
        ]);
        const monitors = R.convertToBeans("monitor", rows);
        const certificates = await readCertificates(monitors.map((monitor) => monitor.id));

        const data = [];
        for (const monitor of monitors) {
            const beat = await R.getRow(
                "SELECT status, time, ping FROM heartbeat WHERE monitor_id = ? ORDER BY time DESC LIMIT 1",
                [ monitor.id ]
            );

            // The transition into the current state, which is what "since when"
            // means. important = 1 marks those and is covered by an index.
            const since = await R.getRow(
                "SELECT time FROM heartbeat WHERE monitor_id = ? AND important = 1 ORDER BY time DESC LIMIT 1",
                [ monitor.id ]
            );

            let uptime = null;
            try {
                uptime = (await UptimeCalculator.getUptimeCalculator(monitor.id)).get24Hour().uptime;
            } catch (e) {
                // A monitor with no history yet has no calculator; that is not
                // an error, it just has no uptime to report.
                uptime = null;
            }

            data.push({
                id: monitor.id,
                name: monitor.name,
                active: Boolean(monitor.active),
                status: beat ? beat.status : null,
                lastCheck: beat ? beat.time : null,
                since: since ? since.time : null,
                ping: beat ? beat.ping : null,
                uptime24h: uptime,
                ...(certificates.get(monitor.id) ?? { certValid: null, certExpiresAt: null }),
            });
        }

        res.json({ ok: true, data });
    })
);

/**
 * Read what each monitor last learned about its peer's certificate.
 *
 * The engine already records this on every TLS check; it simply had no way out
 * through this API, so a caller could watch a site's availability but not the
 * certificate that availability depends on.
 *
 * Read in one query rather than per monitor: the overview loop is already
 * several queries deep per row, and a certificate lookup for each would grow
 * that with the size of the estate.
 *
 * `certExpiresAt` is the certificate's own notAfter and is the value to judge
 * expiry by. A days-remaining count is deliberately not returned: it would be
 * correct only at the moment of the check that produced it, and a caller
 * computing from the timestamp is right whenever it asks.
 * @param {number[]} monitorIDs Monitors to look up
 * @returns {Promise<Map<number, object>>} Certificate fields by monitor id
 */
async function readCertificates(monitorIDs) {
    const certificates = new Map();
    if (monitorIDs.length === 0) {
        return certificates;
    }

    const placeholders = monitorIDs.map(() => "?").join(",");
    const rows = await R.getAll(
        `SELECT monitor_id, info_json FROM monitor_tls_info WHERE monitor_id IN (${placeholders})`,
        monitorIDs
    );

    for (const row of rows) {
        let info;
        try {
            info = JSON.parse(row.info_json);
        } catch (e) {
            // A row this API cannot read is reported as no certificate rather
            // than failing the whole overview for every other monitor.
            continue;
        }
        if (!info || typeof info !== "object") {
            continue;
        }
        certificates.set(row.monitor_id, {
            certValid: typeof info.valid === "boolean" ? info.valid : null,
            certExpiresAt: info.certInfo?.validTo ?? null,
        });
    }

    return certificates;
}

/*
 * Lets a caller discover its own authority before attempting anything, which is
 * the first thing an agent needs to know. A GET, so a read-only key can ask.
 */
router.get(
    "/api/v1/whoami",
    apiAuth,
    route(async (req, res) => {
        res.json({
            ok: true,
            data: {
                // Who is calling, not what they can see. Every resource route
                // scopes to the estate; this one answers for the credential.
                userID: req.principal?.accountID ?? null,
                readOnly: Boolean(req.principal?.readOnly),
            },
        });
    })
);

router.get(
    "/api/v1/incidents/active",
    apiAuth,
    route(async (req, res) => {
        const rows = await R.getAll(
            `SELECT m.id, m.name, h.status, h.time AS last_check
             FROM monitor m
             JOIN heartbeat h ON h.id = (
                 SELECT id FROM heartbeat WHERE monitor_id = m.id ORDER BY time DESC LIMIT 1
             )
             WHERE m.user_id = ? AND m.active = 1 AND h.status IN (0, 2)
             ORDER BY m.name`,
            [ req.principal?.estateID ?? null ]
        );

        const data = [];
        for (const row of rows) {
            const since = await R.getRow(
                "SELECT time FROM heartbeat WHERE monitor_id = ? AND important = 1 ORDER BY time DESC LIMIT 1",
                [ row.id ]
            );
            data.push({
                id: row.id,
                name: row.name,
                status: row.status,
                lastCheck: row.last_check,
                since: since ? since.time : null,
            });
        }

        res.json({ ok: true, data });
    })
);

/*
 * State transitions in a window.
 *
 * Reads only heartbeats flagged important, which is what marks a transition and
 * is covered by monitor_important_time_index. Bounded on both axes: an agent
 * asking an open question must not be able to pull an instance's whole history
 * in one call. See docs/plans/mcp-and-agent-api.md.
 */
router.get(
    "/api/v1/changes",
    apiAuth,
    route(async (req, res) => {
        const MAX_LOOKBACK_HOURS = 24 * 7;
        const DEFAULT_LOOKBACK_HOURS = 24;

        let hours = Number.parseFloat(req.query.hours);
        if (!Number.isFinite(hours) || hours <= 0) {
            hours = DEFAULT_LOOKBACK_HOURS;
        }
        const capped = hours > MAX_LOOKBACK_HOURS;
        hours = Math.min(hours, MAX_LOOKBACK_HOURS);

        const limit = boundedLimit(req.query.limit, 500, 500);
        const since = new Date(Date.now() - hours * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");

        const rows = await R.getAll(
            `SELECT h.monitor_id, m.name, h.status, h.time
             FROM heartbeat h
             JOIN monitor m ON m.id = h.monitor_id
             WHERE m.user_id = ? AND h.important = 1 AND h.time > ?
             ORDER BY h.time DESC
             LIMIT ?`,
            [ req.principal?.estateID ?? null, since, limit ]
        );

        res.json({
            ok: true,
            data: rows.map((row) => ({
                monitorID: row.monitor_id,
                name: row.name,
                status: row.status,
                time: row.time,
            })),
            window: {
                hours,
                // Said plainly rather than silently honoured, so a caller knows
                // it is seeing a truncated answer.
                capped,
                maxHours: MAX_LOOKBACK_HOURS,
                limit,
                truncated: rows.length === limit,
            },
        });
    })
);

/*
 * Tags and maintenance windows, read-only. Both are small, bounded sets that an
 * agent needs to interpret a monitor's state.
 */
router.get(
    "/api/v1/tags",
    apiAuth,
    route(async (req, res) => {
        const rows = await R.getAll("SELECT * FROM tag ORDER BY name");
        res.json({ ok: true, data: rows.map(tagToAPI) });
    })
);

router.post(
    "/api/v1/tags",
    apiAuth,
    requireWrite,
    route(async (req, res) => {
        let columns;
        try {
            columns = parseWith(TAG_FIELDS, req.body, false);
        } catch (e) {
            badRequest(res, e);
            return;
        }

        const bean = R.dispense("tag");
        for (const [ column, value ] of Object.entries(columns)) {
            bean[column] = value;
        }
        await R.store(bean);

        const saved = await R.findOne("tag", " id = ? ", [ bean.id ]);
        res.status(201).json({ ok: true, data: tagToAPI(saved) });
    })
);

router.patch(
    "/api/v1/tags/:id",
    apiAuth,
    requireWrite,
    route(async (req, res) => {
        const bean = await R.findOne("tag", " id = ? ", [ req.params.id ]);

        if (!bean) {
            res.status(404).json({ ok: false, error: { code: "not_found", message: "No such tag" } });
            return;
        }

        let columns;
        try {
            columns = parseWith(TAG_FIELDS, req.body, true);
        } catch (e) {
            badRequest(res, e);
            return;
        }

        for (const [ column, value ] of Object.entries(columns)) {
            bean[column] = value;
        }
        await R.store(bean);

        const saved = await R.findOne("tag", " id = ? ", [ bean.id ]);
        res.json({ ok: true, data: tagToAPI(saved) });
    })
);

/*
 * Which providers this build can send through.
 *
 * Read from the live registry rather than a list kept alongside it, so a
 * provider added to the server is offered here without a second edit. A caller
 * building a form needs this before it can ask for a channel's settings, and
 * the names are the same strings `type` takes below.
 */
router.get(
    "/api/v1/notification-providers",
    apiAuth,
    route(async (req, res) => {
        res.json({
            ok: true,
            data: Object.keys(Notification.providerList)
                .sort()
                /*
                 * `fields` is present for the providers whose settings have
                 * been written down, and absent for the rest. A caller that
                 * has them can draw a form; a caller that does not should ask
                 * for the settings directly rather than guess, which is why
                 * the key is missing rather than empty.
                 */
                .map((name) => (PROVIDER_FIELDS[name]
                    ? { name, fields: PROVIDER_FIELDS[name] }
                    : { name })),
        });
    })
);

/*
 * Notification channels.
 *
 * Writable, with the credential travelling one way only: `config` is accepted
 * and never returned. For most providers that object *is* the credential — a
 * Slack webhook URL is enough to post as that bot — so returning it would make
 * any key a way to read every channel's secret, while accepting it only lets a
 * caller set something it already knew.
 *
 * The settings inside `config` are not validated against the provider, because
 * the server does not validate them either: a provider reads the keys it wants
 * and the interface's form is the only thing that has ever shaped them. What is
 * checked is `type`, since a channel naming a provider this build does not have
 * would accept every alert and deliver none of them.
 */
router.get(
    "/api/v1/notifications",
    apiAuth,
    route(async (req, res) => {
        const rows = await R.getAll("SELECT * FROM notification WHERE user_id = ? ORDER BY name", [
            req.principal?.estateID ?? null,
        ]);
        res.json({ ok: true, data: rows.map(notificationToAPI) });
    })
);

/**
 * Read a notification channel out of a request body.
 * @param {object} body Request body
 * @param {boolean} partial Whether absent fields are allowed
 * @returns {object} The settings object to store
 * @throws {Error} When the body does not describe a usable channel
 */
function parseNotificationBody(body, partial) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new Error("A notification body must be an object");
    }
    const { name, type, isDefault, active, config } = body;

    if (!partial || name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
            throw new Error("name is required");
        }
    }
    if (!partial || type !== undefined) {
        if (typeof type !== "string" || !Notification.providerList[type]) {
            throw new Error(
                `type must name a provider this server has; see GET /api/v1/notification-providers`
            );
        }
    }
    if (config !== undefined && (typeof config !== "object" || config === null || Array.isArray(config))) {
        throw new Error("config must be an object");
    }
    for (const [ field, value ] of [ [ "isDefault", isDefault ], [ "active", active ] ]) {
        if (value !== undefined && typeof value !== "boolean") {
            throw new Error(`${field} must be a boolean`);
        }
    }

    /*
     * Stored the way the interface stores it: one flat object holding the
     * provider's settings alongside name and type. Keeping the shape identical
     * means a channel created here is editable in the interface afterwards, and
     * one created there is editable through this API.
     */
    return {
        ...(config ?? {}),
        ...(name === undefined ? {} : { name: name.trim() }),
        ...(type === undefined ? {} : { type }),
        ...(isDefault === undefined ? {} : { isDefault }),
        ...(active === undefined ? {} : { active }),
    };
}

router.post(
    "/api/v1/notifications",
    apiAuth,
    requireWrite,
    route(async (req, res) => {
        let settings;
        try {
            settings = parseNotificationBody(req.body, false);
        } catch (e) {
            badRequest(res, e);
            return;
        }

        const bean = await Notification.save(settings, null, req.principal?.estateID ?? null);
        const saved = await R.findOne("notification", " id = ? ", [ bean.id ]);
        res.status(201).json({ ok: true, data: notificationToAPI(saved) });
    })
);

router.patch(
    "/api/v1/notifications/:id",
    apiAuth,
    requireWrite,
    route(async (req, res) => {
        const existing = await R.findOne("notification", " id = ? AND user_id = ? ", [
            req.params.id,
            req.principal?.estateID ?? null,
        ]);
        if (!existing) {
            res.status(404).json({
                ok: false,
                error: { code: "not_found", message: "No such notification" },
            });
            return;
        }

        let patch;
        try {
            patch = parseNotificationBody(req.body, true);
        } catch (e) {
            badRequest(res, e);
            return;
        }

        /*
         * Merged over what is stored, so a caller changing a name does not have
         * to resend a credential it cannot read back.
         */
        let stored = {};
        try {
            stored = JSON.parse(existing.config) ?? {};
        } catch (e) {
            stored = {};
        }

        const bean = await Notification.save(
            { ...stored, ...patch },
            existing.id,
            req.principal?.estateID ?? null
        );
        const saved = await R.findOne("notification", " id = ? ", [ bean.id ]);
        res.json({ ok: true, data: notificationToAPI(saved) });
    })
);

router.delete(
    "/api/v1/notifications/:id",
    apiAuth,
    requireWrite,
    route(async (req, res) => {
        const existing = await R.findOne("notification", " id = ? AND user_id = ? ", [
            req.params.id,
            req.principal?.estateID ?? null,
        ]);
        if (!existing) {
            res.status(404).json({
                ok: false,
                error: { code: "not_found", message: "No such notification" },
            });
            return;
        }

        await Notification.delete(existing.id, req.principal?.estateID ?? null);
        res.json({ ok: true, data: { deleted: [ Number(existing.id) ] } });
    })
);

router.get(
    "/api/v1/proxies",
    apiAuth,
    route(async (req, res) => {
        const rows = await R.getAll("SELECT * FROM proxy WHERE user_id = ? ORDER BY host", [
            req.principal?.estateID ?? null,
        ]);
        res.json({ ok: true, data: rows.map(proxyToAPI) });
    })
);

router.get(
    "/api/v1/docker-hosts",
    apiAuth,
    route(async (req, res) => {
        const rows = await R.getAll("SELECT * FROM docker_host WHERE user_id = ? ORDER BY name", [
            req.principal?.estateID ?? null,
        ]);
        res.json({ ok: true, data: rows.map(dockerHostToAPI) });
    })
);

router.get(
    "/api/v1/remote-browsers",
    apiAuth,
    route(async (req, res) => {
        const rows = await R.getAll("SELECT * FROM remote_browser WHERE user_id = ? ORDER BY name", [
            req.principal?.estateID ?? null,
        ]);
        res.json({ ok: true, data: rows.map(remoteBrowserToAPI) });
    })
);

/*
 * Without this a caller has no way to find the web3NetworkId a web3 monitor has
 * to reference, and no way to create one at all.
 */
router.get(
    "/api/v1/web3-networks",
    apiAuth,
    route(async (req, res) => {
        const rows = await R.getAll("SELECT * FROM web3_network WHERE user_id = ? ORDER BY name", [
            req.principal?.estateID ?? null,
        ]);
        res.json({ ok: true, data: rows.map(web3NetworkToAPI) });
    })
);

/*
 * The AI credentials, as much of them as is not a secret: what a caller needs to
 * name one in a monitor, and nothing that could be used away from this instance.
 * Instance-wide, like status pages, and read-only — they are written in the
 * settings page by an administrator.
 */
router.get(
    "/api/v1/ai-credentials",
    apiAuth,
    route(async (req, res) => {
        res.json({ ok: true, data: await llmCredentialSummaries() });
    })
);

/*
 * Status pages are instance-wide rather than per-user — the table has no
 * user_id — so this lists them all. Read-only: editing a public surface through
 * an API is a larger decision than this release makes.
 */
router.get(
    "/api/v1/status-pages",
    apiAuth,
    route(async (req, res) => {
        const rows = await R.getAll("SELECT * FROM status_page ORDER BY slug");
        res.json({ ok: true, data: rows.map(statusPageToAPI) });
    })
);

router.get(
    "/api/v1/maintenances",
    apiAuth,
    route(async (req, res) => {
        const rows = await R.getAll(
            "SELECT id, title, description, strategy, active FROM maintenance WHERE user_id = ? ORDER BY title",
            [ req.principal?.estateID ?? null ]
        );
        res.json({
            ok: true,
            data: rows.map((row) => ({
                id: row.id,
                title: row.title,
                description: row.description,
                strategy: row.strategy,
                active: Boolean(row.active),
            })),
        });
    })
);

/**
 * Check a proposed parent group.
 *
 * Three things the field table cannot express. The group has to exist and
 * belong to the caller, or an API key would be able to file its monitors under
 * somebody else's group and see them appear on that person's dashboard. And it
 * must not be the monitor itself or one of its descendants, which would make a
 * cycle: getAllChildrenIDs walks down, isParentActive walks up, and a loop hangs
 * whichever runs first. The socket path makes the same check on edit.
 * @param {number|null} parent proposed parent id, null to detach
 * @param {number|null} userID the authenticated principal
 * @param {number|null} monitorID the monitor being moved, if it exists yet
 * @returns {Promise<void>} resolves when the parent is acceptable
 * @throws {Error} when it is not
 */
async function assertParentAllowed(parent, userID, monitorID) {
    if (parent === null || parent === undefined) {
        return;
    }

    const group = await R.findOne("monitor", " id = ? AND user_id = ? ", [ parent, userID ]);
    if (!group) {
        throw new Error("parent must be a monitor you own");
    }

    if (monitorID != null) {
        if (Number(parent) === Number(monitorID)) {
            throw new Error("A monitor cannot be its own parent");
        }
        const descendants = await Monitor.getAllChildrenIDs(monitorID);
        if (descendants.includes(Number(parent))) {
            throw new Error("parent cannot be one of this monitor's own children");
        }
    }
}

/**
 * Check a proposed web3 network.
 *
 * The network holds an RPC URL, and a hosted endpoint carries its API key in
 * that URL. Referencing a network belonging to somebody else would let a caller
 * spend another user's quota through a monitor of their own, without ever seeing
 * the credential — so ownership is checked here rather than left to the fact
 * that the id is only listed to its owner.
 * @param {number|null} networkID proposed network id
 * @param {number|null} userID the authenticated principal
 * @returns {Promise<void>} resolves when the network is acceptable
 * @throws {Error} when it is not
 */
async function assertWeb3NetworkAllowed(networkID, userID) {
    if (networkID === null || networkID === undefined) {
        return;
    }

    const network = await R.findOne("web3_network", " id = ? AND user_id = ? ", [ networkID, userID ]);
    if (!network) {
        throw new Error("web3NetworkId must be a network you own; see GET /api/v1/web3-networks");
    }
}

/**
 * Send a 400 describing why a body was refused.
 * @param {express.Response} res Express response object
 * @param {Error} e the validation failure
 * @returns {void}
 */
function badRequest(res, e) {
    res.status(400).json({
        ok: false,
        error: { code: "invalid_request", message: e.message },
    });
}

router.post(
    "/api/v1/monitors",
    apiAuth,
    requireWrite,
    route(async (req, res) => {
        let columns;
        try {
            columns = monitorFromAPI(req.body, false);
        } catch (e) {
            badRequest(res, e);
            return;
        }

        const userID = req.principal?.estateID ?? null;
        if (columns.external_ref) {
            const existing = await R.findOne("monitor", " user_id = ? AND external_ref = ? ", [
                userID,
                columns.external_ref,
            ]);
            if (existing) {
                res.json({ ok: true, data: monitorToAPI(existing), replayed: true });
                return;
            }
        }

        const bean = R.dispense("monitor");
        // Column defaults first, so an explicit value always wins.
        for (const [ column, value ] of Object.entries(CREATE_DEFAULTS)) {
            bean[column] = value;
        }
        for (const [ column, value ] of Object.entries(columns)) {
            bean[column] = value;
        }
        // Ownership comes from the authenticated principal, never the body.
        bean.user_id = userID;

        try {
            await assertParentAllowed(bean.parent, bean.user_id, null);
            await assertWeb3NetworkAllowed(bean.web3_network_id, bean.user_id);
        } catch (e) {
            badRequest(res, e);
            return;
        }

        try {
            // The same domain rules the socket path enforces. Duplicating them
            // here would let the two drift.
            bean.validate();
        } catch (e) {
            badRequest(res, e);
            return;
        }

        try {
            await R.store(bean);
        } catch (error) {
            /*
             * Two requests carrying one externalRef can race between the read
             * above and the insert. The unique constraint picks one winner;
             * the loser returns that same monitor instead of surfacing a 500
             * or creating a duplicate on a later retry.
             */
            if (columns.external_ref) {
                const existing = await R.findOne("monitor", " user_id = ? AND external_ref = ? ", [
                    userID,
                    columns.external_ref,
                ]);
                if (existing) {
                    res.json({ ok: true, data: monitorToAPI(existing), replayed: true });
                    return;
                }
            }
            throw error;
        }

        /*
         * Re-read rather than projecting the in-memory bean. Column defaults —
         * active, method, maxretries and the rest — are applied by the database
         * on insert, so the bean in hand does not have them and a response built
         * from it would report nulls the row does not contain.
         */
        const saved = await R.findOne("monitor", " id = ? ", [ bean.id ]);

        if (saved.active) {
            await lifecycle.startMonitor(saved.user_id, saved.id);
        }

        // Any dashboard the owner has open learns about it now rather than on
        // their next refresh, the same as when the monitor is created in the UI.
        await lifecycle.notifyMonitorChanged(saved.user_id, saved.id);

        res.status(201).json({ ok: true, data: monitorToAPI(saved) });
    })
);

router.patch(
    "/api/v1/monitors/:id",
    apiAuth,
    requireWrite,
    route(async (req, res) => {
        const bean = await R.findOne("monitor", " id = ? AND user_id = ? ", [
            req.params.id,
            req.principal?.estateID ?? null,
        ]);

        if (!bean) {
            res.status(404).json({
                ok: false,
                error: { code: "not_found", message: "No such monitor" },
            });
            return;
        }

        let columns;
        try {
            columns = monitorFromAPI(req.body, true);
        } catch (e) {
            badRequest(res, e);
            return;
        }

        for (const [ column, value ] of Object.entries(columns)) {
            bean[column] = value;
        }

        try {
            if ("parent" in columns) {
                await assertParentAllowed(bean.parent, bean.user_id, bean.id);
            }
            if ("web3_network_id" in columns) {
                await assertWeb3NetworkAllowed(bean.web3_network_id, bean.user_id);
            }
            bean.validate();
        } catch (e) {
            badRequest(res, e);
            return;
        }

        await R.store(bean);

        // Restart so the change takes effect rather than waiting for a redeploy.
        await lifecycle.restartMonitor(bean.user_id, bean.id);
        await lifecycle.notifyMonitorChanged(bean.user_id, bean.id);

        const saved = await R.findOne("monitor", " id = ? ", [ bean.id ]);
        res.json({ ok: true, data: monitorToAPI(saved) });
    })
);


/**
 * Load a monitor the principal owns, answering 404 when it does not exist or
 * belongs to somebody else.
 *
 * The two cases deliberately look the same from outside: telling a caller that
 * a monitor exists but is not theirs would let it enumerate the instance.
 * @param {express.Request} req Express request object
 * @param {express.Response} res Express response object
 * @returns {Promise<object|null>} the bean, or null once a 404 has been sent
 */
async function ownedMonitor(req, res) {
    const bean = await R.findOne("monitor", " id = ? AND user_id = ? ", [
        req.params.id ?? req.params.monitorId,
        req.principal?.estateID ?? null,
    ]);

    if (!bean) {
        res.status(404).json({
            ok: false,
            error: { code: "not_found", message: "No such monitor" },
        });
        return null;
    }

    return bean;
}

/*
 * Deleting a monitor.
 *
 * A group monitor has children, and what should happen to them is a decision
 * the caller has to make rather than one this route can guess. The socket path
 * defaults to unlinking them — they survive, without a parent — so that is the
 * default here too; `?children=delete` removes the subtree instead. Deleting a
 * group without saying which you meant should not silently destroy monitors the
 * caller was not thinking about.
 */
router.delete(
    "/api/v1/monitors/:id",
    apiAuth,
    requireWrite,
    route(async (req, res) => {
        const bean = await ownedMonitor(req, res);
        if (!bean) {
            return;
        }

        const children = req.query.children ?? "unlink";
        if (children !== "unlink" && children !== "delete") {
            badRequest(res, new Error("children must be 'unlink' or 'delete'"));
            return;
        }

        const userID = req.principal?.estateID ?? null;
        const removed = [ bean.id ];

        if (bean.type === "group") {
            const kids = (await Monitor.getChildren(bean.id)) ?? [];
            for (const child of kids) {
                if (children === "delete") {
                    await Monitor.deleteMonitorRecursively(child.id, userID);
                    removed.push(child.id);
                    await lifecycle.notifyMonitorDeleted(userID, child.id);
                } else {
                    await lifecycle.notifyMonitorChanged(userID, child.id);
                }
            }

            if (children === "unlink") {
                await Monitor.unlinkAllChildren(bean.id);
            }
        }

        await Monitor.deleteMonitor(bean.id, userID);

        // The badge endpoints cache by monitor; a deleted one must stop
        // answering from cache.
        apicache.clear();

        await lifecycle.notifyMonitorDeleted(userID, bean.id);

        res.json({ ok: true, data: { deleted: removed } });
    })
);

/*
 * Pausing and resuming.
 *
 * Named actions rather than a PATCH of `active`, because they are transitions
 * with side effects — a paused monitor stops checking, a resumed one starts —
 * and because that is what an agent asks for.
 *
 * Both are idempotent. Pausing an already paused monitor answers with its
 * current state and does not stop it a second time, so a retry after a dropped
 * response cannot do anything the first call did not.
 */
router.post(
    "/api/v1/monitors/:id/pause",
    apiAuth,
    requireWrite,
    route(async (req, res) => {
        const bean = await ownedMonitor(req, res);
        if (!bean) {
            return;
        }

        const userID = req.principal?.estateID ?? null;

        if (bean.active) {
            await lifecycle.pauseMonitor(userID, bean.id);
            await lifecycle.notifyMonitorChanged(userID, bean.id);
        }

        const saved = await R.findOne("monitor", " id = ? ", [ bean.id ]);
        res.json({ ok: true, data: monitorToAPI(saved) });
    })
);

router.post(
    "/api/v1/monitors/:id/resume",
    apiAuth,
    requireWrite,
    route(async (req, res) => {
        const bean = await ownedMonitor(req, res);
        if (!bean) {
            return;
        }

        const userID = req.principal?.estateID ?? null;

        if (!bean.active) {
            await lifecycle.startMonitor(userID, bean.id);
            await lifecycle.notifyMonitorChanged(userID, bean.id);
        }

        const saved = await R.findOne("monitor", " id = ? ", [ bean.id ]);
        res.json({ ok: true, data: monitorToAPI(saved) });
    })
);

/*
 * Attaching and detaching tags.
 *
 * Only the monitor is checked against the caller. The REST plan asks for both
 * the monitor and the tag to be ownership-checked, but the tag table has no
 * user column — tags are instance-wide here, the same as status pages — so
 * there is no owner to check against. Requiring the tag to exist is the whole
 * of what can be verified, and the plan has been corrected to say so.
 *
 * Attaching is idempotent on (monitor, tag): a second call with a different
 * value updates it rather than adding a second row, since a monitor carrying
 * the same tag twice is not a state the UI can represent.
 */
router.post(
    "/api/v1/monitors/:monitorId/tags",
    apiAuth,
    requireWrite,
    route(async (req, res) => {
        const monitor = await ownedMonitor(req, res);
        if (!monitor) {
            return;
        }

        // tagID rather than tagId: whoami answers userID and changes answers
        // monitorID, so this is the convention the rest of the API already uses.
        const tagID = Number(req.body?.tagID);
        if (!Number.isInteger(tagID)) {
            badRequest(res, new Error("tagID is required and must be an integer"));
            return;
        }

        const tag = await R.findOne("tag", " id = ? ", [ tagID ]);
        if (!tag) {
            res.status(404).json({
                ok: false,
                error: { code: "not_found", message: "No such tag" },
            });
            return;
        }

        const value = req.body?.value == null ? "" : String(req.body.value);
        const existing = await R.findOne("monitor_tag", " monitor_id = ? AND tag_id = ? ", [ monitor.id, tagID ]);

        if (existing) {
            existing.value = value;
            await R.store(existing);
        } else {
            await R.exec("INSERT INTO monitor_tag (monitor_id, tag_id, value) VALUES (?, ?, ?)", [
                monitor.id,
                tagID,
                value,
            ]);
        }

        await lifecycle.notifyMonitorChanged(req.principal?.estateID ?? null, monitor.id);

        res.status(existing ? 200 : 201).json({
            ok: true,
            data: { monitorID: monitor.id, tagID, value },
        });
    })
);

/*
 * Which channels a monitor alerts through.
 *
 * The link is read fresh every time a notification is sent, so attaching one
 * takes effect on the next transition rather than on a restart.
 *
 * A channel is named by id and never described here: what it is and where it
 * points belong to /api/v1/notifications, and repeating them would put a
 * credential's destination in a second place.
 */
router.get(
    "/api/v1/monitors/:monitorId/notifications",
    apiAuth,
    route(async (req, res) => {
        const monitor = await ownedMonitor(req, res);
        if (!monitor) {
            return;
        }

        const rows = await R.getAll(
            `SELECT notification.* FROM notification
             JOIN monitor_notification ON monitor_notification.notification_id = notification.id
             WHERE monitor_notification.monitor_id = ?
             ORDER BY notification.name`,
            [ monitor.id ]
        );
        res.json({ ok: true, data: rows.map(notificationToAPI) });
    })
);

router.post(
    "/api/v1/monitors/:monitorId/notifications",
    apiAuth,
    requireWrite,
    route(async (req, res) => {
        const monitor = await ownedMonitor(req, res);
        if (!monitor) {
            return;
        }

        const notificationID = Number(req.body?.notificationID);
        if (!Number.isInteger(notificationID)) {
            badRequest(res, new Error("notificationID is required and must be an integer"));
            return;
        }

        /*
         * Scoped to the caller's estate: without it a monitor could be pointed
         * at a channel belonging to someone else, which would send that
         * someone else this monitor's alerts.
         */
        const notification = await R.findOne("notification", " id = ? AND user_id = ? ", [
            notificationID,
            req.principal?.estateID ?? null,
        ]);
        if (!notification) {
            res.status(404).json({
                ok: false,
                error: { code: "not_found", message: "No such notification" },
            });
            return;
        }

        const existing = await R.findOne(
            "monitor_notification",
            " monitor_id = ? AND notification_id = ? ",
            [ monitor.id, notificationID ]
        );

        /*
         * Attaching twice is the same monitor alerting the same channel, so a
         * repeat is the state the caller asked for rather than a second link
         * that would send every alert twice.
         */
        if (!existing) {
            await R.exec(
                "INSERT INTO monitor_notification (monitor_id, notification_id) VALUES (?, ?)",
                [ monitor.id, notificationID ]
            );
        }

        await lifecycle.notifyMonitorChanged(req.principal?.estateID ?? null, monitor.id);

        res.status(existing ? 200 : 201).json({
            ok: true,
            data: { monitorID: monitor.id, notificationID },
        });
    })
);

router.delete(
    "/api/v1/monitors/:monitorId/notifications/:notificationId",
    apiAuth,
    requireWrite,
    route(async (req, res) => {
        const monitor = await ownedMonitor(req, res);
        if (!monitor) {
            return;
        }

        const link = await R.findOne(
            "monitor_notification",
            " monitor_id = ? AND notification_id = ? ",
            [ monitor.id, req.params.notificationId ]
        );

        if (!link) {
            res.status(404).json({
                ok: false,
                error: { code: "not_found", message: "That notification is not on that monitor" },
            });
            return;
        }

        await R.trash(link);
        await lifecycle.notifyMonitorChanged(req.principal?.estateID ?? null, monitor.id);

        res.json({
            ok: true,
            data: { monitorID: monitor.id, notificationID: Number(req.params.notificationId) },
        });
    })
);

router.delete(
    "/api/v1/monitors/:monitorId/tags/:tagId",
    apiAuth,
    requireWrite,
    route(async (req, res) => {
        const monitor = await ownedMonitor(req, res);
        if (!monitor) {
            return;
        }

        const link = await R.findOne("monitor_tag", " monitor_id = ? AND tag_id = ? ", [
            monitor.id,
            req.params.tagId,
        ]);

        if (!link) {
            res.status(404).json({
                ok: false,
                error: { code: "not_found", message: "That tag is not on that monitor" },
            });
            return;
        }

        await R.trash(link);
        await lifecycle.notifyMonitorChanged(req.principal?.estateID ?? null, monitor.id);

        res.json({ ok: true, data: { monitorID: monitor.id, tagID: Number(req.params.tagId) } });
    })
);

/*
 * Deleting a tag removes it from every monitor carrying it, because monitor_tag
 * cascades on the foreign key. That is the existing behaviour of the socket
 * path and of the UI, so the API matches it rather than inventing a safer one
 * the rest of the product does not have.
 */
router.delete(
    "/api/v1/tags/:id",
    apiAuth,
    requireWrite,
    route(async (req, res) => {
        const bean = await R.findOne("tag", " id = ? ", [ req.params.id ]);

        if (!bean) {
            res.status(404).json({
                ok: false,
                error: { code: "not_found", message: "No such tag" },
            });
            return;
        }

        const affected = await R.getAll("SELECT DISTINCT monitor_id FROM monitor_tag WHERE tag_id = ?", [ bean.id ]);
        await R.trash(bean);

        const userID = req.principal?.estateID ?? null;
        for (const row of affected) {
            await lifecycle.notifyMonitorChanged(userID, row.monitor_id);
        }

        res.json({ ok: true, data: { deleted: Number(req.params.id), detachedFrom: affected.length } });
    })
);

/*
 * Machine-readable description of this API.
 *
 * Generated from MONITOR_FIELDS rather than written alongside it, so the
 * document cannot describe a field the code does not have, or miss one it does.
 * Hand-maintained OpenAPI drifts; this cannot.
 *
 * Unauthenticated on purpose: a caller has to be able to discover what
 * credentials are for before it has any. It describes shapes, never data.
 */

/**
 * Map a field type onto its OpenAPI schema.
 * @param {object} field entry from MONITOR_FIELDS
 * @returns {object} schema fragment
 */
function fieldSchema(field) {
    if (field.type === "int") {
        return { type: "integer" };
    }
    if (field.type === "number") {
        return { type: "number" };
    }
    if (field.type === "bool") {
        return { type: "boolean" };
    }
    if (field.type === "jsonArray") {
        return { type: "array", items: { type: "string" } };
    }
    const schema = { type: "string", nullable: true };
    if (Array.isArray(field.enum)) {
        schema.enum = [ ...field.enum ];
    }
    if (field.description) {
        schema.description = field.description;
    }
    return schema;
}

/**
 * Split a field table into readable and writable OpenAPI schemas.
 * @param {object} fields a field table
 * @returns {object} read properties, and write properties with their required list
 */
function schemaFor(fields) {
    const read = {};
    const write = {};
    const required = [];

    for (const [ name, field ] of Object.entries(fields)) {
        if (field.secret) {
            continue;
        }
        read[name] = fieldSchema(field);
        if (field.writable) {
            write[name] = fieldSchema(field);
            if (field.required) {
                required.push(name);
            }
        }
    }

    return { read, write: { required, properties: write } };
}

/**
 * Build the OpenAPI document from the live field tables.
 * @returns {object} an OpenAPI 3.1 document
 */
function buildOpenAPI() {
    const monitorProperties = {};
    const writableProperties = {};
    const updateProperties = {};
    const required = [];

    for (const [ name, field ] of Object.entries(MONITOR_FIELDS)) {
        if (field.secret) {
            continue;
        }
        monitorProperties[name] = fieldSchema(field);
        if (field.writable) {
            writableProperties[name] = fieldSchema(field);
            if (!field.createOnly) {
                updateProperties[name] = fieldSchema(field);
            }
            if (field.required) {
                required.push(name);
            }
        }
    }

    const authed = [ { basicAuth: [] } ];
    const envelope = (schema) => ({
        "application/json": {
            schema: {
                type: "object",
                properties: { ok: { type: "boolean" }, data: schema },
            },
        },
    });
    const monitorRef = { $ref: "#/components/schemas/Monitor" };
    // Named once; several routes take the same path parameters.
    const pathParam = (name) => ({ name, in: "path", required: true, schema: { type: "integer" } });
    const idParam = pathParam("id");
    const monitorIdParam = pathParam("monitorId");
    const tagIdParam = pathParam("tagId");

    return {
        openapi: "3.1.0",
        info: {
            title: "Uptime Gizmo API",
            version: "1.0.0",
            description:
                "Management API. Every route requires an API key sent as HTTP Basic auth, with any username and the key as the password. A key marked read-only is refused on every mutating route.",
        },
        components: {
            securitySchemes: {
                basicAuth: { type: "http", scheme: "basic" },
            },
            schemas: {
                Monitor: { type: "object", properties: monitorProperties },
                MonitorInput: { type: "object", required, properties: writableProperties },
                Tag: { type: "object", properties: schemaFor(TAG_FIELDS).read },
                TagInput: { type: "object", ...schemaFor(TAG_FIELDS).write },
                StatusPage: { type: "object", properties: schemaFor(STATUS_PAGE_FIELDS).read },
            },
        },
        paths: {
            "/api/v1/monitors": {
                get: {
                    summary: "List monitors",
                    security: authed,
                    description:
                        "Ordered by id so the cursor is stable across renames. The response carries a page object; a caller that ignores nextCursor sees a partial list.",
                    parameters: [
                        { name: "limit", in: "query", schema: { type: "integer", maximum: 500, default: 100 } },
                        { name: "cursor", in: "query", description: "nextCursor from a previous page", schema: { type: "integer" } },
                        { name: "externalRef", in: "query", description: "Exact caller correlation key; returns zero or one monitor", schema: { type: "string" } },
                    ],
                    responses: { 200: { description: "Monitors", content: envelope({ type: "array", items: monitorRef }) } },
                },
                post: {
                    summary: "Create a monitor",
                    description: "Requires a key that is not read-only.",
                    security: authed,
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/MonitorInput" } } },
                    },
                    responses: {
                        201: { description: "Created", content: envelope(monitorRef) },
                        400: { description: "The body was refused" },
                        403: { description: "The key is read-only" },
                    },
                },
            },
            "/api/v1/monitors/{id}/uptime": {
                get: {
                    summary: "Uptime and latency over time",
                    description:
                        "Rolled-up buckets for drawing a chart, oldest first. Each named window fixes its own "
                        + "bucket size, so the resolution is never in question. A bucket nothing was checked in "
                        + "reports uptime null, which is not the same as an outage.",
                    security: authed,
                    parameters: [
                        idParam,
                        {
                            name: "window",
                            in: "query",
                            required: false,
                            schema: { type: "string", enum: Object.keys(UPTIME_WINDOWS), default: "24h" },
                        },
                    ],
                    responses: {
                        200: { description: "Uptime series" },
                        400: { description: "Unknown window" },
                        404: { description: "No such monitor" },
                    },
                },
            },
            "/api/v1/monitors/{id}/heartbeats": {
                get: {
                    summary: "Individual checks, newest first",
                    description:
                        "The checks behind the aggregate, including the message a failed check recorded.",
                    security: authed,
                    parameters: [
                        idParam,
                        {
                            name: "limit",
                            in: "query",
                            required: false,
                            schema: { type: "integer", minimum: 1, maximum: 500, default: 100 },
                        },
                    ],
                    responses: {
                        200: { description: "Heartbeats" },
                        400: { description: "Unacceptable limit" },
                        404: { description: "No such monitor" },
                    },
                },
            },
            "/api/v1/monitors/{id}/pause": {
                post: {
                    summary: "Pause a monitor",
                    description:
                        "Stops checking. Idempotent: pausing an already paused monitor returns its state without stopping it again.",
                    security: authed,
                    parameters: [ idParam ],
                    responses: { 200: { description: "The monitor, now paused" }, 404: { description: "No such monitor" } },
                },
            },
            "/api/v1/monitors/{id}/resume": {
                post: {
                    summary: "Resume a monitor",
                    description:
                        "Starts checking again. Idempotent: resuming a running monitor returns its state without restarting it.",
                    security: authed,
                    parameters: [ idParam ],
                    responses: { 200: { description: "The monitor, now active" }, 404: { description: "No such monitor" } },
                },
            },
            "/api/v1/monitors/{monitorId}/tags": {
                post: {
                    summary: "Attach a tag to a monitor",
                    parameters: [ monitorIdParam ],
                    description:
                        "Body takes tagID and an optional value. Idempotent on the pair: attaching a tag already present updates its value instead of adding a second row.",
                    security: authed,
                    responses: {
                        200: { description: "The tag was already attached; its value was updated" },
                        201: { description: "Attached" },
                        404: { description: "No such monitor or tag" },
                    },
                },
            },
            "/api/v1/monitors/{monitorId}/tags/{tagId}": {
                delete: {
                    summary: "Detach a tag from a monitor",
                    parameters: [ monitorIdParam, tagIdParam ],
                    description: "Removes the link. The tag itself is untouched.",
                    security: authed,
                    responses: { 200: { description: "Detached" }, 404: { description: "That tag is not on that monitor" } },
                },
            },
            "/api/v1/monitors/{id}": {
                get: {
                    summary: "Get one monitor",
                    security: authed,
                    parameters: [ { name: "id", in: "path", required: true, schema: { type: "integer" } } ],
                    responses: { 200: { description: "Monitor", content: envelope(monitorRef) }, 404: { description: "No such monitor" } },
                },
                patch: {
                    summary: "Update a monitor",
                    description: "Partial. Requires a key that is not read-only.",
                    security: authed,
                    parameters: [ { name: "id", in: "path", required: true, schema: { type: "integer" } } ],
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { type: "object", properties: updateProperties } } },
                    },
                    responses: {
                        200: { description: "Updated", content: envelope(monitorRef) },
                        403: { description: "The key is read-only" },
                        404: { description: "No such monitor" },
                    },
                },
                delete: {
                    summary: "Delete a monitor",
                    description:
                        "For a group, `children` decides what happens to its members: 'unlink' (the default) leaves them without a parent, 'delete' removes the subtree. The response lists every id removed.",
                    security: authed,
                    parameters: [
                        idParam,
                        {
                            name: "children",
                            in: "query",
                            required: false,
                            schema: { type: "string", enum: [ "unlink", "delete" ], default: "unlink" },
                        },
                    ],
                    responses: {
                        200: { description: "Deleted" },
                        403: { description: "The key is read-only" },
                        404: { description: "No such monitor" },
                    },
                },
            },
            "/api/v1/overview": {
                get: {
                    summary: "Current state of every monitor",
                    description:
                        "One row per monitor with its status, when it entered that status, 24-hour uptime, and — for a monitor that has completed a TLS check — whether the peer's certificate validated and when it expires. `certExpiresAt` is the certificate's notAfter; judge expiry from it rather than from a count taken at check time.",
                    security: authed,
                    responses: { 200: { description: "Overview" } },
                },
            },
            "/api/v1/incidents/active": {
                get: {
                    summary: "Monitors that are down or degraded now",
                    security: authed,
                    responses: { 200: { description: "Active incidents" } },
                },
            },
            "/api/v1/changes": {
                get: {
                    summary: "State transitions in a window",
                    description:
                        "Bounded: 24 hours by default, 168 maximum, 500 rows. A request past the cap is answered with the capped window and says so in the window object.",
                    security: authed,
                    parameters: [
                        { name: "hours", in: "query", schema: { type: "number", maximum: 168, default: 24 } },
                        { name: "limit", in: "query", schema: { type: "integer", maximum: 500, default: 500 } },
                    ],
                    responses: { 200: { description: "Transitions" } },
                },
            },
            "/api/v1/whoami": {
                get: {
                    summary: "Describe the calling credential",
                    description: "Reports the owning user and whether the key is read-only, so a client can discover its authority before attempting a change.",
                    security: authed,
                    responses: { 200: { description: "The calling principal" } },
                },
            },
            "/api/v1/tags": {
                get: { summary: "List tags", security: authed, responses: { 200: { description: "Tags" } } },
                post: {
                    summary: "Create a tag",
                    description: "Requires a key that is not read-only.",
                    security: authed,
                    requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TagInput" } } } },
                    responses: { 201: { description: "Created" }, 400: { description: "The body was refused" }, 403: { description: "The key is read-only" } },
                },
            },
            "/api/v1/tags/{id}": {
                patch: {
                    summary: "Update a tag",
                    description: "Partial. Requires a key that is not read-only.",
                    security: authed,
                    parameters: [ { name: "id", in: "path", required: true, schema: { type: "integer" } } ],
                    requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TagInput" } } } },
                    responses: { 200: { description: "Updated" }, 403: { description: "The key is read-only" }, 404: { description: "No such tag" } },
                },
                delete: {
                    summary: "Delete a tag",
                    description:
                        "Removes it from every monitor carrying it, because the link table cascades. The response says how many monitors were affected.",
                    security: authed,
                    parameters: [ idParam ],
                    responses: { 200: { description: "Deleted" }, 403: { description: "The key is read-only" }, 404: { description: "No such tag" } },
                },
            },
            "/api/v1/monitors/{monitorId}/notifications": {
                get: {
                    summary: "Channels a monitor alerts through",
                    description: "Each channel as /api/v1/notifications reports it; its settings are still not returned.",
                    security: authed,
                    parameters: [ monitorIdParam ],
                    responses: { 200: { description: "Channels" }, 404: { description: "No such monitor" } },
                },
                post: {
                    summary: "Alert a monitor through a channel",
                    description:
                        "Takes `notificationID`. Read fresh when a notification is sent, so it applies from the next transition. Attaching one already attached is the state asked for, not a second link.",
                    security: authed,
                    parameters: [ monitorIdParam ],
                    responses: { 200: { description: "Already attached" }, 201: { description: "Attached" }, 400: { description: "Invalid body" }, 403: { description: "The key is read-only" }, 404: { description: "No such monitor or notification" } },
                },
            },
            "/api/v1/monitors/{monitorId}/notifications/{notificationId}": {
                delete: {
                    summary: "Stop alerting a monitor through a channel",
                    description: "Leaves the channel itself alone; only the link is removed.",
                    security: authed,
                    parameters: [ monitorIdParam, pathParam("notificationId") ],
                    responses: { 200: { description: "Detached" }, 403: { description: "The key is read-only" }, 404: { description: "Not attached" } },
                },
            },
            "/api/v1/notification-providers": {
                get: {
                    summary: "Notification providers this server can send through",
                    description:
                        "The names `type` accepts when creating a channel, read from the live registry. A provider whose settings have been written down also carries `fields`, enough to draw a form; one without it should be asked for its settings directly rather than guessed at.",
                    security: authed,
                    responses: { 200: { description: "Providers" } },
                },
            },
            "/api/v1/notifications/{id}": {
                patch: {
                    summary: "Update a notification channel",
                    description:
                        "Merged over what is stored, so changing a name does not mean resending a credential the caller cannot read back.",
                    security: authed,
                    parameters: [ idParam ],
                    responses: { 200: { description: "Updated" }, 400: { description: "Invalid body" }, 403: { description: "The key is read-only" }, 404: { description: "No such notification" } },
                },
                delete: {
                    summary: "Delete a notification channel",
                    description: "Removes it from every monitor using it.",
                    security: authed,
                    parameters: [ idParam ],
                    responses: { 200: { description: "Deleted" }, 403: { description: "The key is read-only" }, 404: { description: "No such notification" } },
                },
            },
            "/api/v1/notifications": {
                post: {
                    summary: "Create a notification channel",
                    description:
                        "`config` holds the provider's own settings and is accepted but never returned: for most providers that object is the credential. `type` must name a provider from /api/v1/notification-providers.",
                    security: authed,
                    responses: { 201: { description: "Created" }, 400: { description: "Invalid body" }, 403: { description: "The key is read-only" } },
                },
                get: {
                    summary: "List notification channels",
                    description:
                        "Name, provider type and state. The rest of the channel configuration is the credential for most providers — a webhook URL or bot token — and is never returned.",
                    security: authed,
                    responses: { 200: { description: "Notification channels" } },
                },
            },
            "/api/v1/proxies": {
                get: {
                    summary: "List proxies",
                    description: "Includes the username where a proxy authenticates. The password is never returned.",
                    security: authed,
                    responses: { 200: { description: "Proxies" } },
                },
            },
            "/api/v1/docker-hosts": {
                get: {
                    summary: "List Docker hosts",
                    description: "The daemon connection string may embed credentials and is never returned.",
                    security: authed,
                    responses: { 200: { description: "Docker hosts" } },
                },
            },
            "/api/v1/remote-browsers": {
                get: {
                    summary: "List remote browsers",
                    description: "The endpoint URL commonly carries a token and is never returned.",
                    security: authed,
                    responses: { 200: { description: "Remote browsers" } },
                },
            },
            "/api/v1/web3-networks": {
                get: {
                    summary: "List Web3 networks",
                    description:
                        "The id, name and chain id of each configured EVM network (Ethereum JSON-RPC), for a monitor to reference as web3NetworkId. The RPC URL commonly carries an API key and is never returned. Solana and other non-EVM chains are not in this list.",
                    security: authed,
                    responses: { 200: { description: "Web3 networks" } },
                },
            },
            "/api/v1/ai-credentials": {
                get: {
                    summary: "List AI credentials",
                    description:
                        "The id, name, provider and model of each credential saved in Settings → AI, for an llm monitor to reference as llmCredentialId. The API key is never returned. monitorUsable is false for a credential whose provider does not answer OpenAI chat completions, which an llm monitor cannot send its request through.",
                    security: authed,
                    responses: { 200: { description: "AI credentials" } },
                },
            },
            "/api/v1/status-pages": {
                get: {
                    summary: "List status pages",
                    description: "Instance-wide. Read-only.",
                    security: authed,
                    responses: { 200: { description: "Status pages" } },
                },
            },
            "/api/v1/maintenances": {
                get: { summary: "List maintenance windows", security: authed, responses: { 200: { description: "Maintenance windows" } } },
            },
        },
    };
}

router.get("/api/v1/openapi.json", (req, res) => {
    res.json(buildOpenAPI());
});

/*
 * Terminal handler for the namespace.
 *
 * Without it an unrecognised /api/v1 path falls through to the single-page-app
 * catch-all and answers 200 with a page of HTML. A human notices immediately; a
 * program asking for a mistyped or removed endpoint is handed a successful
 * response containing markup, and the mistake surfaces later as a parse error
 * somewhere unrelated. Anything under this prefix is an API and answers as one.
 */
router.use("/api/v1", (req, res) => {
    res.status(404).json({
        ok: false,
        error: {
            code: "not_found",
            message: `No such endpoint: ${req.method} ${req.baseUrl}${req.path}. See /api/v1/openapi.json.`,
        },
    });
});

module.exports = router;

// Exposed for tests. The field table is the support of the write-side security
// property, so it needs to be assertable without standing up a server.
module.exports.internals = {
    API_MONITOR_TYPES,
    MONITOR_FIELDS,
    TAG_FIELDS,
    STATUS_PAGE_FIELDS,
    NOTIFICATION_FIELDS,
    PROXY_FIELDS,
    DOCKER_HOST_FIELDS,
    REMOTE_BROWSER_FIELDS,
    WEB3_NETWORK_FIELDS,
    monitorToAPI,
    monitorFromAPI,
    projectWith,
    parseWith,
    parseNotificationBody,
    notificationToAPI,
    buildOpenAPI,
    readCertificates,
    uptimePointToAPI,
    summarizeUptime,
    parseBoundedInteger,
    UPTIME_WINDOWS,
};
