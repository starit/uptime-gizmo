# Tailwind migration Phase 6 execution record

**Date:** 2026-08-18
**Scope:** Removing Bootstrap and owning the base element layer

## Outcome

Bootstrap and `@popperjs/core` are gone from `package.json`, the SCSS import is
gone from `app.scss`, and Tailwind's Preflight is enabled in its place. The
migration that started at Phase 0 is complete.

| Artefact | Bytes |
| --- | ---: |
| Phase 0 baseline CSS | 321,400 |
| Before this phase | 353,648 |
| After this phase | 157,787 |

A 55% reduction against the immediately preceding build, and roughly half the
Phase 0 baseline.

## Preflight is not a drop-in for reboot

This was the one part carrying real risk, and it is worth stating plainly: the
two resets disagree. Preflight strips heading sizes, block margins and list
markers to nothing; Bootstrap's reboot preserved them. Swapping one for the
other changes typography on every screen unless the gap is filled deliberately.

`gizmo-ui.scss` stops being a Bootstrap override sheet and becomes a base
element layer written in Gizmo tokens: a type scale, paragraph and rule spacing,
inline code, and link colour.

Two departures from the old reboot are intentional rather than accidental:

- **Lists stay unstyled.** Nearly every `<ul>` in this product is structural —
  navigation, menus, monitor lists — so Preflight's reset is the better default.
- **Buttons keep Preflight's transparent, borderless reset,** since every button
  carries `.gizmo-native-button` or a Gizmo component.

Preflight also restores the `border-style: solid` default, so the
`tw-border-solid` workaround Phase 5 needed is no longer required for new border
utilities. Existing call sites are harmless and were left alone.

## Removed with the import

28 rules across `app.scss` and `gizmo-ui.scss` that only ever matched Bootstrap
class names, the `:root --bs-*` variable overrides, the responsive
`.table-shadow-box` reflow block, and `.btn-outline-normal`. None of them were
applied by any template.

Kept: `.shadow-box`, `.btn-normal` and `.bg-maintenance`, which templates do
apply, and `.toast-container` and `.code-editor`, which vue-toastification and
prism-editor attach at runtime.

## Two defects this phase created, found later

Both were found by looking at the running application, not by inspection.

- **Incident banners lost all colour.** They bind `'bg-' + style`, which were
  Bootstrap contextual utilities. Once Bootstrap went, every incident style
  except maintenance rendered with no background at all. Nothing flagged it,
  because the classes simply stopped matching. Repaired in `9e320421` with a
  real `.status-notice` recipe carrying six variants.
- **One `var(--bs-secondary)` reference survived** in `StatusPage.vue`, pointing
  at a variable that no longer existed. Repaired in the same commit.

The lesson is narrow and worth keeping: removing a stylesheet cannot be verified
by grepping for imports. Classes that stop matching fail silently.

## Verification

Screenshot comparison rather than inspection. Eleven full-page captures —
dashboard, monitor editor, general and appearance settings, and maintenance in
both themes, plus the public status page — taken before and after by driving the
real application through Playwright. Rendering was materially unchanged; the
only visible differences were a slightly wider monitor search field and native
select carets.

`pnpm run lint`, `pnpm run tsc` and `pnpm run build` pass. The end-to-end suite
was unchanged at 22 passed with the same two pre-existing failures.
