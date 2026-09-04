# Monitor inventory page

## Objective

Give operators a full-width monitor inventory so they can find and scan a large
estate without relying on the dashboard's narrow left rail.

The page is implemented. Later changes belong under
[`docs/execution`](../execution).

## Behaviour

The authenticated workspace is a two-column dashboard:

- a sticky left rail (`MonitorList`) of about `17rem` with search, status and
  tag filters, grouping, and bulk pause/resume/delete;
- a right canvas that is either the overview (quick stats and events) or a
  single monitor's detail.

That rail is the right selector once a monitor is already in hand. It is a
poor inventory: names truncate, heartbeat bars are a few characters wide, and
finding one of many monitors means scrolling a single column.

Desktop header **Monitors** opens `/list` as a first-class page. On that route
the left rail is hidden and the canvas lists every monitor, including children.
Search, status, active/paused, and tag filters keep their current meaning. The
list also filters by monitor type and sorts by column. A row's name opens
`/dashboard/:id`, where the rail returns so the existing detail workflow is
unchanged.

Mobile bottom nav **List** uses the same inventory in a stacked compact layout,
not the rail row component. Dashboard Home stays an overview. Group rows retain
their hierarchy in both layouts: children are indented, groups can be expanded
or collapsed, and filtering expands the ancestor chain of each match.

The client already has what an inventory needs. `monitorList`,
`lastHeartbeatList`, and `uptimeList` arrive over the existing Socket.IO
session. No new API, schema, or socket event is required.

## Layout and columns

Desktop `/list` uses the existing dashboard shell but a single full-width
column, still capped by the workspace max width. Wide viewports default to a
table and can switch between Table, Compact, and Grid; the choice is stored in
`localStorage`. Grid uses responsive monitor cards while group cards span the
full row to preserve hierarchy. Viewports at or below 960px use stacked Compact
cards.

The identity cell is type-aware:

- a friendly type label (HTTP(s), LLM Endpoint, Web3 RPC Health, and so on);
- a compact target for that type (URL, host:port, model, contract, child
  count) with passwords stripped;
- parent group path and tags.

Heartbeat placement follows Appearance: column, under the identity, or hidden.
Interval `0` is shown. Groups do not show an interval. Ping milliseconds are
omitted for types that do not measure latency.

The table columns, in scan order:

| Column     | Source                                                  |
| ---------- | ------------------------------------------------------- |
| Status     | Last heartbeat, or paused when the monitor is inactive  |
| Name       | Monitor name, type, target, group, tags                 |
| Heartbeat  | Existing small `HeartbeatBar` when Appearance is Normal |
| 24h uptime | Existing `Uptime` of type `24`                          |
| Last check | Last heartbeat time, plus ping when it is a round-trip  |
| Interval   | `interval`, including `0`                               |

Status is the strongest signal, then the name. Status colour is never the only
cue: the cell keeps a translated label.

Clicking a column header sorts that field. The default order matches the
rail: active before paused, then weight, then name.

Bulk selection, pause, resume, and delete stay on this page with the same
confirmations as the rail.

## Navigation

- Desktop header: **Monitors** after **Dashboard**, linking to `/list`.
- `/list` no longer redirects desktop sessions to `/dashboard`.
- The dashboard rail is omitted while `$route.path` is `/list`.
- Mobile bottom nav still uses `/list` and the existing "List" label.

## Out of scope

- Server-side pagination or a new list endpoint. The inventory reads the
  session's existing `monitorList`.
- Replacing or widening the dashboard rail.
- Changing Dashboard Home, monitor detail, or the add/edit form.
- Drag-and-drop regrouping on the table. The inventory represents existing
  nesting but does not edit it.
- Backup/restore, API writes, or other beta.5 recoverability work.

## Acceptance

- A desktop operator can open Monitors from the header, search and filter a
  populated estate, and reach a monitor's detail from a row.
- Phone and tablet `/list` show the inventory (cards), including a type-specific
  target, and can open detail.
- The dashboard rail and overview still behave as they do today.
- Light and dark themes, empty and filtered-empty states, and a narrow
  desktop width remain readable.
- `pnpm run lint:js`, the frontend typecheck that covers new Vue files, the
  identity unit tests, and the Playwright spec for this page pass.
