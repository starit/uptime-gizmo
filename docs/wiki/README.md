# What Uptime Gizmo adds

<p align="center">
  <img src="../../public/images/uptime-gizmo-logo-horizontal-light.png" width="480" alt="Uptime Gizmo wordmark: gear-and-goggles mark beside the product name." />
</p>

Uptime Gizmo is a fork of [Uptime Kuma](https://github.com/louislam/uptime-kuma). HTTP checks, notifications, status pages, and the rest of Kuma still work. This wiki covers **what the fork added**, and only what works today.

Planned work is in the [Roadmap](../../ROADMAP.md), not here.

## Look

The interface was rebuilt on a token system (light and dark). These shots are a demo instance with three public HTTP checks.

**Login**

<img src="images/login.png" alt="Login screen with Gizmo and the slogan Uptime is money, friend." width="760" />

**Empty dashboard**

<img src="images/dashboard-empty.png" alt="Empty dashboard: Gizmo, the slogan, and a single Add New Monitor control." width="760" />

**Dashboard, light**

<img src="images/dashboard-light.png" alt="Dashboard in light theme: monitor list, quick stats, and recent events." width="760" />

**Dashboard, dark**

<img src="images/dashboard-dark.png" alt="The same dashboard in dark theme." width="760" />

**Public status page**

<img src="images/status-page.png" alt="Public status page: overall status first, then a single service list. Gizmo in the footer." width="760" />

More on the public page: [status page](status-page.md).

## Brand

The product logo is a gear, a “G,” and goggles. Gizmo is the engineer mascot — login, empty dashboard, and the public footer. The workshop sheet is campaign art, not used as a UI icon.

<p align="center">
  <img src="../../public/images/uptime-gizmo-mark-light.png" width="96" alt="Uptime Gizmo mark: gear, letter G, and goggles." />
  &nbsp;&nbsp;&nbsp;
  <img src="../../public/images/gizmo-mascot-engineer.png" width="220" alt="Gizmo standing, holding a wrench." />
</p>

<p align="center">
  <img src="../../public/images/gizmo-monitoring-workshop-hero.png" width="760" alt="Campaign sheet: Gizmo in a monitoring workshop. Slogan: Uptime is money, friend." />
</p>

| Feature | What it is for |
| --- | --- |
| [REST API](rest-api.md) | Read state and history; safely provision monitors, tags, and notification channels over HTTP |
| [MCP and agent skills](mcp-and-agents.md) | An AI client can ask what is down, and optionally create monitors |
| [LLM endpoint monitoring](llm-monitoring.md) | Check that an inference endpoint still returns usable output |
| [Web3 monitoring](web3-monitoring.md) | Watch balances, RPC freshness, and one value from a contract |
| [Themes](themes.md) | Shared palettes, including ones generated from a description |
| [Multiple logins](multiple-logins.md) | Separate passwords for the same instance |
| [Backup](backup.md) | Move monitoring configuration between SQLite, MariaDB, and MySQL instances without moving accounts or history |
| [Public status page](status-page.md) | The public page was rebuilt; overall status leads |

Install and full-backup guidance stay in the [README](../../README.md).
