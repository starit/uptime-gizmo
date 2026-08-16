# UI Rebuild Execution — E2E Regression Attempt

**Date:** 2026-08-16
**Plan:** [Web UI Rebuild Plan](../plans/web-ui-rebuild.md)
**Phase:** 6 — in progress

## Commands

1. `npm run test-e2e` in the sandbox
2. `npm run test-e2e` with local test-server port permission
3. `npx playwright install chromium`

## Result

- The sandbox-only run was blocked from opening test port `30001`; this is a sandbox restriction, not a test failure.
- With local-server permission, Playwright started the test server and discovered all 23 E2E tests. The five run-once setup tests then failed before executing because the project-required Chromium build `1084` was absent; the remaining 18 tests were skipped as a consequence.
- Downloading the required browser was attempted with permission. The primary mirror returned a gateway error and the fallback transfer did not finish; the executable remains absent.

## Decision

The repository's Playwright version and browser revision are locked by its dependency graph. Do not silently substitute a different system browser or modify E2E configuration, because that would weaken the intended regression gate.

## Remaining external prerequisite

Install Playwright Chromium revision `1084` successfully (or provide it in CI cache), then rerun `npm run test-e2e`.
