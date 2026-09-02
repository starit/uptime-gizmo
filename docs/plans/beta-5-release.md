# 3.0.0-beta.5 release plan

## Objective

Make beta.5 the recoverability release: an operator using any supported
application database can download a consistent backup from the interface and
restore it without hand-editing the data directory, while a failed or
incompatible restore leaves the running instance recoverable.

This is a plan, not a description of current behaviour. Until the work below is
implemented and verified, the supported procedure remains the manual one in
[Backing up and restoring](../backup-and-restore.md). Execution results belong
under [`docs/execution`](../execution), and the changelog changes only when the
feature actually ships.

## Why this is the beta.5 boundary

The application database has three configured modes: SQLite, an external
MariaDB/MySQL-compatible server, and embedded MariaDB. A safe SQLite snapshot
can be produced by the database itself with `VACUUM INTO`. Both SQL-server modes
can use a consistent logical dump; copying live MariaDB files would be unsafe.
The full official image already contains the client tools through
`mariadb-server`. Beta.5 adds `mariadb-client` to the slim image so official
images have the same backup capability. A non-container installation must
provide `mariadb-dump` and the `mariadb` client when it uses MariaDB/MySQL.

The project had a JSON monitor-and-notification import/export screen in its
early history. It was removed in `Drop backup (#3892)` after the domain grew
beyond what its hand-maintained field mapping could represent. It omitted users,
settings, history, and newer resources, and its merge modes made ids and
relations difficult to restore consistently. Beta.5 must not revive that model.

The first useful version is therefore deliberately narrow:

- a complete **database** snapshot rather than a partial JSON model;
- replace-only restore rather than merge, keep, skip, or overwrite modes;
- a versioned opaque archive rather than a public object-level interchange
  format; and
- explicit manual guidance for filesystem assets.

## Release scope

### P0 — SQLite and MariaDB/MySQL export

Add **Settings → Backup and Restore**, visible to administrators.

Export will:

1. require the signed-in administrator's current password;
2. detect SQLite, external MariaDB/MySQL, or embedded MariaDB;
3. check available disk space and create a consistent temporary snapshot while
   the instance remains online;
4. verify the SQLite snapshot with `PRAGMA integrity_check`, or verify that the
   MariaDB dump completed and contains the expected migration and application
   tables;
5. package it with a manifest as an `.ugbackup` archive and stream it to the
   browser; and
6. remove temporary files after completion, disconnect, error, or expiry.

SQLite uses `VACUUM INTO`. MariaDB uses `mariadb-dump` with a single transaction,
streaming rows, no table locks, triggers, and binary-safe output. Application
tables are expected to be InnoDB; export must refuse a non-transactional
application table instead of presenting a potentially inconsistent dump as
successful.

Database passwords, socket paths, and TLS options go through a temporary
permission-`0600` client option file, never command-line arguments or logs. The
file is removed with the other temporary export material.

Large exports may briefly add database and disk load. The UI must keep its busy
state, explain that monitoring continues, and report an actionable missing-tool,
permission, connectivity, disk-space, or snapshot error rather than a generic
failure.

### P0 — staged, replace-only import

Import will:

1. require administrator authority and the current password;
2. stream the upload to a private temporary location with compressed and
   extracted size limits instead of sending base64 through Socket.IO;
3. validate the archive format, paths, checksum, version, database family, and
   payload before changing live data;
4. show the backup's source version and creation time, then require an explicit
   confirmation that the current database will be replaced;
5. stage the validated database and record a pending restore; and
6. apply it on the next application start, before the database connection and
   migrations are opened.

Beta.5 will not hot-swap a production database. Monitor objects, settings
caches, sessions, scheduled work, and status-page mappings all hold database
state in memory; replacing the file under them would create a mixed instance.
After staging, the UI instructs the operator to restart the service. It does not
terminate the process automatically because a non-container installation may
not have a supervisor to bring it back.

SQLite restore is transactional at the file boundary:

1. revalidate the staged database;
2. rename the current `kuma.db` to one pre-restore rollback file;
3. atomically rename the staged file to `kuma.db`;
4. connect and run the normal forward migrations; and
5. if connection or migration fails, move the failed import aside, restore the
   original database, and start from it.

MariaDB cannot atomically replace one file. On restart, before ordinary database
initialization, it will:

1. connect to the configured external or embedded target;
2. create and verify a logical rollback dump of the current database;
3. record the restore phase in a crash-resumable marker;
4. disable foreign-key checks, remove the current application tables, and feed
   the staged dump to the MariaDB client with client-side commands disabled;
5. connect normally and run forward migrations; and
6. if import, connection, or migration fails—or startup finds an interrupted
   destructive phase—clear the partial database and restore the rollback dump
   before starting from it.

No destructive MariaDB statement runs until the rollback dump exists and passes
its completeness checks. If the target server disappears during import or
rollback, the process stops with the phase marker and rollback dump intact; the
next start resumes recovery. It must not clear the marker or initialize a
partially restored database merely to keep the process running.

