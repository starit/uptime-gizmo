# Tailwind CSS migration — Phase 0 baseline

Date: 2026-08-17

## Purpose

This record satisfies Phase 0 of the [Tailwind CSS migration plan](../plans/tailwind-css-migration.md). It captures the current UI, Bootstrap dependency surface, bundle-size baseline, critical workflows, and the verification matrix required before visual migration begins.

The baseline is intentionally descriptive: it does not replace Bootstrap or change application behavior.

## Environment and capture conditions

- Application: Uptime Gizmo `2.5.0`
- Local development server: `http://localhost:3000`
- Baseline viewport: `1270 × 714` CSS pixels
- Locale: Simplified Chinese, using the existing local development data
- Dashboard state: no configured monitors or incidents
- Public status-page state: `ui-review`, no configured services, theme set to `auto`
- Captures were taken from the application UI, not from mock data.

## Runtime screenshot inventory

| Screenshot | Route and state | Theme | Why it is retained |
| --- | --- | --- | --- |
| [dashboard-light.png](assets/tailwind-phase-0/dashboard-light.png) | `/dashboard`, empty monitor list | Light | Shell, monitor list, summary cards, table and empty state |
| [dashboard-dark.png](assets/tailwind-phase-0/dashboard-dark.png) | `/dashboard`, empty monitor list | Dark | Existing dark-token contrast and status-card treatment |
| [monitor-editor-dark.png](assets/tailwind-phase-0/monitor-editor-dark.png) | `/add`, HTTP monitor defaults | Dark | Dense form layout, selects, actions and side configuration panels |
| [settings-appearance-dark.png](assets/tailwind-phase-0/settings-appearance-dark.png) | `/settings/appearance` | Dark | Theme selector, navigation and Bootstrap button-group behavior |
| [public-status-page.png](assets/tailwind-phase-0/public-status-page.png) | `/status/ui-review`, empty public page | Auto/light | Public hierarchy, empty state, edit affordance and status semantics |

The public-status baseline currently displays an empty icon area because the development status page has no custom icon configured. This is existing test data, not a Tailwind migration change; preserve it as a regression reference until the status-page icon behavior is intentionally redesigned.

## Production build-size baseline

Command:

```bash
npm run build
```

The following sizes were measured from the generated `dist/assets` directory after the build. They are the pre-Tailwind comparison point; generated hash names are intentionally not treated as stable API.

| Artifact | Bytes | Approx. size |
| --- | ---: | ---: |
| Main JavaScript entry | 2,254,228 | 2.25 MB |
| Main CSS entry | 321,400 | 321 KB |
| All JavaScript chunks | 7,445,757 | 7.45 MB |
| All CSS chunks | 324,461 | 324 KB |
| All gzip artifacts | 2,495,736 | 2.50 MB |
| All Brotli artifacts | 2,100,756 | 2.10 MB |

The main entry and the language/chart chunks dominate the current bundle. Phase 1 must establish a Tailwind baseline without adding a full component-suite runtime; later phases should investigate code splitting separately from this CSS migration.

## Bootstrap dependency inventory

### Styling and runtime entries

- `src/assets/app.scss` imports the complete Bootstrap Sass bundle.
- `src/main.js` imports Bootstrap JavaScript globally.
- `package.json` currently declares `bootstrap@5.1.3` and `@popperjs/core@~2.10.2`.

### Template usage

Static class scanning found **166 Vue files** with Bootstrap-like class usage:

| Surface | Files |
| --- | ---: |
| Pages | 13 |
| Components | 152 |
| Layouts | 1 |

The highest-frequency families are spacing utilities, `form-control`, `btn`, `form-select`, `d-flex`, `row`, `col-*`, dropdown items, spinners, modal structure, and input groups. These figures are a migration inventory, not a mandate to make one mechanical class-for-class substitution.

### Direct Bootstrap JavaScript API usage

Fourteen components import and instantiate Bootstrap `Modal` directly:

- `APIKeyDialog.vue`
- `BadgeLinkGeneratorDialog.vue`
- `Confirm.vue`
- `CreateGroupDialog.vue`
- `DockerHostDialog.vue`
- `IncidentManageModal.vue`
- `MonitorSettingDialog.vue`
- `NotificationDialog.vue`
- `ProxyDialog.vue`
- `RemoteBrowserDialog.vue`
- `ScreenshotDialog.vue`
- `TagEditDialog.vue`
- `TagsManager.vue`
- `TwoFADialog.vue`

