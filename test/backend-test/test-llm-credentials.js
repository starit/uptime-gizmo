const { describe, it } = require("node:test");
const assert = require("node:assert");
const {
    normalizeLlmCredentials,
    redactLlmCredentials,
    pickLlmCredential,
    credentialFromLegacySettings,
} = require("../../server/utils/llm-credentials");
const { LLM_CREDENTIAL_LIMIT } = require("../../src/llm-providers");

const openai = {
    id: "one",
    name: "Drafts",
    provider: "openai",
    apiKey: "sk-test",
    model: "gpt-4o-mini",
    baseUrl: "",
};

describe("AI credentials are a list, and every entry in it is checked", () => {
    it("accepts an empty list, which means no AI features", () => {
        assert.deepStrictEqual(normalizeLlmCredentials(undefined), []);
        assert.deepStrictEqual(normalizeLlmCredentials(null), []);
        assert.deepStrictEqual(normalizeLlmCredentials([]), []);
    });

    it("keeps several credentials, so one instance can hold more than one key", () => {
        const list = normalizeLlmCredentials([
            openai,
            { ...openai, id: "two", name: "Final", provider: "claude", apiKey: "sk-ant-test", model: "claude-opus-5" },
        ]);

        assert.strictEqual(list.length, 2);
        assert.deepStrictEqual(list.map((credential) => credential.provider), [ "openai", "claude" ]);
        assert.deepStrictEqual(list.map((credential) => credential.apiKey), [ "sk-test", "sk-ant-test" ]);
    });

    it("trims the fields and falls back to the provider name", () => {
        const [ credential ] = normalizeLlmCredentials([ { ...openai, name: "  ", apiKey: " sk-test ", model: " gpt-4o " } ]);

        assert.strictEqual(credential.name, "OpenAI");
        assert.strictEqual(credential.apiKey, "sk-test");
        assert.strictEqual(credential.model, "gpt-4o");
    });

    it("refuses a list that is not a list, or is longer than the limit", () => {
        assert.throws(() => normalizeLlmCredentials("openai"), /list/);
        const tooMany = Array.from({ length: LLM_CREDENTIAL_LIMIT + 1 }, (_, index) => ({ ...openai, id: `id-${index}` }));
        assert.throws(() => normalizeLlmCredentials(tooMany), /At most/);
    });

    it("refuses an entry without an id, a known provider, or a key", () => {
        assert.throws(() => normalizeLlmCredentials([ { ...openai, id: "" } ]), /needs an id/);
        assert.throws(() => normalizeLlmCredentials([ { ...openai, provider: "extension" } ]), /unknown provider/);
        assert.throws(() => normalizeLlmCredentials([ { ...openai, apiKey: "  " } ]), /needs an API key/);
        assert.throws(() => normalizeLlmCredentials([ openai, { ...openai, name: "Copy" } ]), /its own id/);
    });

    it("refuses a URL the API key must not be sent to", () => {
        assert.throws(() => normalizeLlmCredentials([ { ...openai, baseUrl: "http://evil.example" } ]), /HTTPS/);
        assert.throws(
            () => normalizeLlmCredentials([ { ...openai, baseUrl: "https://169.254.169.254/v1" } ]),
            /link-local or cloud-metadata/
        );
    });

    it("requires an endpoint for a custom provider, which has no host of its own", () => {
        assert.throws(() => normalizeLlmCredentials([ { ...openai, provider: "custom", baseUrl: "" } ]), /needs an endpoint/);

        const [ credential ] = normalizeLlmCredentials([
            { ...openai, provider: "custom", baseUrl: "https://llm.example.com/v1/chat/completions" },
        ]);
        assert.strictEqual(credential.provider, "custom");
        assert.strictEqual(credential.baseUrl, "https://llm.example.com/v1/chat/completions");
    });

    it("blanks the keys for a client that may not see them", () => {
        const redacted = redactLlmCredentials(normalizeLlmCredentials([ openai ]));

        assert.strictEqual(redacted[0].apiKey, "");
        assert.strictEqual(redacted[0].name, "Drafts");
    });
});

describe("Which AI credential a request uses", () => {
    const list = [ openai, { ...openai, id: "two", provider: "claude" } ];

    it("is the one marked active", () => {
        assert.strictEqual(pickLlmCredential(list, "two").provider, "claude");
    });

    it("falls back to the first, so a deleted mark does not disable AI", () => {
        assert.strictEqual(pickLlmCredential(list, "gone").id, "one");
        assert.strictEqual(pickLlmCredential(list, undefined).id, "one");
    });

    it("is nothing when there are no credentials", () => {
        assert.strictEqual(pickLlmCredential([], "one"), null);
        assert.strictEqual(pickLlmCredential(undefined, "one"), null);
    });
});

describe("The single credential this replaced is still read", () => {
    it("becomes one entry of the list", () => {
        const credential = credentialFromLegacySettings({
            llmProvider: "openai",
            llmApiKey: " sk-test ",
            llmModel: "gpt-4o-mini",
            llmBaseUrl: "https://llm.example.com",
        });

        assert.strictEqual(credential.provider, "openai");
        assert.strictEqual(credential.apiKey, "sk-test");
        assert.strictEqual(credential.model, "gpt-4o-mini");
        assert.strictEqual(credential.baseUrl, "https://llm.example.com");
    });

    it("is nothing when no provider or no key was configured", () => {
        assert.strictEqual(credentialFromLegacySettings({ llmProvider: "openai", llmApiKey: "" }), null);
        assert.strictEqual(credentialFromLegacySettings({ llmProvider: null, llmApiKey: "sk-test" }), null);
    });
});
