/*!
// Shared LLM provider catalogue for frontend and backend.
//
// DO NOT MODIFY llm-providers.js!
// Need to run "pnpm run tsc" to compile if there are any changes.
//
// Backend uses the compiled file llm-providers.js
// Frontend uses llm-providers.ts
*/

/** One selectable LLM provider. */
export interface LLMProvider {
    /** Stored on the credential and handed to themed.js as its provider type. */
    id: string;
    /** Name shown in the provider list. */
    label: string;
    /**
     * Sent when the credential names no model. themed.js has fallbacks of its
     * own, but they age into models the provider has retired.
     */
    defaultModel: string;
    /**
     * Models offered as suggestions. Not a whitelist: the field stays free
     * text, because provider catalogues change faster than this file does.
     */
    models: string[];
    /**
     * The provider has no host of its own, so the credential must carry the
     * URL requests are sent to.
     */
    requiresEndpoint?: boolean;
}

/*
 * Mirrors themed.js AIProviderType, minus the browser-extension transport,
 * which needs a different config shape.
 *
 * The model names were checked against each provider's own documentation in
 * August 2026. They date quickly — DeepSeek retired deepseek-chat that July —
 * which is why they are suggestions rather than a whitelist, and why the field
 * they fill stays free text.
 */
export const llmProviders: LLMProvider[] = [
    {
        id: "openai",
        label: "OpenAI",
        defaultModel: "gpt-5.6-terra",
        models: [ "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna" ],
    },
    {
        id: "claude",
        label: "Claude",
        defaultModel: "claude-opus-5",
        models: [ "claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5", "claude-opus-4-8", "claude-fable-5" ],
    },
    {
        id: "gemini",
        label: "Gemini",
        defaultModel: "gemini-3.7-flash",
        models: [ "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-pro" ],
    },
    {
        id: "groq",
        label: "Groq",
        defaultModel: "openai/gpt-oss-120b",
        models: [ "openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant" ],
    },
    {
        id: "deepseek",
        label: "DeepSeek",
        defaultModel: "deepseek-v4-flash",
        models: [ "deepseek-v4-pro", "deepseek-v4-flash" ],
    },
    {
        id: "moonshot",
        label: "Moonshot (Kimi)",
        defaultModel: "kimi-k3",
        models: [ "kimi-k3", "kimi-k2.7-code", "kimi-k2.6" ],
    },
    {
        id: "custom",
        label: "Custom (OpenAI-compatible)",
        defaultModel: "",
        models: [],
        requiresEndpoint: true,
    },
];

/** How many credentials one instance may keep. */
export const LLM_CREDENTIAL_LIMIT = 20;

/**
 * Look up a provider by the id stored on a credential.
 * @param {string} id provider id
 * @returns {LLMProvider|null} the provider, or null when it is not one of ours
 */
export function getLLMProvider(id: string | null | undefined): LLMProvider | null {
    if (!id) {
        return null;
    }
    return llmProviders.find((provider) => provider.id === id) ?? null;
}
