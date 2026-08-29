const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const { createLlmProvider, probeLlmCredential } = require("../../server/utils/llm-provider");

/*
 * A custom provider is the one this project builds itself, because themed.js
 * posts a body without a model to a custom endpoint and an OpenAI-compatible
 * gateway needs one. The endpoint here is a local http server, which is also
 * the one case the URL policy allows over plain http.
 */

/** What the server answers with next. Each test sets it. */
let reply = { status: 200, body: {} };

/** The body of the last request it received. */
let received = null;

let server;
let endpoint;

/**
 * A credential, with only the fields a provider is built from.
 * @param {object} overrides fields to set
 * @returns {object} the credential
 */
function credential(overrides = {}) {
    return {
        id: "one",
        name: "Gateway",
        provider: "custom",
        apiKey: "sk-test",
        model: "my-gateway-model",
        baseUrl: endpoint,
        ...overrides,
    };
}

before(async () => {
    server = http.createServer((req, res) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        req.on("end", () => {
            received = {
                authorization: req.headers.authorization,
                apiKeyHeader: req.headers["api-key"],
                body: JSON.parse(body || "{}"),
            };
            res.writeHead(reply.status, { "Content-Type": "application/json" });
            res.end(JSON.stringify(reply.body));
        });
    });

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    endpoint = `http://127.0.0.1:${server.address().port}/v1/chat/completions`;
});

after(async () => {
    await new Promise((resolve) => server.close(resolve));
});

describe("A custom endpoint is reached with the model named", () => {
    it("sends the model, the messages and the key", async () => {
        reply = { status: 200, body: { choices: [ { message: { content: "ok" } } ] } };

        assert.strictEqual(await probeLlmCredential(credential()), "ok");
        assert.strictEqual(received.body.model, "my-gateway-model");
        assert.strictEqual(received.authorization, "Bearer sk-test");
        assert.ok(Array.isArray(received.body.messages) && received.body.messages.length > 0);
    });

    it("omits the model when the credential names none, for an endpoint that fixes it", async () => {
        reply = { status: 200, body: { choices: [ { message: { content: "ok" } } ] } };

        await probeLlmCredential(credential({ model: "" }));
        assert.ok(!("model" in received.body));
    });

    it("sends the key under the header the credential names, and no Bearer", async () => {
        reply = { status: 200, body: { choices: [ { message: { content: "ok" } } ] } };

        await probeLlmCredential(credential({ apiKeyHeader: "api-key" }));

        assert.strictEqual(received.apiKeyHeader, "sk-test");
        assert.strictEqual(received.authorization, undefined);
    });

    it("reports what the endpoint said when it refuses", async () => {
        reply = { status: 401, body: { error: { message: "invalid api key" } } };

        await assert.rejects(probeLlmCredential(credential()), /401/);
    });

    it("refuses an answer with no content, which a status code would call fine", async () => {
        reply = { status: 200, body: { choices: [ { message: { content: "" } } ] } };
        await assert.rejects(probeLlmCredential(credential()), /Could not extract content/);

        // Blank rather than absent: themed.js hands this one back as an answer.
        reply = { status: 200, body: { choices: [ { message: { content: "   " } } ] } };
        await assert.rejects(probeLlmCredential(credential()), /without any content/);
    });

    it("refuses a custom credential with no endpoint, and a URL the key must not go to", async () => {
        await assert.rejects(createLlmProvider(credential({ baseUrl: "" })), /no endpoint URL/);
        await assert.rejects(createLlmProvider(credential({ baseUrl: "http://evil.example" })), /HTTPS/);
    });
});

describe("A named provider is built by themed.js", () => {
    it("is that provider, not the custom one", async () => {
        const provider = await createLlmProvider(credential({ provider: "openai", baseUrl: "" }));

        assert.strictEqual(provider.name, "openai");
    });
});
