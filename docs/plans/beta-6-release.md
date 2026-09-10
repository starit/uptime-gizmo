# 3.0.0-beta.6 release plan

## Objective

Make Web3 monitoring resilient across more than two RPC providers without
changing what a valid monitor result means. Beta.6 also closes code-quality and
security issues found in the post-beta.5 release review.

**Status:** implemented and functionally verified. Publication still requires
the release workflow and an explicit decision on the documented upstream
dependency advisories.

Beta.6 is an incremental release. Configuration Backup remains a
configuration-only transfer mechanism, and complete recovery still uses the
database/data-directory procedure in [Backing up and restoring](../backup-and-restore.md).

## Product scope

- Replace the single Web3 fallback selector with an ordered pool of up to 10
  active, owner-scoped networks on the primary chain.
- Apply the same pool to Web3 Balance, RPC Health, Contract Value,
  token-decimal lookup, and contract-read preview.
- Preserve the pool through REST/OpenAPI, MCP, configuration Backup, monitor
  details, and the responsive translated interface.
- Preview network-deletion impact and keep persisted configuration and running
  monitor state consistent after a confirmed deletion.
- Resolve release-review findings in REST field contracts and directly used
  production dependencies where a bounded, tested upgrade is available.

This release does not add non-EVM chains, parallel/hedged RPC requests, health
scoring, or automatic provider reordering.

## Compatibility

The migration adds nullable `monitor.web3_fallback_network_ids` storage and
copies the beta.5 `web3_fallback_network_id` value into a one-item JSON array.
The legacy column remains populated with the first fallback so beta.5 API
clients and existing data continue to work. Old configuration archives may
omit the array; new archives preserve both representations and import on all
supported SQLite, MariaDB, and MySQL configurations.

Deleting a primary network promotes the first active same-chain fallback in one
database transaction. Deleting a fallback removes only that entry. Affected
running monitors reload after commit; if a reload fails, the monitor is paused
and the administrator is warned instead of leaving a stale runner active.

## Safety boundaries

- Validate fallback ownership, active state, uniqueness, count, and chain ID on
  every Socket.IO and REST write path.
- Share one timeout budget across all attempts and reserve time for the last
  configured endpoint.
- Fall back only when no usable RPC result is returned. A valid low balance,
  stale block, or failed contract comparison remains a failed check.
- Keep RPC URL credentials out of ordinary REST/MCP responses and bounded
  heartbeat diagnostics.
- Keep disabled fallback references exportable so an operational toggle cannot
  make the whole configuration Backup fail.
- Do not weaken pnpm's 14-day dependency release-age policy to take a new fix.

## Release gate

- Focused runtime, deletion, migration, Backup, REST/OpenAPI, MCP, and UI tests.
- Fresh SQLite, MariaDB, and MySQL migrations and cross-database Backup coverage.
- Full backend and Chromium E2E suites, lint, type checks, and production build.
- Production dependency audit reviewed; unresolved upstream/transitive findings
  must be documented with their reachable surface and upgrade constraint.
- Version bump, tag, images, and publication remain the responsibility of the
  `release-beta` workflow.

Implementation and verification are recorded in the
[beta.6 execution report](../execution/2026-09-10-beta-6-web3-fallback-pools.md).
