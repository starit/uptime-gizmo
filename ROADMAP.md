# Roadmap

Uptime Gizmo is actively evolving toward a more modern, extensible, and
agent-friendly monitoring platform. The following items describe the current
areas of planned work and may change as the project develops.

## Done

- The interface is built with Tailwind CSS; Bootstrap is gone.
- Multiple people can sign in with their own passwords. Everyone manages the
  whole instance — see [the plan](docs/plans/multi-user.md) for what that does
  and does not mean.
- An HTTP API at `/api/v1`, with a reference in the product that renders the
  generated description.
- An MCP server, in [mcp-server](mcp-server), and two agent skills under
  [skills](skills).
- Themes generated with Themed.js, including from a description.
- Web3 monitoring on EVM chains: address balances, native and ERC-20, RPC
  endpoint health, and reading a value out of a contract to compare against a
  threshold. Every call is Ethereum JSON-RPC.
- LLM endpoint monitoring: one chat completion per check, asserting on the
  content rather than the status code. Credentials are saved once and named by
  the monitors that use them, so the key is not repeated per monitor.
- Notification channels over the API: created, updated, deleted, and attached
  to monitors. Each provider publishes the fields it needs, so a client can
  build the form rather than guess it. What a channel's settings contain is
  never returned — for most providers that object is the credential.
- A monitor's history over the API: rolled-up buckets to draw a chart from, and
  the individual checks behind them.
- Per-key request allowances separated from the limit on guessing a key, so a
  busy integration cannot be throttled by someone else's failed logins.

## Short-term

- Add an administrator-facing, database-independent configuration export and
  replace import. It preserves target logins and omits monitoring history;
  filesystem assets and full disaster recovery remain manual.
- Finish the write side of the HTTP API: maintenance windows and status-page
  incidents.
- Proxies and integrations over the API. Notification channels answered the
  question of how a credential is accepted — the settings go in and never come
  back out — and the same answer should carry to these.

## Long-term

- Migrate the codebase to TypeScript.
- Support more notification providers.
- Add Solana and other non-EVM chains to Web3 monitoring; today's types speak
  Ethereum JSON-RPC only.
- Add self-monitoring for Uptime Gizmo, including application, database, worker,
  storage, and local server health.
- Expand stability and reliability testing.
