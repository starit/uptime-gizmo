# REST API

The dashboard still uses Socket.IO. **`/api/v1` is a separate HTTP API** for
scripts, CI, controllers, and agents; it does not replace the UI.

The API is still a beta contract. Prefer additive assumptions, read the OpenAPI
document served by the instance you are calling, and expect a documented change
between beta releases rather than assuming every beta has the same fields.

Two references are generated from the running server:

- **User menu → API Documentation** renders the implemented routes in the UI.
- `GET /api/v1/openapi.json` returns OpenAPI 3.1 and requires no key.

Unknown paths below `/api/v1` return a JSON `404`, not the single-page
application's HTML.

## Authentication and authority

Create a key in **Settings → API Keys**. New keys are **read-only** unless you
turn that off. Send the key as the HTTP Basic password; the username is ignored:

```bash
export UPTIME_GIZMO_URL=https://uptime.example.com
export UPTIME_GIZMO_API_KEY=uk1_...

curl -sS -u "api:$UPTIME_GIZMO_API_KEY" \
  "$UPTIME_GIZMO_URL/api/v1/whoami"
```

`whoami` reports the account that owns the key and whether it may write:

```json
{
  "ok": true,
  "data": {
    "userID": 1,
    "readOnly": true
  }
}
```

| Response | Meaning |
| --- | --- |
| `400` | A query or body was rejected; read `error.message` |
| `401` | Missing, expired, inactive, or wrong key, or its account is disabled |
| `403` | The key is read-only and the request would change something |
| `404` | The route or an accessible resource does not exist |
| `429` | The source or key has spent its current allowance; honour `Retry-After` when present |

Leave a key read-only unless its holder must change monitoring. A writable key
can create a monitor whose first result sends notifications, alter where alerts
go, and delete resources.

### Response shape

Application routes use an envelope:

```json
{ "ok": true, "data": {} }
```

Validation and resource errors use:

```json
{
  "ok": false,
  "error": {
    "code": "invalid_request",
    "message": "What was rejected"
  }
}
```

Some calls add metadata beside `data`: monitor lists add `page`, recent changes
add `window`, and an idempotent monitor create may add `replayed`.

### Rate limits

Guessing a key and using a valid one consume separate in-memory limits:

| Limit | Counted against | Spent when | Default |
| --- | --- | --- | --- |
| Failed authentication | Source address | A key is rejected | 20 per minute |
| Authenticated throughput | API key | Any authenticated request | 60 per minute |

A valid key does not spend the failed-authentication bucket. One valid key also
cannot spend another key's throughput. Both limits are per server process.

| Variable | Effect |
| --- | --- |
| `UPTIME_GIZMO_API_RATE_LIMIT_PER_MINUTE` | Positive integer request allowance for each key; default 60 |
| `UPTIME_GIZMO_API_RATE_LIMIT_UNLIMITED_KEY_IDS` | Comma-separated key ids exempt from throughput limiting |

The key id is the number in its prefix: `uk2_…` is key `2`. Exempt only a key
belonging to a trusted controller the instance is operated by, not an ordinary
busy client.

## Configuration backup is not a REST API

Beta.5 configuration backup is available only to an administrator in
**Settings → Backup**. It is intentionally **not** part of
`/api/v1`, the OpenAPI document, MCP, or the agent skills.

The browser obtains a short-lived, random, single-use ticket over its
authenticated Socket.IO session after checking the administrator's current
password. It then uses private `/api/internal/configuration-export` or
`/api/internal/configuration-import` transfer endpoints. Those routes are UI
implementation details, not a supported automation contract: an API key cannot
mint their ticket, and clients must not depend on them.

This boundary is deliberate. A configuration archive can contain notification
tokens, monitor passwords, proxy credentials, AI keys, and RPC URLs. It does not
contain user password hashes, 2FA configuration, personal API keys, or history,
but it is still a sensitive file. For scope and the supported workflow, see
[Backup](backup.md).

## Endpoint map

Every route below requires authentication except `GET /api/v1/openapi.json`.
Every `POST`, `PATCH`, and `DELETE` requires a writable key.

### Current state and history

| Method and path | Returns |
| --- | --- |
| `GET /api/v1/whoami` | Calling account id and read-only state |
| `GET /api/v1/overview` | Every monitor's current state, state start, last check, ping, 24-hour uptime, and TLS certificate fields |
| `GET /api/v1/overview?since=<timestamp>` | Only the monitors checked since that moment |
| `GET /api/v1/incidents/active` | Active monitors currently down or pending; paused monitors are omitted |
| `GET /api/v1/changes?hours=24&limit=500` | Status transitions, newest first |
| `GET /api/v1/monitors/{id}/uptime?window=24h` | Rolled-up uptime and latency buckets, oldest first |
| `GET /api/v1/monitors/{id}/heartbeats?limit=100` | Individual checks and their messages, newest first |

