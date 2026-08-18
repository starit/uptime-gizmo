# MCP and agent-facing API plan

## Objective

Make Uptime Gizmo usable by AI agents without weakening its security model, and
without turning the monitoring server into a protocol host.

This plan builds on the [REST API plan](rest-api.md) rather than replacing it.
It adds three things that plan does not cover: a permission model that allows a
read-only credential, a small number of endpoints shaped the way an agent
actually asks questions, and an MCP server.

## Review of the existing REST plan

The REST plan is sound and most of it stands. It already covers versioning under
`/api/v1`, an API-key auth path reusing `apiAuth`, ownership checks on every
route, allow-listed query parameters, response envelopes, pagination, rate
limiting, observability, and a phased sequence. **It also already includes
OpenAPI documentation in scope**, so machine-readable capability discovery is
planned, not missing.

Three gaps matter for agents.

### 1. API keys are all or nothing

`api_key` carries `id`, `key`, `name`, `user_id`, `created_date`, `active` and
`expires`. There is no scope column, and `apiAuthorizer` in
[server/auth.js](../../server/auth.js) only verifies that a key is valid — it
does not attach a principal or any capability set.

So any key that can read can also delete every monitor. That is an acceptable
trade for a human operator's automation script and a bad one for an agent, which
is exactly the kind of caller that should be allowed to look freely and change
almost nothing.

**This is the blocking gap.** Everything else here is easier to build than it is
to make safe without it.

### 2. The read surface is resource-shaped, not question-shaped

The inventory is a faithful CRUD projection of the domain, plus per-monitor
`statistics` and `events`. An agent's actual questions cross resources:

- What is currently broken, and since when?
- Which monitors are in a maintenance window right now?
- What changed in the last hour?

Answering those against the planned surface means listing monitors, then
fetching heartbeats per monitor, then correlating maintenance windows — many
round trips, and a lot of room for an agent to get the correlation wrong.

### 3. Nothing describes side effects

An agent deciding whether to call something needs to know whether it will send
notifications, page someone, or delete history. The REST plan is careful about
this internally — it distinguishes named actions from arbitrary state mutation —
but the contract does not say so in a form a caller can read.

## Where MCP should live

**Recommendation: a separate process that talks to Uptime Gizmo over
`/api/v1`.** Not embedded in the monitoring server.

| | Embedded in the server | Separate process over REST |
| --- | --- | --- |
| Round trips | Fewer | One more hop |
| Coupling | MCP protocol and SDK versions live inside the monitoring process | Monitoring server only ever speaks HTTP |
| Blast radius of an MCP bug | Shares the process that watches production | Cannot take monitoring down |
| Deployment | Tied to the server release | Versioned and upgraded separately |
| Auth | Would need its own path into the domain | Uses the same scoped API key as any other client |
| Self-hosting | Always present, whether wanted or not | Opt-in; an operator who wants no agent surface runs nothing |

The deciding argument is the third row. Uptime Gizmo's job is to notice when
production breaks. Anything that can crash it, block its event loop, or hold its
database connections had better be part of monitoring, and an MCP server is not.

The cost is one network hop on calls that are not latency-critical. That is the
right trade.

It also keeps the contract honest: if MCP can only reach the product through
`/api/v1`, then anything an agent can do, a script can do, and there is one set
of authorization rules rather than two.

## Permission model

Add a scope to API keys. Minimum viable set, deliberately coarse:

| Scope | Allows |
| --- | --- |
| `read` | Every `GET`, and nothing else |
| `write` | Create and update monitors, tags, maintenance windows, incidents |
| `admin` | Delete resources, clear history, manage notifications and API keys |

Rules:

- A key carries one or more scopes; absent any scope it is `read`.
- Existing keys migrate to `read` + `write` + `admin` so nothing breaks, but the
  UI defaults new keys to `read`.
- The scope check happens in middleware, before the route, and is derived from
  the key record rather than the request.
