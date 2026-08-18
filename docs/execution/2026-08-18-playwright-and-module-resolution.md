# Playwright recovery and the badgeConstants resolution defect

**Date:** 2026-08-18
**Scope:** Restoring browser verification, and the dev-server failure it was needed for

## Why these belong in one record

The Tailwind migration ran from Phase 3A to Phase 5 without a single browser
check, because the bundled Playwright could not launch on this host. Two
defects reached committed code in that window. Both are the same story: static
checks were green, and nothing was running the application.

## The dev server was broken

Loading the app failed with:

```
Uncaught SyntaxError: The requested module '/src/badge-constants.js'
does not provide an export named 'badgeConstants' (at util.ts:21:10)
```

`src/util.ts` and `src/badge-constants.ts` each ship a committed CommonJS build
beside the TypeScript source, because the backend reaches them through Node's
`require`. Vite resolves `.js` before `.ts`, so the extensionless specifier in

```ts
export { badgeConstants } from "./badge-constants";
```

handed the browser the CommonJS file, which exposes no ESM named export. Every
existing frontend import of util writes `"../util.ts"` explicitly for exactly
this reason; the re-export added in `0c57198a` did not, and neither did
`BadgeLinkGeneratorDialog`.

**Production builds resolved the same specifier differently and stayed green
throughout.** `pnpm run build` and `pnpm run tsc` never failed. Only the dev
server broke.

### Fix

Each side now imports the format it needs, and the frontend does not route
through util at all:

- `util.ts` drops the re-export.
- The badge dialog imports `"../badge-constants.ts"` explicitly.
- `util-server.js`, `api-router.js`, and `status-page-router.js` require
  `../src/badge-constants` directly.
- `tsconfig-backend` lists `badge-constants.ts` so it keeps being emitted now
  that `util.ts` no longer pulls it in.
- `tsconfig-frontend` enables `allowImportingTsExtensions`, which `vue-tsc`
  needs to accept the explicit specifier. Safe because that project is `noEmit`.

Restoring `badgeConstants` into `util.ts` would have been the smaller diff and
was tried first. It fails: importing util from a gated component drags
`util.ts` into the frontend `vue-tsc` boundary, where `esModuleInterop` is true
and its `import * as jsonata` stops being callable. That is the pre-existing
error baseline Phase 3A deliberately kept outside the gate.

An ESLint rule now rejects extensionless imports of either dual module, and was
confirmed to fire on the original code. A silent, dev-only failure is now a
lint error.

## Playwright could not launch

Playwright 1.39 bundles Chromium 119 from October 2023. On macOS 26 it dies
immediately:

```
[pid=5116] <process did exit: exitCode=null, signal=SIGTRAP>
```

Upgraded `@playwright/test` and `playwright-core` to 1.62.1 and moved the CI
`PLAYWRIGHT_VERSION` to match. 1.62.1 was published 19 days before this work and
clears the 14-day release-age policy in `.npmrc` without an exemption. Its
Chromium 151 launches normally.

### One test changed, marking a real behaviour change

The profile menu's log-out entry was a plain `<button>` inside a `<ul>`, so the
test located it with `getByRole("button")`. It is a Reka `DropdownMenuItem` now
and correctly exposes `role="menuitem"`. The new semantics are right for an
entry inside `role="menu"`, so the test follows the component.

**All five dropdowns migrated in Phase 3C changed the same way.** Anything
keying off `role="button"` for a menu entry needs the same adjustment.

## Suite result: 22 passed, 2 failed

Both failures are pre-existing. That was established rather than assumed: commit
`54f84680` — the state before this session's UI work — was checked out into a
worktree with the same Playwright 1.62.1 pinned, so only application code
differed.

| Test | Pre-migration | Current |
| --- | --- | --- |
| `Status Page › create and edit` | fails, line 175 | fails, line 175 |
| `Status Page › RSS feed escapes malicious monitor names` | fails | fails |

The first is an application bug: the status page keeps Google Analytics after
the editor switches it to Umami and saves. The migration only swapped class
names there and the `v-model` bindings are untouched. The second looks like a
test-ordering problem — the feed is missing a monitor it expects. Both deserve
their own investigation.

Supporting evidence that the analytics failure is not migration damage: the
log-out test *passes* pre-migration with `role="button"`, confirming the role
change is the only thing in that suite the migration actually affected.

The Phase 3A dialog spec now runs and passes, so its focus trapping, Tab loop,
Escape and backdrop dismissal, scroll lock, and focus restoration are verified
rather than asserted.

## An accidental confirmation

The pre-migration worktree installed cleanly, then failed at runtime with a
missing `@louislam/sqlite3` native binding — that commit predates the
`pnpm.onlyBuiltDependencies` allowlist added during the pnpm migration. This is
exactly the silent-install, break-later failure flagged as that migration's main
risk, reproduced by accident. A CI smoke check that loads the native module
after install would catch it.

## What is still not verified

The end-to-end suite covers behaviour and accessibility. It does not cover
appearance: it will not catch a wrong colour, insufficient dark-mode contrast,
or a mobile layout overflow. Screenshot comparison would close that gap, but
only after a human confirms a baseline is correct — otherwise it fixes the
current rendering in place, mistakes included.
