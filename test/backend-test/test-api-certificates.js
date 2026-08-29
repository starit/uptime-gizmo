const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");
const { R } = require("redbean-node");
const { readCertificates } = require("../../server/routers/v1-router").internals;

/**
 * Stand in for the database so this exercises the reading and shaping of
 * certificate rows without needing a live one.
 * @param {object[]} rows Rows the query should return
 * @returns {Function} The previous R.getAll, to restore afterwards
 */
function stubGetAll(rows) {
    const previous = R.getAll;
    R.getAll = async () => rows;
    return previous;
}

describe("readCertificates()", () => {
    let restore = null;

    beforeEach(() => {
        restore = null;
    });

    afterEach(() => {
        if (restore) {
            R.getAll = restore;
        }
    });

    test("returns the validity and expiry a TLS check recorded", async () => {
        restore = stubGetAll([
            {
                monitor_id: 4,
                info_json: JSON.stringify({
                    valid: true,
                    certInfo: {
                        validTo: "2026-11-02T08:39:54.000Z",
                        subject: { CN: "www.example.com" },
                    },
                }),
            },
        ]);

        const certificates = await readCertificates([ 4 ]);

        assert.deepEqual(certificates.get(4), {
            certValid: true,
            certExpiresAt: "2026-11-02T08:39:54.000Z",
        });
    });

    test("reports an untrusted certificate as invalid rather than absent", async () => {
        restore = stubGetAll([
            {
                monitor_id: 7,
                info_json: JSON.stringify({
                    valid: false,
                    certInfo: { validTo: "2020-01-01T00:00:00.000Z" },
                }),
            },
        ]);

        assert.deepEqual(await readCertificates([ 7 ]).then((c) => c.get(7)), {
            certValid: false,
            certExpiresAt: "2020-01-01T00:00:00.000Z",
        });
    });

    test("returns nothing for a monitor that has no certificate", async () => {
        restore = stubGetAll([]);

        const certificates = await readCertificates([ 1, 2 ]);

        assert.equal(certificates.size, 0);
        assert.equal(certificates.get(1), undefined);
    });

    test("skips a row it cannot read instead of failing every monitor", async () => {
        restore = stubGetAll([
            { monitor_id: 1, info_json: "{ this is not json" },
            { monitor_id: 2, info_json: null },
            { monitor_id: 3, info_json: JSON.stringify("a string, not an object") },
            {
                monitor_id: 4,
                info_json: JSON.stringify({ valid: true, certInfo: { validTo: "2026-11-02T08:39:54.000Z" } }),
            },
        ]);

        const certificates = await readCertificates([ 1, 2, 3, 4 ]);

        assert.equal(certificates.has(1), false);
        assert.equal(certificates.has(2), false);
        assert.equal(certificates.has(3), false);
        assert.equal(
            certificates.get(4).certExpiresAt,
            "2026-11-02T08:39:54.000Z",
            "a readable row is still reported alongside unreadable ones"
        );
    });

    test("tolerates a record that has no certificate detail", async () => {
        restore = stubGetAll([
            { monitor_id: 5, info_json: JSON.stringify({ valid: false }) },
        ]);

        assert.deepEqual(await readCertificates([ 5 ]).then((c) => c.get(5)), {
            certValid: false,
            certExpiresAt: null,
        });
    });

    test("does not query when there are no monitors to look up", async () => {
        let queried = false;
        restore = R.getAll;
        R.getAll = async () => {
            queried = true;
            return [];
        };

        const certificates = await readCertificates([]);

        assert.equal(queried, false);
        assert.equal(certificates.size, 0);
    });
});
