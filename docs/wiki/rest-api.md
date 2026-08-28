# REST API

The dashboard still uses Socket.IO. **`/api/v1` is a separate HTTP API** for scripts, CI, and agents. It does not replace the UI.

A live reference is in the product: **Settings → API Documentation**. The machine-readable spec is at `/api/v1/openapi.json` (no key required).

## Auth

Create a key in **Settings → API Keys**. New keys are **read-only** unless you turn that off.

The key is HTTP Basic **password**. The username is ignored:

```bash
curl -s -u "api:$UPTIME_GIZMO_API_KEY" "$UPTIME_GIZMO_URL/api/v1/whoami"
```

| Response | Meaning |
| --- | --- |
| `401` | Missing or wrong key, or the account behind it is disabled |
| `403` | Key is read-only and the request would change something |

Leave a key read-only unless the holder must create or edit monitors.

## Questions the API answers in one call

These three exist so a caller does not have to assemble the picture from every monitor:

| Call | Question |
| --- | --- |
| `GET /api/v1/overview` | State of every monitor, when it entered that state, 24-hour uptime |
| `GET /api/v1/incidents/active` | What is down or degraded **right now** (paused monitors are omitted) |
| `GET /api/v1/changes?hours=24` | Status transitions in a window |

`hours` defaults to 24 and is capped at 168. If the window was shortened or the 500-row limit was hit, the `window` object says so — check it before treating a quiet list as a quiet period.

`since` on an incident is a **timestamp**, not a duration.

## Resources

**Read** (any key):

- Monitors (paginated: follow `page.nextCursor` while `page.hasMore` is true)
- Tags, maintenance windows, status pages
- Notification channels, proxies, Docker hosts, remote browsers, Web3 networks — **names and safe fields only**, never the credential

**Write** (writable key):

- Create, update, pause, resume, and delete monitors
- Create, update, and delete tags; attach and detach them on a monitor

The types `POST /api/v1/monitors` accepts are the `enum` on `MonitorInput.type` in `/api/v1/openapi.json`, generated from the same list the route enforces. Anything else — invented, or a type the UI can create but this API cannot configure — is refused with `400`. The three [Web3 types](web3-monitoring.md) are in that list; they are EVM JSON-RPC, not a generic chain call. MQTT, gRPC and the rest stay in the UI.

Field enums (`dnsResolveType`, the web3 value fields) come from the same lists the check engines enforce. A value the UI's Globalping form offers (`ANY`, and the rest) is still `400` here: this API cannot create a Globalping monitor, and native `dns` cannot read those records.

Deleting a **group** needs `?children=unlink` (default: leave children parentless) or `?children=delete` (remove the subtree). Pause and resume are safe to retry.

## High-count load check

`extra/stress-create-monitors.mjs` creates a group plus a batch of mixed-type monitors (default 100, paused) over this API, so you can see how the dashboard and scheduler behave with a large list. Authenticated calls are limited to 60 per minute; the script spaces writes.

```bash
export UPTIME_GIZMO_URL=http://127.0.0.1:3001
export UPTIME_GIZMO_API_KEY=uk1_...   # writable key; do not put it on the command line
pnpm run stress-create-monitors
pnpm run stress-create-monitors -- --active --interval 300
pnpm run stress-create-monitors -- --delete --yes
```

`--help` lists the rest. MQTT, gRPC and other UI-only types are not created here; the API cannot write them yet.

## Not in this API yet

Writing maintenance windows, status-page incidents, notification channels, and other credential-bearing settings. Those stay in the UI. See the [Roadmap](../../ROADMAP.md).

There is no delete tool on the MCP server for the same reason: an agent that deletes a monitor silently stops watching production.
