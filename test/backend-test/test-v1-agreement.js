const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const express = require("express");
const { R } = require("redbean-node");
const passwordHash = require("../../server/password-hash");
const { Settings } = require("../../server/settings");
const TestDB = require("../mock-testdb");

/*
 * The three agent-shaped endpoints have to agree with the resources they
 * summarise.
 *
 * `overview`, `incidents/active` and `changes` exist so a caller does not have to
 * assemble the answer itself, which means they each restate something the
 * per-resource endpoints already know. Restated facts drift. If `overview` starts
 * reporting a status the monitor's own heartbeats do not support, or
 * `incidents/active` and `overview` disagree about which monitors are in trouble,
 * nothing else in the suite notices — and these are the two endpoints the shipped
 * agent skills lean on hardest.
 *
 * Heartbeats are seeded rather than produced by running monitors: a test that
 * waits for a real check to fail is slow and answers a different question. What
 * is under test is the aggregation, so the history it aggregates is written
 * directly, including the cases that separate the endpoints from each other.
 */

const KEY = "AGREEMENTKEYAGREEMENTKEY";
const CREDENTIALS = "Basic " + Buffer.from(`api:uk1_${KEY}`).toString("base64");

/**
 * A timestamp the given number of minutes in the past, in the format the
 * heartbeat table stores.
 * @param {number} minutes how far back
 * @returns {string} formatted timestamp
 */
function minutesAgo(minutes) {
    return new Date(Date.now() - minutes * 60000).toISOString().slice(0, 19).replace("T", " ");
}

/**
 * A Unix timestamp in whole seconds for an incremental overview request.
 * @param {number} minutes how far back
 * @returns {number} timestamp in seconds
 */
function unixSecondsAgo(minutes) {
    return Math.floor((Date.now() - minutes * 60000) / 1000);
}

/**
 * Insert a monitor owned by the test user.
 * @param {object} fields the monitor to insert
 * @param {number} fields.id primary key to use
 * @param {string} fields.name monitor name
 * @param {number} fields.active 1 for running, 0 for paused
 * @returns {Promise<void>} resolves once stored
 */
async function seedMonitor({ id, name, active = 1 }) {
    await R.exec(
        `INSERT INTO monitor (id, name, type, url, user_id, active, interval, retry_interval,
             resend_interval, maxretries, accepted_statuscodes_json, method)
         VALUES (?, ?, 'http', 'https://example.com', 1, ?, 60, 60, 0, 0, '["200-299"]', 'GET')`,
        [ id, name, active ]
    );
}

/**
 * Insert a heartbeat.
 * @param {object} beat the heartbeat to insert
 * @param {number} beat.monitorId which monitor it belongs to
 * @param {number} beat.status 0 down, 1 up, 2 pending, 3 maintenance
 * @param {number} beat.ago how many minutes in the past
 * @param {number} beat.important 1 when it marks a transition
 * @returns {Promise<void>} resolves once stored
 */
async function seedBeat({ monitorId, status, ago, important = 0 }) {
    await R.exec(
        "INSERT INTO heartbeat (monitor_id, status, time, important, msg, ping, duration, down_count) VALUES (?, ?, ?, ?, '', 12, 0, 0)",
        [ monitorId, status, minutesAgo(ago), important ]
    );
}

