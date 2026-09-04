# 3.0.0-beta.5 release plan

## Objective

Make beta.5 the configuration portability release: administrators can export
monitoring configuration from any supported database and replace the
configuration of another instance without transferring login identities or
monitoring history. The same release also ships a full-width monitor
inventory so a large estate can be scanned without the dashboard rail.

**Status:** implemented; release verification is recorded in
[the execution report](../execution/2026-09-04-beta-5-export-import.md).
Full recovery still uses the manual data-volume/database procedure in
[Backing up and restoring](../backup-and-restore.md).

## Product boundary

Beta.5 provides **configuration import/export only**. It is not a database
backup, account migration, or disaster-recovery replacement.

The archive is a versioned, engine-neutral configuration document assembled
through Knex. The same implementation supports SQLite, external MariaDB/MySQL,
and embedded MariaDB, including configuration export/import between those
engines.
It does not contain a SQLite file or executable SQL and does not require
`sqlite3`, `mariadb-dump`, or another database client binary.

The old monitor-and-notification JSON backup removed in `Drop backup (#3892)` is
not restored. It became incomplete as the schema grew. Beta.5 instead defines a
single configuration schema registry and tests that fail whenever a new table,
column, or statically named server setting has not been classified.

## Included configuration

The archive contains the records required to recreate monitoring behaviour:

- monitors, groups, conditions, tags, and their relations;
- notification channels and monitor attachments;
- proxies, Docker hosts, remote browsers, Web3 networks, and AI credentials;
- maintenance definitions and their monitor/status-page relations;
- status pages and all database-backed page configuration: page settings and
  passwords, groups and monitor links, custom domains, maintenance links, and
  currently active incidents;
- custom themes and allow-listed application settings; and
- operational secrets required by those resources, such as notification tokens,
  monitor authentication, proxy credentials, AI keys, and RPC URLs.

The file remains sensitive even though account credentials are excluded.

## Explicitly excluded data

### Users and access identity

The archive never contains or replaces:

- user rows, usernames, password hashes, administrator flags, or 2FA fields;
- personal API keys;
- the JWT signing secret;
- `instanceOwnerId`, `disableAuth`, or `apiKeysEnabled`;
- database connection details; or
- database migration state.

Import keeps the target instance's accounts and authentication settings. Every
imported estate-owned `user_id` is remapped to the target `instanceOwnerId`.

### Monitoring history and derived state

The archive never contains:

- heartbeats or event messages;
- minutely, hourly, or daily statistics;
- cached TLS or domain-expiry results;
- notification-send history;
- generated maintenance timeslots; or
- completed status-page incident history.

An active incident is current published state and may be included. Imported
monitors begin with empty history.

### Files and external state

The archive also omits `upload/`, screenshots, `docker-tls/`, `db-config.json`,
logs, and state held by external providers. Full disaster recovery therefore
still requires a data-volume and database-native backup.

## Archive contract

The `.ugbackup` file is bounded JSON with an independently versioned format.
This is an abridged shape; an actual archive includes every registered resource
key even when its value is empty:

```json
{
  "format": "uptime-gizmo-configuration",
  "formatVersion": 1,
  "appVersion": "3.0.0-beta.5",
  "createdAt": "2026-09-02T00:00:00.000Z",
  "scope": "configuration",
  "resources": {
    "monitors": [],
    "notifications": [],
    "statusPages": [],
    "maintenances": [],
    "settings": {}
  }
}
```

The server-side schema registry declares for every resource:

- its table or settings source;
- included, excluded, and transformed fields;
- export and import dependency order;
- foreign-key and owner-remapping rules;
- whether it is configuration, identity, history/derived state, or internal
  migration state; and
- field, string, object-count, and total-size limits.

Every application table must have exactly one classification. Every column in a
configuration table must be included, transformed, or excluded with a reason.
SQLite and MariaDB schema-coverage tests enforce this rule, preventing new
features from silently disappearing from exports.

