/*
 * One place that turns a stored credential into something able to talk to the
 * model, so generating a theme and testing a credential cannot drift into
 * sending different bodies to different addresses.
 */

const { getLLMProvider } = require("../../src/llm-providers");
const { assertSafeLlmBaseUrl } = require("./llm-base-url");

/** What a test asks for: one word, so the answer costs almost nothing. */
const PROBE_MESSAGES = [ { role: "user", content: "Reply with the single word: ok" } ];

/** How long a test waits. Short, because someone is watching it. */
const PROBE_TIMEOUT_MS = 15000;

/**
 * Build the themed.js provider a credential describes.
 *
 * The URL is checked here, not only at save: one stored before that check
 * existed, or written around the settings form, must not receive the key
 * either.
 * @param {object} credential a normalized credential
 * @param {object} options timeout and maxRetries, when the defaults do not fit
 * @returns {Promise<object>} a themed.js AIProvider
 * @throws {Error} when the credential cannot be turned into a provider
 */
async function createLlmProvider(credential, options = {}) {
    const url = assertSafeLlmBaseUrl(credential.baseUrl);
    const { timeout, maxRetries } = options;

    const { createAIProvider, CustomProvider } = await import("@themed.js/core");

    if (credential.provider === "custom") {
        if (!url) {
            throw new Error("This AI credential has no endpoint URL");
        }

        /*
         * themed.js posts its own body shape to a custom endpoint, and that
         * shape carries no model. An OpenAI-compatible gateway — LiteLLM,
         * OpenRouter, vLLM, Ollama — needs one, so the request is rebuilt here
         * with the model named. The rest of the provider, including retries and
         * reading the answer back, is left to themed.js.
         */
        const model = (credential.model ?? "").trim();

        return new CustomProvider({
            apiKey: credential.apiKey,
            endpoint: url,
            timeout,
            maxRetries,
            transformRequest: (messages) => ({
                ...(model ? { model } : {}),
                messages: messages.map((message) => ({
                    role: message.role,
                    content: message.content,
                })),
                temperature: 0.7,
                max_tokens: 2000,
            }),
        });
    }

    return createAIProvider({
        provider: credential.provider,
        apiKey: credential.apiKey,
        /*
         * A blank model field falls back to this project's catalogue rather
         * than to themed.js, whose own fallbacks name models their providers
         * have since retired.
         */
        model: credential.model || getLLMProvider(credential.provider)?.defaultModel || undefined,
        // When set, this replaces the provider's own host.
        baseURL: url,
        timeout,
        maxRetries,
    });
}

/**
 * Ask the model for one short answer, to show that a credential reaches it.
 *
 * Retries are off: a test that waits out three backoffs before reporting a bad
 * key reads as a hang, and the failure it hides is the answer.
 * @param {object} credential a normalized credential
 * @returns {Promise<string>} what the model answered
 * @throws {Error} when the provider cannot be reached, or answers with nothing
 */
async function probeLlmCredential(credential) {
    const provider = await createLlmProvider(credential, {
        timeout: PROBE_TIMEOUT_MS,
        maxRetries: 0,
    });

    const answer = await provider.complete(PROBE_MESSAGES);

    if (typeof answer !== "string" || answer.trim() === "") {
        throw new Error("The provider answered without any content");
    }

    return answer.trim();
}

module.exports = {
    PROBE_TIMEOUT_MS,
    createLlmProvider,
    probeLlmCredential,
};
