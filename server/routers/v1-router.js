const express = require("express");
const { R } = require("redbean-node");
const { apiAuth, requireWrite } = require("../auth");
const { UptimeCalculator } = require("../uptime-calculator");
const { log } = require("../../src/util");

const router = express.Router();

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

/**
 * The monitor fields this API is willing to expose.
 *
 * An allow-list rather than a redaction list: a new column added to the monitor
 * table must be published deliberately, and cannot leak by being forgotten.
 * @param {object} bean monitor bean
 * @returns {object} safe projection
 */
function monitorToAPI(bean) {
    return {
        id: bean.id,
        name: bean.name,
        type: bean.type,
        url: bean.url,
        hostname: bean.hostname,
        port: bean.port,
        interval: bean.interval,
        active: Boolean(bean.active),
        description: bean.description,
    };
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

module.exports = router;
