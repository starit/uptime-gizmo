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

Write tools (`create_monitor`, `update_monitor`) appear only when the key may write. They accept the same types as the [REST API](rest-api.md). **Deleting is not offered.**

Install details and the full tool list: [`mcp-server/README.md`](../../mcp-server/README.md).

## Agent skills

Two skills live in [`skills`](../../skills), each carrying a version in its front matter. A skill is a `SKILL.md` and nothing more: the instructions reach the instance with `curl` and an API key, so nothing in them assumes a particular agent runtime. They do not need this repository checked out once the file is available to the agent. Install one by fetching it from GitHub into the directory your agent reads skills from — `.claude/skills` for Claude Code — inside the project that should have it. They are deliberately not loaded by this repository, so an agent editing Uptime Gizmo does not silently gain the ability to reconfigure a production instance.

| Skill | Version | Does |
| --- | --- | --- |
| [`uptime-gizmo-status`](https://github.com/starit/uptime-gizmo/blob/main/skills/uptime-gizmo-status/SKILL.md) | 1.0.1 | Read-only: is anything down, how is the estate, what changed |
| [`uptime-gizmo-sync`](https://github.com/starit/uptime-gizmo/blob/main/skills/uptime-gizmo-sync/SKILL.md) | 1.0.4 | Create and update monitors (and tags). No delete |

```bash
mkdir -p .claude/skills/uptime-gizmo-status
curl -fsSL -o .claude/skills/uptime-gizmo-status/SKILL.md \
  https://raw.githubusercontent.com/starit/uptime-gizmo/main/skills/uptime-gizmo-status/SKILL.md
```

That same `curl` is how a copy is updated. Compare the `version` in the front matter; if GitHub's is newer, replace the local file.

Set `UPTIME_GIZMO_URL` and `UPTIME_GIZMO_API_KEY`. Status works with a read-only key. Sync needs a writable key — check `GET /api/v1/whoami` first (`readOnly: false`).
