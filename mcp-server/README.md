# Uptime Gizmo MCP server

An [MCP](https://modelcontextprotocol.io) server that lets an AI agent read the
state of an Uptime Gizmo instance, and — if you choose — create and update
monitors.

It runs as its own process and reaches Uptime Gizmo only through the REST API at
`/api/v1`. The monitoring server does not host this protocol: its job is to
notice when production breaks, and nothing that could crash it or block its event
loop belongs in it. A useful consequence is that anything this server can do, a
script holding the same key could do, so authorization lives in one place.

## Install

Published separately from the main application, and installed separately:

```bash
cd mcp-server
pnpm install
```

## Configure

```bash
export UPTIME_GIZMO_URL=https://uptime.example.com   # defaults to http://localhost:3001
export UPTIME_GIZMO_API_KEY=uk1_...
```

Create the key in **Settings → API Keys**. **Leave it read-only** unless this
agent genuinely needs to change your monitoring. New keys default to read-only.

With a read-only key the server offers eight read tools and does not advertise
the writing ones. That is a convenience, not the control: the API refuses a
mutating request from a read-only key regardless of what this server offers.

### Claude Code, Claude Desktop, or any MCP client

```json
{
    "mcpServers": {
        "uptime-gizmo": {
            "command": "node",
            "args": [ "/path/to/mcp-server/index.mjs" ],
            "env": {
                "UPTIME_GIZMO_URL": "https://uptime.example.com",
                "UPTIME_GIZMO_API_KEY": "uk1_..."
            }
        }
    }
}
```

## Tools

Always available:

| Tool | What it answers |
| --- | --- |
| `whoami` | Which credential is in use, and whether it may write |
| `get_overview` | State of every monitor, since when, 24-hour uptime |
| `get_active_incidents` | Only what is down or degraded now |
| `get_recent_changes` | State transitions in a window |
| `list_monitors` | Monitor configuration, paginated |
| `get_monitor` | One monitor by id |
| `list_tags` | Tags |
| `list_maintenances` | Maintenance windows |

Offered only when the key may write:

| Tool | Side effects |
| --- | --- |
| `create_monitor` | Begins checking a target; its first result may notify |
| `update_monitor` | Restarts the monitor; may change whether it alerts |

Every tool description states its side effects, so a model can weigh
consequences before calling.

**Deleting is deliberately absent.** An agent that can delete a monitor can
silently stop monitoring production, and the failure is invisible precisely
because monitoring is what stopped. Creating and updating are recoverable.

## Bounds

`get_recent_changes` is bounded by the server: 24 hours by default, 168 at most,
500 transitions per response. When a request exceeds the cap, the response says
so rather than quietly returning less. `list_monitors` is paginated — a caller
that ignores `page.nextCursor` is seeing a partial list.

## Design

See [the MCP and agent-facing API plan](../docs/plans/mcp-and-agent-api.md) for
the reasoning, including why the read surface is split between public and
credentialed access, and what is intentionally not exposed.
