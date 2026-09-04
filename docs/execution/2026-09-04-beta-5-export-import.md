# Beta.5 configuration backup execution

**Release:** [3.0.0-beta.5](../plans/beta-5-release.md) P0

**Scope:** configuration backup only; not full backup or account/history migration

## Outcome

Beta.5 adds an administrator-only **Settings → Backup** page.
It exports a versioned `.ugbackup` document and stages a validated replace
import for the next application start. The implementation uses Knex records,
not a SQLite file or SQL dump, and is exercised against SQLite, MariaDB 12, and
MySQL 8.

The scope is deliberately narrower than disaster recovery. Archives include the
configuration and operational credentials needed to reproduce monitoring, but
exclude users, password hashes, 2FA, personal API keys, identity settings,
monitoring history, completed incidents, filesystem assets, and database
configuration.

## Implementation

- A central registry classifies every current table, every column in portable
  configuration tables, and every statically named setting as configuration,
  identity, history/derived state, host state, or internal state.
- Export runs in a consistent read transaction, normalizes database-dependent
  scalar representations, validates the finished graph, and returns bounded
  canonical JSON with no-store response headers.
- A current-password check mints a random 60-second, purpose-bound, single-use
  ticket. The ticket travels in a header, never in a URL or log.
- Uploads use a bounded octet-stream reader. Unknown versions, resources,
  fields, duplicate ids, broken relations, invalid booleans, invalid UTF-8,
  dangerous nested object keys, excessive nesting, too many values, and
  oversized files are rejected before staging. Compressed bodies and malformed
  content lengths are also refused.
- Staging writes only the canonical archive and a non-secret status record to
  the private data directory. The running database is untouched.
- Startup applies the archive before monitors and jobs initialize. One
  transaction clears incompatible history, replaces configuration in dependency
  order, maps ownership to the target owner, replaces only allow-listed
  settings, verifies resource counts, and commits.
- Users, account credentials, 2FA, personal API keys, JWT/authentication state,
  database settings, and migration state are not deleted or overwritten.
- Status-page settings and passwords, groups and monitor links, custom domains,
  maintenance links, and active incidents transfer. Completed incidents and
  uploaded page assets do not.
- The dead pre-existing `uploadBackup` socket helper was removed.

## Interface

The settings page names the feature **Backup** and states above the actions that
it is a configuration-only backup, not a full backup. It lists both included resources and
excluded identity/history/files, warns that archives may contain operational
secrets, tells administrators to import only a file they created or trust,
requires the current password for each action, confirms destructive replace
staging, and shows pending/applied/failed state with resource counts.

The page follows the existing settings navigation, controls, type, spacing,
status colours, and light/dark design tokens. The action layout collapses to one
column at narrow widths. It was visually checked at desktop width and at
390 × 844 with no browser console errors.

## Compatibility decisions

- The existing database schema and required data-directory layout are
  unchanged; beta.4 directories continue through the normal startup path.
- Format v1 rejects unknown data instead of guessing. A future archive version
  needs an explicit compatibility adapter.
- Replace import, rather than merge, keeps relation semantics deterministic.
- Existing target history is cleared only in the successful replace transaction
  because imported monitor ids may identify different monitors.
- Re-importing the same archive later is an intentional operation and runs
  again; the internal digest marker only protects recovery from a committed
  import whose staged file could not be removed.
- `/settings/export-import` and `/settings/configuration-transfer` redirect to
  `/settings/backup` so existing bookmarks do not break after the user-facing
  rename.

## Verification

The release gate completed on 2026-09-04:

- `pnpm run lint` passed with no errors. It reported 64 pre-existing JSDoc
  warnings in the cloud-only files excluded from this release scope.
- `pnpm run tsc` passed all backend, config, and Vue type checks.
- `pnpm run build` completed the production Vite build.
- `pnpm run test-backend` passed 577 tests with one intentional skip across 113
  suites. This includes current migrations, the beta.4 upgrade regression,
  archive/schema coverage, rollback behaviour, and SQLite/MariaDB/MySQL
  round-trips.
- `pnpm run test-e2e` passed all 35 Playwright tests, including real archive
  download, configuration-only scope inspection, staged replace upload, and a
  390 × 844 responsive check.
- The configuration page was also inspected manually at desktop and mobile
  widths in light theme; there were no browser console errors.
- `git diff --check` and a relative documentation-link check passed.

Beta.5 adds no database migration or required data-directory layout change
relative to the beta.4 tag. Private import-state files are created only after an
administrator stages an import. The full migration suite and beta.4 regression
remain green, so an existing beta.4 data directory follows the same startup
path unchanged.

During the full backend run, the Domain Expiry webhook test exposed fixed local
ports and a listener that could outlive its test. Its mock now binds an
operating-system-assigned port before sending and always closes before the test
settles. The isolated regression and the subsequent full backend run both
passed.

A 2026-09-05 follow-up added malicious-upload and complete status-page graph
coverage. The focused backend suite passed 11 tests, the SQLite/MariaDB/MySQL
round-trip passed, the production build passed, and the focused Playwright run
passed its Backup scenarios plus setup checks. A subsequent responsive
pass made long text, filenames, controls, and summaries shrink or wrap safely;
stacked the form while the two application rails still constrain its usable
width; and changed settings-shell edges to logical properties for RTL. Browser
coverage now includes English at 390 × 844, Simplified Chinese with a long
filename and confirmation dialog at 320 × 700, and Arabic RTL at 1024 × 768.
The import impact list now uses semantic icons instead of relying on globally
reset list markers, and its identity wording explicitly refers to the current
instance the administrator is importing into.
