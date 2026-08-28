# LLM endpoint monitoring

One monitor type, `llm`. It sends a chat completion on every check and asserts on the content that comes back.

## What it is for

An HTTP monitor on the same URL already covers reachability, and that is the failure this type is not for. It exists for the ones that keep a status-code check green:

- a provider answering `200` with an error object in the payload;
- a model that has been deprecated or renamed out from under the caller;
- an empty completion, from a gateway or an exhausted quota;
- an answer that arrives long after the application calling it gave up.

## Configuration

**URL** is the **full** chat-completions endpoint — `https://api.openai.com/v1/chat/completions`, `http://127.0.0.1:11434/v1/chat/completions`. Nothing appends a path for you: a gateway may mount it elsewhere, and guessing fails silently against exactly the setup you were trying to watch.

The request body is the OpenAI chat-completions shape, which self-hosted servers (Ollama, vLLM, llama.cpp, LiteLLM) and hosted providers behind a compatible gateway all accept.

The endpoint is checked before any request is made, through the same policy that governs the LLM base URL in Settings, because it receives the same kind of credential: http or https only, no credentials in the URL, no link-local or cloud-metadata address, and HTTPS unless the host is localhost.

| Field | Meaning |
| --- | --- |
| **Model** | Sent as `model`. Required. Name the model your application actually calls — a rename is one of the failures this type catches. |
| **API Key** | Sent as `Authorization: Bearer`. Leave empty for an endpoint that needs none. |
| **Prompt** | The user message. Defaults to asking for the single word `ok`. |
| **Max Tokens** | Cap on the completion. Defaults to 16. |
| **Maximum Latency** | Milliseconds. A successful but slower answer fails the check. Empty records latency without alerting. |
| **Keyword** | Optional. Must appear in the completion text, not the whole response body. `Invert Keyword` flips it. |
| **Timeout** | The request timeout, in seconds, shared with the HTTP types. |

## Every check spends tokens

At a 60-second interval a monitor makes 1440 completion requests a day. Against a metered endpoint, use an interval measured in minutes and leave **Max Tokens** low. The default prompt and cap are both deliberately small.

## What a heartbeat records

On success: the latency, the provider's `usage.total_tokens` when it reported one, and a bounded excerpt of the completion. On failure: the reason, as the endpoint gave it — an HTTP status with a bounded slice of the body, the provider's own error message, `no completion in the response`, `an empty completion`, the keyword that did not appear, or the latency that exceeded the ceiling.

A completion delivered as an array of content parts is read as well as a plain string; a monitor reporting "no completion" against a working gateway would be wrong.

## The API key is not settable over the HTTP API

There is no `llmApiKey` field on `POST /api/v1/monitors`. Accepting a credential through that API is a decision this project has not taken, and every other credential-bearing resource — notification channels, proxies, Web3 network RPC URLs — is entered by a human for the same reason.

So a monitor created over the API can reach an endpoint that needs no key, or one whose key is already set in the monitor's own form. Everything else about the type is writable:

```bash
curl -s -u "api:$KEY" -X POST -H 'Content-Type: application/json' -d '{
  "name": "local llama",
  "type": "llm",
  "url": "http://127.0.0.1:11434/v1/chat/completions",
  "llmModel": "llama3.2",
  "llmPrompt": "Reply with the single word: ok",
  "llmMaxTokens": 16,
  "keyword": "ok",
  "llmMaxLatency": 5000,
  "interval": 300
}' "$URL/api/v1/monitors"
```

`llmModel`, `llmPrompt`, `llmMaxTokens` and `llmMaxLatency` are the type's own writable fields. The endpoint, timeout and content assertion are `url`, `timeout` and `keyword`/`invertKeyword` — the same fields an HTTP keyword monitor uses, meaning the same thing.

The MCP `create_monitor` tool takes the same fields. See [MCP and agents](mcp-and-agents.md).

## Not in this type

Streaming (`stream` is sent as `false`; nothing here needs the first token sooner than the last), embeddings and other non-chat endpoints, token-cost accounting beyond what the provider reports, tool-call or structured-output assertions, and multiple assertions on one response.
