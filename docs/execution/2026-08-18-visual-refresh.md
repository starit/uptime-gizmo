# Visual refresh execution record

**Date:** 2026-08-18
**Scope:** Removing the residual Bootstrap aesthetic once its code was gone

## Why

Phase 6 removed Bootstrap's code. It did not remove its look: inflated corner
radii, wide diffuse card shadows, and a status palette taken straight from
Tailwind's default ramps. The product still read as a template rather than an
instrument.

The brief was to modernise while keeping the compact, scannable character a
monitoring tool needs, following the colour rules in `DESIGN.md`.

Information hierarchy was explicitly **not** in scope. An early assessment
claimed the dashboard lacked incident hierarchy; that was wrong, drawn from a
screenshot of an empty dashboard where there was no failure to see. Corrected by
the maintainer.

## Elevation

Four tokens were single wide, low-opacity blurs — `0 18px 50px` at 8% and
similar. Each is now layered the way Tailwind's own scale is built: a hairline
ring carries the edge, a tight offset shadow carries the lift.

Dark mode does not darken the same recipe. Shadow barely registers on a
near-black canvas, so definition there comes from an inset top highlight at 4-7%
white, with the drop shadow kept for depth.

Five call sites had hardcoded light-only literals — `rgba(10,21,30,0.06)` and
friends — which were invisible in dark mode. They reference tokens now.

## Corner and weight scales

Twelve distinct radius values were in use: `999px`, `50rem`, `1.25rem`, `1rem`,
`0.875rem`, `0.75rem`, `0.7rem`, `0.65rem`, `0.625rem`, `0.5rem`, `0.375rem`,
`0.3125rem`, `10px`, `8px` — two spellings of the same pill and no relationship
between the rest.

`tokens.scss` now carries a four-step scale plus a pill. Buttons move from
0.75rem to 0.375rem and cards from 1rem to 0.5rem; that is the substance, and
the rest is consistency. 32 files reference the tokens.

Font weights had seven variants including 650 and 750. IBM Plex Sans ships
static cuts, so those rounded to 600 and 700 anyway — the odd numbers only ever
looked like intent. Four named steps replace them.

## Status palette

Every status colour was a Tailwind default taken as-is: green-500, amber-500,
red-500, violet-500, gray-500. Bright, highly saturated, generic.

| Status | Was | Now |
| --- | --- | --- |
| Operational | `#22C55E` | `#2F9E68` |
| Degraded | `#F59E0B` | `#BD5804` |
| Incident | `#EF4444` | `#D94048` |
| Maintenance | `#8B5CF6` | `#6A54C4` |
| Unknown | `#6B7280` | `#7C828C` |

This also settled a rule `DESIGN.md` already stated but the palette broke. Gold
is `#ECAB24` at hue 40.5°, and degraded was amber `#F59E0B` at 37.9° —
essentially the brand hue, against a document that says never to use Gold as the
default warning state. Degraded moves to 27.2°.

Hue separation is still only 13°, because warning is conventionally amber and so
is the brand, and pushing further collides with the incident red. Lightness now
carries the distinction instead: Gold at 53% against degraded at 38%.

**Contrast was computed, not eyeballed.** Every `-fg` on its `-bg` and every base
against the page clears WCAG AA in both themes; the tightest pair is light
incident text at 5.22:1 against a 4.5 requirement. `DESIGN.md` was updated in
the same change, since it is the source of truth for these tokens.

One measurement lesson: contrast ratio is the wrong metric for judging whether
two colours are *confusable*. Unknown sits 1.6° from Signal Blue by hue but at
6.5% saturation, where hue carries no meaning.

## Public status page

The page read as three stacked cards of equal weight with everything set bold,
so nothing led. Changes, all in service of hierarchy:

- Notices drop the saturated fill. A maintenance window rendered as a solid
  violet block that shouted louder than an incident; `.status-notice` is a
  tinted plate with an accent rule on the leading edge.
- The service list becomes one surface. Three groups of one monitor each had
  been three 80-98px cards wrapping 62-80px rows, with headings floating
  outside. Content height dropped from about 660px to 470px.
- Measure narrows from 1040px to 880px.
- The overall status becomes a statement rather than a card; the page title
  steps down to 1.125rem, since it labels the page rather than carrying it.
- Group names become small uppercase muted labels.
- The uptime figure loses its capsule and is set tabular, tinted by state.
- Rows are a uniform 4.75rem. The heartbeat only prints its time range past four
  beats, so a fresh monitor had been 14px shorter than its neighbours.

## The same defect, twice

`.public-monitor-row` and `.monitor-row--split` both carried a viewport media
query switching to an even column split — Bootstrap's `col-xl-*` translated
literally during Phase 5. Both drive fixed-width containers, so on a desktop
window the monitor rail gave a name 105px when it needed 119, and the status page
left roughly 250px of dead space inside the name column.

Both now size the heartbeat on its own terms and let the name take the
remainder. Any other `col-*-*` translation from that phase deserves the same
check: a viewport breakpoint is the wrong tool for a container-driven layout.

## Dead code

Removed after checking, not after scanning: the unreachable single-dash
`.gizmo-status-*` family (ten rules that `GizmoStatusBadge` cannot produce),
`.gizmo-surface`, `.gizmo-surface-subtle`, `.gizmo-page-header__actions`,
`.gizmo-prose-list`, and one orphaned rule.

Deliberately kept: seven Gizmo components that nothing imports, because all
seven are documented in `docs/gizmo-primitives.md` as part of the primitive
library — an intentional API surface, and a decision for the maintainer rather
than a silent deletion.

Three ESLint `no-unused-selector` warnings are false positives, each verified:
`.onboarding-brand img` still matches because a child component's root element
inherits the parent's scope id, confirmed in the browser; `a.gizmo-native-button`
matches because `router-link` renders an anchor.

A first scan reported 26 unused classes rather than 10, because the tokeniser
required delimiters on both sides and consecutive class names share the space
between them. Results from that kind of sweep need checking before they are
believed.

## Verification

Everything here was checked against the running application in both themes, with
real monitors in down, degraded and maintenance states. Static checks pass.

Not verified: no visual regression suite exists. Screenshot comparison was done
by hand at each step and is not repeatable.
