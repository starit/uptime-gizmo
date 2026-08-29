/*
 * The AI settings used to hold one provider and one key. An instance that
 * talks to more than one model — a cheap one for drafts, a stronger one for
 * the final palette, or a second key for a different team — had to be edited
 * between uses. They are a list now, with one of them marked active.
 *
 * The single-credential settings are still read, so an instance that upgrades
 * keeps working before anyone opens the settings page; the first save through
 * that page replaces them with the list.
 */

const { getLLMProvider, LLM_CREDENTIAL_LIMIT } = require("../../src/llm-providers");
const { assertSafeLlmBaseUrl } = require("./llm-base-url");
const { Settings } = require("../settings");

/** Longest a credential name or id may be. */
const NAME_MAX_LENGTH = 64;

/**
 * A header name, as RFC 7230 defines a token.
 *
 * Anything outside this cannot be sent as a header name at all, and a value
 * with a colon or a newline in it is how a header injection starts.
 */
const HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

/**
 * Read a value that has to be a short string.
 * @param {any} value raw value
 * @param {string} label what to call it in an error message
 * @returns {string} trimmed value
 * @throws {Error} when it is not a string, or is too long
 */
function shortString(value, label) {
    if (value == null) {
        return "";
    }
    if (typeof value !== "string") {
        throw new Error(`${label} must be text`);
    }
    const text = value.trim();
    if (text.length > NAME_MAX_LENGTH) {
        throw new Error(`${label} must be at most ${NAME_MAX_LENGTH} characters`);
    }
    return text;
}

/**
 * Check one credential and return it in storage shape.
 * @param {any} raw one entry of the saved list
 * @param {number} index position in the list, for error messages
 * @returns {object} normalized credential
 * @throws {Error} when the entry cannot be used
 */
function normalizeLlmCredential(raw, index) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error(`AI credential ${index + 1} is not an object`);
    }

    const id = shortString(raw.id, `AI credential ${index + 1} id`);
    if (id === "") {
        throw new Error(`AI credential ${index + 1} needs an id`);
    }

    const provider = getLLMProvider(raw.provider);
    if (!provider) {
        throw new Error(`AI credential ${index + 1} has an unknown provider`);
    }

    const name = shortString(raw.name, `AI credential ${index + 1} name`) || provider.label;

    if (typeof raw.apiKey !== "string" || raw.apiKey.trim() === "") {
        throw new Error(`"${name}" needs an API key`);
    }

    if (raw.model != null && typeof raw.model !== "string") {
        throw new Error(`"${name}" has an invalid model`);
    }

    /*
     * A custom provider is only a URL and a key, so the URL is the whole
     * address; for the rest it overrides the provider's own host and stays
     * optional. Either way it receives the key as a Bearer token, so both go
     * through the same check.
     */
    const label = provider.requiresEndpoint ? `The endpoint for "${name}"` : `The base URL for "${name}"`;
    const baseUrl = assertSafeLlmBaseUrl(raw.baseUrl, label) ?? "";
    if (provider.requiresEndpoint && baseUrl === "") {
        throw new Error(`"${name}" needs an endpoint URL`);
    }

    /*
     * The OpenAI API sends the key as `Authorization: Bearer`, so an endpoint
     * compatible with it needs nothing here, and nothing here is the default.
     * The field is for one that copies the request body but not the
     * authentication: Azure OpenAI reads the key from `api-key` and keeps
     * `Authorization: Bearer` for Entra ID tokens, so a Bearer header there is
     * a 401 whatever the key is. Naming the header sends the key as that
     * header's whole value, with no scheme in front of it.
     *
     * Only a custom provider has this. The named ones are reached at their own
     * hosts, which authenticate the way themed.js already knows.
     */
    const apiKeyHeader = provider.requiresEndpoint
        ? shortString(raw.apiKeyHeader, `The API key header for "${name}"`)
        : "";

    if (apiKeyHeader !== "" && !HEADER_NAME.test(apiKeyHeader)) {
        throw new Error(`The API key header for "${name}" is not a valid header name`);
    }

    return {
        id,
        name,
        provider: provider.id,
        apiKey: raw.apiKey.trim(),
        apiKeyHeader,
        model: (raw.model ?? "").trim(),
        baseUrl,
    };
}

/**
 * Check a saved credential list.
 * @param {any} value raw setting
 * @returns {object[]} normalized credentials
 * @throws {Error} when the list, or any entry in it, cannot be used
 */
function normalizeLlmCredentials(value) {
    if (value == null) {
        return [];
    }

    if (!Array.isArray(value)) {
        throw new Error("AI credentials must be a list");
    }

    if (value.length > LLM_CREDENTIAL_LIMIT) {
        throw new Error(`At most ${LLM_CREDENTIAL_LIMIT} AI credentials can be saved`);
    }

    const list = value.map(normalizeLlmCredential);

    const ids = new Set();
    for (const credential of list) {
        if (ids.has(credential.id)) {
            throw new Error("Each AI credential needs its own id");
        }
        ids.add(credential.id);
    }

    return list;
}

