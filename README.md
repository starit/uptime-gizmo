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

Uptime Gizmo is a self-hosted monitoring platform. It is a fork of
[Uptime Kuma](https://github.com/louislam/uptime-kuma).

Everything Kuma is good at is still here: easy self-hosting, twenty-odd monitor
types, a long list of notification providers. This fork adds an API and an MCP
server, on-chain monitoring, and a rebuilt interface.

## What the fork adds

Everything in this section works today. Planned work is in the
[Roadmap](ROADMAP.md).

### An API, and an MCP server on top of it

- **REST API at `/api/v1`.** Monitors, tags, maintenance windows and `whoami`,
  plus `overview`, `incidents/active` and `changes`.
- **API keys can be read-only**, and new keys are read-only by default. An agent
  can be given a key that sees everything and changes nothing.
- **An OpenAPI description** at `/api/v1/openapi.json`, generated from the field
  definitions the API enforces.
- **An [MCP server](mcp-server/).** Separate package, separate process. It talks
  to Uptime Gizmo only through the REST API, so the monitoring server never
  hosts the protocol. A read-only key gets the read tools. Creating and updating
  monitors appear when the key allows it.
- **Two Claude Code skills** in [.claude/skills](.claude/skills).
  `uptime-gizmo-status` reads an instance. `uptime-gizmo-sync` creates and
  updates monitors from a project during development. Neither needs a checkout
  of this repository.

### On-chain monitoring

Two monitor types. RPC endpoints are set up once under **Settings → Web3
Networks** and shared between monitors.

- **Balance.** Native or ERC-20, against a minimum you set. Catches a relayer,
  paymaster or deployer running dry.
- **RPC health.** Fails when the newest block gets too old. Catches a node that
  still answers every call after falling out of consensus.

Balances are compared as integers. Chains count in units of 10^-18, where a
float comparison can report a drained account as funded.

Ethereum JSON-RPC only, so any EVM chain works: Ethereum, Polygon, BSC,
Arbitrum, Optimism, Base, testnets, a local node. Bitcoin, Solana and Cosmos do
not.

### A rebuilt interface

Bootstrap is gone. The UI is Tailwind on a design token system with light and
dark themes, and the shipped stylesheet is about half the size it was.
[DESIGN.md](DESIGN.md) has the tokens and the rules.

The public status page was rebuilt with it:

- The overall status leads the page. It used to open with one service's
  incident.
- The service list is one surface instead of a card per group. About 30% shorter
  for the same services.
- Incident severity has its colour back.

### Themes, including generated ones

Custom themes live on the instance and are shared by everyone who signs in.
Import one as JSON, or describe one in a sentence and have a configured AI
provider generate it, using [themed.js](https://github.com/starit/themed.js).
Generation runs on the server, so the API key stays there.

Every theme is checked against the contrast [DESIGN.md](DESIGN.md) requires,
4.5:1 for text and 3:1 for indicators, and rejected if it falls short. Themes
apply to the workspace and to public status pages.

### Multiple users

Everyone signs in with their own password, and everyone manages the whole
instance. The [multi-user plan](docs/plans/multi-user.md) says what that does and
does not mean.

## Inherited from Uptime Kuma

- HTTP(S), TCP, WebSocket, Ping, DNS, Push and Docker container monitoring
- HTTP(S) keyword and JSON query checks, SNMP, MQTT, RabbitMQ, NTP, game servers
- MySQL, PostgreSQL, Microsoft SQL Server, Oracle, MongoDB and Redis
- Multiple status pages, each able to serve on its own domain
- Notifications through a long list of services
- Response-time charts, certificate information, maintenance windows
- Proxies, two-factor authentication, multi-language support

## Getting started

You need Node.js 20.4 or later, pnpm 10 or later, and Git. `corepack enable pnpm`
uses the version pinned in `package.json`.

```bash
git clone https://github.com/starit/uptime-gizmo.git
cd uptime-gizmo
pnpm install
pnpm run dev
```

The frontend runs at <http://localhost:3000> and the backend at
<http://localhost:3001>. Use `pnpm start` to run the backend alone.

There is a [Dockerfile](docker/dockerfile), but no published image yet.
`compose.yaml` is written for that image and will not pull today. Images and
upgrade documentation come once release practices are settled.

### Backing up

There is no backup feature in the interface. Backing Uptime Gizmo up means
copying its data directory, and one way of doing that loses recent data without
saying so. Read [Backing up and restoring](docs/backup-and-restore.md) before
relying on a copy.

The short version, safe while the instance is running:

```bash
sqlite3 data/kuma.db "VACUUM INTO '/path/to/backup-$(date +%F).db'"
tar czf uploads-$(date +%F).tar.gz -C data upload screenshots docker-tls
```

## Where this is going

The [Roadmap](ROADMAP.md) has the current list. The short version:

- Better status pages.
- Checks that report health, not just whether something answered.
- The write side of the API.
- More context around an incident.

Design notes: [REST API plan](docs/plans/rest-api.md),
[MCP and agent-facing API plan](docs/plans/mcp-and-agent-api.md),
[multi-user plan](docs/plans/multi-user.md).

## Upstream acknowledgement

Uptime Gizmo is a fork of [Uptime Kuma](https://github.com/louislam/uptime-kuma)
by Louis Lam and its contributors. Easy self-hosting, broad monitoring support
and a strong notification ecosystem are all theirs. This project would not exist
without that work. Thank you.

## Contributing

Read the [Contributing Guide](CONTRIBUTING.md), the
[Code of Conduct](CODE_OF_CONDUCT.md) and the [Security Policy](SECURITY.md). For
anything larger, open an issue first.

## License

MIT. See [LICENSE](LICENSE).
