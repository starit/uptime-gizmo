# Tailwind CSS migration — Phase 2 record

**Completed:** 2026-08-17

## Delivered

- Added documented, token-driven Gizmo primitives for buttons, icon buttons, field metadata, inputs, textarea, select, checkbox, radio, switch, panels, status badges, tags, alerts, toast presentation, empty states, loading indicators, tables, and dense list rows.
- Added lightweight layout recipes for page headers, action bars, metric blocks, sidebars, input prefixes, and input/action groups.
- Migrated the shared action-input, selection, copy, password, status, and tag components without changing their public domain APIs.
- Replaced Bootstrap classes in three representative combinations: the Add Status Page form/panel/action group, Dashboard important-events panel/table/action group, and Settings About alert/switches.
- Kept Bootstrap Sass and runtime enabled for unmigrated routes; no Bootstrap JavaScript interaction has been replaced in this phase.

## Accessibility and localization guarantees

- The field primitive associates label, help text, and error text with native controls.
- Buttons and icon buttons use native buttons; icon buttons require an accessible label.
- Status presentation pairs a text label with its status dot.
- Components receive translated text from callers; no locale data was changed or removed.
- The representative new form was verified in Simplified Chinese and dark theme with visible keyboard focus.

## Verification

| Check | Result |
| --- | --- |
| Shared SFC compilation | All Gizmo primitive SFCs parse and compile with `@vue/compiler-sfc`. |
| `npm run lint` | Passed with 0 errors and 10 pre-existing warnings. |
| `npm run build` | Passed. |
| Dashboard representative | Local Dashboard renders the compact event panel, table, and destructive action. |
| Form representative | Local Add Status Page renders native labeled fields, prefix group, panel, and submit action. |
| Keyboard/theme check | Focused field exposes the Gizmo focus ring; local dark theme resolved the expected surface and focus tokens. |

## CSS budget

The Phase 2 build generated a main CSS file of approximately 333 KB before compression. This is about 8 KB above the Phase 1 baseline and remains intentionally small while Bootstrap is still present. Subsequent phases must remove equivalent Bootstrap CSS as they replace it; this temporary overlap must not become permanent.

## Exit audit

| Requirement | Evidence | Status |
| --- | --- | --- |
| Shared controls and feedback primitives | `src/components/gizmo/` and `docs/gizmo-primitives.md` | Complete |
| Card/panel, table/list, empty/loading, badge/tag, alert/toast recipes | Shared primitives and `src/assets/tailwind.scss` | Complete |
| Page header, action bar, grid/sidebar, dense metric patterns | Layout recipes documented and tokenized | Complete |
| Semantic Operational, Degraded, Incident, Maintenance, Unknown styles | `GizmoStatusBadge` plus Phase 1 status tokens | Complete |
| Representative form, table, panel/card, alert, and action group have no Bootstrap classes | Add Status Page, Dashboard important-events panel, Settings About, and shared action-input consumers | Complete |
