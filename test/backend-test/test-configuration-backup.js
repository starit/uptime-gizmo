const { after, before, describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Readable } = require("stream");
const { R } = require("redbean-node");

const {
    canonicalizeConfigurationDocument,
    createConfigurationDocument,
    parseConfigurationDocument,
    serializeConfigurationDocument,
} = require("../../server/configuration-backup/document");
const { RESOURCE_NAMES, SETTING_REGISTRY, TABLE_REGISTRY } = require("../../server/configuration-backup/registry");
const {
    applyPendingConfigurationImport,
    getConfigurationImportStatus,
    replaceConfiguration,
    stageConfigurationImport,
} = require("../../server/configuration-backup/service");
const {
    consumeTransferTicket,
    issueTransferTicket,
    readBoundedBody,
} = require("../../server/configuration-backup/transfer");

let directory;

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
 * Build the current schema with the same initializer and migrations as startup.
 * @param {string} name database stem
 * @returns {Promise<import("knex").Knex>} ready connection
 */
async function freshDatabase(name) {
    const db = sqlite(path.join(directory, `${name}.db`));
    R.setup(db);
    await require("../../db/knex_init_db").createTables();
    await db.migrate.latest({ directory: path.join(__dirname, "../../db/knex_migrations") });
    return db;
}

/**
 * Construct an empty valid v1 document.
 * @returns {object} document
 */
function emptyDocument() {
    const resources = Object.fromEntries(RESOURCE_NAMES.map((resource) => [resource, []]));
    resources.settings = {};
    return {
        format: "uptime-gizmo-configuration",
        formatVersion: 1,
        appVersion: "3.0.0-beta.5-test",
        createdAt: "2026-09-04T00:00:00.000Z",
        scope: "configuration",
        resources,
    };
}

/**
 * Insert one user without routing through the shared RedBean connection.
 * @param {import("knex").Knex} db connection
 * @param {object} user user fields
 * @returns {Promise<void>} nothing
 */
async function insertUser(db, user) {
    await db("user").insert({
        username: user.username,
        password: user.password,
        active: 1,
        timezone: "UTC",
        twofa_secret: user.twofaSecret ?? null,
        twofa_status: user.twofaSecret ? 1 : 0,
        twofa_last_token: null,
        admin: user.admin ? 1 : 0,
    });
}

before(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "uptime-gizmo-config-backup-"));
});

after(() => {
    fs.rmSync(directory, { recursive: true, force: true });
});

