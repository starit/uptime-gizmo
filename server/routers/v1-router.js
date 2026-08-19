const express = require("express");
const { R } = require("redbean-node");
const Monitor = require("../model/monitor");
const apicache = require("../modules/apicache");
const { apiAuth, requireWrite } = require("../auth");
const { UptimeCalculator } = require("../uptime-calculator");
const { log } = require("../../src/util");

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
 * This covers the common monitor types — http, keyword, ping, port, dns. The
 * exotic transports (grpc, kafka, radius, snmp, mqtt) are deliberately absent
 * from the first release rather than half-supported.
 */
const MONITOR_FIELDS = {
    id: { column: "id", type: "int" },
    name: { column: "name", type: "string", writable: true, required: true },
    type: { column: "type", type: "string", writable: true, required: true },
    active: { column: "active", type: "bool", writable: true },
    description: { column: "description", type: "string", writable: true },
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
    dnsResolveType: { column: "dns_resolve_type", type: "string", writable: true },
    dnsResolveServer: { column: "dns_resolve_server", type: "string", writable: true },
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
        if (!(name in body)) {
            if (!partial && field.required) {
                throw new Error(`${name} is required`);
            }
            continue;
        }
        columns[field.column] = coerce(body[name], field.type, name);
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

const tagToAPI = makeProjection(TAG_FIELDS);
const notificationToAPI = makeProjection(NOTIFICATION_FIELDS);
const proxyToAPI = makeProjection(PROXY_FIELDS);
const dockerHostToAPI = makeProjection(DOCKER_HOST_FIELDS);
const remoteBrowserToAPI = makeProjection(REMOTE_BROWSER_FIELDS);
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
        const limit = boundedLimit(req.query.limit, 100, 500);
        const cursor = Number.parseInt(req.query.cursor, 10);
        const after = Number.isFinite(cursor) ? cursor : 0;

        // One extra row tells us whether another page exists without a count.
        const rows = await R.getAll(
            "SELECT * FROM monitor WHERE user_id = ? AND id > ? ORDER BY id LIMIT ?",
            [ req.principal?.userID ?? null, after, limit + 1 ]
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
            req.principal?.userID ?? null,
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
 * The question an agent actually asks, answered in one call: what is the state
 * of everything right now. Assembled here rather than left to the caller, so a
 * client cannot get the correlation wrong.
 */
router.get(
    "/api/v1/overview",
    apiAuth,
    route(async (req, res) => {
        const rows = await R.getAll("SELECT * FROM monitor WHERE user_id = ? ORDER BY name", [
            req.principal?.userID ?? null,
        ]);
        const monitors = R.convertToBeans("monitor", rows);

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
            });
        }

        res.json({ ok: true, data });
    })
);

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
                userID: req.principal?.userID ?? null,
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
            [ req.principal?.userID ?? null ]
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
            [ req.principal?.userID ?? null, since, limit ]
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
 * Read-only, all four. Creating a notification channel or a proxy means
 * supplying the credential this API declines to return, so writing them is a
 * separate decision from listing them.
 */
router.get(
    "/api/v1/notifications",
    apiAuth,
    route(async (req, res) => {
        const rows = await R.getAll("SELECT * FROM notification WHERE user_id = ? ORDER BY name", [
            req.principal?.userID ?? null,
        ]);
        res.json({ ok: true, data: rows.map(notificationToAPI) });
    })
);

router.get(
    "/api/v1/proxies",
    apiAuth,
    route(async (req, res) => {
        const rows = await R.getAll("SELECT * FROM proxy WHERE user_id = ? ORDER BY host", [
            req.principal?.userID ?? null,
        ]);
        res.json({ ok: true, data: rows.map(proxyToAPI) });
    })
);

router.get(
    "/api/v1/docker-hosts",
    apiAuth,
    route(async (req, res) => {
        const rows = await R.getAll("SELECT * FROM docker_host WHERE user_id = ? ORDER BY name", [
            req.principal?.userID ?? null,
        ]);
        res.json({ ok: true, data: rows.map(dockerHostToAPI) });
    })
);

router.get(
    "/api/v1/remote-browsers",
    apiAuth,
    route(async (req, res) => {
        const rows = await R.getAll("SELECT * FROM remote_browser WHERE user_id = ? ORDER BY name", [
            req.principal?.userID ?? null,
        ]);
        res.json({ ok: true, data: rows.map(remoteBrowserToAPI) });
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
            [ req.principal?.userID ?? null ]
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

        const bean = R.dispense("monitor");
        // Column defaults first, so an explicit value always wins.
        for (const [ column, value ] of Object.entries(CREATE_DEFAULTS)) {
            bean[column] = value;
        }
        for (const [ column, value ] of Object.entries(columns)) {
            bean[column] = value;
        }
        // Ownership comes from the authenticated principal, never the body.
        bean.user_id = req.principal?.userID ?? null;

        try {
            await assertParentAllowed(bean.parent, bean.user_id, null);
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

        await R.store(bean);

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
            req.principal?.userID ?? null,
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
        req.principal?.userID ?? null,
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

        const userID = req.principal?.userID ?? null;
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

        const userID = req.principal?.userID ?? null;

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

        const userID = req.principal?.userID ?? null;

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

        const tagID = Number(req.body?.tagId);
        if (!Number.isInteger(tagID)) {
            badRequest(res, new Error("tagId is required and must be an integer"));
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

        await lifecycle.notifyMonitorChanged(req.principal?.userID ?? null, monitor.id);

        res.status(existing ? 200 : 201).json({
            ok: true,
            data: { monitorId: monitor.id, tagId: tagID, value },
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
        await lifecycle.notifyMonitorChanged(req.principal?.userID ?? null, monitor.id);

        res.json({ ok: true, data: { monitorId: monitor.id, tagId: Number(req.params.tagId) } });
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

        const userID = req.principal?.userID ?? null;
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
    return { type: "string", nullable: true };
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
    const required = [];

    for (const [ name, field ] of Object.entries(MONITOR_FIELDS)) {
        if (field.secret) {
            continue;
        }
        monitorProperties[name] = fieldSchema(field);
        if (field.writable) {
            writableProperties[name] = fieldSchema(field);
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
                        "Body takes tagId and an optional value. Idempotent on the pair: attaching a tag already present updates its value instead of adding a second row.",
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
                        content: { "application/json": { schema: { type: "object", properties: writableProperties } } },
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
                    description: "One row per monitor with its status, when it entered that status, and 24-hour uptime.",
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
            "/api/v1/notifications": {
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
    MONITOR_FIELDS,
    TAG_FIELDS,
    STATUS_PAGE_FIELDS,
    NOTIFICATION_FIELDS,
    PROXY_FIELDS,
    DOCKER_HOST_FIELDS,
    REMOTE_BROWSER_FIELDS,
    monitorToAPI,
    monitorFromAPI,
    projectWith,
    parseWith,
    buildOpenAPI,
};
