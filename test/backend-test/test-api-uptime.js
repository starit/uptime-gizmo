const { describe, test } = require("node:test");
const assert = require("node:assert");
const { uptimePointToAPI, parseBoundedInteger, UPTIME_WINDOWS } = require("../../server/routers/v1-router").internals;

describe("uptimePointToAPI()", () => {
    test("reports the share of successful checks in a bucket", () => {
        const point = uptimePointToAPI({
            timestamp: 1756512000,
            up: 57,
            down: 3,
            avgPing: 42.5,
            minPing: 30,
            maxPing: 90,
        });

        assert.equal(point.uptime, 57 / 60);
        assert.equal(point.avgPing, 42.5);
        assert.equal(point.minPing, 30);
        assert.equal(point.maxPing, 90);
        assert.equal(point.maintenance, 0);
    });

    test("distinguishes a bucket nothing was checked in from an outage", () => {
        const unchecked = uptimePointToAPI({ timestamp: 1756512000 });
        const outage = uptimePointToAPI({ timestamp: 1756512060, up: 0, down: 6 });

        assert.equal(unchecked.uptime, null);
        assert.equal(outage.uptime, 0);
    });

    test("reports no ping for a bucket whose checks all failed", () => {
        const point = uptimePointToAPI({ timestamp: 1756512000, up: 0, down: 4 });

        assert.equal(point.avgPing, null);
        assert.equal(point.minPing, null);
        assert.equal(point.maxPing, null);
    });

    test("keeps maintenance separate from both success and failure", () => {
        const point = uptimePointToAPI({ timestamp: 1756512000, up: 10, down: 0, maintenance: 50 });

        assert.equal(point.maintenance, 50);
        assert.equal(point.uptime, 1);
    });
});

describe("uptime windows", () => {
    test("stays inside the resolution limits the calculator enforces", () => {
        for (const [ window, shape ] of Object.entries(UPTIME_WINDOWS)) {
            const limit = { minute: 1440, hour: 720, day: 365 }[shape.bucket];
            assert.ok(
                shape.count <= limit,
                `${window} asks for ${shape.count} ${shape.bucket} buckets, above the limit of ${limit}`
            );
        }
    });
});

describe("parseBoundedInteger()", () => {
    test("uses the fallback only when the parameter was absent", () => {
        assert.equal(parseBoundedInteger(undefined, 100, 1, 500), 100);
        assert.equal(parseBoundedInteger("", 100, 1, 500), null);
    });

    test("refuses a value that is not wholly a number", () => {
        assert.equal(parseBoundedInteger("12abc", 100, 1, 500), null);
        assert.equal(parseBoundedInteger("1e3", 100, 1, 500), null);
        assert.equal(parseBoundedInteger("-5", 100, 1, 500), null);
        assert.equal(parseBoundedInteger("1.5", 100, 1, 500), null);
    });

    test("refuses a value outside the range rather than clamping it", () => {
        assert.equal(parseBoundedInteger("0", 100, 1, 500), null);
        assert.equal(parseBoundedInteger("501", 100, 1, 500), null);
        assert.equal(parseBoundedInteger("500", 100, 1, 500), 500);
    });
});
