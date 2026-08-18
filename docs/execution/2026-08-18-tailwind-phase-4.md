# Tailwind migration Phase 4 execution record

**Date:** 2026-08-18 (recording work committed as `a3265680` and `e0e77f7b`)
**Scope:** Application shell, high-frequency workflows, and notification provider forms

## Why this record is late

Phase 4 was carried out before it was written up. The work existed only as
uncommitted working-tree changes alongside the Phase 3 records, which scoped
themselves to dialogs and dropdowns, so the documentation set described a
project that had not started Phase 4 while the tree had largely finished it.
This record closes that gap; it describes what the two commits actually contain
rather than what was planned.

## Outcome

Bootstrap class usage across the two commits:

| Class family | Before | After |
| --- | ---: | ---: |
| `form-control` | 426 | 48 |
| `form-check` | 255 | 73 |
| `form-select` | 93 | 14 |
| `col-*` | 87 | 7 |
| `btn` | 430 | 259 |

Two batches:

- `a3265680` converts roughly 130 notification provider forms, 105 files.
- `e0e77f7b` converts the application shell, setup and login, dashboard detail,
  monitor editor, monitor list and filters, heartbeat bar, incident history,
  ping chart, and settings pages, 19 files.

## The layering decision this phase established

The notification forms consume token-driven CSS recipe classes
(`gizmo-field-label`, `gizmo-native-control`, `gizmo-native-select`,
`gizmo-native-check`, `gizmo-field-help`) rather than the `GizmoField` and
`GizmoInput` components created in Phase 2.

That was the right call for these files — they are structurally near-identical
thin wrappers around native controls, and componentising them would have
produced a far larger diff for no behavioural gain — but it was never written
down, and it is the reason the codebase now carries two parallel systems:

| Component (Phase 2) | Recipe class | Template uses |
| --- | --- | ---: |
| `GizmoInput` / `.gizmo-control` | `.gizmo-native-control` | 5 vs 442 |
| `GizmoButton` / `.gizmo-button` | `.gizmo-native-button` | 3 vs 42 |
| `GizmoCheckbox` / `.gizmo-check` | `.gizmo-native-check` | — vs 182 |
| `GizmoSelect` | `.gizmo-native-select` | — vs 78 |

The 21 Gizmo components are consumed by 28 files; the `gizmo-native-*` family
carries over 780 uses. The migration plan's guardrail says not to leave
permanent dual implementations, so this needs an explicit rule in
[the primitive usage guide](../gizmo-primitives.md) saying when to reach for
which. That is still outstanding.

## Defects this phase introduced, found later

Both were found while completing Phase 5 and are fixed in `a7d9899b` and
`303fe877`.

- 29 Stylelint errors: compact single-line declaration blocks, BEM selectors
  rejected by the kebab-case pattern, and duplicate `.settings-menu` /
  `.settings-content` blocks in `Settings.vue` separated by a media query and an
  unrelated rule. The duplicate selectors were a real defect.
- 16 scoped style rules left matching nothing. Class names changed in templates
  without following them into the stylesheets, so rules that carried real intent
  — mobile action sizing in `Details.vue`, the monitor-list checkbox cursor —
  silently stopped applying rather than merely becoming dead code.

## Verification

Static only. `pnpm run lint:js`, `pnpm run tsc`, and `pnpm run build` passed;
`pnpm run lint:style` did not, and the failure was committed knowingly. No
browser ran against this work at the time, because the bundled Playwright could
not launch on the host — see
[the Playwright recovery record](2026-08-18-playwright-and-module-resolution.md).
