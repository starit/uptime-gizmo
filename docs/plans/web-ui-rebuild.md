# Web UI Rebuild Plan

## Objective

Rebuild Uptime Gizmo's web UI so it reflects the product's monitoring, automation, and AI-agent direction; supports multiple themes; preserves existing internationalization; and removes obsolete visual code rather than extending the legacy styling system.

## Design specification

### Purpose

Provide an information-dense, reliable monitoring workspace for operators, while making public status pages clear and trustworthy. Theme behavior and status semantics must remain stable across languages and monitoring workflows.

### Aesthetic direction

**Industrial/utilitarian.** Use Deep Navy as the foundation, Gizmo Gold as the brand anchor, and Signal Blue for AI and interactive states. Prioritize information hierarchy, operational clarity, and an engineering character.

### Color palette

- Deep Navy: `#0A151E`
- Gizmo Gold: `#ECAB24`
- Signal Blue: `#1E64E7`
- Cloud White: `#FCFCFC`
- Operational Green: `#22C55E`

Use the full light, dark, and semantic status token definitions in [DESIGN.md](../../DESIGN.md).

### Typography

- `IBM Plex Sans` for interface text and data explanations
- `IBM Plex Mono` for status, metrics, code, and technical information

### Layout strategy

Use a left-anchored navigation and action area with a deliberately asymmetric data canvas. Important alerts, monitor summaries, and primary actions should form layered, offset visual groups rather than a uniform centered card grid.

## Principles and constraints

- Preserve all existing `$t` and `i18n-t` usage; do not hard-code new UI text in one language.
- Preserve Light, Dark, and Auto theme behavior, including the status page's independent theme setting.
- Use semantic tokens from `DESIGN.md`; do not add one-off hex colors to components.
- Keep monitoring state colors semantic and pair them with labels, icons, or shapes.
- Use the established FontAwesome icon system; do not use emoji as UI icons.
- Retain functional behavior where it remains useful. Breaking visual and internal CSS changes are allowed when they remove obsolete code or simplify the architecture.
- Delete superseded styles, components, assets, and compatibility logic once their replacement is verified.

## Implementation phases

### 1. Establish the baseline

- Inventory routes, shared components, Sass variables, `.dark` overrides, and Bootstrap dependencies.
- Define the visual acceptance matrix for key routes: login/setup, dashboard, monitor list and details, monitor editor, settings, maintenance, and public status pages.
- Audit visible strings and locale-sensitive layouts, including RTL languages and long translations.

**Exit criteria:** the affected surface area and current theme/i18n behavior are documented before visual implementation begins.

### 2. Build the theme foundation

- Map the `DESIGN.md` tokens into global CSS custom properties.
- Provide a compatibility bridge for the existing `.dark` root class while allowing a semantic theme-token architecture to replace Sass-only color values.
- Rework global typography, surfaces, borders, focus states, buttons, forms, and semantic status styles.
- Remove the legacy green primary palette, duplicated dark values, and unused global styling as each replacement is adopted.

**Exit criteria:** Light, Dark, and Auto render from shared tokens, and shared controls are visually consistent in both themes.

### 3. Rebuild the application shell and shared primitives

- Redesign desktop and mobile navigation, branding, connection feedback, profile controls, and toast presentation.
- Consolidate buttons, fields, selects, dialogs, dropdowns, tables, tags, empty states, loading states, and error states into reusable visual primitives.
- Keep existing routes, permissions, keyboard behavior, and localized labels intact.

**Exit criteria:** private application pages use the new shell and primitives without legacy shell styles.

### 4. Rebuild private workspace pages

- Start with Dashboard, monitor list, monitor details, and the add/edit monitor workflow.
- Continue with maintenance, status page management, settings, API keys, proxies, and related administration views.
- Validate information density, responsive behavior, and all important action/error states as each area is migrated.
- Delete page-level legacy Sass and dead component logic after the migrated page is verified.

**Exit criteria:** authenticated workflows have a cohesive Uptime Gizmo visual language and no longer depend on obsolete page styling.

### 5. Rebuild public status pages

- Redesign public status-page hierarchy, service grouping, incident presentation, historical availability, and mobile layout.
- Use status tokens with text and icon cues for Operational, Degraded, Incident, Maintenance, and Unknown states.
- Preserve current status-page configuration, custom CSS, custom domain, and theme capabilities unless a deliberate replacement is implemented.

**Exit criteria:** public status pages are clear, accessible, theme-aware, and distinct from the private workspace while sharing the same design system.

### 6. Verify, remove legacy code, and document decisions

- Run lint, production build, and the relevant backend/end-to-end tests after each substantial phase.
- Test Light, Dark, and Auto themes; desktop and mobile widths; empty/loading/error states; long translations; language switching; and RTL layouts.
- Perform visual and accessibility review for contrast, keyboard focus, status semantics, and responsive regressions.
- Remove unreferenced styles, components, assets, and compatibility code.
- Update `DESIGN.md` when the implementation reveals a deliberate token, accessibility, or brand decision.

**Exit criteria:** the legacy visual system has been removed, the new system is documented, and the supported UI matrix passes verification.

## Initial delivery order

1. Theme foundation
2. Application shell and shared primitives
3. Dashboard and monitor workflows
4. Settings and maintenance
5. Public status pages
6. Cleanup and final verification

This order establishes the reusable foundation first, then applies it to the highest-value operational workflows before rebuilding the public surface.
