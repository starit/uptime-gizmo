# Tailwind migration — Phase 3A

**Date:** 2026-08-17  
**Plan:** [Tailwind CSS migration](../plans/tailwind-css-migration.md)  
**Status:** Complete

## Scope

Phase 3A establishes the non-Bootstrap dialog foundation without expanding into the remaining business dialogs or dropdown migration:

- Add a Vue SFC TypeScript gate for new Gizmo UI infrastructure.
- Add Reka UI as the behavior-only dialog primitive.
- Implement the project-owned `GizmoDialog` abstraction.
- Migrate `Confirm.vue` while preserving its `show()` and `yes`/`no` public contracts.

The remaining 13 components and 14 Bootstrap Modal instances stay in Phase 3B/3C. Five Bootstrap Data API dropdowns and the global Bootstrap runtime import stay in Phase 3D.

## Implementation

- `reka-ui` is pinned to `2.10.1`, the latest compatible release inside the repository's dependency-age policy at implementation time. Business components import `GizmoDialog`, not Reka primitives.
- `vue-tsc` is pinned to `2.2.12` for compatibility with the existing TypeScript 5.3 toolchain. `npm run tsc` now checks backend utilities, Tailwind configuration, and the Phase 3A frontend boundary.
- The frontend boundary initially covers `Confirm.vue` and `src/components/gizmo/`. Existing TypeScript-labelled legacy dialogs have a large pre-existing error baseline and will enter the gate as each dialog is migrated instead of being hidden with relaxed compiler rules.
- `GizmoDialog` provides controlled open state, focus trapping/restoration, page scroll locking, semantic title and description wiring, configurable Escape/backdrop behavior, close reasons, responsive `sm`/`md`/`lg` sizing, reduced-motion handling, and light/dark/RTL inheritance through its body portal.
- Dialog visuals use semantic tokens and preserve monitoring-product density. The new overlay token is documented in `DESIGN.md` for both themes.
- `Confirm.vue` no longer imports `Modal`, uses `.modal` markup, or depends on `data-bs-dismiss`.

## Verification

- `npm run tsc` passed.
- Targeted ESLint and Stylelint checks passed without errors or warnings in changed source files (apart from Stylelint's project-level deprecated-rule notices).
- `npm run build` passed.
- Browser acceptance passed against the authenticated dashboard in desktop and 390 × 844 mobile viewports:
  - light and dark theme rendering;
  - Chinese and Arabic RTL direction;
  - semantic dialog name and description association;
  - Escape, backdrop, close, and cancel behavior;
  - body scroll locking and restoration;
  - focus placement, containment, and restoration to the trigger.
- A Playwright regression test was added for the confirmation dialog's accessibility attributes, Tab loop, Escape and backdrop dismissal, cancel behavior, scroll lock, and focus restoration. On this macOS host, the repository's bundled Playwright 1.39 Chromium closed immediately during the pre-test setup project, so the automated case could not execute; the equivalent behavior was verified in the in-app Chromium session above.
- Dependency installation left the existing npm audit baseline unchanged at 52 reported vulnerabilities; no automatic audit fix or unrelated dependency upgrade was performed.

## Resource note

The production main bundle moved from the Phase 2 baseline of approximately 2.24 MB / 621.81 KB gzip to 2.32 MB / 647.50 KB gzip. The approximately 25.7 KB gzip increase is the one-time cost of Reka Dialog and its focus, dismissable-layer, scroll-lock, and accessibility dependencies. The bundle report confirms that unrelated Reka components are tree-shaken.

Production CSS is 339.72 KB / 50.78 KB gzip. The increase is limited to the tokenized dialog shell, responsive states, and reduced-motion animations.
