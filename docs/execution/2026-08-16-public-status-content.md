# UI Rebuild Execution — Public Status Content

**Date:** 2026-08-16
**Plan:** [Web UI Rebuild Plan](../plans/web-ui-rebuild.md)
**Phase:** 5 — in progress

## Implemented

- Rebuilt public service-group rows as compact, token-based surfaces with clearer service names, tag wrapping, stateful hover feedback, and a constrained public monitoring panel.
- Rebuilt incident-history entries as distinct semantic surfaces with visible state rails, spacing for long incident content, and resolved-state treatment.
- Replaced remaining public-content Sass color and dark-mode branches with design-system tokens.
- Certificate-expiry tags now receive semantic CSS variable colors rather than component-local hex values.

## Decision

Certificate health remains represented with a tag in the existing public configuration. Its color is now supplied as `var(--status-up)` or `var(--status-down)`, allowing both configured public themes to resolve it consistently without changing the saved status-page data model.

## Verification

- `git diff --check` passed.
- `npm run build` passed.
- `npm run lint:js` completed with zero errors and 64 warnings, down from the 72-warning baseline. Remaining warnings are legacy scoped-CSS/static-analysis findings that will be handled in the final cleanup pass.

## Next action

Audit remaining page and shared-component legacy theme styles, then perform the responsive/theme/i18n verification matrix and targeted cleanup.
