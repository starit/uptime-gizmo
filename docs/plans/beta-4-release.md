# 3.0.0-beta.4 release plan

## Objective

Bring the tree to a state worth releasing as `3.0.0-beta.4`: the work that has
landed since `3.0.0-beta.3` reviewed and stable, the failure modes it introduced
closed, and an existing data directory able to upgrade into it and keep running.

This is a plan. Nothing here is complete until its change, its test, and its
documentation are in the tree. Execution is recorded separately under
[`docs/execution`](../execution).

## What is in this release

Thirty-six commits have landed since the `3.0.0-beta.3` tag. The substantial
ones:

- **LLM monitoring credentials.** A key is saved once and named by the monitors
  that use it, reachable at a custom endpoint, and testable from the dialog.
- **Notification channels over the API.** Created, updated, deleted, and
  attached to monitors. Each provider publishes the fields it needs, generated
  from the interface's own forms, so a client can build the form rather than
  guess it.
- **A monitor's history over the API.** Rolled-up buckets to draw a chart from,
  and the individual checks behind them.
- **Certificates in the overview**, and split rate limits: guessing a key and
  spending a key's allowance are now bounded separately.
- **Idempotent provisioning** through an immutable `externalRef`.

## Compatibility

The release may break things, but not the upgrade. **A data directory from
beta.3 must open in beta.4 and keep working**, so:

- no migration may drop or rewrite a column that existing rows depend on;
- no default may change in a way that alters what an existing row means; and
- a behaviour that existing installations rely on may only change where no
  existing row can have relied on it.

The `notification.active` change is the case to reason about, and it passes:
the column has existed since the initial schema with a default of true, and
**no code in the project's history has ever written it** — verified with
`git log --all -S "notification.active"`, which returns only the two commits
that introduced this behaviour. Every row in every existing data directory is
therefore `active = 1`, and filtering delivery on it cannot change what any
existing installation does. No migration is required.

API compatibility is a weaker promise: `/api/v1` is beta and its shape may move
between betas. Where it does, the OpenAPI document and
[the REST API reference](../wiki/rest-api.md) move with it.

## Work

### Fix what the new work broke

- [x] `notification.active` was accepted, never stored, and never read. Now
      persisted, honoured by both delivery paths, and reachable from one query
      so a third path cannot disagree with the first two.
- [x] The uptime summary reported a window other than the one requested when
      that window held no checks, and a flat zero after a restart.
- [x] A monitor stopped while a check was in flight logged a stack trace and
      asked the operator to report a bug, once per running monitor, on every
      clean shutdown.

### Review

- [x] Read the diff since beta.3 for defects rather than style, and fix what it
      finds.
- [x] Decide whether `active` ships with an interface control or not at all. A
      capability only one client can reach, with no way to see or undo it in the
      product, is a trap rather than a feature. It ships with a control in the
      existing notification dialog and a disabled marker in the list.

### Verification

- [x] End-to-end suite green (30 specs).
- [x] Backend suite green under `TEST_BACKEND=1`, which is how the harness runs
      it — without that variable the calculator's year-long simulation takes the
      database path and exhausts the heap, which is a measurement artifact and
      not a defect.
- [x] `pnpm lint:js` clean.
- [x] `pnpm build` succeeds.

### Documentation

- [x] README and roadmap describe shipped work as shipped.
- [x] Changelog for the release.
- [x] An execution record under `docs/execution`.

## Not in this release

- The write side for maintenance windows and status-page incidents.
- Proxies and integrations over the API.
- Anything requiring a schema change that an existing data directory could not
  take.
