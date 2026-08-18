# Tailwind migration Phase 3C execution record

**Date:** 2026-08-17  
**Scope:** Complete removal of Bootstrap JavaScript interactions

## Outcome

Phase 3C migrates the remaining ten direct Bootstrap Modal consumers to `GizmoDialog`:

- `ScreenshotDialog.vue`
- `CreateGroupDialog.vue`
- `RemoteBrowserDialog.vue`
- `DockerHostDialog.vue`
- `ProxyDialog.vue`
- `TwoFADialog.vue`
- `TagEditDialog.vue`
- `TagsManager.vue`
- `IncidentManageModal.vue`
- `BadgeLinkGeneratorDialog.vue`

It also introduces the Reka-backed `GizmoMenu` and `GizmoMenuItem` primitives and migrates the five remaining Bootstrap dropdown consumers in the application shell, monitor list, monitor details, incident editor, and ping chart.

`src/main.js` no longer imports Bootstrap JavaScript, and the unused `@types/bootstrap` dependency has been removed. Bootstrap itself and Popper remain temporarily because Bootstrap SCSS is still the legacy styling foundation; they are removed only after the route styling phases eliminate that dependency.

## Architecture and behavior changes

- All migrated dialogs use controlled state and native Portal-safe form association.
- Delete confirmations are nested without discarding parent form state, with safe-action initial focus and restoration to the invoking action.
- Async save, test, delete, token verification, and 2FA operations reject duplicate submissions.
- Badge fields are definition-driven instead of duplicated conditional template blocks.
- Tag color previews reuse the shared tag presentation instead of adding new inline color styling.
- Missing proxy, Docker host, or remote-browser records no longer open an empty editor.
- Menus now provide arrow-key navigation, Escape dismissal, collision-aware positioning, and trigger focus restoration without Bootstrap runtime code.
- New standalone primitives and low-dependency dialogs are TypeScript and included in the frontend `vue-tsc` gate where their dependency boundary permits it.

## Runtime acceptance

The production build was exercised against an isolated SQLite instance with temporary data:

- Proxy create and nested delete confirmation.
- Docker-host and remote-browser initial state and focus.
- 2FA password and QR preparation flow without persisting a secret.
- Tag create/edit, monitor tag staging, and draft monitor-group creation.
- Badge type switching and generated URL fields.
- Active-incident style menu plus historical incident edit and delete flows.
- Real-browser monitor screenshot dialog.
- Profile, bulk-action, clear-data, chart-period, and incident-style menus.
- Light and dark themes, keyboard menu navigation, Escape dismissal, focus restoration, and a 390 × 844 viewport with no horizontal overflow.

The final production bundle is approximately 2,283.81 kB / 637.76 kB gzip for the main JavaScript asset and 339.67 kB / 50.89 kB gzip for the main CSS asset. Removing the Bootstrap runtime reduced the main JavaScript gzip size by roughly 10.08 kB compared with the Phase 3B build.

No automated test files were added or modified in Phase 3C.
