# 3.0.0-beta.6 Web3 fallback pools execution

**Plan:** [3.0.0-beta.6 release](../plans/beta-6-release.md)

## Outcome

Web3 monitors now use an ordered pool of up to 10 fallback networks. The pool
is shared by normal checks and form previews, survives configuration Backup,
and retains beta.5's single-fallback representation for compatibility.

Confirmed network deletion is transactional. The preview and mutation use the
same impact calculation, a valid fallback can become primary, and affected
running monitors reload committed data immediately. A failed reload pauses the
monitor and produces a visible warning; it cannot keep running with the deleted
network or turn a completed deletion into a false failure response.

## Implementation

- Added additive fallback-pool storage and migration of existing single
  fallback values.
- Centralized normalization, legacy compatibility, timeout allocation, endpoint
  filtering, diagnostics, and relation validation.
- Added ordered selectors with translated empty/error states and mobile layout,
  plus monitor-details visibility and delete-impact confirmation.
- Extended REST/OpenAPI, MCP, agent instructions, and configuration Backup with
  the ordered array while retaining the legacy field.
- Kept disabled fallback networks valid in Backup documents and skipped them at
  runtime.
- Updated directly used JSONata, Axios, MySQL2, LiquidJS, gRPC, Protobuf,
  WebSocket, and HTTP cookie-agent dependencies to patched versions. The
  package release-age policy was not relaxed.

## Verification

Completed on 2026-09-10:

- `pnpm install --frozen-lockfile`, all backend/config/frontend type checks,
  production build, JavaScript lint, and style lint passed. JavaScript lint has
  zero errors and retains 64 pre-existing Cloud JSDoc warnings.
- The full backend suite completed 619 tests across 121 suites: 618 passed,
  none failed, and the opt-in public NTP check was skipped.
- Fresh SQLite, MariaDB, and MySQL migrations passed. The cross-database Backup
  test moved the same configuration and ordered Web3 references among all three
  engines.
- Focused gRPC and WebSocket tests passed after their dependency updates. The
  gRPC group also no longer reproduces the previous local bind failures.
- The full Chromium E2E suite passed all 41 tests. It covers Backup at a narrow
  viewport and in Chinese/RTL, Web3 fallback execution, monitor forms and
  inventory, status pages, incidents, notifications, and API-key copy.
- The production audit fell from 68 findings (4 critical, 26 high) to 36
  findings (1 critical, 14 high) after bounded direct-dependency updates.

The production audit still reports findings inherited through older upstream
packages, chiefly build-time `tar` under `@louislam/sqlite3`, `glob` and
`lodash` under `redbean-node`, and an older `protobufjs` under a transitive
proto loader. Nodemailer's 9.1 fix was only nine days old at review time, so the
14-day policy correctly refused it. These are not hidden by overrides or audit
exceptions; they remain explicit release-review items.

No newer `@louislam/sqlite3` or `redbean-node` release exists. Forcing their
transitive dependencies across major versions would make install/database
compatibility harder to reason about, so beta.6 does not do that. Nodemailer is
used with structured fields only—the application never passes its vulnerable
message-level `raw` option—and recipient values come from authenticated
notification configuration rather than incoming monitor data. Upgrade it to
9.1 or later once the normal release-age window permits, then rerun SMTP and
the full release gate.

## Release result

The beta.6 feature and compatibility gate is green. The release is suitable for
a beta candidate, but the remaining audit findings must be accepted explicitly
or rechecked after Nodemailer 9.1 has aged into the dependency policy before
public publication. Version bump, tag, images, and publishing remain with the
`release-beta` workflow.
