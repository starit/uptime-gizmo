# Monitor inventory type and mobile pass

**Date:** 2026-09-03
**Plan:** [Monitor inventory](../plans/monitor-inventory.md)
**Release:** [3.0.0-beta.5](../plans/beta-5-release.md) P1

## Implemented

- `/list` always renders `MonitorInventory`. Phones and viewports at or below
  960px use stacked cards. Wider desktops default to List and can switch to a
  responsive Grid or the more strongly separated Cards layout. Grid and Cards
  separately remember Comfortable or Dense preferences. Grid favors quick
  scanning, while Cards uses a primary link surface and retains heartbeat
  history and interval.
  Group entries share the same track width as other monitors; collapse controls
  and dedicated child parent-path strips retain the hierarchy without forcing a
  new row. Nested children show their full parent path, and expansion uses a
  short reveal transition.
- Each row shows a friendly type label and a type-specific target (HTTP URL,
  host:port, LLM model, Web3 address, group child count, and so on). Passwords
  in URLs and connection strings are stripped. Search matches the displayed
  target and type label.
- Heartbeat placement follows Appearance (column, under the identity, or none).
  Interval `0` is shown. Groups omit interval. Ping milliseconds are omitted
  for group and manual monitors.
- Groups preserve their parent-child hierarchy in table and compact layouts.
  Their collapse state is shared with the dashboard rail, and active filters
  reveal matching descendants together with their ancestor path.
- Desktop header **Monitors** and mobile bottom-nav **List** still open `/list`.
  Dashboard Home is unchanged.

## Verification

- `node --test test/backend-test/test-monitor-identity.js` — 5 passed.
- `pnpm exec eslint` on the changed Vue/JS files — passed.
- `pnpm exec stylelint` on the changed Vue files — passed (only the repository's
  existing deprecated-rule notices).
- `pnpm exec vue-tsc --project ./tsconfig-frontend.json` — passed.
- `pnpm run build` — passed.
- `pnpm exec playwright test --config ./config/playwright.config.js monitor-inventory.spec.js` —
  7 passed, including setup, the desktop table path, and a 390px compact list
  that still shows the HTTP type label and URL and opens detail.

## Not done here

Configuration import/export and the rest of the beta.5 P0 recoverability /
portability gate remain planned.
