const { describe, test } = require("node:test");
const assert = require("node:assert");
const {
    redactSecret,
    monitorTypeLabel,
    monitorTargetLabel,
    monitorSearchHaystack,
    isMonitorActive,
    hasCheckInterval,
    hasPingSample,
} = require("../../src/monitor-identity.js");

describe("monitor identity", () => {
    test("redactSecret hides URL and SQL passwords", () => {
        assert.strictEqual(
            redactSecret("https://user:secret@example.com/path"),
            "https://user:******@example.com/path"
        );
        assert.match(redactSecret("Server=db;Password=hunter2;Database=app"), /Password=\*{6}/);
        assert.doesNotMatch(redactSecret("Server=db;Pwd={h;unt}}er};Database=app"), /h;unt|er}/);
        assert.doesNotMatch(redactSecret("host=db user=app password='secret value' sslmode=require"), /secret value/);
        assert.doesNotMatch(redactSecret("Server=db;Access Token=azure-secret;Database=app"), /azure-secret/);
        assert.doesNotMatch(redactSecret("jdbc:postgresql://user:jdbc-secret@db/app"), /jdbc-secret/);
        assert.doesNotMatch(redactSecret("https://example.com/check?token=secret-token&region=west"), /secret-token/);
        assert.match(redactSecret("https://example.com/check?token=secret-token&region=west"), /region=west/);
        assert.strictEqual(redactSecret(""), "");
    });

    test("monitorTypeLabel uses i18n for known types and keeps unknown ids", () => {
        const t = (key) => `T:${key}`;
        assert.strictEqual(monitorTypeLabel("http", t), "HTTP(s)");
        assert.strictEqual(monitorTypeLabel("keyword", t), "HTTP(s) - T:Keyword");
        assert.strictEqual(monitorTypeLabel("llm", t), "T:LLM Endpoint");
        assert.strictEqual(monitorTypeLabel("web3-contract", t), "T:Web3 Contract Value");
        assert.strictEqual(monitorTypeLabel("web3-contract"), "Web3 Contract Value");
        assert.strictEqual(monitorTypeLabel("custom-probe", t), "custom-probe");
    });

    test("monitorTargetLabel is type-specific and never includes a password", () => {
        assert.strictEqual(
            monitorTargetLabel({ type: "http", url: "https://user:secret@example.com/" }),
            "https://user:******@example.com/"
        );
        assert.strictEqual(monitorTargetLabel({ type: "ping", hostname: "1.1.1.1" }), "1.1.1.1");
        assert.strictEqual(monitorTargetLabel({ type: "port", hostname: "db.local", port: 5432 }), "db.local:5432");
        assert.strictEqual(
            monitorTargetLabel({ type: "dns", hostname: "example.com", dns_resolve_type: "A" }),
            "[A] example.com"
        );
        assert.strictEqual(monitorTargetLabel({ type: "docker", docker_container: "nginx" }), "nginx");
        assert.strictEqual(
            monitorTargetLabel({ type: "mqtt", hostname: "broker", port: 1883, mqttTopic: "uptime" }),
            "broker:1883/uptime"
        );
        assert.strictEqual(
            monitorTargetLabel(
                { type: "llm", url: "https://api.example/v1", llmModel: "" },
                { llmModel: "gpt-5.6-terra", llmTarget: "Work account" }
            ),
            "gpt-5.6-terra · Work account"
        );
        assert.strictEqual(
            monitorTargetLabel(
                { type: "web3-balance", web3Address: "0x1234567890abcdef1234567890abcdef12345678" },
                { networkName: "Mainnet" }
            ),
            "Mainnet · 0x123456…5678"
        );
        assert.strictEqual(monitorTargetLabel({ type: "group" }, { childCount: 4 }), "4");
        assert.strictEqual(monitorTargetLabel({ type: "push", pushToken: "super-secret" }), "");
        assert.doesNotMatch(
            monitorTargetLabel({
                type: "postgres",
                databaseConnectionString: "postgres://u:hunter2@db.internal:5432/app",
            }),
            /hunter2/
        );
    });

    test("search haystack includes the displayed target and type label", () => {
        const haystack = monitorSearchHaystack(
            {
                name: "API",
                type: "http",
                url: "https://user:secret@api.example/",
                tags: [{ name: "prod", value: "west" }],
            },
            {},
            (key) => key
        );
        assert.match(haystack, /api\.example/);
        assert.match(haystack, /http\(s\)/);
        assert.match(haystack, /prod/);
        assert.doesNotMatch(haystack, /secret/);
    });

    test("active, interval, and ping edge cases", () => {
        assert.strictEqual(isMonitorActive({ active: true }), true);
        assert.strictEqual(isMonitorActive({ active: 1 }), true);
        assert.strictEqual(isMonitorActive({ active: 0 }), false);
        assert.strictEqual(hasCheckInterval({ type: "http", interval: 0 }), true);
        assert.strictEqual(hasCheckInterval({ type: "group", interval: 60 }), false);
        assert.strictEqual(hasPingSample({ type: "http" }, { ping: 12 }), true);
        assert.strictEqual(hasPingSample({ type: "http" }, { ping: 0 }), true);
        assert.strictEqual(hasPingSample({ type: "group" }, { ping: 12 }), false);
        assert.strictEqual(hasPingSample({ type: "http" }, null), false);
    });
});
