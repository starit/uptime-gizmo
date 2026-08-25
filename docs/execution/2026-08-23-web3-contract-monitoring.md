# Web3 contract values: reading one number out of a contract

Executes [docs/plans/web3-contract-monitoring.md](../plans/web3-contract-monitoring.md),
written before the code. Uncommitted at the time of writing.

## A third type, on the two that were already there

**Web3 Contract Value** makes one `eth_call` per check, decodes one 32-byte word
of the result, and goes down when that value fails a comparison.

The two existing web3 types answer questions about infrastructure: does the
endpoint answer, is the chain still moving, does an account still have gas. Most
of what actually goes wrong on-chain is state — a pool's reserves drain, an
oracle stops being updated, a contract gets paused, a proxy's admin changes — and
every one of those is a number that can be read for free and is invisible to a
monitor that only checks whether the node answers.

It reuses the network from **Settings → Web3 Networks**, the chain-id guard, and
the BigInt arithmetic the balance type established. What is new is the read.

## The calldata is supplied, not composed

The monitor stores hex and sends it verbatim. It does not take an ABI, a function
name and arguments and encode them.

That is the decision the whole type rests on. ABI encoding is a large surface —
tuples, dynamic types, arrays, overloads — and **getting it wrong produces a call
that succeeds and returns the wrong number**, which is the worst thing a monitor
can do. It is also work the callers already do: an agent creating a monitor
through the REST API can encode a selector and its arguments, and a human reading
a contract at this level has the hex in front of them from a block explorer or
`cast calldata`.

What is validated is that the calldata is hex, is whole bytes, and is at least
the four bytes of a selector. Anything shorter reaches the contract's fallback,
which returns no value to compare.

## The two mistakes that are silent, and what refuses them

Calldata that reads the wrong function, and a word index pointing at the wrong
part of the result. Neither can be caught by looking at the configuration, and
both produce a monitor that runs happily and reports a number that means
something else.

Three things stand against them:

**A word index past the end of the result is an error, not zero.** Read as zero,
a monitor pointed at word 3 of a two-word result would report a reserve of zero
and page as if the pool had been emptied — or, under a `lte` threshold, pass
forever while testing nothing. The same reasoning already made an empty `0x`
result a failure in the balance monitor rather than a balance of zero.

**An `address` word must have twelve zero bytes in front of it.** ABI left-pads
an address, so anything in the top twelve bytes means this word is not one, which
nearly always means the index is off.

**The form makes the call for you.** A **Test read** button runs the same read
through the socket handler and shows the decoded value beside the raw result. It
stores nothing, and it uses a network the caller already owns, so it grants no
reach they did not have. It is the only way to see the mistake before saving, and
the reason it exists is that the API cannot show it afterwards — see below.

## Signed values, and the one function that stayed strict

`int256` is decoded as two's complement. A funding rate, an oracle answer and a
protocol's net position are routinely negative, and reading `-1` unsigned turns
"slightly below zero" into `2^256 - 1`, which passes every `gte` threshold there
is.

`scaleToInteger` refuses a leading `-` and **was left that way**: a negative
balance floor is meaningless, and quietly accepting one would hide a typo in the
number the balance monitor exists to protect. Signed thresholds go through a new
`scaleSignedToInteger`, which splits the sign off and reuses the same
digit-shifting conversion. A test pins both halves of that.

## Decimals default to zero

The threshold is a decimal string scaled by a per-monitor `decimals` and compared
in BigInt, for the reason the balance work set out at length: a uint256 at 18
decimals is far past what a double represents exactly, and a comparison that
rounds fails in the direction of reporting that nothing is wrong.

Unlike the balance type, the default is **0** rather than 18. Most values worth
watching this way are not token amounts — a round id, a count, a basis-point rate
— and a default of 18 would silently turn a threshold of `1000` into
`0.000000000000001`.

## Ordering is refused where it means nothing

`gte`, `lte`, `gt` and `lt` are rejected for `address`, `bytes32` and `bool`.
Offering them would invite a monitor that looks configured and tests nothing;
`owner() == 0x…` and `paused() == false` are what those types are for.

The form follows the same rule rather than restating it: the operator list is
derived from the chosen type, and switching to an unordered type clears an
ordering operator instead of leaving it selected but absent from the dropdown,
which would have failed on save for a reason nothing on screen explained.

## One place decides whether a read is usable

`validateContractRead` lives in the RPC module and is called from
`Monitor.validate()`, so the socket path and the REST API refuse the same things
and cannot drift. It also fills in the column defaults — type, decimals, block
tag — because validation runs before the insert that would have applied them, and
a caller that omits them means "a plain integer at the latest block".