Unknown format versions, resources, or fields are rejected. A future format
change must add an explicit adapter before that version is accepted. Invalid
UTF-8, dangerous nested object keys, duplicate ids, and broken relations are
rejected rather than guessed.

## Export flow

Add **Settings → Export / Import**, visible to administrators. The previous
`/settings/configuration-transfer` URL redirects to the new page.

Export:

1. require the signed-in administrator's current password;
2. open a consistent read transaction;
3. read only registry-classified configuration;
4. normalize booleans, dates, nulls, and JSON fields across database engines;
5. validate ids and relations before producing the file; and
6. return the response with `Cache-Control: no-store` and no public temporary
   file.

`UPTIME_GIZMO_BACKUP_MAX_BYTES` defaults to 128 MiB and can be raised for
unusually large monitor bodies, protobuf definitions, themes, or page content.
Uploads must be uncompressed UTF-8 JSON so the byte bound is enforced before
parsing and cannot be bypassed with a compression bomb.

## Import flow

Beta.5 offers **replace configuration**, not merge/skip/overwrite modes.

Import:

1. require administrator authority and the current password;
2. reject compression, malformed lengths, invalid UTF-8, dangerous object keys,
   and uploads outside the byte, object-count, string-length, and nesting
   limits;
3. validate every field, id, relation, and resource count without writing;
4. summarize what will be replaced and explicitly warn that current monitoring
   configuration and history will be removed;
5. stage only the validated canonical document in the private data directory;
   and
6. apply it on the next start before monitors and jobs initialize.

One database transaction will:

1. resolve and preserve the target instance owner and identity settings;
2. clear history and derived rows tied to current monitors;
3. delete current configuration relations and resources in dependency order;
4. insert the staged resources and remap estate ownership;
5. replace only allow-listed portable settings;
6. retain users, passwords, 2FA, API keys, authentication/JWT identity, database
   configuration, and migration state;
7. reset auto-increment sequences where required; and
8. commit only after relation and resource-count verification succeeds.

SQLite and supported MariaDB/MySQL tables use transactional storage. Any write
or validation failure rolls back configuration and history deletions together.
The staged file and a non-secret failure result remain available for diagnosis.

Current history cannot safely remain after replace import: imported monitor ids
may refer to different monitors. Keeping it would attach old checks to new
configuration. History is therefore cleared only as part of the successful
transaction; a failed import leaves it untouched.

The Import UI tells administrators to use only an archive they created or
trust. Configuration is intentionally operational: imported URLs, notification
destinations, credentials, integrations, and status-page CSS become active after
restart. The format contains no SQL and is never extracted as an archive, so it
does not expose a SQL-execution, path-traversal, or decompression path.

## Settings policy

The `setting` table mixes portable configuration, operational credentials,
identity, cache, and migration bookkeeping, so it is never exported wholesale.

An allow-list includes appearance, entry-page behaviour, retention preferences,
notification thresholds, custom themes, AI credentials, and other monitoring
integrations. Identity and internal keys such as `jwtSecret`, `instanceOwnerId`,
`disableAuth`, `apiKeysEnabled`, `database_version`, `databasePatchedFiles`, and
aggregate-migration state always remain those of the target instance.

Every statically named server setting must be classified by the schema-coverage
test. Dynamically supplied or future settings remain excluded until explicitly
allow-listed.

## Security model

- Import and export are administrator-only and require a fresh current-password
  check.
- The authenticated socket issues a random, single-use, purpose-bound transfer
  ticket that expires quickly.
- Transfer endpoints are private UI endpoints, not `/api/v1`.
- Tickets, archive content, secrets, and temporary paths are never logged.
- Temporary files are never stored below `/upload` or another static path.
- Imports accept plain data only and never execute SQL, shell commands, links, or
  filesystem paths.
- Errors identify a resource and field without echoing its secret value.

