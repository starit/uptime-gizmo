# UI Rebuild Execution — Application Shell and Onboarding

**Date:** 2026-08-16
**Plan:** [Web UI Rebuild Plan](../plans/web-ui-rebuild.md)
**Phase:** 3 — Application shell and shared primitives (in progress)

## Implemented

- Rebuilt the private application shell with a sticky token-driven header, Uptime Gizmo horizontal logo, updated repository links, responsive desktop navigation, and a mobile bottom navigation.
- Updated Dashboard to a responsive asymmetric workspace: a sticky monitor rail on desktop and a flexible workspace canvas for routed content.
- Rebuilt database setup and admin setup surfaces as responsive onboarding cards using the Uptime Gizmo logo, semantic surfaces, brand accent, and token-based borders and shadows.
- Replaced direct Uptime Kuma branding in runtime app name, HTML metadata, and PWA manifest with Uptime Gizmo branding.

## Preserved behavior

- Existing navigation destinations, logged-in conditions, user menu actions, responsive breakpoint behavior, and FontAwesome icons remain intact.
- Existing setup forms, database options, validation, language selection, and submission behavior are unchanged.
- No translation keys were removed or replaced; setup still renders the active locale.

## Browser verification

- Started the local frontend and backend successfully.
- Loaded the database setup page in Simplified Chinese.
- Verified the accessible DOM contains the Uptime Gizmo logo, language selector, localized database prompt, database option radios, and disabled Next button before selection.
- Measured the onboarding layout at a 1280×720 viewport: the page width is 1280px and the 544px setup card is centered at x=368, with no horizontal overflow.

## Remaining work in this phase

- Rebuild monitor list, dashboard content, shared dialogs, settings shell, and common feedback states.
- Run Light/Dark and mobile browser checks after the private authenticated routes are available in the local environment.
