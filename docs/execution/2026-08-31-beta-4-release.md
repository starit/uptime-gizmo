# 3.0.0-beta.4 release execution record

## Scope

This pass prepared the self-hosted `uptime-gizmo` tree for beta.4. Work in the
separate Cloud application was deliberately out of scope. The release boundary
was an existing beta.3 data directory: it must migrate forward without losing
monitors or changing what an existing row means.

## Review findings and decisions

### Keep notification `active`, and finish it in the product

The backend change is compatible with existing data: the column has always
defaulted to true and older code did not write it. Reverting it would leave the
new API accepting a state that it could not honour. Shipping it without an
interface control would leave an operator unable to discover or undo an API
change.

Beta.4 therefore keeps the behaviour and adds the missing UI. A channel can be
disabled and re-enabled in its normal notification dialog, and disabled rows
are marked in the settings list. Recipient selection remains centralized so
status, certificate-expiry, and domain-expiry delivery cannot disagree.

### Correct a claim the migration made, not a break anyone could hit

The first `externalRef` migration's comment asserted that every supported
database permits multiple NULL values in a unique constraint. SQL Server does
not, so the claim as written was false.

It was not, however, describing a reachable failure. This application keeps its
own data in SQLite, MariaDB/MySQL or embedded MariaDB and nothing else —
`Database.connect()` has no other branch — while SQL Server and PostgreSQL
appear in this repository only as monitor types, things an instance watches. No
installation can migrate a SQL Server backing store because none exists.

The migration now adds the nullable column first and, on the `mssql` dialect,
creates a filtered unique index (`WHERE external_ref IS NOT NULL`); every engine
this project actually runs on keeps its ordinary constraint. That branch is
defensive code against a port that has not happened, not a fix.

The regression test covers the part that matters: several legacy rows with no
reference survive the migration on SQLite, and per-user uniqueness holds
afterwards. A second case asserts the `mssql` branch emits the filtered
predicate, but it does so against a stub rather than a real dialect, so it
guards the string the code produces and not the behaviour of any database.

### Make the test entry points reproducible

`pnpm run test-e2e` served `dist` without building it, so the result depended on
whatever an earlier command happened to leave there. It now builds first.
Playwright also now disables Cloud transition delivery and the development
inspector in its child server, preventing test data from reaching a configured
Cloud endpoint and avoiding inspector-port conflicts.

SQLite snapshot restoration used to close the connection pool while monitors
were still running. That produced false crash reports and left monitor objects
from the replaced database in memory. The E2E-only endpoints now stop and clear
runtime monitors before replacing the file, then start the monitors present in
the restored snapshot.

Backend files now run sequentially so several database and broker containers do
not compete for one Docker host. Container stops that were previously left in
flight are awaited. MQTT uses the official multi-architecture HiveMQ CE 2025.5
image instead of the test helper's amd64-only 2023.5 default, waits for Docker's
mapped port, and reuses one broker for its serial suite.

The public NTP probe is now opt-in with `TEST_EXTERNAL=1`; protocol parsing and
threshold behaviour remain in the default suite without requiring outbound UDP.
Ping address normalization is tested directly instead of assuming a real IDN
host must fail. Test databases are cleared before creation, and v1 teardown is
safe even when setup fails, so an interrupted run cannot poison the next one.

### Repair a stale release test

The changelog revision test used `3.0.0-beta.1` as a deliberately absent tag.
That tag now exists, so the assertion had become guaranteed to fail. It now
uses a name that cannot be a real release tag.

## Release artifacts

- Version, tag, and GitHub release notes are left to the `release-beta`
  workflow. This pass does not bump `package.json`.
- The root `CHANGELOG.md` records features, fixes, API notes, and upgrade
  compatibility for that workflow to ship.
- The release plan records the compatibility boundary and completed work.

## Verification

- `pnpm run tsc` — passed.
- `pnpm run lint:style` — passed (only the repository's existing deprecated-rule
  notices).
- `pnpm run lint:js` — passed with 64 existing JSDoc warnings, all in the
  out-of-scope Cloud bridge files; zero errors.
- `pnpm run build` — passed. Vite reports its existing CJS API and large-chunk
  warnings.
- Beta.4 focused backend set — 145 tests passed, including LLM monitoring,
  credentials, notification delivery, uptime history, API field contracts,
  changelog revision, and data-upgrade coverage.
- MQTT container suite — 19 tests passed on the multi-architecture image.
- Postgres and RabbitMQ container suites — passed after cleanup was made
  deterministic.
- `pnpm run test-e2e` — 30 tests passed in Chromium. The run included the LLM
  form, notification active control, dialogs, monitor forms, incidents, API
  key copy, database reset, and status pages.
- `pnpm run test-backend-22` — 556 tests: 555 passed, zero failed, and one
  skipped. The skipped public NTP integration is opt-in with `TEST_EXTERNAL=1`;
  mocked NTP protocol and threshold coverage passed.

## Release result

The self-hosted tree meets the beta.4 release gate: upgrade notes and the
beta.3 data-upgrade regression are in the tree, build and static checks
pass, and the full backend and Chromium E2E suites are green. Version bump,
tagging, and publishing are left to `release-beta`.
