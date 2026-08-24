# MCP server and agent skills

Two ways for an AI client to use the [REST API](rest-api.md). Neither runs inside the monitoring process.

## MCP server

A separate Node process in [`mcp-server`](../../mcp-server/). It only calls `/api/v1`. Anything it can do, a script with the same key can do.

```bash
cd mcp-server
pnpm install
```

```json
{
    "mcpServers": {
        "uptime-gizmo": {
            "command": "node",
            "args": ["/path/to/mcp-server/index.mjs"],
            "env": {
                "UPTIME_GIZMO_URL": "https://uptime.example.com",
                "UPTIME_GIZMO_API_KEY": "uk1_..."
            }
        }
    }
}
```

Create the key in **Settings → API Keys**. Leave it read-only unless the agent must change monitors.

With a read-only key, only read tools are advertised. The API still refuses writes even if a client tries them.

Read tools cover overview, active incidents, recent changes, monitors, tags, maintenances, notification channels, proxies, Docker hosts, remote browsers, and Web3 networks. Credentials in those records are never returned.

Write tools (`create_monitor`, `update_monitor`) appear only when the key may write. They cover `http`, `keyword`, `ping`, `port`, `dns`, and the three Web3 types. **Deleting is not offered.**

Install details and the full tool list: [`mcp-server/README.md`](../../mcp-server/README.md).

## Claude Code skills

Two skills live in [`.claude/skills`](../../.claude/skills). They talk to `/api/v1` with `curl`; they do not need this repository checked out once the skill files are available to the agent.

| Skill | Does |
| --- | --- |
| `uptime-gizmo-status` | Read-only: is anything down, how is the estate, what changed |
| `uptime-gizmo-sync` | Create and update monitors (and tags). No delete |

Set `UPTIME_GIZMO_URL` and `UPTIME_GIZMO_API_KEY`. Status works with a read-only key. Sync needs a writable key — check `GET /api/v1/whoami` first (`readOnly: false`).
