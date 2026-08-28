const { MonitorType } = require("./monitor-type");
const { UP } = require("../../src/util");
const { assertSafeLlmBaseUrl } = require("../utils/llm-base-url");
const dayjs = require("dayjs");
const axios = require("axios");

/** A completion this small cannot be a legitimate answer to the request below. */
const MAX_RESPONSE_BYTES = 1024 * 1024;

/** How much of an error body is worth putting in a heartbeat message. */
const ERROR_BODY_CHARS = 200;

/** How much of the completion to echo back so a heartbeat shows what it got. */
const CONTENT_PREVIEW_CHARS = 120;

/** What to ask when the operator has not written a prompt. */
const DEFAULT_PROMPT = "Reply with the single word: ok";

/** Tokens to allow when the operator has not set a cap. */
const DEFAULT_MAX_TOKENS = 16;

/** Seconds to wait when the monitor has no usable timeout of its own. */
const DEFAULT_TIMEOUT_SECONDS = 30;

/**
 * The largest timeout that can be a value someone entered.
 *
 * `monitor.timeout` is seconds, but `Monitor.beat()` patches an unset one to
 * `interval * 1000 * 0.8` — milliseconds, against a column in seconds. The
 * smallest interval it can produce is 800, so anything above this ceiling is
 * that patch rather than an operator's number, and multiplying it by 1000 again
 * would give a monitor no effective timeout at all.
 */
const MAX_TIMEOUT_SECONDS = 600;

/**
 * Whether an inference endpoint is still returning usable output.
 *
 * Reachability is the part this monitor is not for; an HTTP check covers it. The
 * failures it exists for all keep a status-code check green:
 *
 *   - a provider answering 200 with an error object in the payload;
 *   - a model deprecated out from under the caller, or renamed;
 *   - a gateway or a quota returning an empty completion;
 *   - a response that arrives so late the caller has already timed out.
 *
 * So the check makes a real chat-completion request and asserts on the content
 * that comes back rather than on the envelope around it.
 *
 * The request body is the OpenAI chat-completions shape, which is what
 * self-hosted servers (Ollama, vLLM, llama.cpp, LiteLLM) and the hosted
 * providers behind a compatible gateway all accept. The endpoint is the full
 * URL, not a base to which a path is appended: guessing `/v1/chat/completions`
 * onto a URL is the kind of convenience that fails silently against a gateway
 * that mounts it somewhere else.
 *
 * Each check spends tokens. At the default interval that is 1440 requests a
 * day, which is why max_tokens is capped low by default and the prompt is one
 * line.
 */
class LlmMonitorType extends MonitorType {
    name = "llm";

