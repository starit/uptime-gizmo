# Changelog

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
