# Web3 RPC fallback execution

**Release:** [3.0.0-beta.5](../plans/beta-5-release.md)

**Plan:** [Web3 RPC fallback](../plans/web3-rpc-fallback.md)

## Outcome

Web3 Balance, RPC Health, and Contract Value monitors can use one optional
fallback Web3 Network. The fallback must be a different active network owned by
the same instance and recorded with the same chain ID as the primary network.
Existing monitors receive `NULL` and keep their single-network behaviour.

Fallback is limited to failures that prevent an RPC result. A valid low balance,
stale block, or failed contract comparison remains a failed check and does not
switch providers. The two attempts share one monitor timeout. Successful
fallback heartbeats name the network used; failure details are bounded and RPC
URL paths are removed before they reach a heartbeat.

## Implementation

- Added nullable `monitor.web3_fallback_network_id` with a foreign key to
  `web3_network.id` and `ON DELETE SET NULL`.
- Centralized network lookup, chain verification, timeout budgeting, fallback
  execution, and safe diagnostics for all three Web3 monitor types.
- Enforced ownership, active state, different ids, and equal chain ids in both
  Socket.IO and REST monitor writes.
- Exposed `web3FallbackNetworkId` through monitor serialization, REST/OpenAPI,
  MCP create/update fields, and configuration Backup. `PATCH` accepts `null` to
  remove it.
- Extended Backup graph validation so a malicious or inconsistent archive
  cannot introduce a missing, disabled, duplicate, or cross-chain fallback.
- Added a translated fallback selector below the primary network. It uses the
  existing form controls and layout, disables invalid choices, explains the
  runtime boundary, and remains visible at 390 × 844.
- Updated monitor details and Web3 Network deletion feedback to show fallback
  use and loss of fallback coverage. Deleting a primary atomically promotes an
  active same-chain fallback; an unsafe fallback is cleared instead.
- Updated README, Web3 guides, REST API documentation, agent instructions, the
  beta.5 plan, and changelog.

Configuration Backup archives contain the RPC URLs required to reconstruct Web3
Networks. They remain excluded from ordinary REST/MCP projections, but the
archive itself must be protected as a secret.

## Verification

Completed on 2026-09-09:

- Focused backend coverage passed 152 tests for runtime switching, timeout
  budgeting, URL redaction, validation, Backup compatibility, migration and
  deletion invariants, REST/OpenAPI, MCP agreement, and existing Web3 behaviour.
- The MCP/REST field agreement suite passed all 6 tests after the fallback field
  was added to the MCP schema.
- The production build and all backend/config/Vue type checks passed.
- Targeted ESLint and Stylelint checks passed; translation JSON and
  `git diff --check` passed.
- Playwright passed all 7 tests in the focused run. The feature tests create two
  local JSON-RPC services through the UI, persist and reload the fallback,
  verify the mobile layout, stop the primary endpoint and observe an `UP`
  fallback heartbeat, then verify that a valid low-balance result remains
  `DOWN` without querying the fallback.
- Fresh-database migrations passed on SQLite, MariaDB, and MySQL during the full
  backend run. A focused cross-database Backup test also moved a monitor, both
  RPC URLs, and its fallback relation from SQLite to MariaDB and MySQL and back.
  The same test verifies primary-network deletion and fallback promotion on both
  MySQL-family engines; the focused migration test covers SQLite.

The final full backend run completed 609 tests across 121 suites: 608 passed,
none failed, and one public-NTP test was skipped. The first run exposed a
missing MCP field and a Domain Expiry test that depended on an external RDAP
result. Both were fixed; the Domain Expiry notification test now creates its
own deterministic future-expiry record.

## Interface audit

The interface adds no new colours, fonts, icons, or custom layout rules. It
reuses the project's native field, select, help, warning, spacing, and responsive
styles. English and Simplified Chinese have explicit copy; other locales use the
existing English fallback. Labels remain associated with native controls, and
the warning uses a status role.
