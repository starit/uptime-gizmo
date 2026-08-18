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

**The MCP server ships in this repository** as a separate package with its own
process, rather than in a separate repository. Keeping it beside the API it
consumes is what stops the two drifting; keeping it out of the server process is
what protects monitoring. Publishing it is then a packaging question — an agent
can install it directly, or a third-party platform can discover and install it,
without Uptime Gizmo hosting any of that itself.

It also keeps the contract honest: if MCP can only reach the product through
`/api/v1`, then anything an agent can do, a script can do, and there is one set
of authorization rules rather than two.

## Permission model

An earlier draft of this plan proposed three scopes — `read`, `write`, `admin`.
That was over-designed. The product's multi-user model is deliberately minimal
(see [the multi-user plan](multi-user.md)), and the agent requirement is
narrower than three scopes imply: what an agent needs is a credential that can
look at everything and change nothing.

Two booleans are enough.

| Carried by | Flag | Meaning |
| --- | --- | --- |
| User | `admin` | May manage other users, notifications, integrations, and API keys |
| API key | `read_only` | The key may issue `GET` requests and nothing else |

Effective authority is the intersection: a key never exceeds the authority of
the user it belongs to, and a read-only key is read-only regardless of who owns
it. There are no scope strings, no capability lists, and nothing to keep in sync
as the API grows — a new mutating route is covered by the read-only check the
day it is written.

Rules:

- Existing keys migrate to `read_only = false`, so nothing breaks.
- The UI defaults new keys to read-only, because that is the safe default and
  the common case for automation that only observes.
- The check happens in middleware, before the route, derived from the key
  record rather than from anything the client sends.

An agent is expected to hold a read-only key. Giving it a writing key is a
decision an operator makes per key and can revoke.

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

### `changes` is cheap, and still bounded

An earlier draft worried this endpoint would need its own index. It does not.
`heartbeat.important` already marks state transitions, and
`monitor_important_time_index` on `(monitor_id, important, time)` already covers
the query — a 2025-12-22 migration added partial indexes for exactly this
access pattern. On a development instance 31 of 718 heartbeats were transitions,
about 4%, so the endpoint reads a small fraction of the table through an index
built for it.

Bounds are still required, for a different reason: an agent asking an open
question should not be able to pull an instance's entire history in one call.

- `since` defaults to 24 hours and is capped at 7 days.
- At most 500 transitions per response, with a cursor for the rest.
- A request past the cap is answered with the capped window and says so, rather
  than failing.

These are guards against accidental load, not security controls. The security
control is who may call it at all.

## Two classes of agent access

Agents fall into two groups with very different risk, and they should not share
a door.

### Reading

The intent is that a read-only agent may not need a credential at all. That is
reasonable, but **"read-only without a key" must not mean "the whole monitor
inventory without a key"**.

The monitor table is the sensitive part of a monitoring instance. It holds
hostnames, URLs, ports, and what is currently failing — an inventory of the
estate and a list of which parts of it are already weak. Publishing that
unauthenticated is a different act from publishing a status page, which is a
curated subset an operator deliberately chose to make public.

So the read surface splits:

| Access | Credential | Surface |
| --- | --- | --- |
| Public read | none, and **off by default** | Only what published status pages already expose: the names an operator chose to publish, their status, and uptime |
| Private read | read-only API key | Full inventory, configuration excluding secrets, heartbeats, statistics, `overview`, `incidents/active`, `changes` |

The public tier is derived from status-page configuration rather than from the
monitor table, so nothing reaches it that an operator has not already published
by other means.

#### Most of this already exists

Checked against a running instance rather than assumed. Three unauthenticated
endpoints already serve exactly this data:

| Endpoint | Already public |
| --- | --- |
| `/api/status-page/:slug` | groups, monitors as `{id, name, type, tags, sendUrl}`, incidents, maintenance windows, page config |
| `/api/status-page/heartbeat/:slug` | the last 100 heartbeats per monitor, plus 24-hour uptime |
| `/api/status-page/:slug/incident-history` | incident history, already cursor-paginated |

