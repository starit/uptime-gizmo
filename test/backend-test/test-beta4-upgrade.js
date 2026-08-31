const { describe, test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const migration = require("../../db/knex_migrations/2026-08-29-0100-monitor-external-ref");

/**
 * Open the SQLite driver the same way production does.
 * @param {string} filename Database path
 * @returns {import("knex").Knex} Knex connection
 */
function sqlite(filename) {
    const Dialect = require("knex/lib/dialects/sqlite3/index.js");
    Dialect.prototype._driver = () => require("@louislam/sqlite3");
    return require("knex")({
        client: Dialect,
        connection: { filename },
        useNullAsDefault: true,
    });
}

describe("beta.4 externalRef upgrade", () => {
    test("keeps every existing monitor and scopes non-null references by user", async () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "uptime-gizmo-beta4-"));
        const db = sqlite(path.join(directory, "kuma.db"));

        try {
            await db.schema.createTable("monitor", (table) => {
                table.increments("id");
                table.integer("user_id").notNullable();
                table.string("name").notNullable();
            });
            await db("monitor").insert([
                { user_id: 1, name: "first existing monitor" },
                { user_id: 1, name: "second existing monitor" },
                { user_id: 2, name: "another user's monitor" },
            ]);

            await migration.up(db);

            const existing = await db("monitor").orderBy("id");
            assert.deepStrictEqual(existing.map((row) => row.name), [
                "first existing monitor",
                "second existing monitor",
                "another user's monitor",
            ]);
            assert.ok(existing.every((row) => row.external_ref === null));

            await db("monitor").where({ id: 1 }).update({ external_ref: "controller:first" });
            await db("monitor").where({ id: 3 }).update({ external_ref: "controller:first" });
            await assert.rejects(
                db("monitor").where({ id: 2 }).update({ external_ref: "controller:first" }),
                /unique/i
            );
        } finally {
            await db.destroy();
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });

    test("uses a filtered index on SQL Server so legacy NULL rows are allowed", async () => {
        const statements = [];
        const table = {
            string: () => ({ nullable() {} }),
            dropColumn() {},
        };
        const knex = {
            client: { dialect: "mssql" },
            schema: {
                async alterTable(name, change) {
                    assert.strictEqual(name, "monitor");
                    change(table);
                },
            },
            async raw(sql) {
                statements.push(sql.replace(/\s+/g, " ").trim());
            },
        };

        await migration.up(knex);
        assert.deepStrictEqual(statements, [
            "CREATE UNIQUE INDEX monitor_user_external_ref_unique ON monitor (user_id, external_ref) WHERE external_ref IS NOT NULL",
        ]);
    });
});
