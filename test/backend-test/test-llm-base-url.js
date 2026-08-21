const { describe, it } = require("node:test");
const assert = require("node:assert");
const { assertSafeLlmBaseUrl } = require("../../server/utils/llm-base-url");

describe("LLM base URL is a request destination, not a display setting", () => {
    it("accepts an empty value, which means the provider's own host", () => {
        assert.strictEqual(assertSafeLlmBaseUrl(""), undefined);
        assert.strictEqual(assertSafeLlmBaseUrl(null), undefined);
        assert.strictEqual(assertSafeLlmBaseUrl(undefined), undefined);
        assert.strictEqual(assertSafeLlmBaseUrl("   "), undefined);
    });

    it("accepts HTTPS to a public host", () => {
        assert.strictEqual(
            assertSafeLlmBaseUrl("https://api.openai.com/v1"),
            "https://api.openai.com/v1"
        );
        assert.strictEqual(
            assertSafeLlmBaseUrl(" https://llm.example.com "),
            "https://llm.example.com"
        );
    });

    it("accepts HTTPS to a private host, for a self-hosted gateway", () => {
        assert.strictEqual(assertSafeLlmBaseUrl("https://10.0.0.5:8080/v1"), "https://10.0.0.5:8080/v1");
    });

    it("accepts HTTP only on localhost, for a self-hosted model", () => {
        assert.strictEqual(assertSafeLlmBaseUrl("http://localhost:11434"), "http://localhost:11434");
        assert.strictEqual(assertSafeLlmBaseUrl("http://127.0.0.1:11434/v1"), "http://127.0.0.1:11434/v1");
        assert.strictEqual(assertSafeLlmBaseUrl("http://[::1]:11434"), "http://[::1]:11434");
    });

    it("refuses HTTP to anywhere else, so the key is not sent in cleartext", () => {
        assert.throws(() => assertSafeLlmBaseUrl("http://evil.example/"), /HTTPS/);
        assert.throws(() => assertSafeLlmBaseUrl("http://10.0.0.5:8080"), /HTTPS/);
    });

    it("refuses cloud metadata and link-local addresses", () => {
        for (const bad of [
            "https://169.254.169.254/latest/meta-data/",
            "http://169.254.169.254/",
            "https://metadata.google.internal/",
            "https://metadata.goog/",
            "https://[fe80::1]/",
            "https://[::ffff:169.254.169.254]/",
        ]) {
            assert.throws(() => assertSafeLlmBaseUrl(bad), /link-local|metadata/, `accepted ${bad}`);
        }
    });

    it("refuses credentials in the URL; the key is a header", () => {
        assert.throws(
            () => assertSafeLlmBaseUrl("https://user:secret@api.example/v1"),
            /credentials/
        );
    });

    it("refuses schemes that are not HTTP", () => {
        assert.throws(() => assertSafeLlmBaseUrl("file:///etc/passwd"), /http or https/);
        assert.throws(() => assertSafeLlmBaseUrl("not a url"), /not a URL/);
    });
});