Encryption, passphrases, scheduling, and remote storage remain future features.
The UI must not imply that an unencrypted configuration archive is safe to share.

## Implementation sequence

### Phase 1 — registry and format

- [x] Classify every current table, configuration column, and statically named
      server setting key.
- [x] Define v1 schemas, transforms, relation rules, and limits.
- [x] Add schema-coverage and malformed/oversized-payload tests.

### Phase 2 — export

- [x] Add password-gated transfer tickets and a no-store download response.
- [x] Implement transactional reads and engine normalization.
- [x] Prove identity and history sentinel values never appear in an archive.
- [x] Prove equivalent SQLite, MariaDB, and MySQL fixtures produce equivalent
      canonical configuration.

### Phase 3 — staged import

- [x] Add bounded upload, canonical staging, and confirmation summary.
- [x] Implement transactional replace, owner remapping, settings preservation,
      sequence reset, and post-write verification.
- [x] Test same-engine and SQLite/MariaDB/MySQL cross-engine imports.
- [x] Inject a database write failure and verify target configuration, identity,
      and history remain unchanged.

### Phase 4 — interface and release hardening

- [x] Add desktop and narrow-viewport loading, validation, staged, applied, and
      failed states.
- [x] Remove the dead `uploadBackup` helper left by the old JSON feature.
- [x] Update README, wiki, backup guidance, changelog, and execution record only
      after implementation passes its release gate.
- [x] Keep the full backend and Playwright suites green.

### P1 — monitor inventory

Independent of configuration import/export. The dashboard rail stays the
selector for a monitor that is already in hand; it is too narrow to scan an
estate. Scope is in [the monitor inventory plan](monitor-inventory.md).

- [x] Desktop header link to `/list`; that route no longer redirects to the
      dashboard.
- [x] The dashboard rail is hidden on `/list` so the table uses the full
      workspace.
- [x] The table lists every monitor with status, name, type-specific target,
      tags, 24-hour uptime, interval, and last check, plus search, status/tag/type
      filters, column sort, and the existing bulk actions.
- [x] Mobile `/list` uses the same inventory in a compact stacked layout.
      Dashboard Home is unchanged.
- [x] A Playwright spec covers opening the page, finding a monitor, and
      reaching its detail.

This work does not change the configuration archive, import transaction, or
the P0 release gate.

## Release gate

Beta.5 is releasable only when:

- [x] SQLite, MariaDB, and MySQL exports contain equivalent configuration;
- [x] No user, password hash, 2FA value, API key, JWT/identity setting, heartbeat,
      aggregate statistic, cached check result, or completed incident appears;
- [x] Operational configuration secrets restore correctly and never reach logs;
- [x] Every target user, password, 2FA setting, API key, admin flag, JWT secret,
      authentication mode, and database connection remains unchanged;
- [x] Old history is cleared only on successful import and failed imports leave it
      untouched;
- [x] Active incidents restore while completed incident history does not;
- [x] Corrupt, oversized, future-format, unknown-field, duplicate-id, and
      broken-relation documents are rejected before writes;
- [x] Same-engine and cross-engine imports pass;
- [x] A beta.4 data directory still upgrades unchanged; and
- [x] `pnpm run tsc`, JavaScript/style lint, build, full backend tests, and full
      Playwright tests pass.

## Explicitly deferred

- Full database snapshots and restoration of monitoring history.
- User/account, password, 2FA, API-key, or authentication migration.
- Filesystem assets, Docker TLS material, and whole-volume backup.
- Merge or selective import and conflict resolution.
- Scheduled, incremental, encrypted, remote, or cloud backups.
- Backup operations through `/api/v1`, MCP, or agent skills.
- Automatic service restart after staging.
- Unrelated API expansion.

Full disaster recovery remains a data-volume/database-native operation. Beta.5
only moves how an instance is configured—not who can log in or what happened in
the past.
