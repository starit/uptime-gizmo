# pnpm migration execution record

**Date:** 2026-08-18
**Scope:** Replacing npm with pnpm across install, scripts, images, CI, and docs

## Outcome

`package-lock.json` is gone, `pnpm-lock.yaml` is committed, and every install
and script invocation in `package.json`, the Dockerfiles, CI workflows, release
tooling, and documentation uses pnpm. `.gitignore` rejects npm and Yarn
lockfiles.

The pre-existing `pnpm-lock.yaml` in the tree was stale — generated two days
earlier and missing `reka-ui` and `vue-tsc` — and was regenerated from scratch.

pnpm is pinned by the `packageManager` field and enabled with `corepack enable
pnpm` rather than a marketplace action, so CI gains no unpinned third-party
action and keeps its SHA-pinned action set unchanged.

## Measured, after the fact

| | npm ci | pnpm install --frozen-lockfile |
| --- | ---: | ---: |
| Install time | 13.0s | 6.3s |
| `node_modules` apparent size | 599 MB | 585 MB |
| Additional global store | — | 3.6 GB |

Same machine, same `package.json`, npm using the pre-migration lockfile. The
pnpm figure was measured on a volume separate from its store, so it includes a
copy penalty the in-repo case does not pay.

Disk is not a straightforward win. On APFS pnpm uses copy-on-write clones, so
`du` overstates real usage, but the 3.6 GB store is a genuine addition for a
machine with only this project on it.

Speed was not the reason to switch and does not justify it on its own. The
findings below are.

## The release-age policy was never actually in force

`.npmrc` carried `min-release-age=14`. npm never re-resolves when a lockfile is
present, so the constraint had no opportunity to run. pnpm resolves the whole
tree and it fired immediately.

Translating it honestly required care:

- `legacy-peer-deps=true` becomes `auto-install-peers=false` plus
  `strict-peer-dependencies=false`. That flag meant "do not install peers", not
  "do not fail on peers"; the naive translation to
  `strict-peer-dependencies=false` alone is wrong and caused a resolution
  failure on an auto-installed `postcss`.
- `min-release-age=14` (days) becomes `minimum-release-age=20160` (minutes).

Four exemptions were needed, each a package a dependent pins exactly so pnpm
cannot fall back to an older release: `@aws-sdk/*` (daily releases, reaches us
only as an optional peer of mongodb), `@vue/*` and `vue` (Vue pins its own
runtime packages to the exact same version), and `postcss` (pinned exactly by
the `postcss-*` tooling).

**Every exemption removes supply-chain protection for that package.** All four
are first-party publishers, which is a defensible posture, but the list has a
natural tendency to grow whenever someone hits a failing install. `.npmrc` and
`AGENTS.md` both say adding one is a decision to raise in review, and that is
discipline rather than a mechanism.

## Install scripts are now governed by one allowlist, and it is stricter

pnpm 10 blocks dependency install scripts by default. `pnpm.onlyBuiltDependencies`
lists the seven that genuinely need them: `@louislam/sqlite3`, `cpu-features`,
`esbuild`, `oracledb`, `protobufjs`, `ssh2`, `vue-demi`.

The npm-era `allowScripts` field was removed rather than left as a second,
diverging source of truth. The new list is deliberately tighter: FontAwesome and
core-js no longer run install scripts, because theirs only print donation
banners.

**This is the migration's main ongoing risk.** A future dependency that needs an
install script and is not on the list will install successfully and fail at
runtime. That failure mode was reproduced by accident later the same day: a
worktree at a pre-migration commit installed cleanly and then could not start,
missing the `@louislam/sqlite3` native binding. A CI smoke check that loads the
native module after install would catch it.

## Docker

The production image installs with `--config.node-linker=hoisted`, producing a
flat `node_modules` so the release stage's `COPY` does not depend on pnpm's
symlink layout surviving. That forfeits pnpm's isolation in the runtime image,
which is the correct trade for a stage whose only job is to be copied.

`corepack enable` runs before the switch to the unprivileged user, because it
writes shims into the Node prefix.

## Documentation

README, CONTRIBUTING, `.github/copilot-instructions.md`, `docs/plans/*`, and
`test/backend-test/README.md` were updated. `AGENTS.md` and `CLAUDE.md` had no
mention of a package manager at all and now carry explicit rules — without
them, an agent reaching for `npm` is the default behaviour.

Historical records under `docs/execution/` still say `npm run ...`. They record
commands that were actually run at the time and were left alone; only
forward-looking documentation was rewritten.

`npm-update.yml` became `dependency-update.yml`. Its `npm approve-scripts --all`
step is gone, because the committed allowlist covers that policy.

## Verification

A clean `rm -rf node_modules && pnpm install --frozen-lockfile` succeeds, the
`@louislam/sqlite3` native binding builds and loads, and `pnpm run tsc`,
`pnpm run lint:js`, and `pnpm run build` pass.

`ssh2`'s optional crypto binding fails to compile on this host and falls back to
its JavaScript implementation; it failed under npm too.

**Not verified: no Docker image was built.** There is no Docker daemon on this
host, so the Dockerfile changes — the corepack ordering and the hoisted
node-linker — follow documented practice but have never been executed. The first
CI image build should be watched.

The testcontainers-backed backend tests cannot run here for the same reason;
their 37 failures all trace to the missing container runtime, and the pure unit
tests pass.
