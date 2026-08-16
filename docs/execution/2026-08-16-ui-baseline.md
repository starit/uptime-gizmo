# UI Rebuild Execution — Baseline Audit

**Date:** 2026-08-16
**Plan:** [Web UI Rebuild Plan](../plans/web-ui-rebuild.md)
**Phase:** 1 — Establish the baseline

## Findings

- The application is Vue 3 with Bootstrap 5.1, Sass, FontAwesome, Chart.js, and Vue Toastification.
- `src/assets/vars.scss` defines the current green-first Sass palette. `src/assets/app.scss` applies global styles and broad `.dark` overrides.
- Theme behavior is centralized in `src/mixins/theme.js`. It supports user `light`, `dark`, and `auto` preferences, system preference detection, and status-page theme overrides.
- The current theme implementation toggles `light` or `dark` on `document.body`. The new token system must keep those classes working while replacing the visual values behind them.
- The application has 41 Vue/SCSS files containing `.dark` or legacy Sass color references. These will be migrated incrementally and removed after each surface is verified.
- Internationalization is established through `vue-i18n`; supported locale direction is applied to the document through `setPageLocale()`. RTL locales are Arabic, Farsi, Hebrew, and Urdu.
- Core route groups are setup/login, dashboard and monitor workflows, settings, maintenance, status-page management, and public status pages.

## Decisions

1. Use CSS custom properties as the semantic theme layer, with `.dark` as the dark-theme selector. This preserves the existing runtime behavior and status-page theme setting without requiring a theme API migration.
2. Keep Bootstrap during the rebuild, but override its semantic CSS variables and component presentation through the Uptime Gizmo token layer. Bootstrap replacement is not a first-phase objective.
3. Maintain FontAwesome as the single icon system. New UI must use existing translation keys or add English source keys before localized copies are updated.
4. Start visual migration with global tokens and shared primitives before changing page layouts. Dashboard and monitor workflows are the first authenticated screens after the shell is ready.
5. Preserve the existing runtime theme values (`light`, `dark`, `auto`) as a compatibility contract. Internal legacy Sass aliases may be removed only after their callers are migrated.

## Verification baseline

- Confirmed `DESIGN.md` provides Light, Dark, and semantic status tokens.
- Confirmed the theme runtime supports light, dark, auto, and independent public status-page themes.
- Confirmed the locale layer sets both document language and RTL direction.

## Next action

Implement the Phase 2 token layer, update theme-color metadata, and restyle shared global primitives without changing localized content or route behavior.
