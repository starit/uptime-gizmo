const express = require("express");
const { R } = require("redbean-node");
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
 * Project a monitor bean onto the API contract.
 * @param {object} bean monitor bean
 * @returns {object} safe projection
 */
function monitorToAPI(bean) {
    const out = {};
    for (const [ name, field ] of Object.entries(MONITOR_FIELDS)) {
        if (field.secret) {
            continue;
        }
        let value = bean[field.column];
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

/**
 * Turn a request body into the columns it is allowed to set.
 *
 * An allow-list, so a field absent from MONITOR_FIELDS is dropped rather than
 * written. That is what stops a caller assigning user_id, or any of the other
 * hundred columns, by including it in the payload.
 * @param {object} body request body
 * @param {boolean} partial true for PATCH, where required fields may be absent
 * @returns {object} column/value pairs safe to assign
 * @throws {Error} when a supplied value is unusable or a required one is missing
 */
function monitorFromAPI(body, partial) {
    if (!body || typeof body !== "object") {
        throw new Error("A JSON object body is required");
    }

    const columns = {};

    for (const [ name, field ] of Object.entries(MONITOR_FIELDS)) {
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

router.get(
    "/api/v1/monitors",
    apiAuth,
    route(async (req, res) => {
        const limit = boundedLimit(req.query.limit, 100, 500);
        const rows = await R.getAll(
            "SELECT * FROM monitor WHERE user_id = ? ORDER BY name LIMIT ?",
            [ req.principal?.userID ?? null, limit ]
        );

        res.json({
            ok: true,
            data: R.convertToBeans("monitor", rows).map(monitorToAPI),
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
 * Registered with requireWrite purely to prove the guard is wired; it reports
 * what the calling credential may do. A read-only key gets 403 here, which is
 * the cheapest way for a client to discover its own authority.
 */
router.get(
    "/api/v1/whoami/write-check",
    apiAuth,
    requireWrite,
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

/*
 * What is wrong right now. Separate from /overview because an agent asking
 * "is anything broken" should not have to receive, or filter, the healthy
 * majority.
 */
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
        const rows = await R.getAll("SELECT id, name, color FROM tag ORDER BY name");
        res.json({ ok: true, data: rows });
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
            bean.validate();
        } catch (e) {
            badRequest(res, e);
            return;
        }

        await R.store(bean);

        // Restart so the change takes effect rather than waiting for a redeploy.
        await lifecycle.restartMonitor(bean.user_id, bean.id);

        const saved = await R.findOne("monitor", " id = ? ", [ bean.id ]);
        res.json({ ok: true, data: monitorToAPI(saved) });
    })
);

module.exports = router;
