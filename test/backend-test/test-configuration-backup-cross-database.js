const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { GenericContainer, Wait } = require("testcontainers");
const { MySqlContainer } = require("@testcontainers/mysql");
const { R } = require("redbean-node");

const { createConfigurationDocument } = require("../../server/configuration-backup/document");
const { TABLE_REGISTRY } = require("../../server/configuration-backup/registry");
const { replaceConfiguration } = require("../../server/configuration-backup/service");

/**
 * Open a production-compatible SQLite connection.
 * @param {string} filename database filename
 * @returns {import("knex").Knex} connection
 */
function sqlite(filename) {
    const Dialect = require("knex/lib/dialects/sqlite3/index.js");
    Dialect.prototype._driver = () => require("@louislam/sqlite3");
    return require("knex")({
        client: Dialect,
        connection: { filename },
        useNullAsDefault: true,
        pool: { min: 1, max: 1 },
    });
}

/**
 * Use mysql2 with production's no-timezone-conversion behaviour.
 * @param {object} connection connection fields
 * @returns {import("knex").Knex} connection
 */
function mysql(connection) {
    return require("knex")({
        client: "mysql2",
        connection: {
            ...connection,
            timezone: "Z",
            typeCast(field, next) {
                if (field.type === "DATETIME") {
                    return field.string();
                }
                return next();
            },
        },
        pool: { min: 0, max: 5 },
    });
}

/**
 * Initialize the complete current application schema.
 * @param {import("knex").Knex} db connection
 * @returns {Promise<void>} nothing
 */
async function initialize(db) {
    R.setup(db);
    await require("../../db/knex_init_db").createTables();
    await db.migrate.latest({ directory: path.join(__dirname, "../../db/knex_migrations") });
}

/**
 * Add an identity that must never come from an archive.
 * @param {import("knex").Knex} db connection
 * @param {string} username username
 * @param {string} password password sentinel
 * @returns {Promise<void>} nothing
 */
async function insertIdentity(db, username, password) {
    await db("user").insert({
        id: 1,
        username,
        password,
        active: 1,
        timezone: "UTC",
        twofa_secret: `${username}-twofa`,
        twofa_status: 1,
        twofa_last_token: null,
        admin: 1,
    });
    await db("setting").insert({ key: "instanceOwnerId", value: "1", type: null });
}

/**
 * Return application table names for a MySQL-family connection.
 * @param {import("knex").Knex} db connection
 * @returns {Promise<string[]>} table names
 */
async function mysqlTableNames(db) {
    const rows = await db("information_schema.tables")
        .select("table_name")
        .whereRaw("table_schema = DATABASE()")
        .where({ table_type: "BASE TABLE" });
    return rows.map((row) => row.TABLE_NAME ?? row.table_name).sort();
}