describe("configuration archive registry", () => {
    test("classifies every current table and every configuration column", async () => {
        const db = await freshDatabase("schema-coverage");
        try {
            const rows = await db.raw("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
            const actualTables = rows.map((row) => row.name);
            const requiredRegistryTables = Object.entries(TABLE_REGISTRY)
                .filter(([, entry]) => !entry.optional)
                .map(([table]) => table)
                .sort();

            assert.deepStrictEqual(
                actualTables.filter((table) => !TABLE_REGISTRY[table]?.optional).sort(),
                requiredRegistryTables
            );
            assert.deepStrictEqual(
                actualTables.filter((table) => !TABLE_REGISTRY[table]),
                [],
                "new database tables must be classified before release"
            );

            for (const [table, entry] of Object.entries(TABLE_REGISTRY)) {
                if (entry.category !== "configuration") {
                    continue;
                }
                assert.deepStrictEqual(
                    Object.keys(await db(table).columnInfo()).sort(),
                    [...entry.columns].sort(),
                    `${table} columns must be explicitly registered`
                );
            }
        } finally {
            await db.destroy();
        }
    });

    test("classifies every statically named server setting", () => {
        const roots = [path.join(__dirname, "../../server"), path.join(__dirname, "../../extra")];
        const sourceFiles = [];
        const visit = (target) => {
            for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
                const filename = path.join(target, entry.name);
                if (entry.isDirectory()) {
                    visit(filename);
                } else if (/\.(?:js|mjs)$/.test(entry.name)) {
                    sourceFiles.push(filename);
                }
            }
        };
        roots.forEach(visit);

        const discovered = new Set();
        const pattern = /(?:Settings\.(?:get|set)|setting|setSetting)\(\s*["']([^"']+)["']/g;
        for (const filename of sourceFiles) {
            const source = fs.readFileSync(filename, "utf8");
            for (const match of source.matchAll(pattern)) {
                discovered.add(match[1]);
            }
        }

        assert.deepStrictEqual(
            [...discovered].filter((key) => !SETTING_REGISTRY[key]).sort(),
            [],
            "new settings must be classified before release"
        );
    });
});

describe("configuration archive document", () => {
    test("exports configuration and operational secrets but no identity or history", async () => {
        const db = await freshDatabase("export-scope");
        try {
            await insertUser(db, {
                username: "source-admin",
                password: "USER-PASSWORD-HASH-SENTINEL",
                twofaSecret: "TWO-FA-SENTINEL",
                admin: true,
            });
            await db("setting").insert([
                { key: "instanceOwnerId", value: "1", type: null },
                { key: "jwtSecret", value: '"JWT-SENTINEL"', type: null },
                { key: "serverTimezone", value: '"Asia/Shanghai"', type: "general" },
                { key: "trustProxy", value: "true", type: "general" },
            ]);
            await db("api_key").insert({
                key: "PERSONAL-API-KEY-SENTINEL",
                name: "personal",
                user_id: 1,
                active: 1,
            });
            await db("notification").insert({
                id: 7,
                name: "webhook",
                active: 1,
                user_id: 1,
                is_default: 0,
                config: '{"token":"NOTIFICATION-TOKEN-SENTINEL"}',
            });
            await db("monitor").insert({
                id: 11,
                name: "portable monitor",
                active: 1,
                user_id: 1,
                type: "http",
                url: "https://example.com",
                basic_auth_pass: "MONITOR-PASSWORD-SENTINEL",
            });
            await db("heartbeat").insert({
                monitor_id: 11,
                status: 1,
                msg: "HEARTBEAT-SENTINEL",
                time: "2026-09-04 00:00:00",
            });
            await db("status_page").insert({
                id: 13,
                slug: "service",
                title: "Service status",
                icon: "/icon.svg",
                theme: "auto",
            });
            await db("incident").insert([
                {
                    id: 17,
                    title: "Current incident",
                    content: "ACTIVE-INCIDENT-SENTINEL",
                    status_page_id: 13,
                    active: 1,
                },
                {
                    id: 18,
                    title: "Resolved incident",
                    content: "RESOLVED-INCIDENT-SENTINEL",
                    status_page_id: 13,
                    active: 0,
                },
            ]);

            const document = await createConfigurationDocument(db, "3.0.0-beta.5-test");
            const text = serializeConfigurationDocument(document).toString("utf8");

            assert.strictEqual(document.resources.monitors[0].active, true);
            assert.strictEqual(document.resources.settings.serverTimezone, "Asia/Shanghai");
            assert.match(text, /MONITOR-PASSWORD-SENTINEL/);
            assert.match(text, /NOTIFICATION-TOKEN-SENTINEL/);
            assert.match(text, /ACTIVE-INCIDENT-SENTINEL/);
            assert.doesNotMatch(text, /RESOLVED-INCIDENT-SENTINEL/);
            assert.doesNotMatch(text, /USER-PASSWORD-HASH-SENTINEL/);
            assert.doesNotMatch(text, /TWO-FA-SENTINEL/);
            assert.doesNotMatch(text, /PERSONAL-API-KEY-SENTINEL/);
            assert.doesNotMatch(text, /JWT-SENTINEL/);
            assert.doesNotMatch(text, /HEARTBEAT-SENTINEL/);
            assert.strictEqual(document.resources.settings.trustProxy, undefined);
        } finally {
            await db.destroy();
        }
    });

    test("rejects unknown fields, duplicate ids, broken relations, and excessive nesting", () => {
        const unknown = emptyDocument();
        unknown.resources.monitors.push({ id: 1, future_secret: "no" });
        assert.throws(() => canonicalizeConfigurationDocument(unknown), /future_secret is not supported/);

        const duplicate = emptyDocument();
        duplicate.resources.tags.push({ id: 1 }, { id: 1 });
        assert.throws(() => canonicalizeConfigurationDocument(duplicate), /id is duplicated/);

        const broken = emptyDocument();
        broken.resources.monitorTags.push({ id: 1, monitor_id: 10, tag_id: 20 });
        assert.throws(() => canonicalizeConfigurationDocument(broken), /missing monitors row/);

        const nested = emptyDocument();
        let value = {};
        nested.resources.settings.customThemes = value;
        for (let index = 0; index < 25; index++) {
            value.child = {};
            value = value.child;
        }
        assert.throws(() => canonicalizeConfigurationDocument(nested), /nested too deeply/);
    });

    test("rejects invalid JSON and unknown archive versions", () => {
        assert.throws(() => parseConfigurationDocument(Buffer.from("not-json")), /not valid JSON/);
        assert.throws(() => parseConfigurationDocument(Buffer.from([0xc3, 0x28])), /not valid UTF-8/);
        const document = emptyDocument();
        document.formatVersion = 99;
        assert.throws(
            () => parseConfigurationDocument(Buffer.from(JSON.stringify(document))),
            /Unsupported configuration archive version/
        );
    });

    test("enforces configured byte limits while parsing and serializing", () => {
        assert.throws(
            () => parseConfigurationDocument(Buffer.from(JSON.stringify(emptyDocument())), 10),
            /exceeds the configured size limit/
        );
        assert.throws(() => serializeConfigurationDocument(emptyDocument(), 10), /exceeds the configured size limit/);
    });

    test("rejects prototype-pollution keys nested inside portable settings", () => {
        const document = emptyDocument();
        document.resources.settings.customThemes = JSON.parse('{"__proto__":{"polluted":true}}');

        assert.throws(() => canonicalizeConfigurationDocument(document), /__proto__ is not allowed/);
        assert.strictEqual({}.polluted, undefined);
    });
});

describe("configuration import upload reader", () => {
    test("rejects compression, malformed lengths, and streamed bodies over the limit", async () => {
        const compressed = Readable.from([Buffer.from("data")]);
        compressed.headers = { "content-encoding": "gzip" };
        await assert.rejects(readBoundedBody(compressed, 10), /Compressed configuration uploads are not accepted/);

        const malformedLength = Readable.from([Buffer.from("data")]);
        malformedLength.headers = { "content-length": "4x" };
        await assert.rejects(readBoundedBody(malformedLength, 10), /invalid content length/);

        const oversized = Readable.from([Buffer.from("123456"), Buffer.from("78901")]);
        oversized.headers = {};
        await assert.rejects(readBoundedBody(oversized, 10), /exceeds the configured size limit/);
    });
});

describe("configuration transfer tickets", () => {
    test("are random, purpose-bound, and single-use", () => {
        const first = issueTransferTicket("export", 1).ticket;
        const second = issueTransferTicket("export", 1).ticket;
        assert.notStrictEqual(first, second);
        assert.strictEqual(consumeTransferTicket(first, "export").loginUserID, 1);
        assert.throws(() => consumeTransferTicket(first, "export"), /invalid or expired/);

        const importTicket = issueTransferTicket("import", 1).ticket;
        assert.throws(() => consumeTransferTicket(importTicket, "export"), /invalid or expired/);
        assert.throws(() => consumeTransferTicket(importTicket, "import"), /invalid or expired/);
    });
});

describe("configuration replace import", () => {
    test("stages without writes, then replaces configuration on startup while preserving identity", async () => {
        const source = await freshDatabase("source");
        const target = await freshDatabase("target");
        const dataDir = path.join(directory, "target-data");
        fs.mkdirSync(dataDir);

        try {
            await insertUser(source, { username: "source", password: "source-hash", admin: true });
            await source("setting").insert([
                { key: "instanceOwnerId", value: "1", type: null },
                { key: "serverTimezone", value: '"Asia/Shanghai"', type: "general" },
            ]);
            await source("monitor").insert({
                id: 41,
                name: "imported monitor",
                active: 1,
                user_id: 1,
                type: "http",
                url: "https://imported.example",
            });
            await source("status_page").insert({
                id: 43,
                slug: "imported-status",
                title: "Imported status",
                description: "Status page description",
                icon: "/icon.svg",
                theme: "auto",
                published: 1,
                search_engine_index: 0,
                show_tags: 1,
                password: "STATUS-PAGE-PASSWORD",
                footer_text: "Status page footer",
                custom_css: ".status-page { color: #123456; }",
                show_powered_by: 0,
                show_certificate_expiry: 1,
                auto_refresh_interval: 120,
                show_only_last_heartbeat: 1,
                rss_title: "Imported status feed",
                icon_size: "lg",
                icon_position: "top",
                title_size: "lg",
                title_font: "serif",
                text_size: "lg",
            });
            await source("group").insert({
                id: 53,
                name: "Public services",
                public: 1,
                active: 1,
                weight: 10,
                status_page_id: 43,
            });
            await source("monitor_group").insert({
                id: 59,
                monitor_id: 41,
                group_id: 53,
                weight: 20,
                send_url: 1,
                custom_url: "https://status.example.com/service",
            });
            await source("maintenance").insert({
                id: 61,
                title: "Status maintenance",
                description: "Planned work",
                user_id: 1,
                active: 1,
                strategy: "manual",
            });
            await source("maintenance_status_page").insert({
                id: 67,
                status_page_id: 43,
                maintenance_id: 61,
            });
            await source("status_page_cname").insert({
                id: 71,
                status_page_id: 43,
                domain: "status.example.com",
            });
            await source("incident").insert({
                id: 47,
                title: "Imported active incident",
                content: "Still investigating",
                status_page_id: 43,
                active: 1,
            });
            const archive = serializeConfigurationDocument(
                await createConfigurationDocument(source, "3.0.0-beta.5-source")
            );

            await insertUser(target, { username: "first", password: "first-hash", admin: false });
            await insertUser(target, {
                username: "target-admin",
                password: "TARGET-PASSWORD-HASH",
                twofaSecret: "TARGET-TWO-FA",
                admin: true,
            });
            await target("setting").insert([
                { key: "instanceOwnerId", value: '"2"', type: null },
                { key: "jwtSecret", value: '"TARGET-JWT"', type: null },
                { key: "trustProxy", value: "true", type: "general" },
                { key: "disableAuth", value: "false", type: "general" },
                { key: "apiKeysEnabled", value: "true", type: "general" },
                { key: "serverTimezone", value: '"UTC"', type: "general" },
            ]);
            await target("api_key").insert({ key: "TARGET-API-KEY", name: "target", user_id: 2, active: 1 });
            await target("monitor").insert({
                id: 3,
                name: "old target monitor",
                active: 1,
                user_id: 2,
                type: "http",
            });
            await target("heartbeat").insert({
                monitor_id: 3,
                status: 1,
                msg: "old target history",
                time: "2026-09-04 00:00:00",
            });

            await stageConfigurationImport(dataDir, archive);
            assert.strictEqual((await target("monitor").first()).name, "old target monitor");
            assert.strictEqual((await getConfigurationImportStatus(dataDir)).state, "pending");

            const status = await applyPendingConfigurationImport(dataDir, target);
            assert.strictEqual(status.state, "applied");
            assert.deepStrictEqual(await target("monitor").select("id", "name", "user_id"), [
                { id: 41, name: "imported monitor", user_id: 2 },
            ]);
            assert.strictEqual(
                await target("heartbeat")
                    .count({ count: "*" })
                    .first()
                    .then((row) => row.count),
                0
            );
            assert.strictEqual((await target("user").where({ id: 2 }).first()).password, "TARGET-PASSWORD-HASH");
            assert.strictEqual((await target("user").where({ id: 2 }).first()).twofa_secret, "TARGET-TWO-FA");
            assert.strictEqual((await target("api_key").first()).key, "TARGET-API-KEY");
            assert.strictEqual((await target("user").where({ id: 2 }).first()).admin, 1);
            assert.strictEqual((await target("setting").where({ key: "jwtSecret" }).first()).value, '"TARGET-JWT"');
            assert.strictEqual((await target("setting").where({ key: "trustProxy" }).first()).value, "true");
            assert.strictEqual((await target("setting").where({ key: "disableAuth" }).first()).value, "false");
            assert.strictEqual((await target("setting").where({ key: "apiKeysEnabled" }).first()).value, "true");
            assert.strictEqual(
                (await target("setting").where({ key: "serverTimezone" }).first()).value,
                '"Asia/Shanghai"'
            );
            assert.deepStrictEqual(await target("incident").select("id", "title", "active", "status_page_id"), [
                {
                    id: 47,
                    title: "Imported active incident",
                    active: 1,
                    status_page_id: 43,
                },
            ]);
            assert.deepStrictEqual(
                await target("status_page").select(
                    "id",
                    "slug",
                    "password",
                    "custom_css",
                    "show_tags",
                    "show_certificate_expiry",
                    "show_only_last_heartbeat",
                    "icon_size",
                    "icon_position",
                    "title_size",
                    "title_font",
                    "text_size"
                ),
                [
                    {
                        id: 43,
                        slug: "imported-status",
                        password: "STATUS-PAGE-PASSWORD",
                        custom_css: ".status-page { color: #123456; }",
                        show_tags: 1,
                        show_certificate_expiry: 1,
                        show_only_last_heartbeat: 1,
                        icon_size: "lg",
                        icon_position: "top",
                        title_size: "lg",
                        title_font: "serif",
                        text_size: "lg",
                    },
                ]
            );
            assert.deepStrictEqual(await target("group").select("id", "status_page_id", "name", "weight"), [
                { id: 53, status_page_id: 43, name: "Public services", weight: 10 },
            ]);
            assert.deepStrictEqual(
                await target("monitor_group").select(
                    "id",
                    "monitor_id",
                    "group_id",
                    "weight",
                    "send_url",
                    "custom_url"
                ),
                [
                    {
                        id: 59,
                        monitor_id: 41,
                        group_id: 53,
                        weight: 20,
                        send_url: 1,
                        custom_url: "https://status.example.com/service",
                    },
                ]
            );
            assert.deepStrictEqual(await target("maintenance").select("id", "title", "user_id"), [
                { id: 61, title: "Status maintenance", user_id: 2 },
            ]);
            assert.deepStrictEqual(await target("maintenance_status_page").select("status_page_id", "maintenance_id"), [
                { status_page_id: 43, maintenance_id: 61 },
            ]);
            assert.deepStrictEqual(await target("status_page_cname").select("status_page_id", "domain"), [
                { status_page_id: 43, domain: "status.example.com" },
            ]);

            await target("heartbeat").insert({
                monitor_id: 41,
                status: 1,
                msg: "history after first import",
                time: "2026-09-04 01:00:00",
            });
            await stageConfigurationImport(dataDir, archive);
            assert.strictEqual((await target("heartbeat").first()).msg, "history after first import");
            assert.strictEqual((await applyPendingConfigurationImport(dataDir, target)).state, "applied");
            assert.strictEqual(
                await target("heartbeat")
                    .count({ count: "*" })
                    .first()
                    .then((row) => row.count),
                0,
                "an intentional re-import of the same archive must run again"
            );
        } finally {
            await source.destroy();
            await target.destroy();
        }
    });

    test("rolls history and configuration deletion back when an insert fails", async () => {
        const db = await freshDatabase("rollback");
        try {
            await insertUser(db, { username: "target", password: "target-hash", admin: true });
            await db("setting").insert({ key: "instanceOwnerId", value: "1", type: null });
            await db("monitor").insert({ id: 5, name: "still here", active: 1, user_id: 1, type: "http" });
            await db("heartbeat").insert({
                monitor_id: 5,
                status: 1,
                msg: "still here too",
                time: "2026-09-04 00:00:00",
            });

            const invalidForDatabase = emptyDocument();
            invalidForDatabase.resources.statusPages.push({ id: 99 });
            await assert.rejects(replaceConfiguration(db, invalidForDatabase));

            assert.strictEqual((await db("monitor").where({ id: 5 }).first()).name, "still here");
            assert.strictEqual((await db("heartbeat").where({ monitor_id: 5 }).first()).msg, "still here too");
        } finally {
            await db.destroy();
        }
    });
});
