const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const { LlmMonitorType, internals } = require("../../server/monitor-types/llm");
const { UP } = require("../../src/util");

/*
 * The llm type exists for failures that keep a status-code check green, so most
 * of what is asserted here is a 200 that should still be reported as down.
 *
 * The endpoint is a local http server, which is also the one case the URL
 * policy allows over plain http.
 */

/** What the server answers with next. Each test sets it. */
let reply = { status: 200, body: {} };

let server;
let endpoint;

/**
 * A monitor row, with only the columns this type reads.
 * @param {object} overrides columns to set
 * @returns {object} the row
 */
function monitorRow(overrides = {}) {
    return {
        url: endpoint,
        llm_model: "test-model",
        llm_prompt: "Reply with the single word: ok",
        llm_max_tokens: 16,
        timeout: 5,
        ...overrides,
    };
}

/**
 * A well-formed chat completion.
 * @param {string} content the assistant's text
 * @returns {object} the body
 */
function completion(content) {
    return {
        choices: [ { message: { role: "assistant", content } } ],
        usage: { total_tokens: 12 },
    };
}

/**
 * Run a check and return the heartbeat, or the error message it threw.
 * @param {object} row monitor row
 * @returns {Promise<{heartbeat: object, error: string|null}>} the outcome
 */
async function run(row) {
    const type = new LlmMonitorType();
    const heartbeat = {};
    try {
        await type.check(row, heartbeat, {});
        return { heartbeat, error: null };
    } catch (e) {
        return { heartbeat, error: e.message };
    }
}

describe("llm monitor", () => {
    before(async () => {
        server = http.createServer((req, res) => {
            let raw = "";
            req.on("data", (chunk) => {
                raw += chunk;
            });
            req.on("end", () => {
                reply.seen = raw ? JSON.parse(raw) : null;
                const send = () => {
                    res.writeHead(reply.status, { "Content-Type": "application/json" });
                    res.end(typeof reply.body === "string" ? reply.body : JSON.stringify(reply.body));
                };
                // A loopback answer can legitimately take under a millisecond,
                // so the latency test holds the response rather than relying on
                // a ceiling of 1ms being unreachable.
                if (reply.delay) {
                    setTimeout(send, reply.delay);
                } else {
                    send();
                }
            });
        });
        await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
        endpoint = `http://127.0.0.1:${server.address().port}/v1/chat/completions`;
    });

    after(async () => {
        await new Promise((resolve) => server.close(resolve));
    });

    it("is up when the endpoint returns a completion", async () => {
        reply = { status: 200, body: completion("ok") };
        const { heartbeat, error } = await run(monitorRow());

        assert.strictEqual(error, null);
        assert.strictEqual(heartbeat.status, UP);
        assert.match(heartbeat.msg, /12 tokens/);
        assert.match(heartbeat.msg, /ok/);
        assert.ok(Number.isFinite(heartbeat.ping));
    });

    it("sends the model, prompt and token cap it was configured with", async () => {
        reply = { status: 200, body: completion("ok") };
        await run(monitorRow({ llm_model: "gpt-4o-mini", llm_prompt: "say hi", llm_max_tokens: 4 }));

        assert.strictEqual(reply.seen.model, "gpt-4o-mini");
        assert.deepStrictEqual(reply.seen.messages, [ { role: "user", content: "say hi" } ]);
        assert.strictEqual(reply.seen.max_tokens, 4);
        assert.strictEqual(reply.seen.stream, false);
    });

    /*
     * The reason this type exists. Every assertion below arrives with a 200.
     */
    it("is down when a 200 carries an error object", async () => {
        reply = { status: 200, body: { error: { message: "model_not_found" } } };
        const { error } = await run(monitorRow());

        assert.match(error, /model_not_found/);
    });

    it("is down when a 200 carries no completion", async () => {
        reply = { status: 200, body: { choices: [] } };
        const { error } = await run(monitorRow());

        assert.match(error, /no completion/);
    });

    it("is down when the completion is empty", async () => {
        reply = { status: 200, body: completion("   ") };
        const { error } = await run(monitorRow());

        assert.match(error, /empty completion/);
    });

    it("is down when a successful answer is slower than the ceiling", async () => {
        reply = { status: 200, body: completion("ok"), delay: 60 };
        const { error } = await run(monitorRow({ llm_max_latency: 10 }));

        assert.match(error, /over the limit of 10ms/);
    });

    it("reports latency without a ceiling set", async () => {
        reply = { status: 200, body: completion("ok") };
        const { heartbeat, error } = await run(monitorRow({ llm_max_latency: null }));

        assert.strictEqual(error, null);
        assert.strictEqual(heartbeat.status, UP);
    });

    it("asserts the keyword against the completion, not the whole body", async () => {
        // "test-model" appears nowhere in the completion, but would appear in a
        // response body that echoed the request.
        reply = { status: 200, body: completion("ok") };
        const { error } = await run(monitorRow({ keyword: "test-model" }));

        assert.match(error, /does not appear in the completion/);
    });

    it("passes when the keyword is in the completion", async () => {
        reply = { status: 200, body: completion("the answer is ok") };
        const { heartbeat, error } = await run(monitorRow({ keyword: "ok" }));

        assert.strictEqual(error, null);
        assert.strictEqual(heartbeat.status, UP);
    });

    it("inverts the keyword when asked", async () => {
        reply = { status: 200, body: completion("refused") };
        const { error } = await run(monitorRow({ keyword: "refused", invert_keyword: true }));

        assert.match(error, /should not appear but does/);
    });

    it("surfaces a bounded excerpt of a failing status body", async () => {
        reply = { status: 429, body: { error: { message: "rate limited" } } };
        const { error } = await run(monitorRow());

        assert.match(error, /HTTP 429/);
        assert.match(error, /rate limited/);
    });

    it("refuses a monitor with no model", async () => {
        const { error } = await run(monitorRow({ llm_model: "" }));

        assert.match(error, /No model is set/);
    });

    /*
     * Monitor.beat() patches an unset timeout to interval * 1000 * 0.8, which is
     * milliseconds against a column in seconds. Multiplying that by 1000 again
     * would leave the monitor with no effective timeout.
     */
    it("ignores a timeout that is the millisecond runtime patch, not seconds", async () => {
        reply = { status: 200, body: completion("ok"), delay: 40 };
        const { heartbeat, error } = await run(monitorRow({ timeout: 48000, llm_max_latency: null }));

        assert.strictEqual(error, null);
        assert.strictEqual(heartbeat.status, UP);
    });

    it("times out a request that outlasts the configured seconds", async () => {
        reply = { status: 200, body: completion("ok"), delay: 400 };
        const { error } = await run(monitorRow({ timeout: 0.1 }));

        assert.match(error, /Request failed/);
    });

    it("refuses a monitor with no endpoint", async () => {
        const { error } = await run(monitorRow({ url: "" }));

        assert.match(error, /No endpoint URL is set/);
    });

    /*
     * The endpoint receives an API key, so it goes through the same policy the
     * LLM base-url setting does rather than a second copy of the rules.
     */
    it("refuses an endpoint the URL policy rejects", async () => {
        const cases = [
            [ "http://example.com/v1/chat/completions", /must use HTTPS/ ],
            [ "https://user:pass@example.com/v1", /must not contain credentials/ ],
            [ "ftp://example.com/v1", /must be http or https/ ],
            [ "http://169.254.169.254/latest", /link-local or cloud-metadata/ ],
            [ "not a url", /is not a URL/ ],
        ];

        for (const [ url, expected ] of cases) {
            const { error } = await run(monitorRow({ url }));
            assert.match(error, expected, `${url} was not refused as expected`);
        }
    });
});