describe("configuration archive across database engines", () => {
    test(
        "moves the same canonical configuration from SQLite to MariaDB and MySQL",
        { skip: !!process.env.CI && (process.platform !== "linux" || process.arch !== "x64") },
        async () => {
            const directory = fs.mkdtempSync(path.join(os.tmpdir(), "uptime-gizmo-config-cross-db-"));
            const source = sqlite(path.join(directory, "source.db"));
            let mariadbContainer;
            let mysqlContainer;
            let mariadb;
            let mysql8;

            try {
                [mariadbContainer, mysqlContainer] = await Promise.all([
                    new GenericContainer("mariadb:12")
                        .withEnvironment({
                            MYSQL_ROOT_PASSWORD: "root",
                            MYSQL_DATABASE: "kuma_test",
                            MYSQL_USER: "kuma",
                            MYSQL_PASSWORD: "kuma",
                        })
                        .withExposedPorts(3306)
                        .withWaitStrategy(Wait.forLogMessage("ready for connections", 2))
                        .withStartupTimeout(120000)
                        .start(),
                    new MySqlContainer("mysql:8.0").withStartupTimeout(120000).start(),
                ]);

                mariadb = mysql({
                    host: mariadbContainer.getHost(),
                    port: mariadbContainer.getMappedPort(3306),
                    user: "kuma",
                    password: "kuma",
                    database: "kuma_test",
                });
                mysql8 = mysql({
                    host: mysqlContainer.getHost(),
                    port: mysqlContainer.getPort(),
                    user: mysqlContainer.getUsername(),
                    password: mysqlContainer.getUserPassword(),
                    database: mysqlContainer.getDatabase(),
                });

                await initialize(source);
                await initialize(mariadb);
                await initialize(mysql8);

                for (const db of [mariadb, mysql8]) {
                    const actualTables = await mysqlTableNames(db);
                    assert.deepStrictEqual(
                        actualTables.filter((table) => !TABLE_REGISTRY[table]),
                        [],
                        "every MariaDB/MySQL table must be classified"
                    );
                    for (const [table, entry] of Object.entries(TABLE_REGISTRY)) {
                        if (entry.category === "configuration") {
                            assert.deepStrictEqual(
                                Object.keys(await db(table).columnInfo()).sort(),
                                [...entry.columns].sort(),
                                `${table} columns must be registered on every engine`
                            );
                        }
                    }
                }

                await insertIdentity(source, "source-admin", "source-password-hash");
                await source("setting").insert({
                    key: "serverTimezone",
                    value: '"Asia/Shanghai"',
                    type: "general",
                });
                await source("monitor").insert({
                    id: 17,
                    name: "cross-engine monitor",
                    active: 1,
                    user_id: 1,
                    type: "http",
                    url: "https://example.com/health",
                    created_date: "2026-09-04 00:00:00",
                    basic_auth_pass: "portable-monitor-secret",
                });
                await source("tag").insert({
                    id: 23,
                    name: "production",
                    color: "#2F9E68",
                    created_date: "2026-09-04 00:00:00",
                });
                await source("monitor_tag").insert({ id: 29, monitor_id: 17, tag_id: 23, value: "api" });
                const document = await createConfigurationDocument(source, "sqlite-source");

                for (const [db, engine] of [
                    [mariadb, "mariadb"],
                    [mysql8, "mysql"],
                ]) {
                    await insertIdentity(db, `${engine}-admin`, `${engine}-password-hash`);
                    await db("setting").insert([
                        { key: "jwtSecret", value: `"${engine}-jwt"`, type: null },
                        { key: "trustProxy", value: "true", type: "general" },
                    ]);
                    await db("api_key").insert({
                        key: `${engine}-personal-api-key`,
                        name: engine,
                        user_id: 1,
                        active: 1,
                    });

                    await replaceConfiguration(db, document);

                    const roundTrip = await createConfigurationDocument(db, `${engine}-target`);
                    assert.deepStrictEqual(roundTrip.resources, document.resources);
                    assert.strictEqual((await db("user").first()).password, `${engine}-password-hash`);
                    assert.strictEqual((await db("user").first()).twofa_secret, `${engine}-admin-twofa`);
                    assert.strictEqual((await db("user").first()).admin, 1);
                    assert.strictEqual((await db("api_key").first()).key, `${engine}-personal-api-key`);
                    assert.strictEqual(
                        (await db("setting").where({ key: "jwtSecret" }).first()).value,
                        `"${engine}-jwt"`
                    );
                    assert.strictEqual((await db("setting").where({ key: "trustProxy" }).first()).value, "true");
                }

                await mysql8("monitor").where({ id: 17 }).update({ name: "configuration exported by MySQL" });
                const mysqlDocument = await createConfigurationDocument(mysql8, "mysql-source");
                await replaceConfiguration(source, mysqlDocument);
                assert.deepStrictEqual(
                    (await createConfigurationDocument(source, "sqlite-target")).resources,
                    mysqlDocument.resources,
                    "a MySQL export must import back into SQLite"
                );
                assert.strictEqual((await source("user").first()).password, "source-password-hash");
            } finally {
                await Promise.allSettled([source.destroy(), mariadb?.destroy(), mysql8?.destroy()]);
                await Promise.allSettled([mariadbContainer?.stop(), mysqlContainer?.stop()]);
                fs.rmSync(directory, { recursive: true, force: true });
            }
        }
    );
});
