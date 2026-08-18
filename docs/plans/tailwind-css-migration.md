# Tailwind CSS migration plan

## Objective

Replace Bootstrap with Tailwind CSS as the styling foundation for Uptime Gizmo while preserving the current Vue application behavior, internationalization, accessibility, light/dark/auto themes, and low resource usage expected from a monitoring product.

This plan implements the visual-system direction in [DESIGN.md](../../DESIGN.md) and refines the broader [Web UI Rebuild Plan](web-ui-rebuild.md). It deliberately avoids replacing Bootstrap with another full UI framework.

## Target architecture

```text
CSS custom properties from DESIGN.md
        ↓
Tailwind theme tokens and utility classes
        ↓
Uptime Gizmo shared visual components
        ↓
Reka UI primitives only where accessible interaction is complex
```

- **Tailwind CSS** owns layout, spacing, typography, responsive rules, and product styling.
- **CSS custom properties** remain the source of truth for light, dark, and semantic-status tokens.
- **Reka UI** is optional and limited to behavior-heavy primitives such as dialogs, menus, select controls, popovers, tooltips, and tabs.
- Do not introduce PrimeVue, Vuetify, or another opinionated component suite.
- Keep Vue Router, Socket.IO, Vue I18n, FontAwesome, and existing domain behavior unchanged.

## Current migration inventory

The initial audit found the following Bootstrap coupling:

| Area | Current scope |
| --- | ---: |
| Vue files with Bootstrap classes | 166 |
| Pages using Bootstrap classes | 13 |
| Components using Bootstrap classes | 152 |
| Layout files using Bootstrap classes | 1 |
| Components importing Bootstrap `Modal` directly | 14 |
| Global Bootstrap style entry | `src/assets/app.scss` |
| Bootstrap runtime entry | `src/main.js` |

The most common dependencies are form controls, buttons, selects, grid/flex layout classes, spacing utilities, and modal markup. Treat the numbers as a baseline; dynamic class bindings must also be audited during each phase.

## Guardrails

- Preserve every `$t`, `i18n-t`, locale key, and locale-sensitive layout. Do not replace translated text with hard-coded copy.
- Preserve light, dark, and auto theme behavior, including the public status page's independent theme setting.
- Use semantic tokens from `DESIGN.md`; do not introduce arbitrary color literals in Vue templates.
- Preserve keyboard navigation, focus indication, escape-to-close behavior, focus trapping, and screen-reader labels when replacing Bootstrap interactions.
- Preserve existing Socket.IO event contracts and server-side behavior. This is a presentation-layer migration.
- Preserve the dense, scan-first character of authenticated monitoring workflows. Do not replace data rows and inline metrics with decorative cards, oversized headers, or low-signal whitespace; follow the Monitoring density rules in `DESIGN.md`.
- Delete Bootstrap styles and JavaScript only after their replacements are verified. Do not leave permanent dual implementations.
- Prefer route-level code splitting and lightweight primitives. A monitoring dashboard should not gain a large UI-library runtime.
- Breaking changes are acceptable when they remove obsolete architecture or enable a clearer, safer design. Prefer the best-practice API for new code over large compatibility layers created only to preserve Bootstrap-era implementation details.

## Implementation phases

### Phase 0 — Baseline and safety net

**Status:** Complete on 2026-08-17. See the [Phase 0 baseline record](../execution/2026-08-17-tailwind-phase-0-baseline.md).

1. Record the current production bundle sizes and key route screenshots.
2. Inventory Bootstrap classes, direct JavaScript API calls, Sass imports, and dynamic `class` bindings.
3. Define an acceptance matrix for desktop, mobile, light, dark, auto, long translations, and RTL.
4. Identify critical flows: setup/login, dashboard, monitor create/edit, pause/resume, notifications, maintenance, status-page editing, and public status pages.

**Exit criteria:** the team can compare each migrated route against functional, visual, and performance baselines.

### Phase 1 — Install Tailwind and map the design system

**Status:** Complete on 2026-08-17. See the [Phase 1 implementation record](../execution/2026-08-17-tailwind-phase-1.md).

1. Add Tailwind, PostCSS integration, content scanning for Vue/JS/TS files, and a single application stylesheet entry.
2. Map `DESIGN.md` primitives and semantic CSS variables to Tailwind color, typography, radius, shadow, breakpoint, and transition tokens.
3. Ensure utilities consume CSS variables, so light and dark mode remain runtime theme changes rather than separate builds.
4. Add a small set of project utilities for focus rings, status treatments, surfaces, and compact monitoring data.
5. Keep Bootstrap loaded temporarily while Tailwind is introduced; do not change visual behavior in this phase beyond safe token preparation.

**Exit criteria:** Tailwind utilities compile, work with both themes, and do not create a noticeable production CSS regression.

### Phase 2 — Establish shared Gizmo primitives

**Status:** Complete on 2026-08-17. See the [Phase 2 implementation record](../execution/2026-08-17-tailwind-phase-2.md) and [primitive usage guide](../gizmo-primitives.md).

**Preparation:** See the [Phase 2 preparation record](../execution/2026-08-17-tailwind-phase-2-preparation.md) for proposed boundaries, initial consumers, and acceptance criteria.

Create and document small shared components or class recipes for:

- Buttons and icon buttons, including loading and destructive states.
- Text inputs, textareas, checkboxes, radios, switches, selects, labels, help text, and validation states.
- Cards, panels, empty states, badges, tags, tables, list rows, loading indicators, alerts, and toast presentation.
- Layout patterns for page headers, action bars, responsive grids, sidebars, dense monitoring lists, and metric blocks.
- Semantic status styles for Operational, Degraded, Incident, Maintenance, and Unknown.

Use these primitives to replace repeated Bootstrap patterns before migrating large pages.

