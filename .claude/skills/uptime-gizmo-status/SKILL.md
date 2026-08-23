---
name: uptime-gizmo-status
description: Read the state of an Uptime Gizmo instance over its HTTP API — what is being monitored, what is broken and for how long, what changed recently, and which notification channels, proxies and maintenance windows exist. Use when asked whether something is up or down, why a service was unreachable, what the uptime of a monitor is, or what an instance is watching. Read-only; never changes anything.
---

# Reading an Uptime Gizmo instance

Uptime Gizmo watches services and records whether they answered. This skill reads
that record over `/api/v1`. Nothing here writes; to create or change monitors, use
the `uptime-gizmo-sync` skill instead.

## Connecting

Two values are needed:

- `UPTIME_GIZMO_URL` — the instance root, e.g. `https://status.example.com`. Default
  `http://localhost:3001`.
- `UPTIME_GIZMO_API_KEY` — a key created in **Settings → API Keys**, of the form
  `uk<id>_<secret>`.

The key goes in HTTP Basic auth as the **password**, with any username:

```bash
curl -s -u "api:$UPTIME_GIZMO_API_KEY" "$UPTIME_GIZMO_URL/api/v1/overview"
```

If the key is missing or wrong the response is `401`. Ask the user for it rather
than guessing; do not read it out of the repository, and do not echo it back into
the transcript or into a file.

## Start with whoami

```bash
curl -s -u "api:$UPTIME_GIZMO_API_KEY" "$UPTIME_GIZMO_URL/api/v1/whoami"
# {"ok":true,"data":{"userID":1,"readOnly":true}}
```

This works with any key. `readOnly: true` means the key cannot change anything,
which is the safer kind to hold for this work — every request in this skill is a
`GET`, so either kind is fine. Run it first anyway: it is the cheapest way to
confirm the URL and the key are both right before interpreting an empty result as
"nothing is wrong".

## Answering the common questions

Three endpoints exist because agents kept asking these three questions. Prefer them
over assembling the answer from the resource endpoints.

### "Is anything broken right now?"

```bash
curl -s -u "api:$KEY" "$URL/api/v1/incidents/active"
```

Returns only the monitors that are down or degraded:

```json
{ "id": 3, "name": "checkout-api", "status": 0,
  "lastCheck": "2026-08-19 01:26:30.371", "since": "2026-08-19 01:26:30.371" }
```

`since` is when it entered that state — **a timestamp, not a duration**. Subtract it
from now to say how long the outage has run; do not report it as the length.

An empty `data` array means nothing is currently failing, which is a real answer
rather than a missing one.

### "How is everything?"

```bash
curl -s -u "api:$KEY" "$URL/api/v1/overview"
```

Every monitor with its current status, when it entered that status, and its 24-hour
uptime. This is the one call to make when asked for a general picture.

### "What changed recently?"

```bash
curl -s -u "api:$KEY" "$URL/api/v1/changes?hours=24"
```

State transitions, newest first. `hours` defaults to 24 and is capped at 168 (one
week); a larger value is clamped rather than refused.

The bounds are reported in a `window` object beside `data`, **not at the top level**:

```json
{ "ok": true,
  "window": { "hours": 168, "capped": true, "maxHours": 168, "limit": 500, "truncated": false },
  "data": [ ... ] }
```

`capped` means the window you asked for was shortened; `truncated` means the row
limit was reached and older transitions are missing. **Check both before concluding
that a period was quiet** — a truncated response is a partial answer that otherwise
looks complete.

Only transitions are recorded, not every check. A monitor that has been up for a
month contributes nothing to this list, which is what makes the call cheap.

## Resources

| What | Endpoint |
| --- | --- |
| Monitors, with configuration | `GET /api/v1/monitors` |
| One monitor | `GET /api/v1/monitors/{id}` |
| Tags | `GET /api/v1/tags` |
| Maintenance windows | `GET /api/v1/maintenances` |
| Status pages | `GET /api/v1/status-pages` |
| Notification channels | `GET /api/v1/notifications` |
| Proxies | `GET /api/v1/proxies` |
| Docker hosts | `GET /api/v1/docker-hosts` |
| Remote browsers | `GET /api/v1/remote-browsers` |
| Web3 networks | `GET /api/v1/web3-networks` |

`GET /api/v1/monitors` is paginated. `limit` defaults to 100 and is clamped to 500
rather than refused. Follow the cursor until it runs out:

```bash
curl -s -u "api:$KEY" "$URL/api/v1/monitors?limit=100&cursor=42"
# "page": { "limit": 100, "hasMore": true, "nextCursor": 137 }
```

**A single page is not the whole list.** Saying "there are 100 monitors" after one
call, when `hasMore` was true, is wrong.

## Reading a result

Every response is an envelope:

```json
{ "ok": true, "data": ... , "page": { "limit": 100, "hasMore": true, "nextCursor": 137 } }
```

Errors carry a code and a message:

```json
{ "ok": false, "error": { "code": "not_found", "message": "No such monitor" } }
```

- `401` — the key is missing, wrong, expired or disabled.
- `403` — the key is read-only and the route writes. Nothing in this skill should
  ever produce it.
- `404` — no such resource, **or it belongs to another user**. The two are
  deliberately indistinguishable, so do not report "it does not exist" with
  certainty; "not visible to this key" is the accurate phrasing.
- `429` — rate limited. Back off; do not retry in a tight loop.

## What is deliberately not returned

Do not report these as missing data or offer to fetch them another way — they are
withheld on purpose:

- Notification channel configuration. A Slack webhook URL or a Telegram bot token
  *is* the credential. Only the channel's name, provider `type` and active state
  are returned.
- Proxy passwords. The username is returned, the password never is.
- A Docker host's daemon address, which may embed a user and password.
- A remote browser's URL, which commonly carries a token.
- Monitor credentials — basic auth passwords, bearer tokens, TLS keys, push tokens
  and the rest are absent from every monitor response.

## Interpreting status

`status` is `0` down, `1` up, `2` pending (retrying before being declared down),
`3` under maintenance. A monitor under maintenance is intentionally quiet rather
than broken — check `GET /api/v1/maintenances` before describing it as an outage.

`active: false` means the monitor is paused: it is not being checked at all, so its
last known status is stale. Say so rather than reporting the stale value as current.

## The authoritative contract

```bash
curl -s "$URL/api/v1/openapi.json"
```

Unauthenticated, and generated from the server's own field definitions rather than
written by hand, so it cannot describe a field the instance does not have. When this
document and that one disagree, that one is right.
