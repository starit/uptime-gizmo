# UI Rebuild Execution — Theme Foundation and Shell Start

**Date:** 2026-08-16
**Plan:** [Web UI Rebuild Plan](../plans/web-ui-rebuild.md)
**Phases:** 2 complete; 3 started

## Implemented

- Added `src/assets/tokens.scss`, a semantic Light and Dark CSS custom-property layer implementing the `DESIGN.md` surface, text, brand, interaction, and status tokens.
- Kept the existing `body.light` / `body.dark` runtime behavior intact. The token layer also supports `[data-theme="dark"]` for future consumers.
- Updated the Bootstrap Sass seed values and legacy aliases in `src/assets/vars.scss` from the former green palette to the Uptime Gizmo palette.
- Added `src/assets/gizmo-ui.scss` after the existing global stylesheet. It applies token-based surfaces, typography, focus states, forms, shared containers, buttons, tables, dropdowns, modals, and reusable semantic status badges.
- Updated mobile browser theme-color metadata to Cloud White and Deep Navy.
- Updated the HTML title, metadata, PWA manifest, and runtime app name to Uptime Gizmo.
- Started the application-shell migration: the desktop/mobile header now uses the Uptime Gizmo logo, the existing navigation behavior is retained, and the dashboard now uses a responsive monitor rail plus workspace canvas rather than the old symmetric Bootstrap columns.
- Replaced upstream repository links in the application shell with Uptime Gizmo repository links.

## Decisions

1. Existing page-level `.dark` selectors remain temporarily while their owning pages are migrated. Global primitives now use semantic variables, preventing new code from depending on legacy Sass colors.
2. The provided horizontal logo is used in the application shell from `/images/uptime-gizmo-logo-horizontal-light.png`; product icon replacement for the PWA assets remains a later branding task because no square production icon asset was supplied.
3. `IBM Plex Sans` is the primary interface font declaration with `Noto Sans` as a language-coverage fallback. Self-hosting the font is deferred until an approved font asset/source is selected.

## Verification

- `npm run build` passed.
- `npm run lint` passed with 72 pre-existing warnings and no errors. The warnings are primarily existing scoped-style selector warnings and are recorded as legacy cleanup work.
- The build retained dynamically loaded locale chunks, including RTL locale chunks.

## Next action

Finish the shared shell audit with browser-based visual checks, then rebuild dashboard content and the shared monitor-list primitives before moving to monitor detail and editor workflows.
