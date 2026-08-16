# UI Rebuild Execution — Shared Status Primitives

**Date:** 2026-08-16
**Plan:** [Web UI Rebuild Plan](../plans/web-ui-rebuild.md)
**Phases:** 3, 5, and 6 — in progress

## Implemented

- Updated `HeartbeatBar` to draw semantic health colors directly from `--status-*` tokens. This prevents the brand-primary color from being confused with an operational Up state.
- Migrated heartbeat empty states, elapsed-time markers, monitor-filter controls, and tag presentation to shared theme tokens.
- Removed local dark-mode Sass branches from the migrated primitives.

## Decision

The heartbeat bar intentionally uses operational green for Up rather than Gizmo Gold. Gold is reserved for product identity and primary actions; health must retain a stable semantic meaning across private and public surfaces.

## Verification

- `git diff --check` passed.
- `npm run build` passed.
- `npm run lint:js` completed with zero errors and 64 existing warnings.

## Next action

Complete the remaining high-visibility dialogs/settings primitives, then execute the final theme, responsive, i18n, accessibility, and legacy-style cleanup audit.