    /**
     * @inheritdoc
     */
    async check(monitor, heartbeat, _server) {
        const endpoint = assertSafeLlmBaseUrl(monitor.url, "The endpoint URL");
        if (!endpoint) {
            throw new Error("No endpoint URL is set for this monitor");
        }

        const model = (monitor.llm_model || "").trim();
        if (!model) {
            throw new Error("No model is set for this monitor");
        }

        const prompt = (monitor.llm_prompt || "").trim() || DEFAULT_PROMPT;
        const maxTokens = monitor.llm_max_tokens > 0 ? monitor.llm_max_tokens : DEFAULT_MAX_TOKENS;
        const configured = Number(monitor.timeout);
        const seconds = configured > 0 && configured <= MAX_TIMEOUT_SECONDS ? configured : DEFAULT_TIMEOUT_SECONDS;
        const timeout = seconds * 1000;

        const headers = { "Content-Type": "application/json" };
        if (monitor.llm_api_key) {
            headers.Authorization = `Bearer ${monitor.llm_api_key}`;
        }

        const started = dayjs().valueOf();

        let response;
        try {
            response = await axios.post(
                endpoint,
                {
                    model,
                    messages: [ { role: "user", content: prompt } ],
                    max_tokens: maxTokens,
                    // A streamed body would have to be reassembled before any of
                    // it could be asserted on, and nothing here needs the first
                    // token sooner than the last.
                    stream: false,
                },
                {
                    timeout,
                    maxContentLength: MAX_RESPONSE_BYTES,
                    maxBodyLength: MAX_RESPONSE_BYTES,
                    headers,
                    // A provider's own error is more useful than axios throwing
                    // on the status, and several return 200 with an error body.
                    validateStatus: () => true,
                }
            );
        } catch (e) {
            throw new Error(`Request failed: ${e.message}`);
        }

        const latency = dayjs().valueOf() - started;
        heartbeat.ping = latency;

        if (response.status >= 400) {
            throw new Error(`HTTP ${response.status}: ${describeBody(response.data)}`);
        }

        const body = response.data;
        if (!body || typeof body !== "object") {
            throw new Error("The endpoint returned a body that is not JSON");
        }

        /*
         * An error alongside a 200 is the case a status-code check misses, so it
         * is read before the completion rather than after failing to find one.
         */
        if (body.error) {
            const message = typeof body.error === "object" && typeof body.error.message === "string"
                ? body.error.message
                : describeBody(body.error);
            throw new Error(`The endpoint returned an error: ${message}`);
        }

        const content = completionContent(body);
        if (content === null) {
            throw new Error(`HTTP ${response.status} with no completion in the response`);
        }
        if (content.trim() === "") {
            throw new Error(`HTTP ${response.status} with an empty completion`);
        }

        const keyword = (monitor.keyword || "").trim();
        if (keyword) {
            const found = content.includes(keyword);
            if (monitor.invert_keyword ? found : !found) {
                const relation = monitor.invert_keyword ? "should not appear but does" : "does not appear";
                throw new Error(`"${keyword}" ${relation} in the completion: ${preview(content)}`);
            }
        }

        const maxLatency = monitor.llm_max_latency;
        if (maxLatency > 0 && latency > maxLatency) {
            throw new Error(`Answered in ${latency}ms, over the limit of ${maxLatency}ms`);
        }

        heartbeat.msg = describeSuccess(latency, body.usage, content);
        heartbeat.status = UP;
    }
}

/**
 * The assistant's text, from either shape a compatible endpoint may return.
 *
 * A single string is the common case. An array of content parts is what some
 * gateways answer with, and a monitor that reported "no completion" for one of
 * those would be wrong about a working endpoint.
 * @param {object} body parsed response body
 * @returns {string|null} the text, or null when there is no completion at all
 */
function completionContent(body) {
    const choice = Array.isArray(body.choices) ? body.choices[0] : null;
    if (!choice) {
        return null;
    }

    const content = choice.message?.content;
    if (typeof content === "string") {
        return content;
    }
    if (Array.isArray(content)) {
        const text = content
            .map((part) => (typeof part === "string" ? part : part?.text))
            .filter((part) => typeof part === "string")
            .join("");
        return text;
    }

    return null;
}

/**
 * A heartbeat message for a check that passed.
 * @param {number} latency milliseconds the request took
 * @param {object|undefined} usage the provider's token accounting, when present
 * @param {string} content the completion
 * @returns {string} the message
 */
function describeSuccess(latency, usage, content) {
    const parts = [ `${latency}ms` ];

    const total = usage?.total_tokens;
    if (Number.isFinite(total)) {
        parts.push(`${total} tokens`);
    }

    parts.push(preview(content));
    return parts.join(", ");
}

/**
 * A bounded, single-line excerpt of a completion.
 * @param {string} content the completion
 * @returns {string} the excerpt
 */
function preview(content) {
    const flat = content.replace(/\s+/g, " ").trim();
    return flat.length > CONTENT_PREVIEW_CHARS ? `${flat.slice(0, CONTENT_PREVIEW_CHARS)}…` : flat;
}

/**
 * A bounded description of a body that was not usable.
 * @param {any} body whatever arrived
 * @returns {string} something safe to put in a heartbeat
 */
function describeBody(body) {
    if (body == null) {
        return "no body";
    }
    const text = typeof body === "string" ? body : JSON.stringify(body);
    const flat = text.replace(/\s+/g, " ").trim();
    return flat.length > ERROR_BODY_CHARS ? `${flat.slice(0, ERROR_BODY_CHARS)}…` : flat;
}

module.exports = {
    LlmMonitorType,
    internals: { completionContent, describeSuccess, preview, describeBody },
};