Only a backup from the same database family is accepted: SQLite restores to
SQLite, while external MariaDB/MySQL and embedded MariaDB may restore between
SQL-server modes. SQLite-to-MariaDB conversion and the reverse are not backup
operations and are out of scope.

Only one pre-restore rollback is retained in the private data directory. A later
successful import replaces that rollback after making a new one. A small
non-secret result file lets the settings page explain whether the previous
restart applied or rolled back a restore. Restored users and the JWT secret take
effect after restart, so all clients should expect to sign in again.

### P0 — release hardening

- Add real SQLite, containerized MariaDB, and external-MySQL compatibility
  backup/restore integration suites.
- Add a browser test for password confirmation, export, upload validation, and
  the staged-restart message.
- Keep the full backend and Playwright suites green.
- Remove the dead client `uploadBackup` socket helper left behind when the old
  JSON backup feature was removed.
- Make both full and slim official images contain the MariaDB dump and restore
  clients, with a release-image smoke test that checks them.
- Update README, wiki, backup/restore documentation, changelog, and an execution
  record only to describe the behaviour that passes the release gate.

## Backup archive contract

The archive contains a manifest and exactly one database payload:

```text
manifest.json
database.sqlite   for SQLite
database.sql      for MariaDB
```

The proposed manifest is intentionally small:

```json
{
  "format": "uptime-gizmo-backup",
  "formatVersion": 1,
  "appVersion": "3.0.0-beta.5",
  "createdAt": "2026-09-01T00:00:00.000Z",
  "schema": {
    "legacyVersion": 10,
    "patchedFiles": ["patch-setting-value-type.sql"],
    "knexMigrations": ["2026-08-29-0200-llm-monitor-credential.js"]
  },
  "database": {
    "type": "sqlite",
    "engineVersion": "3.46.0",
    "file": "database.sqlite",
    "size": 123456,
    "sha256": "..."
  }
}
```

Import accepts only known format versions and exact allow-listed paths. It
rejects absolute paths, `..`, duplicate entries, links, devices, extra files,
checksum mismatches, malformed JSON, a payload that does not match its declared
database family, and archives over the configured limits.
`UPTIME_GIZMO_BACKUP_MAX_BYTES` defaults to 2 GiB and bounds both the uploaded
archive and extracted database; operators with a larger history database can
raise it deliberately. Export checks the same database limit before starting and
both directions check that temporary storage has enough free space.

Manifest schema fields are useful diagnostics. The SQLite importer also inspects
the staged database itself. For MariaDB, export reads migration state from the
source database and records the complete applied Knex migration list in the
manifest; import verifies that list before executing any SQL. Both reject a
legacy `database_version` newer than this binary, unknown entries in
`databasePatchedFiles`, and applied `knex_migrations` names that do not exist
locally. This closes a current downgrade behaviour where Knex's "migration files
are missing" error is logged as a warning and startup continues.

A MariaDB payload is executable SQL, so import treats it as privileged input.
The restore client runs without shell interpolation and with client-side named,
`source`, and system commands disabled. The dump is restored into a temporary
validation database and queried before the live database is touched; import
therefore requires permission to create and drop that temporary database. This
is not a sandbox for hostile SQL—the confirmation screen warns operators to
restore only an archive they trust.

`.ugbackup` is a product backup format, not an integration API. Its manifest is
versioned so a later release can add optional assets without pretending an old
importer understands them. Database connection details and passwords are never
written to it.

## What is and is not backed up

The database snapshot includes:

- monitors, groups, tags, and their relations;
- users, password hashes, two-factor settings, the JWT signing secret, and API
  keys;
- notification configuration and other credentials stored in the database;
- status pages, incidents, maintenance windows, settings, and themes; and
- heartbeat and aggregate history retained by the instance.

It deliberately omits:

- `upload/`, including status-page icons and other uploaded assets;
- `screenshots/`, which are generated monitor output;
- `docker-tls/`, which may contain private client keys;
- `db-config.json`, so an import cannot silently switch SQLite/MariaDB modes,
  change the target server, or install connection credentials; and
- logs and any service reached by a monitor or notification provider.

Because omitted files can be referenced by restored rows, the export and import
screens must link to the manual backup guide and list the omissions before the
operator confirms. Full disaster recovery still means backing up the data
volume. The interface feature is a convenient database backup, not a claim that
the volume no longer matters.

## Security model

A backup is more sensitive than any readable API response. It contains password
hashes, API keys, notification secrets, monitor credentials, internal hostnames,
and history. Therefore:

- export and import are administrator-only and require a fresh current-password
  check for each operation;
- the browser receives a random, single-use, purpose-bound transfer ticket over
  its authenticated socket; the HTTP transfer endpoint accepts it once and it
  expires quickly;
- tickets and archive paths are never logged;
- transfer endpoints are internal UI endpoints, not additions to `/api/v1`;
- archives and temporary files are created under the private data directory,
  never under `/upload` or another static path;
- responses use `Cache-Control: no-store`; and
- errors do not include secrets, SQL, filesystem internals, or archive content.

