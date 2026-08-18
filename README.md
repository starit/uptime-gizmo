<div align="center">
  <img src="./public/images/uptime-gizmo-logo-horizontal-light.png" width="760" alt="Uptime Gizmo — Uptime is money, friend." />
  <p><strong>Modern monitoring for humans and AI agents.</strong></p>
</div>

<p align="center">
  <a href="https://github.com/starit/uptime-gizmo/stargazers"><img src="https://img.shields.io/github/stars/starit/uptime-gizmo?style=flat&color=ECAB24" alt="GitHub stars" /></a>
  <a href="https://github.com/starit/uptime-gizmo/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-0A151E" alt="MIT License" /></a>
  <a href="https://github.com/starit/uptime-gizmo/issues"><img src="https://img.shields.io/github/issues/starit/uptime-gizmo?color=1E64E7" alt="GitHub issues" /></a>
</p>

# Uptime Gizmo

> **Uptime is money, friend!**

Uptime Gizmo is a self-hosted monitoring platform built on a proven open-source monitoring foundation. It is being developed with a focus on modern status pages, richer monitoring, automation, and AI-agent integrations.

The goal is simple: make monitoring easy for people to understand and structured enough for agents to operate.

For the product visual system, logo usage, theme tokens, and UI implementation rules, see the [Design System](DESIGN.md).

## Why Uptime Gizmo?

### Beautiful status pages

Status pages should be useful, clear, and worth sharing. Uptime Gizmo is moving toward a more polished public status page experience for projects, products, APIs, and infrastructure, including:

- Clearer service grouping and incident presentation
- Better historical uptime visualization
- More branding and customization options
- Improved mobile layouts and custom domains

### Better monitoring

Uptime Gizmo builds on a broad monitoring foundation while working toward richer service-health signals—not just **“Is it up?”**, but **“Is it healthy?”**

Planned improvements include more monitoring types, stronger HTTP/API validation, latency tracking, SSL/TLS and domain checks, infrastructure monitoring, flexible alert conditions, dependency context, and better history and analytics.

### Built for AI agents

AI integration should not depend on browser automation. Uptime Gizmo is being designed so agents can work with monitoring as a first-class system:

- Create, update, and remove monitors
- Discover services that should be monitored
- Inspect health and query incident history
- Analyze failures and suggest monitoring rules
- Create temporary monitors during deployments
- Maintain monitoring configuration as infrastructure changes

For example:

```text
Monitor api.example.com every 30 seconds and alert me if latency exceeds 500ms.
```

## Agent-friendly interfaces

The project is preparing structured interfaces for automation and AI agents. The
shape is planned; none of it is built yet.

- **A versioned REST API** under `/api/v1` for monitors, status, metrics and
  incidents — see [the REST API plan](docs/plans/rest-api.md).
- **An MCP server**, shipped from this repository as a separate package with its
  own process. It reaches Uptime Gizmo only through the REST API, so the
  monitoring server never hosts the protocol and an agent can do nothing a
  script could not. Installable directly by an agent, or discoverable through a
  third-party platform.
- **Read-only credentials.** An API key can be marked read-only, so an agent can
  be given access that observes everything and changes nothing.
- Webhooks and structured event streams.

See [the MCP and agent-facing API plan](docs/plans/mcp-and-agent-api.md) for the
design and its guardrails.

**None of these interfaces exist today.** They are a roadmap, not a feature
list.

## Current capabilities

Uptime Gizmo currently includes these core monitoring capabilities:

- HTTP(S), TCP, WebSocket, Ping, DNS, Push, and Docker container monitoring
- HTTP(S) keyword and JSON query checks
- Steam game server monitoring
- Multiple status pages and custom domains
- Notifications through many common services
- Response-time charts and certificate information
- Proxy and two-factor authentication support
- Multi-language support

## Project direction

Development is focused on four connected areas:

1. **Beautiful status pages** — Make public uptime and incident information clean and understandable.
2. **Better monitoring** — Expand availability checks toward richer service-health monitoring.
3. **AI-agent native workflows** — Let agents safely create and maintain monitoring infrastructure.
4. **Smarter operations** — Provide context that helps people and agents understand incidents and decide what to do next.

## Upstream acknowledgement

Uptime Gizmo originated from an open-source monitoring project created by Louis Lam and its contributors.

That project provides the foundation for this work. We aim to preserve its strengths—easy self-hosting, broad monitoring support, a friendly UI, and a strong notification ecosystem—while taking the product in a more modern, automated, and AI-friendly direction.

## Getting started

### Requirements

- Node.js >= 20.4.0
- pnpm >= 10 (`corepack enable pnpm` uses the version pinned in `package.json`)
- Git

### Development

```bash
git clone https://github.com/starit/uptime-gizmo.git
cd uptime-gizmo
pnpm install
pnpm run dev
```

The development frontend runs at <http://localhost:3000>. The backend runs at <http://localhost:3001>.

To run only the backend:

```bash
pnpm start
```

Uptime Gizmo is under active development. Docker images, migration guidance, and upgrade documentation will be added as release practices are established.

## Contributing

Please read:

- [Contributing Guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)

For larger changes, open an issue first to discuss the proposed direction.

## License

Uptime Gizmo is licensed under the [MIT License](LICENSE).
