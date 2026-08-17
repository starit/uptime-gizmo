# Gizmo UI primitives

These primitives are the shared presentation layer introduced in Tailwind migration Phase 2. They are intentionally small: domain components own data, translation, and business actions; Gizmo primitives own accessible markup, density, and semantic visual states.

## Rules

- Import primitives from `src/components/gizmo/` and preserve the project’s Vue Options API convention.
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