describe("v1 summary endpoints agree with their sources", () => {
    const db = new TestDB("./data/test-v1-agreement");
    let server;
    let base;

    before(async () => {
        await db.create();

        // generate() is bcrypt's async form and returns a promise; storing it
        // unawaited writes "[object Promise]" and every request comes back 401.
        await R.exec("INSERT INTO user (id, username, password, active) VALUES (1, 'agreement', ?, 1)", [
            await passwordHash.generate("unused"),
        ]);
        await R.exec(
            "INSERT INTO api_key (id, key, name, user_id, active, expires) VALUES (1, ?, 'test', 1, 1, '2099-01-01 00:00:00')",
            [ await passwordHash.generate(KEY) ]
        );
        await R.exec("INSERT INTO setting (`key`, value, type) VALUES ('apiKeysEnabled', 'true', 'general')");

        /*
         * Six monitors, chosen so that no two of the three endpoints can be
         * satisfied by the same naive rule.
         */
        // Up, with a transition into that state.
        await seedMonitor({ id: 1, name: "a-up" });
        await seedBeat({ monitorId: 1, status: 1, ago: 90, important: 1 });
        await seedBeat({ monitorId: 1, status: 1, ago: 5 });

        // Down: an incident.
        await seedMonitor({ id: 2, name: "b-down" });
        await seedBeat({ monitorId: 2, status: 1, ago: 200, important: 1 });
        await seedBeat({ monitorId: 2, status: 0, ago: 40, important: 1 });
        await seedBeat({ monitorId: 2, status: 0, ago: 4 });

        // Pending, which counts as an incident too.
        await seedMonitor({ id: 3, name: "c-pending" });
        await seedBeat({ monitorId: 3, status: 2, ago: 10, important: 1 });

        // Paused, and its last known state is down. This is the case that
        // separates the two endpoints: it belongs in the overview, because it
        // exists, and not in the incident list, because nothing is checking it.
        await seedMonitor({ id: 4, name: "d-paused-down", active: 0 });
        await seedBeat({ monitorId: 4, status: 0, ago: 300, important: 1 });

        // Never checked: a null status rather than a missing monitor.
        await seedMonitor({ id: 5, name: "e-never-checked" });

        // Under maintenance: quiet on purpose, not broken.
        await seedMonitor({ id: 6, name: "f-maintenance" });
        await seedBeat({ monitorId: 6, status: 3, ago: 20, important: 1 });

        // Older than the default window, to prove `changes` bounds itself.
        await seedBeat({ monitorId: 1, status: 0, ago: 60 * 30, important: 1 });

        const app = express();
        app.use(require("../../server/routers/v1-router"));
        await new Promise((resolve) => {
            server = app.listen(0, resolve);
        });
        base = `http://127.0.0.1:${server.address().port}`;
    });

    after(async () => {
        /*
         * close() stops new connections but leaves established ones alone, and
         * fetch keeps its sockets alive in a pool. Without this the server
         * handle outlives the suite, the test process never exits, and the
         * runner waits on it forever with nothing printed — which is how this
         * file first appeared to hang rather than fail.
         */
        if (server) {
            server.closeAllConnections();
            await new Promise((resolve) => server.close(resolve));
        }
        /*
         * Settings.get starts an interval to expire its cache the first time it
         * is called, and only server.js ever stops it. Left running it outlives
         * the suite, the test process never exits, and the runner waits on it
         * with nothing printed — which is how this file first appeared to hang
         * rather than fail.
         */
        Settings.stopCacheCleaner();
        await db.destroy();
    });

    /**
     * Call the API with the test key.
     * @param {string} path path below the host
     * @returns {Promise<object>} the parsed body
     */
    async function get(path) {
        const response = await fetch(base + path, { headers: { Authorization: CREDENTIALS } });
        assert.strictEqual(response.status, 200, `${path} answered ${response.status}`);
        return response.json();
    }

    it("covers exactly the monitors the resource endpoint lists", async () => {
        const listed = (await get("/api/v1/monitors?limit=500")).data.map((m) => m.id).sort();
        const summarised = (await get("/api/v1/overview")).data.map((m) => m.id).sort();

        assert.deepStrictEqual(summarised, listed, "the overview and the monitor list describe different populations");
    });

    it("narrows the overview to what has been checked since a caller last asked", async () => {
        const everything = (await get("/api/v1/overview")).data;
        const since = unixSecondsAgo(30);
        const recent = (await get(`/api/v1/overview?since=${since}`)).data;

        /*
         * A caller keeping a copy in step re-reads the whole estate otherwise,
         * most of which has not moved since it last looked.
         */
        assert.ok(recent.length < everything.length, "since returned the whole estate");
        for (const row of recent) {
            assert.ok(
                Date.parse(`${row.lastCheck.replace(" ", "T")}Z`) > since * 1000,
                `${row.name} was returned but was last checked at ${row.lastCheck}`
            );
        }
        const excluded = everything.filter((row) => !recent.some((kept) => kept.id === row.id));
        for (const row of excluded) {
            assert.ok(
                row.lastCheck === null || Date.parse(`${row.lastCheck.replace(" ", "T")}Z`) <= since * 1000,
                `${row.name} was left out but was checked at ${row.lastCheck}`
            );
        }
    });

    it("leaves a monitor that has never been checked out of a since response", async () => {
        const recent = (await get(`/api/v1/overview?since=${unixSecondsAgo(60 * 24 * 365)}`)).data;

        /*
         * It has nothing to say the previous answer did not already contain,
         * which is the same reason an unchanged monitor is left out.
         */
        assert.ok(
            !recent.some((row) => row.name === "e-never-checked"),
            "a monitor with no heartbeat appeared in a since response"
        );
    });

    it("answers the whole estate when since is absent, as it always did", async () => {
        const listed = (await get("/api/v1/monitors?limit=500")).data.map((m) => m.id).sort();
        const summarised = (await get("/api/v1/overview")).data.map((m) => m.id).sort();

        assert.deepStrictEqual(summarised, listed, "adding since changed what the unfiltered overview covers");
    });

    it("accepts only Unix timestamps in whole seconds", async () => {
        const validAttempts = await Promise.all(
            [ "0", "253402300799" ].map((value) =>
                fetch(`${base}/api/v1/overview?since=${value}`, {
                    headers: { Authorization: CREDENTIALS },
                })
            )
        );
        for (const response of validAttempts) {
            assert.strictEqual(response.status, 200);
            await response.json();
        }

        const invalidValues = [
            "yesterday",
            "2026-09-05T00:00:00Z",
            "1.5",
            "1e3",
            "-1",
            "1788566400000",
            "253402300800",
        ];
        const attempts = await Promise.all(
            invalidValues.map(async (value) => {
                const response = await fetch(`${base}/api/v1/overview?since=${encodeURIComponent(value)}`, {
                    headers: { Authorization: CREDENTIALS },
                });
                return { value, response, body: await response.json() };
            })
        );

        for (const { value, response, body } of attempts) {
            assert.strictEqual(response.status, 400, `${value} was accepted`);
            assert.strictEqual(body.error.code, "invalid_request");
            assert.match(body.error.message, /whole seconds/);
        }
    });

    it("reports the status each monitor's own heartbeats support", async () => {
        const overview = (await get("/api/v1/overview")).data;

        for (const row of overview) {
            const latest = await R.getRow(
                "SELECT status, time FROM heartbeat WHERE monitor_id = ? ORDER BY time DESC LIMIT 1",
                [ row.id ]
            );

            assert.strictEqual(
                row.status,
                latest ? latest.status : null,
                `overview reports status ${row.status} for monitor ${row.id}, its newest heartbeat says ${latest?.status ?? "none"}`
            );
            assert.strictEqual(row.lastCheck, latest ? latest.time : null, `lastCheck disagrees for monitor ${row.id}`);
        }
    });

    it("dates each state from the transition into it", async () => {
        const overview = (await get("/api/v1/overview")).data;

        for (const row of overview) {
            const transition = await R.getRow(
                "SELECT time FROM heartbeat WHERE monitor_id = ? AND important = 1 ORDER BY time DESC LIMIT 1",
                [ row.id ]
            );

            assert.strictEqual(
                row.since,
                transition ? transition.time : null,
                `since disagrees with the last transition for monitor ${row.id}`
            );
        }
    });

    /*
     * The load-bearing one. Both endpoints decide independently which monitors
     * are in trouble, and the answer has to be the same both times.
     */
    it("lists as incidents exactly the active monitors the overview shows as down or pending", async () => {
        const overview = (await get("/api/v1/overview")).data;
        const incidents = (await get("/api/v1/incidents/active")).data;

        const expected = overview
            .filter((m) => m.active && (m.status === 0 || m.status === 2))
            .map((m) => m.id)
            .sort();

        assert.deepStrictEqual(
            incidents.map((i) => i.id).sort(),
            expected,
            "the two endpoints disagree about what is currently broken"
        );
    });

    it("describes an incident the same way the overview does", async () => {
        const overview = new Map((await get("/api/v1/overview")).data.map((m) => [ m.id, m ]));
        const incidents = (await get("/api/v1/incidents/active")).data;

        assert.ok(incidents.length > 0, "the fixture should produce incidents, or this proves nothing");

        for (const incident of incidents) {
            const row = overview.get(incident.id);
            assert.ok(row, `incident ${incident.id} is absent from the overview`);
            assert.strictEqual(incident.status, row.status, `status disagrees for monitor ${incident.id}`);
            assert.strictEqual(incident.lastCheck, row.lastCheck, `lastCheck disagrees for monitor ${incident.id}`);
            assert.strictEqual(incident.since, row.since, `since disagrees for monitor ${incident.id}`);
        }
    });

    it("excludes a paused monitor whose last known state was down", async () => {
        const incidents = (await get("/api/v1/incidents/active")).data;
        const overview = (await get("/api/v1/overview")).data;

        const paused = overview.find((m) => m.id === 4);
        assert.strictEqual(paused.active, false, "the fixture no longer describes a paused monitor");
        assert.strictEqual(paused.status, 0, "the fixture no longer describes a paused monitor that is down");
        assert.ok(
            !incidents.some((i) => i.id === 4),
            "a paused monitor was reported as an active incident; nothing is checking it"
        );
    });

    it("reports only transitions, and only inside the window it says it used", async () => {
        const body = await get("/api/v1/changes?hours=24");
        const cutoff = new Date(Date.now() - body.window.hours * 3600 * 1000);

        assert.ok(body.data.length > 0, "the fixture should produce changes, or this proves nothing");

        for (const change of body.data) {
            // Heartbeat times are stored without a zone, in local time.
            assert.ok(
                new Date(change.time) > cutoff,
                `a change at ${change.time} is older than the ${body.window.hours}h window`
            );

            const beat = await R.getRow(
                "SELECT important FROM heartbeat WHERE monitor_id = ? AND time = ? LIMIT 1",
                [ change.monitorID, change.time ]
            );
            assert.strictEqual(beat?.important, 1, `a change at ${change.time} is not a transition`);
        }
    });

    it("agrees with the overview about when the current state began", async () => {
        const overview = new Map((await get("/api/v1/overview")).data.map((m) => [ m.id, m ]));
        const changes = (await get("/api/v1/changes?hours=24")).data;

        // The newest change for a monitor inside the window is the transition
        // into its current state, which is exactly what `since` reports.
        const newest = new Map();
        for (const change of changes) {
            if (!newest.has(change.monitorID)) {
                newest.set(change.monitorID, change.time);
            }
        }

        assert.ok(newest.size > 0, "no monitor had a change in the window; the fixture proves nothing");

        for (const [ id, time ] of newest) {
            assert.strictEqual(
                overview.get(id).since,
                time,
                `changes and overview disagree about when monitor ${id} entered its current state`
            );
        }
    });
});
