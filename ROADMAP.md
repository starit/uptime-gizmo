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
  content rather than the status code.

## Short-term

- Finish the write side of the HTTP API: maintenance windows, status-page
  incidents, and the resources whose configuration carries credentials.
- Notification channels, proxies and integrations over the API, once there is a
  decided answer for accepting a credential through it.

## Long-term

- Migrate the codebase to TypeScript.
- Support more notification providers.
- Add Solana and other non-EVM chains to Web3 monitoring; today's types speak
  Ethereum JSON-RPC only.
- Add self-monitoring for Uptime Gizmo, including application, database, worker,
  storage, and local server health.
- Expand stability and reliability testing.
