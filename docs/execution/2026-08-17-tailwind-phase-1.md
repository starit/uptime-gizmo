# Tailwind CSS migration — Phase 1 record

**Completed:** 2026-08-17

## Scope completed

- Added Tailwind CSS 3.4 and Autoprefixer to the frontend build toolchain.
- Added content scanning for `index.html` and application Vue, JavaScript, and TypeScript files.
- Kept [`src/assets/app.scss`](../../src/assets/app.scss) as the single application stylesheet entry. It now loads the Tailwind layers alongside the existing Bootstrap and project Sass.
- Added [`tailwind.config.js`](../../tailwind.config.js) with `tw-` as the required utility prefix and disabled Preflight while Bootstrap remains active. This keeps the new system opt-in and prevents global reset or selector collisions during incremental migration.
- Mapped the semantic tokens defined in [`DESIGN.md`](../../DESIGN.md) to Tailwind colors, font family, radii, shadow, breakpoints, and transition timing functions. Every color is a CSS-variable reference, so a utility resolves against the active light or dark theme at runtime.
- Added small, token-driven recipes in [`src/assets/tailwind.scss`](../../src/assets/tailwind.scss): focus ring, surface treatments, compact tabular data, and the five monitoring status treatments.

## Intentional compatibility decisions

- Bootstrap and its runtime import remain in place. Their removal belongs to Phases 3–6.
- Tailwind's global Preflight reset is intentionally disabled in this phase.
- The `tw-` prefix is intentional. New code must use utilities such as `tw-bg-surface`, `tw-text-content`, and `tw-ease-gizmo`; this protects existing Bootstrap class names until their routes are migrated.
- A small safelist retains the foundational token utilities before Phase 2 components begin consuming them. It avoids broad patterns and has a negligible CSS cost.

## Verification

| Check | Result |
| --- | --- |
| `npm run build` | Passed; Tailwind token utilities and Gizmo recipes are present in the generated CSS. |
| Local Dashboard | Loaded at `http://localhost:3000/dashboard` without errors. |
| Theme behavior | Token utilities use `var(--...)`; the existing `.dark` and `[data-theme="dark"]` overrides continue to supply the runtime dark values. The local Dashboard resolved the dark surface, interaction, and status-background tokens correctly. |
| Visual compatibility | No existing Vue template receives a `tw-` or `gizmo-` class in this phase; Bootstrap remains loaded and Preflight is disabled. |
| CSS size | Generated CSS totals 327,808 bytes, a 3,347-byte (about 1.0%) increase from the Phase 0 CSS baseline. |

## Phase 1 exit audit

| Requirement | Evidence | Status |
| --- | --- | --- |
| Tailwind compiles from one application entry | `tailwind.scss` imported by `app.scss`; production build passes | Complete |
| Vue/JS/TS content scanning | `tailwind.config.js` content paths | Complete |
| Runtime light/dark theme support | Tailwind colors refer to existing semantic CSS variables | Complete |
| Focus, status, surface, compact-data utilities | `src/assets/tailwind.scss` | Complete |
| Bootstrap temporarily retained without visual regression | Bootstrap imports retained; prefixed utilities and disabled Preflight | Complete |