These must be migrated as behavior, not only as styling. The replacement needs focus trapping, keyboard navigation, accessible names/descriptions, Escape handling, backdrop behavior, and current public component APIs where they are used by pages.

### Dynamic class bindings

There are 53 `:class` / `v-bind:class` bindings in `src/`. The Bootstrap-coupled cases identified during the baseline include:

- `Confirm.vue`: dynamic button style combined with Bootstrap's dismissal attribute.
- `notifications/Webpush.vue`: dynamically selects `btn-primary` or `btn-danger`.
- `PublicGroupList.vue`: dynamically adds `btn-link`.
- `Details.vue`: dynamically composes status background classes.

Each migration batch must search its affected components for dynamic bindings; a static `class="…"` audit alone is insufficient.

## Theme and internationalization baseline

### Theme behavior

- `src/mixins/theme.js` resolves Light, Dark, and Auto modes, persists operator preference in browser storage, and applies the resolved theme as a body class.
- Status pages can use their own Light, Dark, or Auto theme setting independently of private-workspace preference.
- `src/components/settings/Appearance.vue` exposes the private-workspace Light/Dark/Auto control.
- `DESIGN.md` is the source of truth for semantic light/dark tokens and status colors.

Migration requirement: Tailwind utilities must consume semantic CSS variables or equivalent token mappings so a runtime theme change does not require a separate generated stylesheet.

### Internationalization behavior

- User-visible text remains in locale dictionaries under `src/lang/` and is rendered with `$t` / `i18n-t` patterns.
- The migration must retain the existing locale selector, dynamic locale loading, and RTL support.
- Baseline visual review used Simplified Chinese to capture non-English label density.

## Critical-flow baseline

| Flow | Primary routes/components | Minimum behavior that must remain intact |
| --- | --- | --- |
| Setup and login | `/setup`, `/` | Setup guard, password inputs, translated validation and successful login |
| Dashboard | `/dashboard` | Real-time monitor list, status counters, filtering, events and responsive shell |
| Monitor creation and editing | `/add`, `/dashboard/:id/edit/:id` | Type selection, validation, notifications, proxy configuration, save and cancel |
| Pause, resume and recovery | Dashboard, details and monitor list actions | Socket updates, status feedback and correct action availability |
| Notifications | `/settings/notifications`, `NotificationDialog.vue` | Provider forms, test action, save/delete and modal keyboard behavior |
| Maintenance | `/maintenance`, `/add-maintenance`, `/maintenance/edit/:id` | Scheduling, monitor binding, pause/resume and status-page association |
| Status-page editing | `/manage-status-page`, `/status-page` | Public grouping, theme setting, incidents, custom icon and public preview |
| Public status page | `/status/:slug` | Public visibility, semantic statuses, refresh, incidents, RSS and mobile layout |

## Acceptance matrix for all migration phases

Every route batch must be reviewed against the applicable cells below before Bootstrap code for that batch is removed.

| Dimension | Required coverage |
| --- | --- |
| Theme | Light, Dark, Auto; public status page Light, Dark and Auto independently |
| Viewport | Desktop, tablet and mobile widths; verify horizontal overflow, action wrapping and dense list behavior |
| Language | English, Simplified Chinese, one long-string locale, and one RTL locale |
| State | Empty, loading, error, pending, operational, degraded/down, maintenance and recovery where applicable |
| Interaction | Mouse, keyboard-only focus order, visible focus rings, Escape, dialog focus trapping, menu closing and form validation |
| Data updates | Socket-driven monitor, heartbeat, notification, maintenance and status-page list updates |
| Performance | Compare generated CSS/JS against this baseline; no large UI-library runtime; inspect route-level chunking when a regression appears |
| Static assets | Favicon/PWA icons, status-page default icon, light/dark logo selection and asset loading |

## Phase 0 exit audit

| Requirement | Evidence | Status |
| --- | --- | --- |
| Record production bundle sizes | Measured `npm run build` artifacts above | Complete |
| Record key route screenshots | Five runtime screenshots under `docs/execution/assets/tailwind-phase-0/` | Complete |
| Inventory Bootstrap classes, JS APIs, Sass imports and dynamic bindings | Dependency inventory and source-level audit above | Complete |
| Define theme, locale, RTL, viewport and state acceptance matrix | Matrix above | Complete |
| Identify critical workflows | Critical-flow table above | Complete |

Phase 0 is complete when this record and its screenshot assets are kept with the migration work. Phase 1 may now introduce Tailwind, but must not remove Bootstrap until the relevant replacement phases have passed the matrix.