Failing the comparison is **Down**, as a balance below its floor is: same
retries, notifications, status pages and uptime history, no new concept. A revert
is Down too, with its message surfaced — `paused()` reverting means the function
is gone, which on a proxy means it was upgraded to something else. **With no
comparison set the monitor records the value and stays up**, the same as an unset
balance floor.

## The REST API, and the part of it that is missing

Before this, **no `web3_*` field was writable through `/api/v1`**, so an agent
could not create a web3 monitor of any kind. All three types' fields went in
together, along with a read-only `GET /api/v1/web3-networks`: without it a caller
has no way to discover the `web3NetworkId` it has to supply. `rpc_url` stays out
of that listing — a hosted endpoint carries its API key in the URL, so it gets
the same treatment as `remote_browser.url`.

Referencing a network is checked for ownership the way `parent` is. Pointing a
monitor at somebody else's network would spend their provider quota through a
monitor of your own, without ever seeing the credential.

**The value the monitor read is not visible over the API.** It goes into the
heartbeat message, and no `/api/v1` endpoint returns that message for any monitor
type, so a caller sees up or down and nothing more. For this type the gap bites
harder than for the others: a monitor whose calldata or word index is wrong looks
perfectly healthy from the API, and the mistake only surfaces in the UI. That is
why the form has a test-read button and why the agent skill says the encoding is
the caller's responsibility to get right. Exposing the last heartbeat message is
the obvious next step and is deliberately not part of this change.

## Why not the conditions engine

Declaring `supportsConditions` would have given this type the existing AND/OR
condition editor for free, and that is where it should eventually go. It is not
where it starts: the engine's `lt`/`gt`/`lte`/`gte` operators compare with
`Number(value)`, and a uint256 at 18 decimals passes what a double holds exactly,
so those operators would silently round the one number the monitor exists to
check. Moving over means first adding operators that compare decimal strings
exactly. The stored operator ids already match the engine's where they overlap,
so that move will not rename anything.

## Verification

Unit tests over hand-built words pin the decoding and the comparison, and one run
against Ethereum mainnet pins the whole path — the check function, not its parts.

The live subject is the Uniswap V2 factory's `allPairsLength()`
(`0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f`, calldata `0x574f2ba3`), which
returned **519,654** on 2026-08-25. It cross-checks itself: `allPairs(519653)`
answers with a pair address and `allPairs(519654)` reverts, so the number is the
array length rather than something that merely looks like a count.

| Configuration against mainnet | Result |
| --- | --- |
| `gte 100000` | Up — "Value 519654 >= 100000", 1011 ms |
| `lte 100000` | Down — "Value 519654 is not <= 100000" |
| No comparison | Up — "Value 519654" |
| Word index 1 on a one-word result | Down — "The call returned 32 bytes, which has no 32-byte word at index 1" |

The last row is the guard that matters, refusing real return data rather than a
fixture.

| | |
| --- | --- |
| 39 new cases over the read, decode, threshold and validation helpers | pass — 52 in the file |
| `-1` as `int256`, and the `2^255` boundary in both directions | decoded as negative |
| A threshold at 18 decimals, one unit apart | separated; `Number()` calls the fixture equal |
| Word index past the end of a two-word result, and `0x` | refused, not read as zero |
| An `address` read of a word with dirty top bytes | refused |
| `gte` on an address, half a comparison, 40 decimals, `pending` as a block tag | each refused at save time |
| Migration on a scratch SQLite database | columns and defaults present; a monitor round-tripped through the REST field table |
| The network listing | no `rpcUrl` |
| The form in light and dark, driven by Playwright | renders; the operator resets when the type loses its order |
| `pnpm run lint`, `pnpm run build` | clean |

The full backend suite is 411 tests with 21 failures, all pre-existing: 19 MQTT
cases that need a broker (the same 19 fail on an unmodified checkout), one
`pingAsync` IDN case that needs DNS, and one changelog test belonging to
unrelated work in progress.

## Also

The RPC module's header comment claimed "two reads and two ABI-encoded calls",
which is no longer what the file is. It now says what is true: a handful of reads
and some ABI decoding, and that nothing in it composes calldata from an ABI.

The MCP server had the same gap the REST API did, one layer up: its
`create_monitor` and `update_monitor` tools declare a fixed subset of fields, so
an agent speaking MCP could not create a web3 monitor of any kind even once the
REST API could. Both tools now carry all fourteen web3 fields — declared once and
shared, so the two cannot drift — and a `list_web3_networks` read tool supplies
the `web3NetworkId` they need. A test asserts the field names match the REST
allow-list exactly, because a name the allow-list does not know is dropped
silently rather than refused.

The tool table in the MCP server's README had drifted before this: it listed
eight read tools when the code offered twelve, missing the four
credential-bearing listings. It now lists all thirteen.
