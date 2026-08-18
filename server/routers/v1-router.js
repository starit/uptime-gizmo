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

module.exports = router;