The one-time ticket bridges the existing Socket.IO login to a streaming HTTP
request. It avoids adding a second long-lived authentication mechanism and
avoids loading a potentially large database into either the server's Socket.IO
buffer or the browser's JavaScript heap.

## Compatibility rules

- A beta.4 data directory must start unchanged on beta.5. The feature should not
  need an application-domain schema change.
- A backup from the same or an older application version may be restored and
  then follows the ordinary forward-migration path.
- An older binary must refuse a backup created by a newer application version.
  It must also refuse a database whose recorded legacy, patch-list, or Knex
  migration state is newer, even if an unreliable or development build version
  string says otherwise. Downgrade migrations are not supported.
- Unknown optional fields may be ignored within a known manifest version;
  unknown format versions are rejected.
- SQLite and MariaDB-family backups are not interchangeable. External
  MariaDB/MySQL and embedded MariaDB are interchangeable because they restore
  into the configured `kuma` database through logical SQL.
- Old monitor/notification JSON exports are not accepted. Calling them a
  database backup would conceal their missing data; operators can still use an
  old application version to import them before upgrading normally.
- Copying an existing data directory forward remains supported and documented.
  The new UI is an additional recovery path, not a replacement for that upgrade
  guarantee.

## Implementation sequence

### Phase 1 — format and validation

- Introduce a backup service independent of sockets and HTTP.
- Generate and parse the v1 manifest for both payload families.
- Stream fixed archive entries and enforce path, type, checksum, size, and
  version rules.
- Add a MariaDB tool adapter that uses `spawn` without a shell, private option
  files, bounded output, and redacted errors.
- Add unit tests for every rejected archive shape before exposing an upload
  route.

### Phase 2 — export

- Add the administrator/password-gated export ticket.
- Implement SQLite `VACUUM INTO` and MariaDB single-transaction logical dumps,
  integrity/completeness verification, archive streaming, cleanup, no-store
  headers, and a stable download name.
- Test both engines during live writes. Verify that SQLite opens without a WAL
  companion and MariaDB restores into a clean temporary database.

### Phase 3 — restore lifecycle

- Add the upload ticket and bounded streaming stage operation.
- Persist a pending restore only after full validation.
- Refactor SQLite patch failure paths to throw to the startup coordinator rather
  than calling `process.exit()` internally. Normal startup may still exit at the
  top level; restore startup needs the error in order to put the original file
  back first.
- Apply SQLite before `Database.connect()`, with a pre-restore file and automatic
  rollback if startup preparation fails.
- Add the MariaDB restart coordinator: current-state dump, durable phase marker,
  clean logical import, verification, and automatic logical rollback.
- Make interrupted startup states resumable and test interruption at each file
  transition.

### Phase 4 — interface and documentation

- Add the settings page using existing Gizmo controls and destructive-action
  confirmation patterns.
- Cover loading, missing MariaDB tools, validation error, staged, applied, and
  rolled-back states, including narrow viewports.
- Update English and Simplified Chinese copy first, then preserve the project's
  existing translation fallback for other locales.
- Update current backup guidance, README, roadmap, changelog, and execution
  record without describing deferred scope as shipped.

## Release gate

Beta.5 is releasable only when all of the following are true:

- an SQLite export taken while checks are writing passes `integrity_check` and
  contains the expected monitors, users, settings, credentials, and history;
- external MariaDB, external MySQL, and embedded MariaDB exports taken while
  checks are writing restore the same expected state into a clean compatible
  database;
- importing that archive into a changed instance, restarting, and running the
  normal migrations restores the expected state;
- a corrupt, truncated, oversized, path-traversal, wrong-format, newer-version,
  or newer-migration archive is rejected before live data changes;
- a forced connection, dump, SQL import, or migration failure either starts
  again from the pre-restore SQLite file/MariaDB rollback dump, or blocks safely
  with the rollback and recovery marker preserved when the database server is
  unavailable;
- a non-administrator, wrong password, expired ticket, reused ticket, and ticket
  used for the wrong direction are denied;
- no archive, ticket, secret, or temporary path is exposed through logs or the
  static upload route;
- the full, slim, and rootless official images can execute the MariaDB dump and
  restore tools, while a non-container install without them gets installation
  guidance before export or import begins;
- existing beta.4 data-directory upgrade tests still pass; and
- `pnpm run tsc`, JavaScript/style lint, build, the full backend suite, and the
  full Playwright suite pass.

## Explicitly deferred

- Cross-engine conversion between SQLite and the MariaDB/MySQL family.
- Scheduled, incremental, encrypted, remote, or cloud backups.
- Uploads, screenshots, Docker TLS material, and a whole-volume archive.
- Selective monitor export, cross-instance merge, id remapping, or old JSON
  backup import.
- Backup management through `/api/v1`, MCP, or agent skills.
- Automatic process termination or container orchestration after staging.
- Finishing maintenance/status-page/integration API writes; those remain valid
  roadmap work, but combining them with restore lifecycle changes would make
  beta.5 harder to review and roll back.

Any future database engine should add a native snapshot adapter to the same
archive and restore lifecycle rather than copy live files or translate every
model through JSON.
