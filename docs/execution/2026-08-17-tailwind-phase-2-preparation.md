# Tailwind CSS migration — Phase 2 preparation

**Prepared:** 2026-08-17
**Status:** Ready to begin; no UI migration has been made in this preparation step.

## Boundary

Phase 2 establishes reusable presentation primitives. It must not migrate the application shell, Dashboard, monitor list, monitor editor, or Bootstrap JavaScript interactions; those belong to Phases 3 and 4. Existing Socket.IO contracts, Vue I18n usage, and domain-component APIs remain unchanged.

## Inventory-driven starting point

The current Bootstrap inventory makes the first priorities clear:

| Pattern | Current evidence | Phase 2 response |
| --- | --- | --- |
| Form fields | 425 `form-control` and 87 `form-select` uses | Establish fields and field metadata before changing pages. |
| Actions | 26 primary, 20 outline-primary, and 11 destructive button uses | Establish button and icon-button variants with loading and disabled behavior. |
| Small input/action groups | `ActionInput`, `ActionSelect`, `CopyableInput`, and `HiddenInput` repeat Bootstrap `input-group` | Use these as the first low-risk component consumers. |
| Status and tags | `Status.vue` and `Tag.vue` already centralize presentation, but `Tag.vue` still contains Bootstrap utilities | Make them semantic, token-driven consumers. |
| Dense operational rows | `MonitorListItem.vue` combines status, name, tags, and heartbeat data in one scan path | Treat it as a density reference for Phase 4, not a Phase 2 migration target. |

## Proposed primitive boundary

Create primitives under `src/components/gizmo/` using the project’s current Vue Options API unless there is a concrete interoperability reason not to.

| Primitive | Responsibility | Explicit non-responsibility |
| --- | --- | --- |
| `GizmoButton` / `GizmoIconButton` | Semantic button variants, disabled and loading states, visible keyboard focus | Navigation or business actions |
| `GizmoField` | Label, help text, required indicator, error association, and field layout | Owning form state or validation rules |
| `GizmoInput`, `GizmoTextarea`, `GizmoSelect`, `GizmoCheckbox`, `GizmoRadio`, `GizmoSwitch` | Native control presentation and consistent states | Replacing native keyboard and form semantics |
| `GizmoPanel` | A purposeful surface boundary with compact/default density | Creating decorative card nesting |
| `GizmoStatusBadge` / `GizmoTag` | Token-driven semantic status or user tag presentation | Converting arbitrary user tag colors into monitoring states |
| `GizmoAlert` | Accessible inline alert presentation | Toast queue or modal behavior |
| `GizmoTable` / `GizmoListRow` | Dense data layout recipes and responsive overflow/reflow rules | Domain-specific sorting, pagination, or data fetching |
| Layout recipes | Page header, action bar, metric block, responsive grid, sidebar | A second layout framework |

## API and accessibility contract

- Use native `<button>`, `<input>`, `<select>`, `<textarea>`, and `<label>` whenever possible. Do not replace them with click handlers on anchors or divs.
- Every control exposes disabled, invalid, and focus-visible states. Loading buttons remain identifiable and prevent repeated activation.
- `GizmoField` must associate label, description, and error text with the native control through `for`, `id`, `aria-describedby`, and `aria-invalid` as appropriate.
- Components accept translated text from their callers or slots. They must not introduce hard-coded visible strings or locale keys for general labels.
- Status primitives accept a semantic tone (`up`, `degraded`, `down`, `maintenance`, `unknown`) and present a textual/structural cue in addition to color.
- Default density is operational: no unnecessary nested panels; action controls remain compact while preserving a 2.5rem interactive target.
- All colors come from Phase 1 Tailwind semantic tokens or the matching CSS variables. No new template hex values.

## First consumer order

1. `Status.vue` and `Tag.vue` for status/tag recipes.
2. `ActionInput.vue`, `ActionSelect.vue`, `CopyableInput.vue`, and `HiddenInput.vue` for form controls plus action groups.
3. One contained form surface and one existing alert/action-group surface, chosen after the primitives are stable.
4. One representative dense table or list-row surface without changing the Dashboard or monitor-list workflow architecture.

The exact contained consumers should be selected from current usage after the primitive APIs are implemented, to avoid locking a high-traffic route into an immature abstraction.

## Exit verification plan

Phase 2 is complete only when a representative form, table/list row, panel, alert, badge/tag, and action group use no Bootstrap classes; all must be checked in light and dark themes, with keyboard navigation and Chinese/long-text rendering. Build size must remain close to the Phase 1 baseline, and Bootstrap must remain available for unmigrated routes.
