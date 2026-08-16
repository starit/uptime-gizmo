# UI Rebuild Execution — Monitor List

**Date:** 2026-08-16
**Plan:** [Web UI Rebuild Plan](../plans/web-ui-rebuild.md)
**Phases:** 3 and 4 — in progress

## Implemented

- Converted the monitor-list panel, filter header, search affordance, bulk-action menu, and selected-count treatment to the semantic token system.
- Rebuilt monitor rows as compact interactive surfaces with stronger hover and inactive-state treatments, while retaining monitor nesting, drag-and-drop grouping, heartbeat modes, tags, selection, filtering, and routing.
- Replaced the list's remaining component-level legacy Sass color variables and `.dark` branches with theme tokens.
- Added shared floating-elevation and destructive-status aliases to the token foundation for component use in both themes.

## Preserved behavior

- All existing monitor actions, localized labels, route generation, filter behavior, keyboard/form semantics, and nested-collapse persistence are unchanged.
- The sidebar remains sticky on desktop and preserves its current viewport-aware height behavior; mobile continues to use the same component and workflow.

## Verification

- `git diff --check` passed.
- `npm run build` passed.
- `npm run lint:js` completed with zero errors and 70 existing selector/style warnings. The warning count decreased from the earlier 72-warning baseline because obsolete monitor-list selectors were removed; remaining warnings are tracked legacy scoped-CSS findings outside this migration plus two static-analysis false positives in the updated list.

## Next action

Migrate monitor detail and add/edit-monitor surfaces, then apply the same system to maintenance and settings workflows.
