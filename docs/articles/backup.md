# Move Configuration Between Uptime Gizmo Instances

_Copy monitoring configuration without copying accounts or history._

> Configuration Backup is available in Uptime Gizmo 3.0.0-beta.5.

Uptime Gizmo's Backup page moves configuration, not the database. Use it for a
new instance, a different database engine, or a copy that does not need existing
heartbeat history.

Only administrators can use the page. Backup is not available through the REST
API, MCP server, or agent skills.

The `.ugbackup` archive includes monitors, notification channels, status pages,
maintenance windows, tags, integrations, custom themes, and the operational
credentials those settings need. It works across SQLite, MariaDB, and MySQL.

It deliberately leaves out user accounts, login password hashes, two-factor
authentication, personal API keys, authentication policy, database connection
settings, monitor history, aggregates, completed incidents, logs, uploads, and
generated files.

![The Backup page explaining configuration scope and showing export and import actions](images/backup/01-configuration-backup-overview.jpg)

This is not a disaster-recovery backup. Use a
[full backup](../backup-and-restore.md) to preserve accounts, history, files, and
database state.

## 1. Prepare the target instance

Install and start the target instance normally. Choose its database engine,
create its administrator account, configure authentication, and confirm that you
can sign in.

Those target-side choices stay in place during import. The backup does not
replace them.

Run the same Uptime Gizmo version on both instances when possible. If the target
is newer, check its Backup documentation for archive compatibility
first. The importer rejects archive formats it does not support.

## 2. Export from the source

Sign in to the source as an administrator and open **Settings → Backup**.

Under **Export configuration**:

1. Enter your current login password.
2. Select **Export configuration**.
3. Save the downloaded `.ugbackup` file.

The password proves that the signed-in administrator is present; it is not used
to encrypt the archive.

## 3. Store the archive securely

A `.ugbackup` file is plain, unencrypted JSON. Depending on your setup, it can
contain notification tokens, monitor credentials, proxy passwords, AI provider
keys, Web3 RPC URLs, and custom status-page CSS.

Treat the archive like an environment file or password-manager export. Do not
attach it to an issue, commit it to Git, or place it in a public folder. Remove
temporary copies after you verify the import.

## 4. Import into the target

On the target instance, open **Settings → Backup** and move to **Import
configuration**.

1. Choose the trusted `.ugbackup` file.
2. Enter the current password for the administrator account on this target
   instance.
3. Select **Import configuration**.
4. Read the replacement summary and confirm.

Import replaces the target's current monitoring configuration; it does not
merge two setups. Existing target monitors and their history are removed
when the staged import is successfully applied.

![The import warning explaining restart, retained identity settings, and history replacement](images/backup/02-import-safeguards.jpg)

Uploading the file does not change the running configuration immediately. The
server accepts only supported fields, rejects malformed or oversized input and
broken references, and stages a normalized copy for startup. It does not unpack
files or execute SQL from the archive.

Only import an archive you created or trust. Structural validation cannot make
an intentionally harmful configuration safe: an archive can still change alert
destinations, credentials, integrations, and status-page CSS.

## 5. Restart Uptime Gizmo

A process or container restart is required after a successful import. Restart
Uptime Gizmo itself—not the database—and use the normal mechanism for your
deployment, such as restarting the Docker Compose service or systemd unit.

The replacement runs in one database transaction during startup. A failed
import rolls back instead of leaving a partial configuration. beta.5 does not
support applying the import without a restart.

## 6. Verify the result

Sign in with the target account and password you created before the import.
Then check:

- Monitors are present and begin producing fresh heartbeats.
- Notification channels point to the intended destinations.
- Status pages, including their groups, links, domains, passwords, incidents,
  and custom CSS, look correct.
- Maintenance windows, tags, Web3 networks, and other integrations are present.
- Credentials that depend on destination networking can still reach their
  targets.

Do not expect old charts or incident history to appear. The first post-import
heartbeat starts the new instance's history.

Also do not expect source accounts or API keys. The target keeps its own
users, login passwords, two-factor authentication, personal API keys,
authentication policy, and database connection settings. This prevents an
import from replacing the target's identity or database connection.

## When to use configuration Backup

Configuration Backup is a good match for moving from SQLite to MariaDB or MySQL,
building a clean replacement instance, cloning production configuration into an
isolated lab, or recovering the monitoring setup without carrying a large history
table with it.

For recovery with accounts and history intact, use a
[full backup](../backup-and-restore.md). Production deployments may need both
backup types.

For the complete field scope and operational notes, see the
[Backup wiki](../wiki/backup.md).
