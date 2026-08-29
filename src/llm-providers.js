"use strict";
/*!
// Shared LLM provider catalogue for frontend and backend.
//
// DO NOT MODIFY llm-providers.js!
// Need to run "pnpm run tsc" to compile if there are any changes.
//
// Backend uses the compiled file llm-providers.js
// Frontend uses llm-providers.ts
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLLMProvider = exports.LLM_CREDENTIAL_LIMIT = exports.llmProviders = void 0;
exports.llmProviders = [
    {
        id: "openai",
        label: "OpenAI",
        defaultModel: "gpt-5.6-terra",
        models: ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"],
        chatCompletionsUrl: "https://api.openai.com/v1/chat/completions",
    },
    {
        id: "claude",
        label: "Claude",
        defaultModel: "claude-opus-5",
        models: ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5", "claude-opus-4-8", "claude-fable-5"],
    },
    {
        id: "gemini",
        label: "Gemini",
        defaultModel: "gemini-3.7-flash",
        models: ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-pro"],
        chatCompletionsUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    },
    {
        id: "groq",
        label: "Groq",
        defaultModel: "openai/gpt-oss-120b",
        models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
        chatCompletionsUrl: "https://api.groq.com/openai/v1/chat/completions",
    },
    {
        id: "deepseek",
        label: "DeepSeek",
        defaultModel: "deepseek-v4-flash",
        models: ["deepseek-v4-pro", "deepseek-v4-flash"],
        chatCompletionsUrl: "https://api.deepseek.com/chat/completions",
    },
    {
        id: "moonshot",
        label: "Moonshot (Kimi)",
        defaultModel: "kimi-k3",
        models: ["kimi-k3", "kimi-k2.7-code", "kimi-k2.6"],
        chatCompletionsUrl: "https://api.moonshot.ai/v1/chat/completions",
    },
    {
        id: "custom",
        label: "Custom (OpenAI-compatible)",
        defaultModel: "",
        models: [],
        requiresEndpoint: true,
    },
];
exports.LLM_CREDENTIAL_LIMIT = 20;
function getLLMProvider(id) {
    var _a;
    if (!id) {
        return null;
    }
    return (_a = exports.llmProviders.find((provider) => provider.id === id)) !== null && _a !== void 0 ? _a : null;
}
exports.getLLMProvider = getLLMProvider;