- `admin` is never the default and the UI should say what it permits.

An agent is expected to hold a `read` key. Giving it `write` is a decision an
operator makes deliberately, per key, and can revoke.

## Agent-shaped endpoints

Three additions, all read-only, all answerable in one call:

```text
GET /api/v1/overview          current state of every monitor, one row each
GET /api/v1/incidents/active  what is down or degraded now, with since-when
GET /api/v1/changes?since=…   state transitions in a window, newest first
```

These are projections over existing data, not new persistence. They exist so an
agent does not have to reimplement correlation that the server already does for
its own dashboard.

Everything else an agent needs is already in the REST plan.

## MCP surface

Tools map to the endpoints above and to the safe subset of the REST surface.
Each is annotated with whether it mutates and whether it can notify anyone.

| Tool | Maps to | Mutates | Side effects |
| --- | --- | --- | --- |
| `list_monitors` | `GET /monitors` | no | none |
| `get_monitor` | `GET /monitors/:id` | no | none |
| `get_overview` | `GET /overview` | no | none |
| `get_active_incidents` | `GET /incidents/active` | no | none |
| `get_recent_changes` | `GET /changes` | no | none |
| `get_monitor_statistics` | `GET /monitors/:id/statistics` | no | none |
| `pause_monitor` | `POST /monitors/:id/pause` | yes | may suppress alerts |
| `resume_monitor` | `POST /monitors/:id/resume` | yes | may trigger alerts |
| `create_maintenance` | `POST /maintenance` | yes | suppresses alerts for its window |

Deliberately absent from the first release: creating or deleting monitors,
deleting history, editing notification channels, and anything touching API keys.
An agent that can delete a monitor can silently stop monitoring production, and
no convenience justifies that until the scope model has been in use for a while.

Resources (as opposed to tools) are a good fit for status pages: an agent can
read a status page as a document without calling anything.

## Guardrails

- **No secrets, ever.** Monitor credentials, notification config, push tokens
  and API keys are excluded from every response, as the REST plan already
  requires. An MCP server must not be able to ask for them.
- **The scope check is server-side.** The MCP server is a client; it is not
  trusted to restrict itself.
- **Mutating tools are opt-in per deployment,** disabled unless the operator
  configures a key that permits them.
- **Every tool declares its side effects** in its description, so a model can
  reason about consequences before calling.
- **Rate limits apply to the key,** not to the transport, so an agent cannot
  bypass them by using MCP instead of HTTP.
- **The monitoring server never imports an MCP SDK.**

## Phases

### Phase 1 — Scopes

Migration adding scopes to `api_key`, middleware enforcement, UI for choosing
scopes when creating a key, existing keys grandfathered. No new endpoints.

**Exit criteria:** a `read` key is refused on every mutating route, and existing
keys keep working.

### Phase 2 — REST as planned

Follow [the REST API plan](rest-api.md) through its own phases, with the scope
check wired into the middleware foundation from the start.

### Phase 3 — Agent-shaped reads

`overview`, `incidents/active` and `changes`, with tests that assert they agree
with the per-resource endpoints they summarise.

### Phase 4 — MCP server

A separate package that speaks MCP and calls `/api/v1` with a configured key.
Read-only tools first; mutating tools behind explicit configuration.

**Exit criteria:** an agent can answer "what is broken and since when" in one
tool call, holding a key that cannot change anything.

## Open questions

- **Multi-user is planned but does not exist yet.** Scopes are per key, so they
  compose with a future role model rather than pre-empting it, but the two should
  be designed together before Phase 1 ships.
- **Whether `changes` needs its own index.** It reads the heartbeat table by
  time; on a large instance that may need work, and this plan does not assume it
  is free.
- **Whether the MCP server ships in this repository** or separately. In-repo is
  easier to keep in step with the API; separate makes the process boundary
  obvious. No recommendation yet.
