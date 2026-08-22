<div align="center">
  <img src="./public/images/uptime-gizmo-logo-horizontal-light.png" width="760" alt="Uptime Gizmo — Uptime is money, friend." />
  <p><strong>Modern monitoring for humans and AI agents.</strong></p>
</div>

<p align="center">
  <a href="https://github.com/starit/uptime-gizmo/stargazers"><img src="https://img.shields.io/github/stars/starit/uptime-gizmo?style=flat&color=ECAB24" alt="GitHub stars" /></a>
  <a href="https://hub.docker.com/r/starit/uptime-gizmo"><img src="https://img.shields.io/docker/v/starit/uptime-gizmo/beta?label=docker&color=1E64E7" alt="Docker image" /></a>
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
- Notifications via Telegram, Discord, Slack, email (SMTP) and
  [90+ other providers](src/components/notifications)
- Response-time charts, certificate information, maintenance windows
- Proxies, two-factor authentication, multi-language support

## Getting started

Images are on [Docker Hub](https://hub.docker.com/r/starit/uptime-gizmo) and
[GHCR](https://github.com/starit/uptime-gizmo/pkgs/container/uptime-gizmo), for
linux/amd64, linux/arm64 and linux/arm/v7. Docker is the supported way to run an
instance. The server listens on port 3001 on every interface
(`http://localhost:3001` or `http://<your-ip>:3001`).

> [!WARNING]
> SQLite does not work on NFS. Map `/app/data` to a local directory or a Docker
> volume.

### Docker Compose

From an empty directory, without cloning this repository:

```bash
mkdir uptime-gizmo
cd uptime-gizmo
curl -o compose.yaml https://raw.githubusercontent.com/starit/uptime-gizmo/master/compose.yaml
docker compose up -d
```

If you already have the repo checked out, `docker compose up -d` in the root is
enough. [compose.yaml](compose.yaml) bind-mounts `./data` to `/app/data` and
pulls `starit/uptime-gizmo:beta`.

To expose the UI on localhost only, change the published port to
`127.0.0.1:3001:3001`.

### Docker

```bash
docker run -d --restart=always -p 3001:3001 -v uptime-gizmo:/app/data --name uptime-gizmo starit/uptime-gizmo:beta
```

The named volume `uptime-gizmo` is the data directory. Localhost only:

```bash
docker run -d --restart=always -p 127.0.0.1:3001:3001 -v uptime-gizmo:/app/data --name uptime-gizmo starit/uptime-gizmo:beta
```

The same tags are on GHCR as `ghcr.io/starit/uptime-gizmo`.

### Image tags

| Tag | What it is |
| --- | --- |
| `beta` | Current prerelease. This tag moves. |
| `3.0.0-beta.1` | A pinned prerelease. Use this if you do not want `beta` to change under you. |
| `nightly2` | Unreleased `main`. |

`beta-slim` and `3.0.0-beta.1-slim` omit Chromium, embedded MariaDB and extra
fonts. `beta-rootless` and `*-rootless` run as the `node` user. There is no
`:3` image yet; that tag is reserved for a final 3.x release.

### Updating

Compose:

```bash
docker compose pull && docker compose up -d
```

A container started with `docker run` keeps its data in the named volume. Pull
the new image, then replace the container:

```bash
docker pull starit/uptime-gizmo:beta
docker stop uptime-gizmo
docker rm uptime-gizmo
docker run -d --restart=always -p 3001:3001 -v uptime-gizmo:/app/data --name uptime-gizmo starit/uptime-gizmo:beta
```

### From source

You need Node.js 20.4 or later, pnpm 10 or later, and Git. `corepack enable pnpm`
uses the version pinned in `package.json`.

Development (Vite frontend on 3000, backend on 3001):

```bash
git clone https://github.com/starit/uptime-gizmo.git
cd uptime-gizmo
pnpm install
pnpm run dev
```

Production, without Docker:

```bash
git clone https://github.com/starit/uptime-gizmo.git
cd uptime-gizmo
pnpm install --frozen-lockfile
pnpm run build
pnpm start
```

`pnpm start` serves the built UI from the backend on port 3001. To keep it
running in the background:

```bash
pnpm add --global pm2
pm2 start server/server.js --name uptime-gizmo
pm2 startup && pm2 save
```

`pm2 monit` shows the live log. Host and port can be set with
`UPTIME_GIZMO_HOST` and `UPTIME_GIZMO_PORT` (or `PORT`). Data lives in `./data`
unless `DATA_DIR` says otherwise.

If you are locked out of the first account, stop the process and run
`pnpm run reset-password`. `pnpm run remove-2fa` clears two-factor authentication
the same way.

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
