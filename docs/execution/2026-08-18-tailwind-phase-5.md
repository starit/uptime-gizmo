# Tailwind migration Phase 5 execution record

**Date:** 2026-08-18
**Scope:** Administration and public surfaces; completion of Bootstrap class removal

## Outcome

No Vue template references a Bootstrap class any more. 763 class uses across 35
files were converted in four commits:

| Commit | Area | Files |
| --- | --- | ---: |
| `a7d9899b` | Stylelint debt inherited from Phase 4 | 5 |
| `2da7330a` | Settings surfaces | 11 |
| `e45e4d1f` | Maintenance and public status surfaces | 9 |
| `7e80d92f` | Remaining dialogs, certificate views, filter dropdown, 404 | 24 |
| `303fe877` | Scoped styles orphaned by Phase 4 | 6 |

Bootstrap SCSS is still imported by `src/assets/app.scss`. Phase 6 removes it.

## Measuring the scope correctly

The first inventory of this phase was wrong by roughly a factor of two. A
hand-written pattern matching `\bmb-3\b` also matches inside `tw-mb-3`, because
a hyphen is a word boundary, so already-migrated files were being counted as
unmigrated. `EditMonitor.vue` and `Details.vue` were reported as the largest
remaining targets when they were already finished.

The inventory was rebuilt to extract the real class list from the installed
`bootstrap.css` — 1760 selectors — and compare against template class
attributes, excluding `tw-` and `gizmo-` prefixes and any name the project
defines itself. That check found eighteen classes the pattern had missed,
including `fs-4`, `list-unstyled`, `is-invalid`, and the responsive
`mx-lg-4` / `pe-lg-3` / `mb-md-0` / `me-md-auto` family.

Any future audit should use the extracted list, not a pattern.

## Decisions that were not mechanical

**Breakpoints are Bootstrap's, not Tailwind's.** Bootstrap's `xl` is 1200px and
Tailwind's is 1280px. `col-xl-10` in the maintenance editor and the
`col-9`/`col-3` to `col-6`/`col-6` switch in the public monitor list are
reproduced as scoped grid rules at 1200px so nothing shifts in the 80px band
between the two definitions.

**Preflight is disabled, so Tailwind's border utilities do not work alone.**
`tw-border-b` sets `border-bottom-width` only; without Preflight there is no
`border-style: solid` and the border does not render. `NotFound.vue` needs
`tw-border-b tw-border-solid tw-border-border`. This applies to every future
border conversion.

**The status page lost `.container` and had to regain what it provided.** That
class supplied centring and horizontal gutters while `.status-page-shell` only
capped the width, so the shell rule absorbed `margin-inline` and
`padding-inline`. Without that the public page would have gone flush left.

**Gold is kept for the theme picker.** `Appearance.vue` overrode the selected
state with `--color-brand`, while the shared `.gizmo-choice-input` recipe fills
with `--color-interactive`. `DESIGN.md` reserves Gold for "selected primary
actions", so the override is correct and was retargeted rather than deleted;
removing it would have silently restyled the picker from Gold to blue. Note
that `SetupDatabase.vue` uses the shared blue for its database selector, so the
two selection surfaces disagree. That inconsistency is pre-existing and is a
design decision, not a migration one.

**`alert-heading` maps to colour inheritance and nothing else.** Bootstrap's
class only forces a heading to inherit the alert's contextual colour. The new
`.gizmo-native-alert__title` recipe does exactly that; giving it a font-size
would have resized six headings this work has no business touching.

**`text-primary` becomes `tw-text-interactive`, not a status token.** On the
reverse-proxy and status pages it marks informational state. Promoting it to
the semantic "up" green would have been a design change.

## Dead code removed

- `gizmo-data-table--borderless` and `gizmo-data-table--hover` in `Details.vue`.
  Neither modifier has ever been defined, so they styled nothing, and the base
  recipe already provides row hover.
- `small-padding` in `PublicGroupList.vue`, defined only in `MonitorListItem`'s
  scoped block and therefore never applied there.
- `PublicGroupList`'s `:class="{ 'link-active': true, 'btn-link': true }"`, two
  constant values written as a dynamic binding, now a static class list. Its
  local `.btn-link` rule is renamed `.monitor-settings-action`; Bootstrap's
  class of that name contributed nothing to an inline SVG.
- Six orphaned scoped rules whose intent no longer applied, including the
  `.form-floating` blocks in Login, Setup, and SetupDatabase — the shared
  `.gizmo-floating-field` recipe positions the label at 0.75rem, and carrying
  over the old 1.3rem Bootstrap-era offset would have misaligned it.

Nine were retargeted instead of deleted, because the intent still applied.

## A Stylelint gap worth knowing

`.stylelintrc` sets `customSyntax` to `postcss-html` globally, so `.scss` files
are parsed as HTML and yield nothing. `src/assets/tailwind.scss` — 947 lines
containing 163 BEM class definitions, the heart of the design system — has no
lint coverage at all. This is inherited configuration, not something this phase
introduced, and fixing it needs a per-extension override plus a pass over
whatever it surfaces.

`selector-class-pattern` was widened to accept BEM `__element` and `--modifier`
suffixes, because the standard kebab-case pattern was rejecting the design
system's own naming rather than catching a defect.

## Verification

Static checks all pass: `pnpm run lint` (0 errors, 9 pre-existing warnings),
`pnpm run tsc`, `pnpm run build`. Three purpose-built checks were also run over
the whole tree — no element carries a duplicate `class` attribute, every
`gizmo-*` class used in a template resolves to a definition, and no template
references a Bootstrap-only class.

Browser verification became possible only after this phase, once Playwright was
repaired. The end-to-end suite passes 22 of 24; both failures are pre-existing
and were confirmed against the pre-migration tree. See
[the Playwright recovery record](2026-08-18-playwright-and-module-resolution.md).

The suite exercises behaviour and accessibility, not appearance. **No screen
from this phase has been reviewed by eye in either theme**, so colour,
contrast, spacing, and responsive rendering remain unverified.

## Phase 6 readiness

Removing the Bootstrap import from `app.scss` was tried as an experiment and
reverted; it compiles with no errors and the production CSS drops from 353,648
to 159,040 bytes, a 55% reduction against a Phase 0 baseline of 321,400.

The Sass variables were expected to block this and do not: `vars.scss` defines
`$primary`, `$body-bg`, `$border-radius`, `$font-family-sans-serif` and the rest
itself, and is imported before Bootstrap.

Three things genuinely remain:

1. 28 rules in `app.scss` and `gizmo-ui.scss` still target Bootstrap class names
   that no template uses. Dead, and removable.
2. **The base layer.** Preflight is disabled, so Bootstrap's reboot is the only
   normalize in the build. Replacing it with Preflight is not equivalent —
   Preflight strips heading sizes and list styles that reboot preserves — so the
   swap will change typography across every screen and must not be done without
   visual verification.
3. Removing `bootstrap` and `@popperjs/core` from `package.json`.

Item 2 is the only one carrying real risk.