describe("llm monitor helpers", () => {
    it("reads a string completion", () => {
        assert.strictEqual(internals.completionContent(completion("hello")), "hello");
    });

    it("reads a completion delivered as content parts", () => {
        const body = { choices: [ { message: { content: [ { text: "he" }, { text: "llo" } ] } } ] };
        assert.strictEqual(internals.completionContent(body), "hello");
    });

    it("returns null when there is no choice at all", () => {
        assert.strictEqual(internals.completionContent({ choices: [] }), null);
        assert.strictEqual(internals.completionContent({}), null);
    });

    it("collapses and truncates a preview", () => {
        assert.strictEqual(internals.preview("  a\n\n  b  "), "a b");
        assert.ok(internals.preview("x".repeat(500)).endsWith("…"));
        assert.ok(internals.preview("x".repeat(500)).length < 500);
    });

    it("bounds an unusable body without throwing on any shape", () => {
        assert.strictEqual(internals.describeBody(null), "no body");
        assert.strictEqual(internals.describeBody("a  b"), "a b");
        assert.ok(internals.describeBody({ a: "x".repeat(500) }).endsWith("…"));
    });

    it("names the token count only when the provider reported one", () => {
        assert.match(internals.describeSuccess(5, { total_tokens: 3 }, "ok"), /3 tokens/);
        assert.doesNotMatch(internals.describeSuccess(5, undefined, "ok"), /tokens/);
    });
});

describe("What one check sends when the monitor names a saved credential", () => {
    const saved = [
        {
            id: "gateway",
            name: "Gateway",
            provider: "custom",
            apiKey: "sk-saved",
            model: "gateway-model",
            baseUrl: "https://llm.example.com/v1/chat/completions",
        },
        { id: "anthropic", name: "Claude", provider: "claude", apiKey: "sk-ant", model: "", baseUrl: "" },
    ];

    it("is the monitor's own three fields when it names none", () => {
        const target = internals.resolveTarget(
            { url: "https://own.example.com/v1/chat/completions", llm_api_key: "sk-own", llm_model: "own-model" },
            saved
        );

        assert.deepStrictEqual(target, {
            endpoint: "https://own.example.com/v1/chat/completions",
            apiKey: "sk-own",
            model: "own-model",
        });
    });

    it("takes the endpoint and key from the credential, and keeps the monitor's model", () => {
        const target = internals.resolveTarget(
            { llm_credential_id: "gateway", llm_model: "pinned-model", url: "", llm_api_key: "" },
            saved
        );

        assert.strictEqual(target.endpoint, "https://llm.example.com/v1/chat/completions");
        assert.strictEqual(target.apiKey, "sk-saved");
        assert.strictEqual(target.model, "pinned-model");
    });

    it("falls back to the credential's model when the monitor names none", () => {
        const target = internals.resolveTarget({ llm_credential_id: "gateway", llm_model: "" }, saved);

        assert.strictEqual(target.model, "gateway-model");
    });

    it("says so when the credential has been deleted, rather than checking something else", () => {
        assert.throws(
            () => internals.resolveTarget({ llm_credential_id: "gone" }, saved),
            /no longer configured/
        );
    });

    it("refuses a credential whose API is a different shape than this monitor sends", () => {
        assert.throws(
            () => internals.resolveTarget({ llm_credential_id: "anthropic" }, saved),
            /no chat-completions endpoint/
        );
    });
});
