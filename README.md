<div align="center">
  <img src="./public/images/uptime-gizmo-logo-horizontal-light.png" width="760" alt="Uptime Gizmo — Uptime is money, friend." />
  <p><strong>Modern monitoring for humans and AI agents.</strong></p>
</div>

<p align="center">
  <a href="https://github.com/starit/uptime-gizmo/stargazers"><img src="https://img.shields.io/github/stars/starit/uptime-gizmo?style=flat&color=ECAB24" alt="GitHub stars" /></a>
  <a href="https://hub.docker.com/r/starit/uptime-gizmo"><img src="https://img.shields.io/docker/v/starit/uptime-gizmo/beta?label=docker&color=1E64E7" alt="Docker image" /></a>
  <a href="https://github.com/starit/uptime-gizmo/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-0A151E" alt="MIT License" /></a>
  <a href="https://github.com/starit/uptime-gizmo/issues"><img src="https://img.shields.io/github/issues/starit/uptime-gizmo?color=1E64E7" alt="GitHub issues" /></a>
</p>

# Uptime Gizmo

> **Uptime is money, friend!**

Uptime Gizmo is a self-hosted monitoring platform. It is a fork of
[Uptime Kuma](https://github.com/louislam/uptime-kuma).

Everything Kuma is good at is still here: easy self-hosting, twenty-odd monitor
types, a long list of notification providers. This fork adds an API and an MCP
server, monitoring for AI and on-chain infrastructure, and a rebuilt interface.

**[Wiki](docs/wiki)** — what this fork added, in short. Open it for
screenshots of the current UI (login, dashboard, dark theme, public status
page), plus the mascot and logo.

## What the fork adds

Everything in this section works today. Planned work is in the
[Roadmap](ROADMAP.md). The same notes, with screenshots, are in the
[wiki](docs/wiki).

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
- **Two agent skills** in [skills](skills), versioned. Each is a `SKILL.md`
  with front matter and nothing else — the instructions reach the instance with
  `curl` and an API key, so no part of them is tied to one agent runtime. Fetch
  one into wherever your agent reads skills from (`.claude/skills` for Claude
  Code). Current copies:
  [`uptime-gizmo-status` 1.0.1](https://github.com/starit/uptime-gizmo/blob/main/skills/uptime-gizmo-status/SKILL.md)
  (reads an instance) and
  [`uptime-gizmo-sync` 1.0.4](https://github.com/starit/uptime-gizmo/blob/main/skills/uptime-gizmo-sync/SKILL.md)
  (creates and updates monitors). Re-fetch from those URLs to update a copy.
  Neither needs a checkout of this repository.

### AI endpoint monitoring

One monitor type, `llm`. It sends a chat completion on every check and asserts
on the content that comes back, which is the part an HTTP check cannot see. A
provider answering 200 with an error object in the payload, a model deprecated
or renamed out from under the caller, an empty completion from an exhausted
quota, and an answer that arrives after the application gave up all keep a
status-code check green.

The URL is the full chat-completions endpoint — nothing appends a path for you,
because a gateway may mount it elsewhere and guessing fails silently. The
request body is the OpenAI chat-completions shape, which Ollama, vLLM,
llama.cpp, LiteLLM and hosted providers behind a compatible gateway all accept.
`Keyword` asserts on the completion text rather than the whole body, and an
optional latency ceiling fails a successful answer that took too long.

Every check spends tokens: at a 60-second interval that is 1440 completions a
day, so the default prompt is one line and the token cap is 16. Use an interval
measured in minutes against a metered endpoint. Details, and why the API key is
not settable over the HTTP API, are in the
[wiki](docs/wiki/llm-monitoring.md).

### On-chain monitoring

Three monitor types, all EVM. RPC endpoints are set up once under **Settings →
Web3 Networks** and shared between monitors. Every check is Ethereum JSON-RPC
(`eth_getBalance`, `eth_getBlockByNumber`, `eth_call`) — not a generic "web3"
call.

- **Balance.** Native or ERC-20, against a minimum you set. Catches a relayer,
  paymaster or deployer running dry.
- **RPC health.** Fails when the newest block gets too old. Catches a node that
  still answers every call after falling out of consensus.
- **Contract value.** Reads one value out of a contract and compares it against a
  threshold — reserves, an oracle answer, a supply cap, a paused flag, an owner
  address. You supply the calldata; nothing here encodes it for you, and the form
  will make the call once so you can check the value before saving.

Amounts are compared as integers. Chains count in units of 10^-18, where a float
comparison can report a drained account as funded, or a threshold as met.

Any EVM chain works: Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, testnets,
a local node. Bitcoin, Solana and Cosmos do not. Solana and other non-EVM chains
are [planned](ROADMAP.md).

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

## 🔧 How to Install

Images are on [Docker Hub](https://hub.docker.com/r/starit/uptime-gizmo) and
[GHCR](https://github.com/starit/uptime-gizmo/pkgs/container/uptime-gizmo), for
linux/amd64, linux/arm64 and linux/arm/v7. Docker is the supported way to run an
instance.

### 🐳 Docker Compose

```bash
mkdir uptime-gizmo
cd uptime-gizmo
curl -o compose.yaml https://raw.githubusercontent.com/starit/uptime-gizmo/main/compose.yaml
docker compose up -d
```

Uptime Gizmo is now running on all network interfaces (e.g. http://localhost:3001
or http://your-ip:3001).

If you already have the repo checked out, `docker compose up -d` in the root is
enough. [compose.yaml](compose.yaml) bind-mounts `./data` to `/app/data` and
pulls `starit/uptime-gizmo:beta`.

To expose the UI on localhost only, change the published port to
`127.0.0.1:3001:3001`.

> [!WARNING]
> SQLite does not work on NFS. Map `/app/data` to a local directory or a Docker
> volume.

### 🐳 Docker Command

```bash
docker run -d --restart=always -p 3001:3001 -v uptime-gizmo:/app/data --name uptime-gizmo starit/uptime-gizmo:beta
```

Uptime Gizmo is now running on all network interfaces (e.g. http://localhost:3001
or http://your-ip:3001).

If you want to limit exposure to localhost only:

```bash
docker run ... -p 127.0.0.1:3001:3001 ...
```

If 3001 is already in use on the host, change only the left-hand port. The
container still listens on 3001:

```bash
docker run -d --restart=always -p 3002:3001 -v uptime-gizmo:/app/data --name uptime-gizmo starit/uptime-gizmo:beta
```

Then open http://localhost:3002. Any free host port works the same way (`3003:3001`, and so on).

The same tags are on GHCR as `ghcr.io/starit/uptime-gizmo`.

### 💪🏻 Non-Docker

Requirements:

- [Node.js](https://nodejs.org/en/download/) >= 20.4
- [pnpm](https://pnpm.io/installation) >= 10 (`corepack enable pnpm` uses the
  version pinned in `package.json`)
- [Git](https://git-scm.com/downloads)
- [pm2](https://pm2.keymetrics.io/) — for running Uptime Gizmo in the background

```bash
git clone https://github.com/starit/uptime-gizmo.git
cd uptime-gizmo
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm run build

# Option 1. Try it
pnpm start

# (Recommended) Option 2. Run in the background using PM2
# Install PM2 if you don't have it:
pnpm add --global pm2

# Start Server
pm2 start server/server.js --name uptime-gizmo
```

Uptime Gizmo is now running on all network interfaces (e.g. http://localhost:3001
or http://your-ip:3001).

More useful PM2 commands:

```bash
# If you want to see the current console output
pm2 monit

# If you want to add it to startup
pm2 startup && pm2 save
```

`pnpm start` serves the built UI from the backend on port 3001. Host and port
can be set with `UPTIME_GIZMO_HOST` and `UPTIME_GIZMO_PORT` (or `PORT`). Data
lives in `./data` unless `DATA_DIR` says otherwise.

If you are locked out of the first account, stop the process and run
`pnpm run reset-password`. `pnpm run remove-2fa` clears two-factor authentication
the same way.

For local development (`pnpm run dev`, Vite on 3000), see the
[Contributing Guide](CONTRIBUTING.md).

### Image tags

| Tag | What it is |
| --- | --- |
| `beta` | Current prerelease. This tag moves. |
| `<version>` | A pinned prerelease matching that GitHub release. Use this if you do not want `beta` to change under you. |
| `nightly2` | Unreleased `main`. |

`beta-slim` and `<version>-slim` omit Chromium, embedded MariaDB and extra
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

## How this is built

Uptime Gizmo is developed with heavy use of AI coding agents. Saying so matters
less than saying what they are held to.

Anything substantial starts as a plan in [docs/plans](docs/plans) that argues
the trade-offs before the code exists, and ends as a record in
[docs/execution](docs/execution) saying what shipped, what was verified, and
what was not. [AGENTS.md](AGENTS.md) is the standing brief: agents implement and
review, the maintainer decides. Tests and lint run in CI on every change.

The Kuma core underneath is years of other people's work. What this fork adds on
top is where the agents work.

None of that makes a defect impossible. It does mean that when you wonder why
something behaves the way it does, there is usually a written argument you can
read — and disagree with.

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
