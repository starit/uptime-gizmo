const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { RedBeanNode } = require("redbean-node");

const migration = require("../../db/knex_migrations/2026-09-09-0000-web3-fallback-network");
const {
    assertWeb3NetworkSelection,
    formatWeb3ResultMessage,
    runWeb3NetworkOperation,
    internals,
} = require("../../server/monitor-types/web3-network");
const { canonicalizeConfigurationDocument } = require("../../server/configuration-backup/document");
const { RESOURCE_NAMES } = require("../../server/configuration-backup/registry");
const { internals: web3SocketInternals } = require("../../server/socket-handlers/web3-socket-handler");

const primary = {
    id: 1,
    user_id: 7,
    name: "Primary",
    chain_id: "1",
    rpc_url: "https://primary.example/v2/primary-secret",
    active: 1,
};
const fallback = {
    id: 2,
    user_id: 7,
    name: "Fallback",
    chain_id: "1",
    rpc_url: "https://fallback.example/v2/fallback-secret",
    active: 1,
};

/**
 * Build a monitor row for the fallback helper.
 * @param {object} overrides fields to replace
 * @returns {object} monitor row
 */
function monitor(overrides = {}) {
    return {
        web3_network_id: 1,
        web3_fallback_network_id: 2,
        timeout: 10,
        ...overrides,
    };
}

/**
 * Inject deterministic network lookup, chain probe, and clock behavior.
 * @param {object[]} networks available network rows
 * @returns {object} helper options
 */
function options(networks = [primary, fallback]) {
    const byID = new Map(networks.map((network) => [ network.id, network ]));
    return {
        findNetwork: async (id) => byID.get(Number(id)) ?? null,
        probeChainId: async (_url, _timeout) => "1",
        now: () => 1000,
    };
}

/**
 * Build a minimal configuration archive with a Web3 fallback relation.
 * @param {object} primaryNetwork primary network row
 * @param {object} fallbackNetwork fallback network row
 * @returns {object} configuration archive
 */
function archiveWithFallback(primaryNetwork = primary, fallbackNetwork = fallback) {
    const resources = Object.fromEntries(RESOURCE_NAMES.map((resource) => [ resource, [] ]));
    resources.settings = {};
    resources.web3Networks = [primaryNetwork, fallbackNetwork].map((network) => ({
        id: network.id,
        chain_id: network.chain_id,
        active: Boolean(network.active),
    }));
    resources.monitors = [{
        id: 10,
        web3_network_id: primaryNetwork.id,
        web3_fallback_network_id: fallbackNetwork.id,
    }];
    return {
        format: "uptime-gizmo-configuration",
        formatVersion: 1,
        appVersion: "3.0.0-beta.5-test",
        createdAt: "2026-09-09T00:00:00.000Z",
        scope: "configuration",
        resources,
    };
}

describe("Web3 fallback execution", () => {
    test("does not touch fallback after a successful primary read", async () => {
        const called = [];
        const result = await runWeb3NetworkOperation(
            monitor(),
            async (network) => {
                called.push(network.id);
                return "primary value";
            },
            options()
        );

        assert.deepStrictEqual(called, [1]);
        assert.strictEqual(result.value, "primary value");
        assert.strictEqual(result.usedFallback, false);
    });

    test("uses fallback after an RPC-layer failure and reports it without URL secrets", async () => {
        const called = [];
        const result = await runWeb3NetworkOperation(
            monitor(),
            async (network, timeout) => {
                called.push({ id: network.id, timeout: timeout() });
                if (network.id === 1) {
                    throw new Error(`request to ${network.rpc_url} failed`);
                }
                return "fallback value";
            },
            options()
        );
        const message = formatWeb3ResultMessage(result, "Balance 12");

        assert.deepStrictEqual(called.map((entry) => entry.id), [1, 2]);
        assert.strictEqual(called[0].timeout, 6000);
        assert.strictEqual(called[1].timeout, 10000);
        assert.strictEqual(result.value, "fallback value");
        assert.match(message, /used fallback Fallback \(fallback\.example\)/);
        assert.doesNotMatch(message, /primary-secret|fallback-secret/);
    });

    test("reports bounded reasons when both networks fail", async () => {
        await assert.rejects(
            runWeb3NetworkOperation(
                monitor(),
                async (network) => {
                    throw new Error(`${network.name} ${"x".repeat(300)}`);
                },
                options()
            ),
            (error) => {
                assert.match(error.message, /^Primary RPC failed: Primary/);
                assert.match(error.message, /fallback RPC failed: Fallback/);
                assert.ok(error.message.length < 450);
                return true;
            }
        );
    });

    test("leaves valid business results to the monitor without trying fallback", async () => {
        const called = [];
        const result = await runWeb3NetworkOperation(
            monitor(),
            async (network) => {
                called.push(network.id);
                return 5n;
            },
            options()
        );

        assert.throws(() => {
            if (result.value < 10n) {
                throw new Error("Balance is below the minimum");
            }
        }, /below the minimum/);
        assert.deepStrictEqual(called, [1]);
    });
});

