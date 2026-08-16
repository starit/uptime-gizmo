# UI Rebuild Execution — Legacy Theme Elimination

**Date:** 2026-08-16
**Plan:** [Web UI Rebuild Plan](../plans/web-ui-rebuild.md)
**Phase:** 6 — verification and cleanup

## Decision

The remaining legacy visual system was concentrated in global Sass dark-mode overrides and in a few shared components. It was removed rather than kept as a parallel fallback. Bootstrap retains only its necessary compile-time brand inputs; all runtime light/dark and monitoring-state values now resolve through the semantic CSS tokens defined in `src/assets/tokens.scss`.

## Implemented

- Replaced the old `app.scss` dark-theme branch, green alert treatment, repeated form/table/modal styling, and monitor-list highlight colors with tokenized global primitives.
- Migrated Vue Multiselect and Vue Datepicker theme overrides to shared surface, text, border, focus, brand, and status tokens.
- Made ping-chart and heartbeat-canvas colors read active body tokens. The chart now follows theme status colors instead of embedded historic green, red, blue, and yellow values.
- Removed remaining component-level dark branches and hard-coded colors from certificate information, condition groups, tooltips, tags, About, the status-page unknown state, QR generation, and the toast control.
- Added explicit chart-line token values, including a dark-theme counterpart, to keep data visualization distinct while remaining part of the design system.

## Verification

- A source audit found no component-level hexadecimal color or `.dark` override outside the token files and the intentional Bootstrap compatibility bridge.
- `git diff --check` passed before this documentation update.
- `npm run lint && npm run build` passed after the global style rewrite. Lint has zero errors and only the repository's existing scoped-selector/static-analysis warnings.

## E2E environment decision

The locked Playwright Chromium revision `1084` is still unavailable. Two controlled system-Chrome fallback attempts were made without changing repository code or test configuration:

1. Mapping the application bundle failed because the expected binary name is `Chromium`.
2. Mapping the executable itself failed because macOS resolves Chrome Framework libraries relative to the temporary bundle path.

The fallback is therefore not viable. The E2E suite must run with the actual Playwright Chromium download or an equivalent CI browser cache; no project-side workaround was added.
