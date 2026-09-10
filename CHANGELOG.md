# Changelog

## 3.0.0-beta.6 — 2026-09-10

- Web3 fallback now supports an ordered pool of up to 10 same-chain RPC networks
  across balance, RPC health, contract monitoring, token-decimal lookup, and
  contract previews. Includes ordered UI controls, REST/MCP array fields,
  configuration backup, and safe promotion when a network is deleted. Legacy
  single-fallback configurations remain compatible. Deletion now previews how
  many monitors will continue through promotion, stop, or lose fallback
  coverage before the administrator confirms it, then immediately reloads the
  affected running monitors. Configuration Backup preserves fallback references
  when a network is temporarily disabled.
- REST monitor writes and projections now keep the ordered fallback field
  writable while reading beta.5 single-fallback rows through the new array
  contract.
- If an affected monitor cannot restart after network deletion, it is paused
  instead of continuing with a stale in-memory network selection. The UI reports
  the affected count while the completed deletion remains a successful result.
- Updated JSONata, Axios, MySQL2, LiquidJS, gRPC, Protobuf, WebSocket, and HTTP
  cookie-agent dependencies to versions that address known production security
  advisories without weakening the package release-age policy.

## 3.0.0-beta.5 — 2026-09-04

Beta.5 adds database-independent configuration backup and a full-width monitor
inventory. The configuration archive is intentionally not a complete backup:
it moves monitoring behaviour while leaving the target instance's
accounts and authentication identity in place.

### Added

- Administrator-only **Backup** under **Settings → Backup**,
  protected by the administrator's current password and short-lived,
  single-use transfer tickets.
- A versioned, bounded `.ugbackup` format for monitors, notifications, status
  pages and their groups/links/domains/active incidents, maintenances, tags,
  integrations, custom themes, and allow-listed settings. Operational
  credentials needed by those resources are included, so archives must be
  handled as secrets.
- Cross-database configuration backup between SQLite, external
  MariaDB/MySQL, and embedded MariaDB, with schema coverage that requires every
  table, configuration column, and known setting to be classified.
- A full-width monitor inventory with search, status/tag/type filters, sorting,
  bulk actions, responsive mobile cards, and a per-monitor history display
  control.
- Incremental overview reads through
  `/api/v1/overview?since=<unix-seconds>`, using whole Unix seconds rather than
  implementation-dependent date-string parsing.
- An optional same-chain fallback network for all three Web3 monitor types. RPC
  failures may switch networks; valid threshold failures never do. Deleting a
  primary promotes a still-valid fallback instead of breaking the monitor.

### Safety and compatibility

- Configuration archives never contain users, login password hashes, 2FA
  configuration, personal API keys, JWT/authentication identity, monitoring
  history, completed incidents, filesystem assets, or database settings.
- Import validates and stages the archive without changing the running
  database. Replacement happens on the next start, before monitors and jobs,
  in one transaction. A failure rolls back both configuration and history
  changes.
- Import rejects compressed uploads, malformed lengths, invalid UTF-8,
  oversized or excessively nested documents, unknown fields, dangerous object
  keys, duplicate ids, broken relations, and cyclic monitor parent graphs before
  it writes a staged file.
- Monitor inventory and detail targets share conservative credential redaction
  for URL userinfo and sensitive query parameters as well as common database
  connection-string password forms.
- Backup controls wrap and stack safely for long translations and
  filenames, including a 320 px mobile viewport; settings navigation and panel
  edges use RTL-aware logical properties. Import effects use visible semantic
  icons and describe preserved data from the importing administrator's point
  of view. The required post-import restart is shown in a dedicated warning
  before the file and password fields.
- Imported ownership is mapped to the target instance owner. Existing target
  accounts, passwords, 2FA, API keys, administrator flags, JWT secret, and
  authentication policy remain unchanged.
- Existing beta.4 data directories still open in place. The Web3 fallback
  migration adds one nullable monitor reference; existing monitors keep their
  previous single-network behaviour.

### Full-database compatibility

- Kuma `2.5.0` → Gizmo beta.5 has been verified with a stopped SQLite data
  directory, including accounts, monitors, status pages, and history.
- Beta.5 does not support complete databases from Kuma `2.5.1` or newer because
  it does not include their full migration history.
- `.ugbackup` remains portable between Gizmo SQLite, MariaDB, and MySQL
  instances. It moves configuration and does not import a Kuma database.

### API notes

Configuration backup is not part of `/api/v1`, OpenAPI, MCP, or the agent
skills. Its private transfer routes are UI implementation details and cannot be
used with an API key.

## 3.0.0-beta.4 — 2026-08-31

This beta focuses on making the work since beta.3 safe to operate and safe to
upgrade. An existing beta.3 data directory can be copied into beta.4 and is
migrated in place. Back up the data directory before upgrading; downgrading a
migrated database is not supported.

### Added

- LLM monitors that verify an OpenAI-compatible completion endpoint returns
  usable output within the configured latency, with reusable AI credentials.
- Idempotent monitor provisioning through a caller-owned `externalRef`.
- Notification-channel create, update, delete, discovery, and monitor
  attachment through `/api/v1`.
- Rolled-up uptime/latency history and individual heartbeat history through
  `/api/v1`.
- Certificate validity and expiry details in the monitor overview.
- Per-key API throughput limits and per-source failed-authentication limits.

### Fixed

- Disabled notification channels now stop all status, certificate-expiry, and
  domain-expiry delivery while staying attached to their monitors. They can be
  disabled and re-enabled in the notification dialog.
- Empty uptime windows now describe the requested window instead of falling
  back to unrelated historical data or reporting a false zero after restart.
- A clean shutdown no longer reports an in-flight monitor cancellation as a
  crash that should be filed as a bug.
- DNS monitors now reject record types that the checker cannot interpret.
- System-service checks use `sc.exe` on Windows instead of depending on
  PowerShell output.
- Changelog tests no longer treat a real release tag as a deliberately missing
  tag.

### Upgrade compatibility

- The three new monitor migrations are additive. Existing monitor rows keep
  their meaning and receive only nullable fields or the documented token cap.
- `externalRef` is unique per user only where it is set. Existing monitors have
  no reference and upgrade unchanged, however many of them there are.
- Existing single AI-provider settings are read as the first reusable
  credential, so they continue to work until saved in the new list format.
- Existing notification rows remain enabled. The `active` column already
  defaulted to true, and older application versions never wrote a disabled
  value.

### Beta API notes

`/api/v1` is still a beta contract. This release adds notification writes,
history endpoints, certificate fields, and `externalRef`; clients should use
the OpenAPI document served by the running instance rather than assuming a
beta.3 response shape.