describe("Web3 fallback configuration", () => {
    test("accepts a different active network on the same chain", async () => {
        const byID = new Map([primary, fallback].map((network) => [ network.id, network ]));
        await assert.doesNotReject(
            assertWeb3NetworkSelection(1, 2, 7, {
                findOwnedNetwork: async (id) => byID.get(Number(id)) ?? null,
            })
        );
    });

    test("rejects duplicate, disabled, foreign, and cross-chain fallbacks", async () => {
        const find = (networks) => {
            const byID = new Map(networks.map((network) => [ network.id, network ]));
            return async (id) => byID.get(Number(id)) ?? null;
        };

        await assert.rejects(
            assertWeb3NetworkSelection(1, 1, 7, { findOwnedNetwork: find([primary]) }),
            /must differ/
        );
        await assert.rejects(
            assertWeb3NetworkSelection(1, 2, 7, {
                findOwnedNetwork: find([primary, { ...fallback, active: 0 }]),
            }),
            /must be active/
        );
        await assert.rejects(
            assertWeb3NetworkSelection(1, 2, 7, { findOwnedNetwork: find([primary]) }),
            /must be a network you own/
        );
        await assert.rejects(
            assertWeb3NetworkSelection(1, 2, 7, {
                findOwnedNetwork: find([primary, { ...fallback, chain_id: "8453" }]),
            }),
            /same chain ID/
        );
        await assert.rejects(
            assertWeb3NetworkSelection(1, 0, 7, { findOwnedNetwork: find([primary]) }),
            /positive integer/
        );
    });

    test("configuration Backup accepts old rows and validates fallback relations", () => {
        const valid = archiveWithFallback();
        assert.strictEqual(
            canonicalizeConfigurationDocument(valid).resources.monitors[0].web3_fallback_network_id,
            2
        );

        const old = archiveWithFallback();
        delete old.resources.monitors[0].web3_fallback_network_id;
        assert.ok(!("web3_fallback_network_id" in canonicalizeConfigurationDocument(old).resources.monitors[0]));

        const duplicate = archiveWithFallback(primary, { ...fallback, id: 1 });
        duplicate.resources.web3Networks = [duplicate.resources.web3Networks[0]];
        assert.throws(() => canonicalizeConfigurationDocument(duplicate), /must differ/);

        assert.throws(
            () => canonicalizeConfigurationDocument(archiveWithFallback(primary, { ...fallback, active: 0 })),
            /must refer to an active network/
        );
        assert.throws(
            () => canonicalizeConfigurationDocument(archiveWithFallback(primary, { ...fallback, chain_id: "8453" })),
            /must use the primary network's chain ID/
        );
    });

    test("migration preserves rows and adds a nullable foreign key", async () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "uptime-gizmo-web3-fallback-"));
        const filename = path.join(directory, "kuma.db");
        const Dialect = require("knex/lib/dialects/sqlite3/index.js");
        Dialect.prototype._driver = () => require("@louislam/sqlite3");
        const db = require("knex")({
            client: Dialect,
            connection: { filename },
            useNullAsDefault: true,
        });

        try {
            await db.raw("PRAGMA foreign_keys = ON");
            await db.schema.createTable("web3_network", (table) => {
                table.increments("id");
                table.string("chain_id");
                table.boolean("active");
            });
            await db.schema.createTable("monitor", (table) => {
                table.increments("id");
                table.string("name").notNullable();
                table.integer("web3_network_id").references("id").inTable("web3_network").onDelete("SET NULL");
            });
            await db("web3_network").insert([
                { id: 1, chain_id: "1", active: 1 },
                { id: 2, chain_id: "1", active: 1 },
                { id: 3, chain_id: "1", active: 1 },
                { id: 4, chain_id: "8453", active: 1 },
            ]);
            await db("monitor").insert([
                { id: 1, name: "existing", web3_network_id: 1 },
                { id: 2, name: "cross-chain fallback", web3_network_id: 3 },
            ]);

            await migration.up(db);
            const row = await db("monitor").where({ id: 1 }).first();
            assert.strictEqual(row.name, "existing");
            assert.strictEqual(row.web3_fallback_network_id, null);

            await db("monitor").where({ id: 1 }).update({ web3_fallback_network_id: 2 });
            await db("monitor").where({ id: 2 }).update({ web3_fallback_network_id: 4 });

            const redbean = new RedBeanNode();
            redbean.setup(db);
            redbean.freeze(true);
            const promoted = await web3SocketInternals.deleteNetworkAndReassign(
                redbean,
                await redbean.load("web3_network", 1)
            );
            assert.deepStrictEqual(promoted, {
                affectedMonitors: 1,
                affectedPrimaryMonitors: 0,
                affectedFallbackMonitors: 0,
                promotedMonitors: 1,
            });
            assert.strictEqual((await db("monitor").where({ id: 1 }).first()).web3_network_id, 2);
            assert.strictEqual((await db("monitor").where({ id: 1 }).first()).web3_fallback_network_id, null);

            const refused = await web3SocketInternals.deleteNetworkAndReassign(
                redbean,
                await redbean.load("web3_network", 3)
            );
            assert.strictEqual(refused.promotedMonitors, 0);
            assert.strictEqual(refused.affectedPrimaryMonitors, 1);
            assert.strictEqual((await db("monitor").where({ id: 2 }).first()).web3_network_id, null);
            assert.strictEqual((await db("monitor").where({ id: 2 }).first()).web3_fallback_network_id, null);

            await db("web3_network").where({ id: 2 }).delete();
            assert.strictEqual((await db("monitor").where({ id: 1 }).first()).web3_network_id, null);
        } finally {
            await db.destroy();
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });
});

describe("Web3 fallback diagnostics", () => {
    test("redacts URL paths and enforces timeout exhaustion", () => {
        assert.strictEqual(
            internals.describeFailure(new Error("failed https://user:pass@rpc.example/v2/key?token=secret")),
            "failed https://rpc.example/…"
        );
        assert.throws(() => internals.remainingTimeout(1000, () => 1000), /budget was exhausted/);
    });
});
