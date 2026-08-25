---
name: uptime-gizmo-sync
version: 1.0.0
description: Create and update monitors on an Uptime Gizmo instance over its HTTP API, so that a service added during development starts being watched. Use when asked to add monitoring for a new endpoint or service, to change how something is checked, to pause or resume a monitor, or to tag monitors. Covers create, update, pause, resume and tagging; deleting is not supported here and is left to the user.
---

# Adding monitoring for what you just built

The case this exists for: a service, endpoint or job gains a URL during
development, and it should be watched in production without anyone opening the
Uptime Gizmo UI to type it in again.

This skill gives you the interface and the field semantics. **It does not decide
what to create.** Whether a given service already has a monitor, whether two
similar entries are duplicates, and whether to add or update is a judgement for
you to make from the data — see [Deciding what already exists](#deciding-what-already-exists).

To read state without changing it, use the `uptime-gizmo-status` skill instead.

## Connecting

- `UPTIME_GIZMO_URL` — instance root, default `http://localhost:3001`.
- `UPTIME_GIZMO_API_KEY` — from **Settings → API Keys**, of the form `uk<id>_<secret>`.

The key is the Basic auth **password**; the username is ignored:

```bash
curl -s -u "api:$UPTIME_GIZMO_API_KEY" "$UPTIME_GIZMO_URL/api/v1/whoami"
```

Ask the user for the key. Do not read it from the repository, write it into a file,
or echo it back.

## Check the key can write, first

```bash
curl -s -u "api:$KEY" "$URL/api/v1/whoami"
# {"ok":true,"data":{"userID":1,"readOnly":false}}
```

`readOnly: true` means every request below will be refused with `403`. Say so and
stop, rather than attempting the writes and reporting a wall of failures — the fix
is a human creating a writable key, not a retry.

## Deciding what already exists

There is no upsert. Creating is `POST`, changing is `PATCH`, and choosing between
them is yours to make. List what is there and look:

```bash
curl -s -u "api:$KEY" "$URL/api/v1/monitors?limit=200"
```

`limit` is clamped to 500. Keep following `page.nextCursor` while `page.hasMore` is
true. **Deciding from a first page you did not finish paging is how a duplicate gets
created.**

Nothing in the data makes that decision for you, and the obvious shortcuts are each
wrong in a different way:

- **Names are not unique.** Two monitors may legitimately share one, and a rename
  in the UI leaves nothing linking the new name to what you created before.
- **URLs are not unique either.** One endpoint often has several monitors on
  purpose — a plain reachability check, a keyword check, a slower deep check.
  Matching on URL alone merges things that were meant to be separate.
- **Ids are stable but you have to have kept one.** If the project records the id
  it created — in a config file, a comment, an issue — that is the reliable link.
  If it does not, there is nothing authoritative to match on.

So: gather the candidates, show the user what you found, and ask when it is
genuinely ambiguous. Creating a second monitor for something already watched is a
cheap mistake to make and an annoying one to clean up, because deleting is not
available here.

## Creating a monitor

```bash
curl -s -u "api:$KEY" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"checkout-api","type":"http","url":"https://api.example.com/health","interval":60}' \
  "$URL/api/v1/monitors"
```

`201` with the stored monitor, including the `id` it was given. **Keep that id** if
the project has anywhere sensible to keep it; it is the only unambiguous handle for
later updates.

`name` and `type` are required. Everything else has a default. The monitor starts
checking immediately unless `active: false`, and its first result can fire
notifications — so creating a monitor for something not yet deployed will page
somebody. Create it paused and resume when the service is live.

### Types and their fields

| `type` | Needs | Notes |
| --- | --- | --- |
| `http` | `url` | Fails on a status code outside `acceptedStatuscodes` |
| `keyword` | `url`, `keyword` | Also fails if the body lacks the keyword; `invertKeyword` flips that |
| `ping` | `hostname` | ICMP |
| `port` | `hostname`, `port` | TCP connect |
| `dns` | `hostname` | With `dnsResolveType`, `dnsResolveServer` |
| `group` | — | A container; children point at it with `parent` |
| `web3-balance` | `web3NetworkId`, `web3Address` | Native balance, or an ERC-20 with `web3TokenContract` |
| `web3-rpc` | `web3NetworkId` | Down when the newest block stops being recent |
| `web3-contract` | `web3NetworkId`, `web3CallTo`, `web3CallData` | Reads one value out of a contract and compares it |

### Every writable field

`name`, `type`, `active`, `description`, `parent`, `url`, `hostname`, `port`,
`interval`, `retryInterval`, `resendInterval`, `maxretries`, `timeout`, `method`,
`maxredirects`, `ignoreTls`, `upsideDown`, `keyword`, `invertKeyword`,
`acceptedStatuscodes`, `dnsResolveType`, `dnsResolveServer`,
`web3NetworkId`, `web3Address`, `web3TokenContract`, `web3TokenDecimals`,
`web3MinBalance`, `web3MaxBlockAge`, `web3CallTo`, `web3CallData`,
`web3ValueOffset`, `web3ValueType`, `web3ValueDecimals`, `web3ValueOperator`,
`web3ValueThreshold`, `web3BlockTag`.

Anything else in the body is **dropped silently** — the API takes an allow-list. If
a setting you need is not here, it is not settable over the API yet; say so instead
of sending it and reporting success. `GET /api/v1/openapi.json` is the authoritative
list, generated from the server's own definitions.

Times are seconds. `interval` is how often to check, `retryInterval` how long to
wait between retries once failing, `maxretries` how many before it counts as down,
`resendInterval` how often to repeat a notification while it stays down.

## Watching something on-chain

All three web3 types read through a **network** — a chain and an RPC endpoint,
configured once in the instance's settings. You reference it by id and cannot
create one: the endpoint URL usually carries an API key, so it is a credential a
human enters.

```bash
curl -s -u "api:$KEY" "$URL/api/v1/web3-networks"
# {"ok":true,"data":[{"id":2,"name":"Base","chainId":"8453","active":true}]}
```

An empty list means nobody has configured a chain yet. Say so and stop — there is
nothing to point a monitor at, and the fix is a human adding the endpoint.
`web3NetworkId` pointing at a network that is not yours is refused with `400`.

### Reading a value out of a contract

`web3-contract` sends calldata you supply and compares one value from the result:

```bash
curl -s -u "api:$KEY" -X POST -H 'Content-Type: application/json' -d '{
  "name": "vault total assets",
  "type": "web3-contract",
  "web3NetworkId": 2,
  "web3CallTo": "0x…",
  "web3CallData": "0x01e1d114",
  "web3ValueType": "uint256",
  "web3ValueDecimals": 18,
  "web3ValueOperator": "gte",
  "web3ValueThreshold": "1000",
  "interval": 300
}' "$URL/api/v1/monitors"
```

- **`web3CallData` is sent verbatim.** A four-byte selector plus any arguments,
  already ABI-encoded. Nothing on the server encodes it for you, so encode it
  yourself and be sure of it: calldata that reads the wrong function produces a
  monitor that runs happily and reports a number that means something else.
- **`web3ValueOffset`** picks which 32-byte word of the result to read, from zero.
  A single return value is `0`. `getReserves()` returns three words;
  `latestRoundData()` returns five, with the price in word `1`. A word past the
  end of the result fails the check rather than reading as zero.
- **`web3ValueType`** is `uint256`, `int256`, `bool`, `address` or `bytes32`. Use
  `int256` whenever the value can go negative — read as unsigned, `-1` becomes the
  largest number there is and passes any `gte` threshold.
- **`web3ValueDecimals`** scales the threshold and the reported value, and
  defaults to `0`. Use `18` for a token amount, `8` for most price feeds, `0` for
  a count, an id or a basis-point rate.
- **`web3ValueOperator`** is `gte`, `lte`, `gt`, `lt`, `eq` or `ne`. Only `eq` and
  `ne` are accepted for `bool`, `address` and `bytes32` — ordering those is
  meaningless and is refused rather than ignored.
- **`web3ValueThreshold` is a decimal string, not a number.** It is scaled and
  compared as an integer, because a uint256 at 18 decimals is past what a double
  represents exactly. Send `"1000"`, not `1000`. For `address` and `bytes32` send
  the hex; for `bool` send `"true"` or `"false"`.
- Omit both the operator and the threshold to record the value on every heartbeat
  without alerting on it. Sending one without the other is refused.
- **`web3BlockTag`** is `latest` (default), `safe` or `finalized`.

The monitor goes **down** when the comparison fails, and also when the call
reverts, when the address holds no code, or when the endpoint turns out to be
serving a different chain than the network says.

**You cannot see the value the monitor read.** The decoded value goes into the
heartbeat message, and no `/api/v1` endpoint returns that message — a caller sees
only up or down. So a monitor whose calldata or word index is wrong looks
perfectly healthy from here, and the mistake is invisible until somebody opens the
monitor in the UI, where the message and a **Test read** button are.

That makes the encoding your responsibility to get right before you send it. Say
which contract, which function and which word you encoded, so a human can check
the one thing the API will not tell either of you.

## Updating

```bash
curl -s -u "api:$KEY" -X PATCH -H 'Content-Type: application/json' \
  -d '{"interval":120}' "$URL/api/v1/monitors/137"
```

Partial: only the fields you send change. The monitor restarts so the change takes
effect immediately.

## Pausing and resuming

```bash
curl -s -u "api:$KEY" -X POST "$URL/api/v1/monitors/137/pause"
curl -s -u "api:$KEY" -X POST "$URL/api/v1/monitors/137/resume"
```

Both are idempotent — pausing something already paused returns its state and does
nothing else — so a retry after a dropped connection is safe.

Pause before a planned deployment to keep it from paging, and remember to resume. A
paused monitor is not checking at all, so it will never tell you the service came
back.

## Groups

A `group` monitor contains others. Create the group, then create members with
`parent` set to its id:

```bash
GID=$(curl -s -u "api:$KEY" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"checkout","type":"group"}' "$URL/api/v1/monitors" | jq -r .data.id)

curl -s -u "api:$KEY" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"checkout-api\",\"type\":\"http\",\"url\":\"https://api.example.com/health\",\"parent\":$GID}" \
  "$URL/api/v1/monitors"
```

`parent` is refused with `400` if the group is not yours, is the monitor itself, or
is one of its own descendants.

## Tags

Tags are instance-wide, not per-user. Create one, then attach it:

```bash
curl -s -u "api:$KEY" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"production","color":"#2f9e68"}' "$URL/api/v1/tags"

curl -s -u "api:$KEY" -X POST -H 'Content-Type: application/json' \
  -d '{"tagID":4,"value":"eu-west"}' "$URL/api/v1/monitors/137/tags"
```

Attaching is idempotent on the pair: `201` the first time, `200` and an updated
`value` thereafter. Detach with
`DELETE /api/v1/monitors/{monitorId}/tags/{tagId}`; the tag itself survives.

Check `GET /api/v1/tags` before creating one — nothing stops two tags sharing a name.

## Deleting

**Not part of this skill, by design.** Removing a monitor silently stops watching
something in production, and the failure is invisible precisely because monitoring
is what stopped. If a monitor should go, tell the user which one and why, and let
them delete it in the UI.

Pausing is the reversible alternative when something should stop alerting now.

## When a call fails

- `400` — the body was refused; `error.message` says which field and why.
- `401` — key missing, wrong, expired or disabled.
- `403` — the key is read-only. Not retryable; a human must issue a writable key.
- `404` — no such resource, **or it belongs to another user**. Indistinguishable on
  purpose, so do not assert that something does not exist.
- `429` — rate limited. Back off rather than looping.

After a dropped connection, re-list before retrying a `POST`: create is not
idempotent, and a request that timed out may still have been stored.

## Reporting back

Say what was created or changed, with ids, and what was skipped and why. If you
chose between creating and updating on ambiguous evidence, say which way you went
and on what basis, so the user can correct it while it is still one monitor rather
than twelve.