/**
 * Drop the keys from a credential list, for a client that may not see them.
 * @param {object[]} list credentials
 * @returns {object[]} the same list with every key blanked
 */
function redactLlmCredentials(list) {
    return list.map((credential) => ({
        ...credential,
        apiKey: "",
    }));
}

/**
 * The credential a request should use.
 *
 * Falling back to the first entry keeps generation working when the active id
 * points at a credential that was deleted.
 * @param {object[]} list credentials
 * @param {any} activeId id of the credential marked active
 * @returns {object|null} the credential to use, or null when there is none
 */
function pickLlmCredential(list, activeId) {
    if (!Array.isArray(list) || list.length === 0) {
        return null;
    }
    return list.find((credential) => credential && credential.id === activeId) ?? list[0];
}

/**
 * Build a credential from the single-credential settings this replaced.
 * @param {object} settings values of llmProvider, llmApiKey, llmModel, llmBaseUrl
 * @returns {object|null} one credential, or null when nothing was configured
 */
function credentialFromLegacySettings(settings) {
    const provider = getLLMProvider(settings.llmProvider);
    if (!provider || typeof settings.llmApiKey !== "string" || settings.llmApiKey.trim() === "") {
        return null;
    }

    return {
        id: "legacy",
        name: provider.label,
        provider: provider.id,
        apiKey: settings.llmApiKey.trim(),
        apiKeyHeader: "",
        model: (settings.llmModel ?? "").trim(),
        baseUrl: (settings.llmBaseUrl ?? "").trim(),
    };
}

/**
 * The stored credential list, or the single-credential settings read as one.
 *
 * A stored list that has gone bad — hand-edited, or written by an older
 * version — must not take the settings page down with it, so anything that
 * fails the check is dropped rather than thrown.
 * @returns {Promise<object[]>} credentials
 */
async function readLlmCredentials() {
    const stored = await Settings.get("llmCredentials");

    if (Array.isArray(stored) && stored.length > 0) {
        return stored.flatMap((raw, index) => {
            try {
                return [ normalizeLlmCredential(raw, index) ];
            } catch (e) {
                return [];
            }
        });
    }

    const legacy = credentialFromLegacySettings({
        llmProvider: await Settings.get("llmProvider"),
        llmApiKey: await Settings.get("llmApiKey"),
        llmModel: await Settings.get("llmModel"),
        llmBaseUrl: await Settings.get("llmBaseUrl"),
    });

    return legacy ? [ legacy ] : [];
}

/**
 * The credential AI features should use right now.
 * @returns {Promise<object|null>} the active credential, or null when unconfigured
 */
async function resolveActiveLlmCredential() {
    const list = await readLlmCredentials();
    return pickLlmCredential(list, await Settings.get("llmActiveCredentialId"));
}

/**
 * Where a credential answers OpenAI-shaped chat completions, if anywhere.
 *
 * An llm monitor sends that shape, so this is what decides whether a monitor
 * can name a credential instead of carrying its own endpoint and key. A custom
 * credential holds the whole address. A named provider is usable only through
 * its own documented endpoint, and not when the credential overrides its host:
 * that override is a base URL, and appending a path to it is the guess the llm
 * monitor type exists to avoid.
 * @param {object} credential a saved credential
 * @returns {string|null} the endpoint, or null when there is none to use
 */
function chatCompletionsEndpoint(credential) {
    const provider = getLLMProvider(credential.provider);
    if (!provider) {
        return null;
    }

    if (provider.requiresEndpoint) {
        return credential.baseUrl || null;
    }

    return credential.baseUrl ? null : provider.chatCompletionsUrl ?? null;
}

/**
 * What the browser is told about the saved credentials: enough to name one in a
 * monitor, and nothing that is a secret.
 * @returns {Promise<object[]>} id, name, provider, model and whether a monitor can use it
 */
async function llmCredentialSummaries() {
    return (await readLlmCredentials()).map((credential) => ({
        id: credential.id,
        name: credential.name,
        provider: credential.provider,
        model: credential.model,
        monitorUsable: chatCompletionsEndpoint(credential) !== null,
    }));
}

/**
 * Whether any AI credential is configured, without handing one out.
 * @returns {Promise<boolean>} true when AI features can be offered
 */
async function hasLlmCredential() {
    return (await readLlmCredentials()).length > 0;
}

module.exports = {
    NAME_MAX_LENGTH,
    chatCompletionsEndpoint,
    llmCredentialSummaries,
    normalizeLlmCredential,
    normalizeLlmCredentials,
    redactLlmCredentials,
    pickLlmCredential,
    credentialFromLegacySettings,
    readLlmCredentials,
    resolveActiveLlmCredential,
    hasLlmCredential,
};
