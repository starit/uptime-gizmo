# Monitor inventory execution record

**Date:** 2026-09-02
**Plan:** [Monitor inventory](../plans/monitor-inventory.md)
**Release:** [3.0.0-beta.5](../plans/beta-5-release.md) P1

## Implemented

- `/list` is a desktop inventory page. It no longer redirects to `/dashboard`.
- The dashboard rail is omitted on that route so the table uses the full
  workspace. Opening a row still goes to `/dashboard/:id`, where the rail
  returns.
- The table lists every monitor while preserving group hierarchy. Group rows
  expand and collapse, children are indented, and filtering reveals matching
  descendant paths. Status leads, then a combined identity cell (name, type,
  group, tags), heartbeat, 24-hour uptime, last check, and interval.
  Down/pending/maintenance rows have a status-coloured leading edge. Search
  also matches type, URL, and hostname. Checkboxes are always visible for bulk
  pause/resume/delete. Type filter and column sort are inventory-only.
- Desktop header **Monitors** sits after Dashboard. Mobile `/list` still
  renders the existing list component. Dashboard Home is unchanged.
- English and Simplified Chinese copy were added. Other locales fall back to
  English.

## Preserved behaviour

- No new socket event, REST route, or schema.
- Monitor create/edit, detail, grouping, and drag-and-drop stay on the rail
  and existing forms.
- Mobile bottom navigation still uses `/list` with the existing List label.

## Verification

- `pnpm exec eslint` on the changed Vue/JS files — passed.
- `pnpm exec stylelint` on those Vue files — passed (only the repository's
  existing deprecated-rule notices).
- `pnpm exec vue-tsc --project ./tsconfig-frontend.json` — passed.
- `pnpm run build` — passed.
- `pnpm exec playwright test --config ./config/playwright.config.js monitor-inventory.spec.js` —
  6 passed, including setup and the desktop path: create a monitor, open
  Monitors, see it in the table, open its detail.

Dark theme was not toggled in that run. The page uses existing semantic tokens
and Gizmo primitives rather than new colours.

## Not done here

Configuration import/export and the rest of the beta.5 P0 recoverability /
portability gate remain planned.
