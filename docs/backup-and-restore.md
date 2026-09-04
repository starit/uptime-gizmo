# Backing up and restoring

Uptime Gizmo has two deliberately different operations:

- **Backup** in **Settings → Backup** moves how an instance monitors between
  SQLite, MariaDB, and MySQL. It is a configuration-only backup.
- **Full backup and restore** copies the database and filesystem state described
  on this page.

Do not substitute the first for the second when you need disaster recovery.

## Configuration backup is not a full backup

The beta.5 `.ugbackup` archive contains monitors, notification channels, status
pages, maintenances, tags, integrations, custom themes, and the operational
credentials those resources require. It deliberately excludes:

- users, password hashes, administrator flags, 2FA settings, and personal API
  keys;
- authentication identity and database configuration;
- monitoring history, aggregate statistics, cached results, and completed
  incidents; and
- uploads, screenshots, Docker TLS material, and logs.

Import is a replace operation staged for the next restart. It keeps the target
instance's accounts and authentication configuration and starts imported
monitors with empty history. The archive is database-independent and supports
cross-engine transfer; it is not a SQLite file or SQL dump.

See [Backup](wiki/backup.md) for the workflow
and [the beta.5 release plan](plans/beta-5-release.md) for the format and safety
decisions.

## Full backup and restore

Backing up the complete instance means copying its data directory and, when an
external database is used, taking a native database backup. There is one way to
copy SQLite incorrectly which produces no error at the time — the rest of this
page is mostly about avoiding that.

## What has to be copied

Everything lives under the data directory, `./data` by default, or whatever
`DATA_DIR` or the Docker volume points at.

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

An instance configured for external MariaDB/MySQL keeps its monitors and history
in that server instead, and `db-config.json` records how to reach it. Back the
database up with that server's own tools; the directory still holds the uploads,
the screenshots and the certificates.

Embedded MariaDB stores its database below `data/mariadb/`. Stop the instance
before copying the complete data volume; copying that directory while MariaDB is
running is not a consistent backup.

## The mistake worth avoiding

**Copying `kuma.db` on its own, while the server is running, silently loses
data.**

SQLite runs in WAL mode here. Recent writes go to `kuma.db-wal` and are folded
into `kuma.db` later, so a copy of `kuma.db` alone is the database as of some
earlier moment — with no indication of how much later the rest of it was. It
opens cleanly, it contains most of what you expect, and the monitors that were
added in the last few minutes are simply not in it.

Either copy all three files together, or take a snapshot the way described below.

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

## Stopping first, if you prefer

A clean shutdown folds the WAL into the database and removes it, after which the
directory can be copied as it stands.

Stop the service the ordinary way — `docker compose stop`, or `SIGTERM` to the
process. Do not use `kill -9`: it gives the database no chance to checkpoint, and
leaves the `-wal` file that the previous section warns about.

Confirm before copying. When `kuma.db-wal` and `kuma.db-shm` are gone, the
database is complete on its own:

```bash
ls data/
```

## Restoring

1. Stop the instance.
2. Put the files back where they came from. A snapshot taken with `VACUUM INTO`
   is restored by placing it at `data/kuma.db` — there is no `-wal` to restore
   with it, and any `-wal` or `-shm` left over from the old database must be
   deleted, or SQLite will apply it on top of the file you just restored.
3. Restore the directories from their archive.
4. Start the instance. Migrations run at startup, so a backup from an older
   version is brought forward automatically.

Restoring into an **older** version than the backup came from is not supported:
migrations only run forwards.

## Verifying a backup

A backup nobody has restored is a hypothesis. The cheap version of the test:

```bash
sqlite3 backup-2026-08-20.db "PRAGMA integrity_check; SELECT count(*) FROM monitor;"
```

`ok` and a count that matches what the instance has is enough to show the file is
a real database rather than a truncated copy. Restoring into a scratch instance
and signing in is the honest version.

## What is not included

History is in the database, so it comes with it. What no copy of the data
directory contains is anything the instance reaches out to: the notification
providers' own state, the Docker daemons, the RPC endpoints. Those are configured
here and live elsewhere.