`changes` defaults to 24 hours and 500 rows. Lookback is capped at 168 hours,
and the response's `window.capped` and `window.truncated` flags say when the
answer was bounded. `since` on an overview row or incident is a timestamp, not
a duration.

`since` takes an ISO 8601 timestamp and returns only the monitors whose last
check is later than it. It is for a caller keeping a copy of this in step: at a
minute's polling against a five-minute check interval, four readings in five
otherwise repeat what the last one said. Omit it and the whole estate comes
back, exactly as before.

**An absence means something different in the two answers.** A monitor missing
from the full overview is not in the estate. A monitor missing from a `since`
response has simply not been checked in that window — it is still there, and
treating it as gone is the mistake this parameter makes easy. A monitor that has
never been checked is never in a `since` response.

A monitor that completed a TLS check carries `certValid` and `certExpiresAt`.
The latter is the certificate's own `notAfter`; compute expiry from that
timestamp instead of caching a days-remaining count. Both values are `null`
when no certificate record is available.

Uptime `window` is one of `3h`, `6h`, `24h`, `7d`, `30d`, `1y`. The response
states the chosen `bucket` and `bucketSeconds`. A point with `uptime: null` means
no check ran in that bucket, not that every check failed. The same rule applies
to an empty window's `summary`. A never-checked monitor returns an empty
`points` array rather than a `404`.

Heartbeat `limit` defaults to 100 and must be an integer from 1 through 500.
Each row includes `status`, `time`, `ping`, `message`, `important`, and
`duration`.

### Inventory and safe projections

| Method and path | Notes |
| --- | --- |
| `GET /api/v1/monitors` | Cursor-paginated monitor configuration |
| `GET /api/v1/monitors/{id}` | One monitor |
| `GET /api/v1/tags` | Tags |
| `GET /api/v1/maintenances` | Maintenance windows; read-only |
| `GET /api/v1/status-pages` | Status pages; read-only |
| `GET /api/v1/notifications` | Channel id, name, provider type, enabled state, and default state |
| `GET /api/v1/notification-providers` | Live provider names and, where available, form field definitions |
| `GET /api/v1/monitors/{id}/notifications` | Channels attached to one monitor, including disabled channels |
| `GET /api/v1/proxies` | Safe proxy fields; password omitted |
| `GET /api/v1/docker-hosts` | Safe Docker host fields; daemon connection omitted |
| `GET /api/v1/remote-browsers` | Names only; endpoint omitted |
| `GET /api/v1/web3-networks` | EVM network id, name, chain id, and state; RPC URL omitted |
| `GET /api/v1/ai-credentials` | Credential id, name, provider, model, and monitor usability; API key omitted |

Monitor pagination defaults to 100 and is capped at 500. Follow
`page.nextCursor` while `page.hasMore` is true:

```bash
curl -sS -u "api:$UPTIME_GIZMO_API_KEY" \
  "$UPTIME_GIZMO_URL/api/v1/monitors?limit=100&cursor=0"
```

Credential-bearing resources deliberately return only safe projections. A
readable API key cannot recover notification config, proxy passwords, Docker
daemon addresses, browser endpoints, Web3 RPC URLs, or AI keys.

## Monitor writes

Writable monitor routes are:

| Method and path | Behaviour |
| --- | --- |
| `POST /api/v1/monitors` | Create and, when active, begin checking |
| `PATCH /api/v1/monitors/{id}` | Partial update and restart |
| `POST /api/v1/monitors/{id}/pause` | Idempotently stop checking |
| `POST /api/v1/monitors/{id}/resume` | Idempotently resume checking |
| `DELETE /api/v1/monitors/{id}` | Delete the monitor; group child policy is explicit |

The accepted monitor types are generated into `MonitorInput.type` in the live
OpenAPI document. In beta.5 they are `http`, `keyword`, `ping`, `port`, `dns`,
`group`, `web3-balance`, `web3-rpc`, `web3-contract`, and `llm`. MQTT, gRPC,
Kafka, SNMP, and other UI types are not half-configurable here: the API rejects
them with `400`.

```bash
curl -sS -u "api:$UPTIME_GIZMO_API_KEY" \
  -X POST -H 'Content-Type: application/json' \
  -d '{
    "name": "Checkout API",
    "type": "http",
    "url": "https://checkout.example.com/health",
    "interval": 60,
    "externalRef": "terraform:checkout-api"
  }' \
  "$UPTIME_GIZMO_URL/api/v1/monitors"
```

`name` and `type` are required on create. Defaults supply 60-second check and
retry intervals when omitted. The complete writable field list, type-specific
enums, and request schema are in `MonitorInput`; use that schema instead of
copying a field list into a client.

### Idempotent provisioning with `externalRef`

