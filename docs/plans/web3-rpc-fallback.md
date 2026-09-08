# Web3 RPC fallback plan

## Objective

Allow each Web3 monitor to name one optional fallback Web3 Network. Existing
monitors keep using their current network, and the fallback is used only when
the primary network cannot return a usable RPC result.

## Data model

Add nullable `monitor.web3_fallback_network_id` with a foreign key to
`web3_network.id` and `ON DELETE SET NULL`. The API and UI expose it as
`web3FallbackNetworkId`.

The fallback must:

- differ from the primary network;
- belong to the same instance owner;
- be active when the monitor is saved; and
- have the same recorded chain ID as the primary network.

`NULL` preserves the previous behaviour. The field is part of configuration
Backup and uses the existing Web3 Network resource. Backup archives already
contain RPC URLs needed to restore those networks and must be handled as secrets.

## Runtime behaviour

The primary and fallback share the monitor's timeout budget. When a fallback is
configured, the primary receives 60% of the budget and the fallback receives
the remainder. A fast primary failure leaves more time for the fallback.

Fallback applies to endpoint failures: a disabled or missing primary, timeout,
HTTP or JSON-RPC error, malformed response, or chain-ID mismatch. It does not
apply after a valid business result, including a low balance, stale block, or
contract value that fails its comparison.

When fallback succeeds, the heartbeat stays `UP` and identifies the fallback
network and the bounded primary error. When both endpoints fail, the final error
contains bounded reasons for both attempts without exposing either RPC URL.

Deleting a primary network atomically promotes its still-active same-chain
fallback to the new primary. A fallback that is disabled or no longer on the
same chain is cleared instead, so deletion cannot silently move a monitor to a
different chain or leave a fallback with no primary.

The same behaviour applies to Web3 Balance, RPC Health, and Contract Value. RPC
Health users who need to alert on one provider specifically should use a
separate monitor for that provider; fallback changes that monitor's meaning to
chain access through either configured network.

## Interface

Add **Fallback network (optional)** directly below the primary network field.
The selector excludes the selected primary network and shows name, host, chain
ID, and disabled state. Inline guidance explains when fallback runs and warns
that per-provider RPC health requires separate monitors.

## Compatibility and safety

- Add a forward Knex migration for SQLite, MariaDB, and MySQL.
- Include the field in monitor serialization, REST/OpenAPI, and Backup registry
  relation validation.
- Old databases migrate with `NULL`; old `.ugbackup` documents may omit the
  field and still import.
- Validate ownership and chain equality in both Socket.IO and REST write paths.
- Preserve the network-pair invariant when either referenced network is deleted.
- Never return RPC URLs through monitor or Web3 Network projections.

## Verification

- Migration and beta.4 upgrade coverage.
- Unit coverage for primary success, fallback success, both failures, timeout
  budgeting, disabled fallback, duplicate selection, and chain mismatch.
- Monitor-type coverage proving valid threshold failures do not invoke fallback.
- REST/OpenAPI and configuration Backup schema coverage.
- Form coverage for desktop/mobile layout and translated guidance.
- Lint, type checks, production build, backend suite, and focused E2E.