**Exit criteria:** a representative form, table, card, alert, and action group have no Bootstrap classes and pass light/dark, keyboard, and locale checks.

### Phase 3 — Replace Bootstrap JavaScript interactions

**Phase 3A status:** Complete on 2026-08-17. The shared Reka-backed `GizmoDialog`, frontend Vue TypeScript gate, and migrated `Confirm.vue` are recorded in [the Phase 3A execution record](../execution/2026-08-17-tailwind-phase-3a.md).

**Phase 3B status:** Complete on 2026-08-17. The initial high-frequency dialogs (`APIKeyDialog.vue`, `NotificationDialog.vue`, and `MonitorSettingDialog.vue`) are recorded in [the Phase 3B execution record](../execution/2026-08-17-tailwind-phase-3b.md). Ten direct Bootstrap modal consumers remain for Phase 3C.

**Phase 3C status:** Complete on 2026-08-17. The remaining ten modal consumers and five Bootstrap dropdown consumers now use shared Gizmo primitives, and the Bootstrap JavaScript entry has been removed. See [the Phase 3C execution record](../execution/2026-08-17-tailwind-phase-3c.md). Bootstrap SCSS remains until the route styling phases are complete.

Replace the 14 components containing 15 direct Bootstrap `Modal` instances with a single accessible dialog abstraction backed by Reka UI or an equivalently verified primitive.

Initial targets include:

- `Confirm.vue`, `APIKeyDialog.vue`, `NotificationDialog.vue`, and `MonitorSettingDialog.vue`.
- Status-page, maintenance, proxy, Docker host, remote browser, tag, screenshot, two-factor, incident, and badge dialogs.

Then replace any Bootstrap-dependent dropdown, collapse, tooltip, or popover behavior. Preserve public APIs only when they remain appropriate for the new architecture; otherwise make the breaking change explicitly and migrate callers to the higher-quality API.

**Exit criteria:** `import "bootstrap"` is no longer needed for JavaScript behavior; dialogs retain focus management, escape handling, accessible labels, and safe nested interactions.

### Phase 4 — Migrate the application shell and high-frequency workflows

**Status:** Complete on 2026-08-18. See the
[Phase 4 execution record](../execution/2026-08-18-tailwind-phase-4.md). The work
was carried out before it was recorded, and the record explains that gap.

Migrate in this order:

1. `src/layouts/Layout.vue`, setup/login, and global navigation.
2. Dashboard, monitor list, monitor detail, and add/edit monitor pages.
3. Shared monitor filters, charts, heartbeat/status displays, and common action controls.
4. Settings and notification configuration.

Replace Bootstrap grid, flex, spacing, button, form, table, dropdown, and feedback classes with Tailwind utilities or shared Gizmo primitives. Remove page-specific legacy Sass as each route is verified.

**Exit criteria:** the most frequently used authenticated monitoring workflows no longer depend on Bootstrap styling.

### Phase 5 — Migrate administration and public surfaces

**Status:** Complete on 2026-08-18. See the
[Phase 5 execution record](../execution/2026-08-18-tailwind-phase-5.md). No Vue
template references a Bootstrap class any more.

1. Migrate maintenance, status-page management, API keys, proxies, Docker hosts, remote browsers, and security settings.
2. Migrate public status pages, incidents, RSS-related presentation, and status-page customization controls.
3. Validate custom status-page CSS and custom domain behavior independently from the private workspace theme.

**Exit criteria:** all 13 Bootstrap-dependent pages and remaining shared components use the new system.

### Phase 6 — Remove Bootstrap and optimize

**Status:** Not started; readiness assessed on 2026-08-18. Removing the import
was tried as an experiment and reverted: it compiles cleanly and production CSS
drops from 353,648 to 159,040 bytes, a 55% reduction against the 321,400-byte
Phase 0 baseline. The Sass variables do not block it — `vars.scss` defines them
itself and is imported first.

The base layer is the one real risk. Preflight is disabled, so Bootstrap's
reboot is the only normalize in the build, and Preflight is not an equivalent
replacement: it strips heading sizes and list styles that reboot preserves. That
swap changes typography on every screen and must not land without visual
verification.

1. Remove remaining Bootstrap class names, Sass imports, `bootstrap` runtime imports, and `@popperjs/core` if no remaining dependency needs it.
2. Remove obsolete Sass variables, compatibility overrides, and dead DOM structure created solely for Bootstrap.
3. Update `package.json` and the lockfile.
4. Compare production CSS/JS output with the Phase 0 baseline; investigate any material increase.
5. Keep only deliberate compatibility fallbacks, documented with an owner and removal condition.

**Exit criteria:** repository search finds no production Bootstrap imports, Bootstrap JS API use, or Bootstrap-only class dependencies; the application builds and the accepted UI matrix passes.

## Verification matrix

Run proportionate checks after each phase and before Bootstrap removal:

- `pnpm run lint`
- `pnpm run build`
- Relevant backend tests and Playwright flows. The browser environment was
  repaired on 2026-08-18; see
  [the Playwright recovery record](../execution/2026-08-18-playwright-and-module-resolution.md).
  Two end-to-end failures are known and pre-existing.
- Keyboard-only dialog, menu, form, and focus-ring tests.
- Light, dark, and auto themes; public status-page theme variants.
- Desktop, tablet, and mobile widths.
- English, Chinese, long-string locales, and at least one RTL locale.
- Empty, loading, error, pending, maintenance, down, and recovery monitor states.
- Browser favicon, PWA icon, and status-page default image checks.

## Definition of done

The migration is complete only when Bootstrap is absent from production dependencies and runtime, all retained user flows remain functional, no legacy Bootstrap styling is required for supported routes, and the generated assets remain appropriate for a low-resource self-hosted monitoring application.
