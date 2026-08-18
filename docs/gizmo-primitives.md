# Gizmo UI primitives

These primitives are the shared presentation layer introduced in Tailwind migration Phase 2. They are intentionally small: domain components own data, translation, and business actions; Gizmo primitives own accessible markup, density, and semantic visual states.

## Rules

- Import primitives from `src/components/gizmo/`. New primitives should use TypeScript; preserve existing Options API contracts where an incremental migration depends on them.
- Pass translated visible text from the caller. A primitive must not invent user-facing copy or locale keys.
- Use native controls. Do not substitute a clickable `<a>` or `<div>` for a button, input, select, textarea, checkbox, radio, or switch.
- Prefer a compact list row, table, or inline metric over a card. Use `GizmoPanel` only for meaningful surface boundaries.
- Do not hard-code colors in templates. Use primitive variants and semantic tones.
- All controls must retain a visible keyboard focus state and a 2.5rem target unless explicitly marked `size="sm"` for dense, pointer-oriented desktop controls.

## Controls and fields

| Primitive | Use | Key contract |
| --- | --- | --- |
| `GizmoButton` | Primary, secondary, outline, ghost, and destructive actions | Native button; accepts `variant`, `size`, `disabled`, and `loading`. |
| `GizmoIconButton` | Icon-only action | Requires a translated `label`; supports the same action states. |
| `GizmoField` | Label, help, required marker, and error association | Use its slot props to pass `aria-describedby` and `aria-invalid` to the control. Rich help belongs in the `help` slot. |
| `GizmoInput`, `GizmoTextarea`, `GizmoSelect` | Native text and select controls | `v-model`; forward standard native attributes. `GizmoSelect` preserves typed option values. |
| `GizmoCheckbox`, `GizmoRadio`, `GizmoSwitch` | Boolean and choice controls | `v-model`; keep label text in the default slot. Model updates are emitted before `change` callbacks. |

```vue
<GizmoField v-slot="{ describedby, invalid }" for-id="endpoint" :label="$t('URL')" :required="true">
    <GizmoInput
        id="endpoint"
        v-model="endpoint"
        type="url"
        :aria-describedby="describedby"
        :aria-invalid="invalid"
    />
</GizmoField>
```

## Content primitives

| Primitive | Use |
| --- | --- |
| `GizmoPanel` | A compact or default-density surface with optional `header`, `actions`, and `footer` slots. |
| `GizmoStatusBadge` | A textual status plus dot; requires one of `up`, `degraded`, `down`, `maintenance`, `unknown`. |
| `GizmoTag` | User-defined tags. It does not turn a custom color into a monitoring status; common hex colors receive a contrast-aware foreground. |
| `GizmoAlert` | Inline contextual feedback; use `info`, `success`, `warning`, `danger`, or `maintenance`. |
| `GizmoToast` | Presentation for an application toast queue. It does not own queueing or timers. |
| `GizmoEmptyState` / `GizmoLoadingIndicator` | Empty and loading states without decorative imagery. |
| `GizmoTable` / `GizmoListRow` | Dense data presentation. The caller owns headings, row data, sorting, and pagination. |

Status labels must retain non-color information. For example, pair `tone="down"` with a translated “Down” label, not only a red dot.

## Dialogs

`GizmoDialog` is the shared accessible shell for modal interactions. It owns focus trapping and restoration, page scroll locking, Escape and backdrop dismissal, semantic title/description association, responsive sizing, and theme-aware presentation. Callers continue to own translated copy, form state, async submission, and business actions.

- Bind the controlled state with `:open` and `@update:open`; do not instantiate Reka UI or Bootstrap directly in business components.
- Always pass translated `title` and `close-label` values. Put explanatory copy in the `description` slot so it is associated through `aria-describedby`.
- Use only `sm`, `md`, or `lg`. Confirmation prompts should normally use `sm`; complex forms should select the smallest size that avoids unnecessary wrapping.
- Disable `close-on-backdrop` for forms where an outside click could discard meaningful work. Set `close-disabled` while an asynchronous operation must not be interrupted; it blocks button, Escape, and backdrop dismissal while still allowing the owner to close the controlled dialog after success.
- Put actions in the `footer` slot. Keep the safe action before the destructive action in DOM order so keyboard navigation remains predictable.
- Because dialog content is portaled, keep each native `<form>` in the dialog body and associate footer submit buttons with a stable `form` id. Do not rely on Vue component ancestry for form submission.
- Mark the preferred initial action with the native `autofocus` attribute. Destructive confirmations must focus the safe cancel action first.

`Confirm.vue`, `APIKeyDialog.vue`, `NotificationDialog.vue`, and `MonitorSettingDialog.vue` now use `GizmoDialog`. `NotificationFormHost.vue` is a narrow migration boundary for legacy notification forms that still read `notification` from their direct parent; new notification forms must use explicit props and events instead. Remove the host after those forms have been migrated rather than extending its compatibility surface.

## Menus

`GizmoMenu` and `GizmoMenuItem` provide the shared Reka-backed dropdown behavior. They own menu focus, arrow-key navigation, Escape dismissal, trigger focus restoration, collision handling, and portal layering.

- Put exactly one native button in the `trigger` slot. Reka supplies `aria-haspopup`, `aria-expanded`, and keyboard behavior.
- Use `GizmoMenuItem` for actions and handle its `select` event, so pointer and keyboard activation follow the same path.
- Set `as-child` when an item is a real `router-link` or external link. Keep external-link security attributes on the link itself.
- Use `variant="danger"` for destructive actions and preserve a visible text label alongside any icon.
- Plain non-interactive menu labels and separators use `gizmo-menu__label` and `gizmo-menu__separator` with an explicit separator role.

Bootstrap JavaScript is no longer loaded. Do not add `data-bs-toggle`, direct Bootstrap constructors, or another page-specific dropdown implementation.

## Layout recipes

The Phase 2 stylesheet provides these class recipes for simple layout composition:

| Recipe | Purpose |
| --- | --- |
| `gizmo-page-header` + `gizmo-page-header__title/actions` | Compact title and action area. |
| `gizmo-action-bar` | Wrapping group of related controls. |
| `gizmo-grid`, `gizmo-grid--two`, `gizmo-grid--metrics` | Responsive two-column and metric layouts. |
| `gizmo-metric-block` + label/value | Dense numeric metric with tabular figures. |
| `gizmo-sidebar` | Tokenized sidebar boundary. |
| `gizmo-inline-action` / `gizmo-input-prefix` | Input with an adjacent action or static prefix. |

## Verified Phase 2 consumers

- `ActionInput`, `ActionSelect`, `CopyableInput`, and `HiddenInput` use the new input/action recipes.
- `Status` delegates to `GizmoStatusBadge`; `Tag` delegates to `GizmoTag`.
- `AddStatusPage` is the representative form/panel/action group.
- The Dashboard important-events panel is the representative panel/table/action group.
- Settings About is the representative alert and switch usage.

Bootstrap remains available for all other routes until their migration phase. Do not add new Bootstrap dependencies to a primitive or a migrated consumer.
