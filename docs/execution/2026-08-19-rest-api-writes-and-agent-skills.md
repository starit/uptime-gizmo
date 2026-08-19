# REST API: the remaining reads, the first writes, and two agent skills

Executes parts of [docs/plans/rest-api.md](../plans/rest-api.md) and
[docs/plans/mcp-and-agent-api.md](../plans/mcp-and-agent-api.md). Commits
`f463e77d`, `038d4e36`, `0c0efdcc`, `4d2a467e`, `7f47a4bc`.

## Reads for the last four resources

Notifications, proxies, Docker hosts and remote browsers differ from the
resources already exposed: their secrets are not always a whole column. The
field tables mark columns, which covers `proxy.password`. They cannot express
`notification.config` — one JSON blob that for most of the hundred-odd providers
*is* the credential — or `docker_host.docker_daemon`, which may be a socket path
or may embed a user and password, or `remote_browser.url`, which commonly carries
a token.

So only the fields that are safe whatever the value holds are returned. The
excluded columns are declared and marked secret rather than omitted, so adding
one back is a visible edit rather than an accident.

Two refinements followed from review. A proxy's username is returned — it is not
the secret half of the pair, and the settings UI already receives it over the
socket. And a notification channel reports which provider it uses, lifted out of
the blob by reading one named key: an agent needs to know whether a monitor
alerts to a pager or an inbox, and that carries none of the credential.

**Reading one named key rather than redacting an object was deliberate.** A
redaction list over a value of unknown shape, across a hundred providers, would
be wrong the first time a provider added a field.

## Writes

Delete, pause and resume for monitors; delete for tags; attach and detach between
them.

**Deleting a group asks what to do with its children** rather than guessing.
`?children=unlink` is the default and leaves them parentless; `delete` removes
the subtree. Deleting a group without saying which should not silently destroy
monitors the caller was not thinking about.

**Pause and resume are idempotent**, so a retry after a dropped response cannot
do anything the first call did not.

**Attaching a tag is idempotent on the pair.** A monitor carrying the same tag
twice is not a state the UI can represent.

Only the monitor's ownership is checked when attaching. The plan asked for both
the monitor and the tag, but `tag` has no user column — tags are instance-wide
here, like status pages — so there is no owner to check against. The plan was
corrected rather than the code.

### A test that passed for the wrong reason

The group deletion tests passed on the first run. Checking the database showed
both "children" had `parent` set to null: `parent` was not in the field table, so
the allow-list dropped it silently and the fixtures were never groups at all.

That also meant **the API could not build a group** — the feature the tests were
exercising did not exist. `parent` became writable, with three checks the field
table cannot express: the group must exist and belong to the caller, or a key
could file its monitors under someone else's group; and it cannot be the monitor
itself or one of its descendants, which would make a cycle that hangs the first
tree walk to run.

## Summaries pinned to their sources

`overview`, `incidents/active` and `changes` each restate something the
per-resource endpoints already know, and restated facts drift. Nothing would have
noticed if `overview` began reporting a status a monitor's heartbeats did not
support, and those are the endpoints the agent skills lean on hardest.

Six fixtures make sure no naive rule satisfies all three at once. The load-bearing
one is **paused with a last known state of down**: it belongs in the overview
because it exists, and not in the incident list because nothing is checking it.

Verified by breaking each endpoint in turn — dropping the active filter, dating
`since` from the newest heartbeat rather than the transition, letting `changes`
report non-transitions — and watching two, three and two assertions fail.

The file first appeared to hang for ten minutes. `Settings.get` starts an interval
on first use that only `server.js` ever stopped, so the test process never exited,
and `node --test` buffers a file's output until it does. The repository's test
script has no `--test-force-exit`, so leaving it would have hung the whole suite.

## Two agent skills

One for each thing an agent does with a monitoring instance: `uptime-gizmo-status`
reads, `uptime-gizmo-sync` creates and updates.

The write skill **deliberately does not decide what to create**. Whether a service
already has a monitor is the calling agent's judgement, so the skill supplies the
data and the reasons each obvious shortcut fails: names are not unique, one
endpoint often carries several monitors on purpose, and an id is only a handle if
the project kept one. Telling it to match on name would have produced confident
duplicates.

Deleting is absent from both. Removing a monitor stops watching something in
production, and the failure is invisible precisely because monitoring is what
stopped.

**Every field name, status code and response shape was checked against a running
instance rather than written from the source.** Three claims were wrong: `changes`
reports its bounds inside a `window` object rather than at the top level;
pagination carries `hasMore` beside `nextCursor`; and `incidents/active` returns
`since`, the moment a monitor entered the state, not the duration it has been
there. The MCP tool description made the same timestamp-for-duration mistake.

## Also

Three test dependencies — `body-parser`, `rimraf`, `@grpc/proto-loader` — were
required directly by the suite and declared nowhere. npm's flat layout made them
resolvable from whichever package happened to pull them in; pnpm links strictly,
so `test-domain.js` could not load. Versions match what the tree already resolves,
so nothing gained a second copy.

## State

Twenty-three endpoints of the plan's forty-five-endpoint inventory. What remains
is listed in the plan's status table; the notable gaps are maintenance writes and
anything that would require accepting a credential through the API.