The boundary is enforced in code, not by convention.
`Heartbeat.toPublicJSON()` blanks the message field outright — `msg: ""`, marked
"Hide for public" — so failure detail such as an unresolved internal hostname
never reaches a public response. Monitors carry no URL unless the operator turns
on `sendUrl`.

So a public agent tier is a **re-projection of data that is already public**,
not a new exposure. That makes it both cheaper and safer than this plan first
assumed. What it lacks is shape, not data:

- The existing endpoints serve the frontend and are not a versioned contract.
- `heartbeatList` is bucketed by monitor id as raw arrays; an agent wants "what
  is down and since when".
- There is no `changes` equivalent.

**There is no endpoint that lists status pages, and there must not be one.** A
caller has to know the slug. Adding a directory would turn "what does this
instance monitor" into something enumerable, which is the inventory leak this
whole split exists to prevent. The public tier stays fetch-by-slug and
non-enumerable.

### Writing

The valuable case: an agent creates and maintains monitors, which removes a
large amount of manual setup.

The first release supports **create and update, not delete.** An agent that can
delete a monitor can silently stop monitoring production, and the failure is
invisible precisely because monitoring is what stopped. Creation and update are
recoverable; deletion is not, and there is no audit log to attribute it.

Writing always requires a key that is not read-only. There is no unauthenticated
write tier and there should never be one.

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

The writing tools follow the create-and-update rule above:

| Tool | Maps to | Mutates | Side effects |
| --- | --- | --- | --- |
| `create_monitor` | `POST /monitors` | yes | begins checking a target |
| `update_monitor` | `PATCH /monitors/:id` | yes | may change alerting |

Deliberately absent from the first release: deleting monitors, deleting history,
editing notification channels, and anything touching API keys or users.

Resources (as opposed to tools) are a good fit for status pages: an agent can
read a status page as a document without calling anything.

## Guardrails

- **No secrets, ever.** Monitor credentials, notification config, push tokens
  and API keys are excluded from every response, as the REST plan already
  requires. An MCP server must not be able to ask for them.
- **The permission check is server-side.** The MCP server is a client; it is not
  trusted to restrict itself.
- **Mutating tools are opt-in per deployment,** disabled unless the operator
  configures a key that permits them.
- **Every tool declares its side effects** in its description, so a model can
  reason about consequences before calling.
- **Rate limits apply to the key,** not to the transport, so an agent cannot
  bypass them by using MCP instead of HTTP.
- **The public read tier, if enabled, is derived from status-page
  configuration** — never from the monitor table. An operator must not be able
  to publish their infrastructure inventory by ticking one box.
- **There is no unauthenticated write tier,** now or later.
- **The monitoring server never imports an MCP SDK.**

## Phases

### Phase 1 — Read-only keys and the admin flag

Migrations adding `read_only` to `api_key` and `admin` to `user`, middleware
enforcing both, and UI for each. Existing keys and the existing user are
grandfathered so nothing breaks. No new endpoints.

Depends on [the multi-user plan](multi-user.md), which introduces the admin
flag.

**Exit criteria:** a read-only key is refused on every mutating route, a
non-admin user is refused on every admin route, and existing credentials keep
working.

### Phase 2 — REST as planned

Follow [the REST API plan](rest-api.md) through its own phases, with both checks
wired into the middleware foundation from the start.

### Phase 3 — Agent-shaped reads

`overview`, `incidents/active` and `changes`, with tests that assert they agree
with the per-resource endpoints they summarise.

### Phase 4 — MCP server

A separate package that speaks MCP and calls `/api/v1` with a configured key.
Read-only tools first; mutating tools behind explicit configuration.

**Exit criteria:** an agent can answer "what is broken and since when" in one
tool call, holding a key that cannot change anything.

## Open questions

- **How an admin-only route behaves for a non-admin user's writing key.** A 403
  is obviously right; whether the response should distinguish "your key cannot
  write" from "your account cannot do this" is a usability question with a small
  information-disclosure edge.
- **Whether the public tier needs an opt-in at all.** Since it re-projects data
  three endpoints already serve without authentication, a switch may be
  protecting nothing. Leaving it opt-in is the cautious default, but it may be
  ceremony.
