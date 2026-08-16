# UI Rebuild Execution — E2E Regression Attempt

**Date:** 2026-08-16
**Plan:** [Web UI Rebuild Plan](../plans/web-ui-rebuild.md)
**Phase:** 6 — in progress

## Commands

1. `npm run test-e2e` in the sandbox
2. `npm run test-e2e` with local test-server port permission
3. `npx playwright install chromium` (initial attempt)
4. `npx playwright install chromium` (successful later retry)
5. `npm run test-e2e` after Chromium installation

## Result

- The sandbox-only run was blocked from opening test port `30001`; this is a sandbox restriction, not a test failure.
- With local-server permission, Playwright started the test server and discovered all 23 E2E tests. The five run-once setup tests then failed before executing because the project-required Chromium build `1084` was absent; the remaining 18 tests were skipped as a consequence.
- A later browser-install retry completed, and the requested arm64 Chromium executable is now present. Its direct `--version` invocation succeeds (`Chromium 119.0.6045.9`).
- The final full E2E retry still failed before test actions: Playwright's required headless launch of Chromium revision 1084 immediately closes, including one `SIGTRAP`; five setup tests fail and the remaining 18 tests are skipped through the configured dependency.

## Decision

The repository's Playwright version and browser revision are locked by its dependency graph. Do not silently substitute a different system browser or modify E2E configuration, because that would weaken the intended regression gate. The installed browser is arm64, while the host is macOS Darwin 25.6.0; the failure occurs only with Playwright's headless automation launch, not with the binary's version command. Treat this as runner compatibility, not as a product regression.

## Remaining external prerequisite

Run this pinned Playwright/Chromium pair in a compatible CI or local macOS environment, then rerun `npm run test-e2e`.
