# Tailwind migration Phase 3B execution record

**Date:** 2026-08-17  
**Scope:** Initial high-frequency Bootstrap modal consumers

## Outcome

Phase 3B migrates `APIKeyDialog.vue`, `NotificationDialog.vue`, and `MonitorSettingDialog.vue` to the shared Reka-backed `GizmoDialog`. Together with Phase 3A's `Confirm.vue`, the initial target set no longer instantiates Bootstrap Modal.

The migration deliberately adopts controlled dialog state, native form submission, explicit focus behavior, and TypeScript boundaries. It does not retain Bootstrap-era APIs when a smaller and safer replacement is available. Ten direct Bootstrap modal consumers remain for Phase 3C.

## Implementation notes

- API key creation and generated-key presentation are separate controlled dialogs. The portaled footer submit button uses native `form` association and duplicate submissions are guarded.
- Notification create/edit uses one controlled large dialog. Notification form categories are derived once, nested delete confirmation keeps the parent dialog mounted, and processing actions are guarded.
- `NotificationFormHost.vue` temporarily exposes the existing `notification` prop to legacy notification forms that depend on direct-parent lookup. It is an explicit, typed boundary, not a pattern for new code; migrate those forms to props and events before removing it.
- Monitor status-page settings use controlled state and release their focus scope before opening the still-legacy badge generator. The obsolete `ignoreSendUrl` compatibility branch was removed.
- Shared dialog layout recipes cover compact form stacks, explanatory copy, responsive field rows, sections, and leading destructive actions.
- `APIKeyDialog.vue`, `NotificationFormHost.vue`, `Confirm.vue`, and all Gizmo primitives are included in the frontend `vue-tsc` gate. Notification and monitor dialogs remain JavaScript boundaries until their transitive legacy children are typed.

## Verification

- API key create/result flow: initial focus, portaled form submission, result transition, focus restoration, and scroll unlock verified.
- Notification create/edit/delete flow: type switching, saved Webhook form, nested confirmation, Escape behavior, focus restoration, and scroll locking verified.
- Monitor settings flow: initial checkbox focus, custom-link controls, and handoff to the legacy Badge generator verified on a temporary status page.
- Light and dark application themes verified with migrated dialogs. Responsive behavior is enforced by the shared dialog CSS and remains in the cross-phase browser matrix.
- `npm run tsc`, `npm run lint`, `npm run build`, and `git diff --check` are the final static gates for this phase.

No test files were added or changed as part of Phase 3B.