`externalRef` is an optional caller-owned correlation key. It is unique inside
the monitor estate, immutable after create, 1–128 characters, starts with an
ASCII letter or digit, and otherwise accepts letters, digits, `:`, `.`, `_`,
and `-`.

- The first `POST` returns `201` and creates a monitor.
- Repeating the same `POST` with the same `externalRef` returns the existing
  monitor with `200` and `replayed: true`, including when two creates race.
- `GET /api/v1/monitors?externalRef=terraform:checkout-api` returns zero or one
  matching monitor.
- `PATCH` cannot change or clear the reference.

This makes a retry safe, but it does not reconcile fields automatically. If a
replayed monitor needs to match a changed desired state, follow with `PATCH`.

### Groups, pause, and delete

`parent` must identify a group visible to the caller and cannot create a cycle.
For operational state, prefer the idempotent `/pause` and `/resume` actions to a
generic patch.

Deleting a group accepts `?children=unlink` (the default, children survive
without a parent) or `?children=delete` (remove the subtree). The response lists
the ids removed. Deleting any monitor silently stops watching that target, so
controllers should require an explicit destructive policy.

## Tags

| Method and path | Behaviour |
| --- | --- |
| `POST /api/v1/tags` | Create a tag |
| `PATCH /api/v1/tags/{id}` | Partial update |
| `DELETE /api/v1/tags/{id}` | Delete and detach from every monitor |
| `POST /api/v1/monitors/{monitorId}/tags` | Attach `{ "tagID": 3, "value": "prod" }`; repeating updates the value |
| `DELETE /api/v1/monitors/{monitorId}/tags/{tagId}` | Detach without deleting the tag |

Tags are instance-wide in the current schema. Deleting one reports how many
monitor links were removed.

## Notification channels

Beta.5 can create, update, delete, attach, detach, disable, and re-enable
notification channels over the API.

| Method and path | Behaviour |
| --- | --- |
| `GET /api/v1/notification-providers` | Discover valid `type` names and known fields |
| `POST /api/v1/notifications` | Create a channel |
| `PATCH /api/v1/notifications/{id}` | Merge a partial change over stored config |
| `DELETE /api/v1/notifications/{id}` | Delete and detach from all monitors |
| `POST /api/v1/monitors/{monitorId}/notifications` | Attach `{ "notificationID": 4 }`; idempotent |
| `DELETE /api/v1/monitors/{monitorId}/notifications/{notificationId}` | Detach only this monitor |

Create takes `name`, `type`, optional booleans `active` and `isDefault`, and a
provider-specific `config` object. Provider names come from the running server;
do not hard-code a copied list. When `notification-providers` includes `fields`,
each field has enough metadata for a client to render the known form.

For example, discover the webhook fields first, then create it:

```bash
curl -sS -u "api:$UPTIME_GIZMO_API_KEY" \
  "$UPTIME_GIZMO_URL/api/v1/notification-providers"

curl -sS -u "api:$UPTIME_GIZMO_API_KEY" \
  -X POST -H 'Content-Type: application/json' \
  -d '{
    "name": "Operations webhook",
    "type": "webhook",
    "active": true,
    "config": {
      "webhookURL": "https://hooks.example.com/uptime",
      "httpMethod": "post",
      "webhookContentType": "json"
    }
  }' \
  "$UPTIME_GIZMO_URL/api/v1/notifications"
```

`config` travels **into** Uptime Gizmo but is never returned; for most providers
it contains a webhook URL, token, or password. `PATCH` merges over the stored
config, so renaming or disabling a channel does not require resending a secret
the API correctly refuses to reveal.

`active: false` stops status, certificate-expiry, and domain-expiry delivery for
the channel without removing any monitor links. Disabled channels remain in
list and attachment responses so they can be found and enabled again.

There is no REST endpoint to send a test notification in beta.5; use the normal
notification dialog when validating provider credentials.

## High-count load check

`extra/stress-create-monitors.mjs` creates a group and a batch of mixed supported
monitor types (default 100, paused). It spaces writes to stay within the default
per-key throughput limit.

```bash
export UPTIME_GIZMO_URL=http://127.0.0.1:3001
export UPTIME_GIZMO_API_KEY=uk1_...   # writable key
pnpm run stress-create-monitors
pnpm run stress-create-monitors -- --active --interval 300
pnpm run stress-create-monitors -- --delete --yes
```

Run with `--help` for all options.

## Not in `/api/v1` yet

- Writing maintenance windows.
- Creating or editing status pages and their incidents.
- Writing proxies, Docker hosts, remote browsers, Web3 networks, or AI
  credentials.
- Managing users or API keys.
- Importing or exporting configuration; use the administrator UI described
  above.
- Sending a notification-channel test.
- Bulk writes and destructive history cleanup.

Those operations remain in the UI. See the [Roadmap](../../ROADMAP.md) for
planned work; a plan is not an implemented endpoint.
