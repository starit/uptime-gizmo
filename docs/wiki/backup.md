# Backup

Beta.5 can back up monitoring configuration and restore it to another Uptime
Gizmo instance. Open **Settings → Backup** as an administrator to export or
import a `.ugbackup` file.

This is a **configuration-only backup**. Use it to copy monitoring setup between
Gizmo instances. To preserve accounts, history, files, and database state, use a
[full backup](../backup-and-restore.md) instead.

## What the archive contains

- monitors, groups, tags, and their relations;
- notification channels and attachments;
- status-page settings and passwords, groups and monitor links, custom domains,
  maintenance links, and active incidents;
- maintenance definitions and relations;
- proxies, Docker hosts, remote browsers, Web3 networks, and AI credentials;
- custom themes and other allow-listed monitoring settings; and
- operational secrets needed by those resources, including tokens, passwords,
  API keys, and RPC URLs.

The archive is plain, unencrypted JSON. Treat it as a secret even though it does
not contain login credentials.

## What it deliberately leaves out

- users, usernames, password hashes, administrator flags, and two-factor
  configuration;
- personal API keys, the JWT secret, and authentication policy;
- heartbeats, event history, aggregate statistics, cached check results, and
  completed incidents;
- uploads, screenshots, Docker TLS files, logs, and database connection
  settings; and
- database migration or internal bookkeeping state.

Imported configuration is assigned to the target instance's existing owner. The
target keeps its accounts and authentication settings.

## Exporting

1. Open **Settings → Backup**.
2. Under **Export configuration**, enter your current password.
3. Download the `.ugbackup` file and store it somewhere protected.

The archive works with SQLite, external MariaDB/MySQL, and embedded MariaDB. It
is not a copied SQLite database or SQL dump.

## Importing

Import is a replace operation, not a merge.

1. Take a full backup if you may need to recover the target's current state.
2. Open **Settings → Backup** on the target instance.
3. Select the `.ugbackup` file, enter your current password, and confirm the
   replacement.
4. Restart Uptime Gizmo.
5. Return to the same page to check whether the import was applied or failed.

Uploading validates the archive and stages it in the private data directory. It
does not change the running database. On the next start, Uptime Gizmo applies
the replacement in one transaction before monitors and background jobs start.
A failed import rolls back the complete transaction.

Beta.5 requires a process or container restart after import. There is no live
**Apply now** action. Applying during startup prevents old monitor objects,
caches, and in-flight checks from using replaced configuration.

Successful replacement clears existing monitoring history because old monitor
ids could otherwise attach old checks to a different imported monitor. Imported
monitors therefore start with empty history. The archive's active status-page
incidents are restored; resolved incident history is not.

The same archive can be imported across supported database engines, including
SQLite → MariaDB/MySQL and the reverse direction.

## Import files are untrusted input

Import only an archive you created or obtained from someone you trust. A valid
configuration archive can intentionally change monitor targets, notification
destinations, integration credentials, external URLs, and custom status-page
CSS. Those settings become active after the restart.

Before staging, the server requires the administrator's current password and a
short-lived, single-use ticket. It rejects:

- compressed, oversized, or non-UTF-8 uploads;
- unsupported formats, resources, fields, or value types;
- dangerous object keys or excessive nesting;
- duplicate ids, broken references, and cyclic monitor parent graphs; and
- malformed content lengths and oversized strings or value collections.

The server writes a validated, canonical JSON document to a private file. It
does not use the uploaded filename.

`.ugbackup` is JSON despite its extension. Uptime Gizmo does not unpack it or
execute SQL from it. Validation protects the parser, but a structurally valid
file can still contain harmful destinations or credentials.

## Full recovery is separate

To preserve users, authentication, history, files, and database state, follow
[Backing up and restoring](../backup-and-restore.md). That guide also lists the
Uptime Kuma versions that can be migrated to Gizmo.

Configuration backup is intentionally unavailable through `/api/v1`, MCP, or
agent skills. See the [REST API reference](rest-api.md#configuration-backup-is-not-a-rest-api)
for the boundary.
