# Backing up and restoring

## Choose the right backup

| Goal | Method | Preserves |
| --- | --- | --- |
| Copy monitoring configuration to another Gizmo instance | **Settings → Backup** | Monitors, notifications, status pages, and other configuration |
| Recover the complete instance | Full backup | Accounts, authentication, history, database state, and local files |
| Move an Uptime Kuma database to Gizmo | Full backup plus the [compatibility matrix](#uptime-kuma-migration-compatibility) | Everything supported by the source-version upgrade |

## Configuration backup

The beta.5 `.ugbackup` file contains monitors, notification channels, status
pages, maintenances, tags, integrations, custom themes, and the credentials
those resources use. It excludes:

- users, password hashes, administrator flags, 2FA settings, and personal API
  keys;
- authentication identity and database configuration;
- monitoring history, aggregate statistics, cached results, and completed
  incidents; and
- uploads, screenshots, Docker TLS material, and logs.

Import replaces the target's monitoring configuration on its next restart. The
target keeps its accounts and authentication settings. Imported monitors start
with no history.

The format works across SQLite, MariaDB, and MySQL. It is not a database dump
and cannot import an Uptime Kuma database.

See [Backup](wiki/backup.md) for the workflow
and [the beta.5 release plan](plans/beta-5-release.md) for the format and safety
decisions.

## Full backup and restore

A full backup includes the data directory. If the instance uses an external
database, it also includes a native backup of that database.

## Uptime Kuma migration compatibility

Gizmo must recognize every migration recorded by the source database. Use only
a source version listed below.

The compatibility matrix for Uptime Gizmo `3.0.0-beta.5` is:

| Source | Database | Status |
| --- | --- | --- |
| Uptime Gizmo `3.0.0-beta.4` | SQLite, MariaDB, or MySQL | Supported |
| Uptime Kuma `2.5.0` | SQLite | Supported and tested with a stopped data-directory copy |
| Uptime Kuma `2.5.0` | MariaDB or MySQL | Not yet tested |
| Uptime Kuma `2.5.1` or newer | Any engine | Not supported by beta.5 |

> [!WARNING]
> Beta.5 does not include an upstream migration added in Kuma `2.5.1`. A newer
> Kuma database may open while Gizmo's own migrations remain unapplied. Existing
> monitors can appear normal even though permissions, API keys, Backup, and
> other Gizmo features have an incomplete schema.

Do not downgrade Kuma or edit `knex_migrations`. Keep an untouched backup and
use a Gizmo release that explicitly supports the source version.

This matrix applies to complete databases, including accounts and history. It
does not apply to Gizmo's configuration-only `.ugbackup` files.

## What has to be copied

Local instance files live under the data directory, `./data` by default, or the
path selected by `DATA_DIR` or the Docker volume.

```text
data/
├── kuma.db          the database
├── kuma.db-wal      recent writes, not yet folded into the file above
├── kuma.db-shm      shared-memory index for the two files above
├── db-config.json   which database this instance uses
├── upload/          status page icons and other uploads
├── screenshots/     captures from real-browser monitors
└── docker-tls/      client certificates for Docker hosts
```

`error.log` can be left out.

With external MariaDB/MySQL, monitors and history live in that database.
`db-config.json` only records how to connect to it. Use the database server's
backup tools, and also copy the data directory for uploads, screenshots, and
certificates.

Embedded MariaDB stores its database below `data/mariadb/`. Stop the instance
before copying the complete data volume; copying that directory while MariaDB is
running is not a consistent backup.

## Do not copy a live SQLite file by itself

**Copying `kuma.db` on its own, while the server is running, silently loses
data.**

SQLite runs in WAL mode. Recent writes may still be in `kuma.db-wal`. Copying
only `kuma.db` can therefore produce an older but apparently valid database.

While the server is running, use the snapshot method below. To copy database
files directly, stop the server first and copy the complete data directory.

## Taking a snapshot without stopping the server

SQLite can write a complete, consistent copy of a live database into a single
file:

```bash
sqlite3 data/kuma.db "VACUUM INTO '/path/to/backup-$(date +%F).db'"
```

The result is one file, already compacted, with no companion `-wal` to keep track
of. It is safe to run while Uptime Gizmo is using the database.

Copy the directories alongside it, since the database does not contain them:

```bash
tar czf uploads-$(date +%F).tar.gz -C data upload screenshots docker-tls
```

## Taking a stopped copy

A clean shutdown stops writes. You can then copy the complete data directory.

Stop the service normally with `docker compose stop` or `SIGTERM`. Do not use
`kill -9`.

Confirm that the process has stopped, then copy the directory. Include
`kuma.db-wal` and `kuma.db-shm` if they remain; do not delete source files before
the backup.

```bash
ls data/
```

## Restoring SQLite

1. Stop the instance.
2. Remove the target's old `kuma.db-wal` and `kuma.db-shm` files.
3. Restore the backup. For a `VACUUM INTO` snapshot, place the file at
   `data/kuma.db`. For a stopped directory backup, restore the complete directory,
   including its `-wal` and `-shm` files if present.
4. If you used `VACUUM INTO`, restore the separately archived uploads,
   screenshots, and Docker TLS files.
5. Confirm that the source version appears in the compatibility matrix above,
   then start the instance. Supported older data is brought forward by startup
   migrations.

You cannot restore into an older version than the source. Migrations only run
forward.

For external MariaDB/MySQL, restore the database with that server's tools and
restore the data directory before starting Uptime Gizmo.

## Verifying a backup

Run a basic SQLite integrity check:

```bash
sqlite3 backup-2026-08-20.db "PRAGMA integrity_check; SELECT count(*) FROM monitor;"
```

Expect `ok` and the same monitor count as the source. For a complete test,
restore the backup into a temporary instance and sign in.

## What is not included

History is in the database, so it comes with it. What no copy of the data
directory contains is anything the instance reaches out to: the notification
providers' own state, the Docker daemons, the RPC endpoints. Those are configured
here and live elsewhere.
