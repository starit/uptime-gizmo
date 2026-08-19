# Web3 monitoring: balances and RPC health

Executes [docs/plans/web3-balance-monitoring.md](../plans/web3-balance-monitoring.md).
Commits `f0abfcae`, `7a291bbb`.

## Two monitor types, one settings section

**Web3 Balance** watches the balance of an address — the chain's own token or any
ERC-20 — and fails below a floor. The failure it exists for is quiet: a relayer,
paymaster or deployer runs dry and the first sign is that transactions stopped
landing.

**Web3 RPC Health** watches whether the chain is still moving. Reachability did
not need a monitor type; an HTTP check with a JSON body covers it. What it cannot
see is a node that has fallen out of consensus, lost its peers, or sits behind a
load balancer with one stale member: it keeps answering every call and keeps
returning a block number, the number simply stops going up, and every ordinary
monitor stays green.

They share a settings section, because an RPC endpoint is instance-level
infrastructure that several monitors point at, and changing provider should not
mean editing every monitor that used it.

## The three decisions taken before writing anything

**The RPC URL is a credential.** Hosted endpoints carry their key in the path, so
anyone holding the string spends the owner's quota. Same treatment as
`docker_host.docker_daemon` and `remote_browser.url`: stored, used, never returned
by the REST API, and reaching the browser only when its own edit form asks.

**Decimals are read from the chain and stay editable.** The interface is a
convention: contracts exist that omit the method or report a value at odds with
how the token is presented. A wrong value is silent — a floor off by a factor of
ten either alerts constantly or never — so it is shown in the form rather than
hidden.

**Below the floor is Down**, which keeps it on the same path as every other
monitor: retries, notifications, status pages, uptime history and the `/api/v1`
summaries all work without a new concept.

## Every amount is a BigInt

A chain counts in units of `10^-18`, so a wei balance passes what a double
represents exactly at around 0.01 Ether. Beyond that arithmetic silently rounds,
and **a balance comparison that rounds fails in the worst direction: it reports a
drained account as funded.**

So the threshold is stored as a decimal string, scaling moves the decimal point
rather than multiplying, and display inserts the point rather than dividing. A
test pins this by asserting that `Number()` cannot tell the fixture's two values
apart while the comparison can.

## No new dependency

Two JSON-RPC reads and two ABI-encoded calls is string manipulation over the HTTP
client already present. A chain library would have been a large dependency for a
four-byte selector and a padded argument.

**A call to an address holding no code returns `0x` rather than failing**, so that
case is refused explicitly — otherwise a mistyped contract reads as a balance of
zero and alerts as if the account had been emptied.

## The traps in RPC health, and how each is handled

**Block production differs by orders of magnitude** — around twelve seconds on
Ethereum, two on Polygon, under one on some rollups — and some chains produce a
block only when there is something to put in one, so idleness is not a fault
there. The limit is per monitor with no default, because any default would be
wrong for most chains. Left empty, height and age are still recorded on every
heartbeat, which is what makes a stall visible in hindsight.

**A block can be newer than now.** Its timestamp is set by whoever produced it, so
a server whose clock runs slow sees blocks from the future. Age is clamped at
zero: reported negative it would sail under any limit, reported as a large
positive it would alert constantly.

**A height that dips is not an alert.** A hosted endpoint is a pool and
consecutive requests can land on different members. It goes in the message and
nothing more.

**The chain id is probed when the network is saved and checked on every run.** An
endpoint quietly repointed at another chain answers every call successfully and
reports a balance that is plausible and wrong, which is worse than an outage.

## Verification

Against a stand-in chain, so the balances and the failures were exact rather than
borrowed:

| | |
| --- | --- |
| Native, 2 against a floor of 1 | Up |
| Native, 2 against a floor of 5 | Down — "Balance 2 is below the minimum of 5" |
| ERC-20, 250 against 100, decimals read as 6 | Up |
| 2 against 2.000000000000000001 | below — one unit, at a magnitude where a double says equal |
| Chain advancing normally | Up — "Block 21983402, 5s old, limit 60s" |
| Node answering, block 400s old | Down — over the limit |
| Same, no limit set | Up, age recorded |
| Block timestamp ahead of local time | "0s old" |
| JSON-RPC error, non-JSON body, HTTP 500, unreachable, empty contract | each a readable failure |

One ERC-20 run failed and was not a defect: the stand-in chain still held state
from the preceding "empty contract" case.

## Also

`rpcCall` returned only hex strings, which a block is not. It now returns whatever
the method answered — `in` rather than a truthiness check, because `false` and
`null` are real answers from some methods — and callers validate the shape they
asked for, which four of them already did.
