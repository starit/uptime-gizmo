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

The interface has been migrated from Bootstrap to Tailwind CSS, with a token-driven design system covering both light and dark themes. That removed the framework's visual defaults in favour of a deliberate one — tighter corners, layered elevation, a retuned status palette, and a rebuilt public status page — and cut the shipped stylesheet by roughly half. See the [Design System](DESIGN.md) for the tokens and rules.

### Better monitoring

Uptime Gizmo builds on a broad monitoring foundation while working toward richer service-health signals—not just **“Is it up?”**, but **“Is it healthy?”**

Planned improvements include more monitoring types, stronger HTTP/API validation, latency tracking, SSL/TLS and domain checks, infrastructure monitoring, flexible alert conditions, dependency context, and better history and analytics.

### On-chain monitoring

Two monitor types for teams running anything on a chain, configured against RPC
endpoints that are set up once and shared:

- **Balances**, native or ERC-20, against a floor you set. A relayer, paymaster or
  deployer running dry is slow, predictable and usually noticed only when
  transactions stop landing.
- **RPC health**, measured as the age of the newest block. A node that has fallen
  out of consensus keeps answering every call and keeps returning a block number —
  it just stops going up, which no ordinary HTTP check can see.

Amounts are compared as integers throughout, because a chain counts in units of
10^-18 and a rounded comparison reports a drained account as funded.

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

Structured interfaces for automation and AI agents, partly built and partly
planned. What each is, and where it stands:

**Working today**

- A versioned REST API under `/api/v1`: monitors (read, create, update), tags,
  maintenance windows, and `whoami`, plus `overview`, `incidents/active` and
  `changes` — endpoints shaped around the questions an agent asks rather than
  around database tables.
- **Read-only API keys.** A key can be marked read-only, so an agent can be
  given access that observes everything and changes nothing. New keys default to
  read-only.
- A machine-readable description at `/api/v1/openapi.json`, generated from the
  same field definitions the API enforces, so it cannot drift.
- **An [MCP server](mcp-server/)**, in this repository as a separate package with
  its own process. It reaches Uptime Gizmo only through the REST API, so the
  monitoring server never hosts the protocol and an agent can do nothing a script
  could not. With a read-only key it offers eight read tools; creating and
  updating monitors appear only when the key permits it.

**Planned**

- The remaining resources, cursor pagination, and per-resource ownership rules.
- Webhooks and structured event streams.
- Multiple users, with a deliberately minimal admin/non-admin split.

Two Claude Code skills ship with the repository, under
[.claude/skills](.claude/skills): `uptime-gizmo-status` reads an instance, and
`uptime-gizmo-sync` creates and updates monitors from a project during
development. Both talk to `/api/v1` with an API key and need no local checkout of
this repository.

Design and guardrails: [REST API plan](docs/plans/rest-api.md),
[MCP and agent-facing API plan](docs/plans/mcp-and-agent-api.md),
[multi-user plan](docs/plans/multi-user.md).

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

Planned work in more detail is in the [Roadmap](ROADMAP.md).

## Upstream acknowledgement

Uptime Gizmo is a fork of [Uptime Kuma](https://github.com/louislam/uptime-kuma) by Louis Lam and its contributors. Thank you — easy self-hosting, broad monitoring support, and a strong notification ecosystem are all theirs, and this project would not exist without that work.

We aim to preserve those strengths while taking the product in a more modern, automated, and AI-friendly direction.

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

### Backing up

There is no backup feature in the interface: backing Uptime Gizmo up means
copying its data directory. One way of doing that loses recent data without
reporting anything, so read [Backing up and restoring](docs/backup-and-restore.md)
before relying on a copy.

The short version, safe while the instance is running:

```bash
sqlite3 data/kuma.db "VACUUM INTO '/path/to/backup-$(date +%F).db'"
tar czf uploads-$(date +%F).tar.gz -C data upload screenshots docker-tls
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
