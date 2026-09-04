# Backup

Beta.5 can back up monitoring configuration and restore it to another Uptime
Gizmo instance. Open **Settings → Backup** as an administrator to export or
import a `.ugbackup` file.

This is a **configuration-only backup, not a full backup**. Use it to reproduce
how an instance monitors; do not use it as the only copy needed to recover the
instance, its accounts, or its history.

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

An imported estate belongs to the target instance's existing owner. The target
keeps all of its accounts and authentication settings.

## Exporting

1. Open **Settings → Backup**.
2. Under **Export configuration**, enter your current password.
3. Download the `.ugbackup` file and store it somewhere protected.

The export is assembled through the application's database layer. It works with
SQLite, external MariaDB/MySQL, and embedded MariaDB; it is not a copied SQLite
database or a SQL dump.

## Importing

Import is a replace operation, not a merge.

1. Take a full backup if you may need to recover the target's current state.
2. Open **Settings → Backup** on the target instance.
3. Select the `.ugbackup` file, enter your current password, and confirm the
   replacement.
4. Restart Uptime Gizmo.
5. Return to the same page to check whether the import was applied or failed.

Uploading only validates and stages the archive in the private data directory.
It does not change the running database. On the next start, Uptime Gizmo applies
the replacement in one transaction before monitors and background jobs begin.
A failed import rolls back the configuration and history changes together.

Beta.5 requires restarting the Uptime Gizmo process or container after import.
There is no live **Apply now** action: applying before runtime services start
prevents old monitor objects, caches, and in-flight checks from continuing to
use the configuration that was just replaced.

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

Before staging, the server requires a fresh administrator password and consumes
a random, purpose-bound, single-use ticket. It reads an uncompressed octet
stream under a configured byte limit, requires valid UTF-8 JSON, and accepts
only the current format, resources, fields, scalar types, ids, and relations.
Malformed lengths, compressed uploads, dangerous nested object keys, excessive
depth or value counts, oversized strings, duplicate ids, and broken references
are rejected. The accepted document is serialized again into canonical JSON
and written as a private file; the uploaded filename is never used.

`.ugbackup` is JSON despite its extension. Uptime Gizmo does not unpack it and
does not execute SQL from it, removing archive path-traversal, decompression-bomb,
and SQL-script execution paths. These checks make parsing safer; they do not
make an intentionally harmful but structurally valid configuration trustworthy.

## Full recovery is separate

To preserve users, authentication, history, files, and database state, follow
[Backing up and restoring](../backup-and-restore.md). Configuration backup
does not replace that procedure.

Configuration backup is intentionally unavailable through `/api/v1`, MCP, or
agent skills. See the [REST API reference](rest-api.md#configuration-backup-is-not-a-rest-api)
for the boundary.
