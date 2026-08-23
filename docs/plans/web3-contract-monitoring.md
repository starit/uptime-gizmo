# Web3 contract value monitoring

## Objective

Read one value out of a contract on every check, compare it against a threshold,
and go down when the comparison fails.

This is the third web3 monitor type, after
[balance and RPC health](web3-balance-monitoring.md), and it exists because the
first two answer questions about infrastructure while most of what goes wrong
on-chain is state: a pool's reserves drain, an oracle stops being updated, a
contract gets paused, a supply cap is reached, a proxy's admin changes. Each of
those is a value that can be read for free and compared against a number, and
each of them is invisible to a monitor that only checks whether the node answers.

## Scope

**In scope.** One `eth_call` per check, with calldata the operator or an agent
supplies. One value decoded out of the result. One comparison against one
threshold. Networks reused from settings, as the other two types do.

**Not in scope.** Multiple values or multiple conditions per monitor, decoding
dynamic return types (strings, bytes, arrays), event and log monitoring
(`eth_getLogs`), historical charts of the value, and anything that writes. This
type signs nothing and holds no key; `eth_call` cannot change state.

## The calldata is supplied, not composed

The monitor stores calldata as a hex string and sends it verbatim. It does not
take an ABI, a function name and a list of arguments and encode them.

That is a deliberate limit and it is the whole reason this type is cheap. ABI
encoding is a large surface — tuples, dynamic types, arrays, overloads — and
getting it wrong produces a call that succeeds and returns the wrong number,
which is the worst failure a monitor can have. Encoding is also exactly what the
callers of this feature already do: an agent creating a monitor through the REST
API can encode a selector and its arguments, and a human who is reading a
contract at this level has the hex in front of them from a block explorer or
`cast calldata`.

So the contract here is: **you bring 0x-prefixed calldata, this reads a word out
of what comes back.** What the monitor validates is that the calldata is hex, is
whole bytes, and starts with something the length of a selector.

## The value is one 32-byte word, chosen by index

An `eth_call` returns ABI-encoded bytes. For the static types this reads, that is
a sequence of 32-byte words: `totalSupply()` returns one,
`UniswapV2Pair.getReserves()` returns three, Chainlink's `latestRoundData()`
returns five with the price in the second. So the read is a word index plus how
to interpret that word — `uint256`, `int256`, `bool`, `address` or `bytes32`.

**A word index past the end of the result is an error, not zero.** This is the
most dangerous mistake available here: a monitor configured to read word 3 of a
two-word result would, if the missing word were treated as zero, report a reserve
of zero and alert as if the pool had been emptied — or, with a `lte` threshold,
report success forever. The same reasoning is why an empty `0x` result is a
failure rather than a balance of zero in the balance monitor.

**An `address` word must have twelve zero bytes in front of it.** ABI left-pads
an address, so a word that has anything in its top twelve bytes is not an
address, which usually means the index is pointing at the wrong word.

## Signed values are real

`int256` is decoded as two's complement. A funding rate, a rebalance delta, an
oracle answer and a protocol's net position are all routinely negative, and
reading `-1` as `2^256 - 1` would turn "slightly below zero" into the largest
number representable, passing any `gte` threshold that exists.

`scaleToInteger` deliberately refuses a leading `-`, because a negative *balance*
floor is meaningless and silently accepting one would hide a typo. Signed
thresholds therefore go through `scaleSignedToInteger`, which splits off the sign
and reuses the same digit-shifting conversion.

## Decimals default to zero, and comparisons stay BigInt

The threshold is a decimal string scaled by a per-monitor `decimals`, for the
reason set out at length in the [balance plan](web3-balance-monitoring.md): a
uint256 at 18 decimals is far past what a double represents exactly, and a
comparison that rounds is worse than no comparison because it fails in the
direction of reporting that nothing is wrong.

Unlike the balance type, `decimals` defaults to **0** rather than 18. Most values
worth watching this way are not token amounts — a block count, a round id, a
number of participants, a basis-point rate — and a default of 18 would make a
threshold of `1000` mean `0.000000000000001` without saying so.

## Only equality applies to addresses

`gte`, `lte`, `gt` and `lt` are rejected for `address`, `bytes32` and `bool`.
Ordering an address is meaningless, and offering the comparison would invite a
monitor that looks configured and tests nothing. `owner() == 0x…` and
`paused() == false` are what those types are for.

## Failing the comparison is Down

As with the balance floor, a value outside its threshold is a failure rather than
a new state, which keeps it on the same path as every other monitor: retries,
notifications, status pages and uptime history.

A revert is also Down, and its message is surfaced. A revert is a real signal
here — `paused()` reverting means the function is gone, which on a proxy means it
was upgraded to something else.

**No threshold set records the value and stays up**, the same as an unset balance
floor or block-age limit. It is a legitimate configuration: the value lands in
every heartbeat message, which is what makes a change visible in hindsight.

## Data model

```text
monitor  (new columns)
    web3_call_to           the contract to call
    web3_call_data         0x calldata, sent verbatim
    web3_value_offset      which 32-byte word of the result to read
    web3_value_type        uint256 | int256 | bool | address | bytes32
    web3_value_decimals    scale for the threshold and the message, default 0
    web3_value_operator    gte | lte | gt | lt | eq | ne
    web3_value_threshold   decimal string, or an address / bytes32 for eq and ne
    web3_block_tag         latest | safe | finalized
```

`web3_network_id` and `timeout` are reused. The balance type's
`web3_token_contract` and `web3_token_decimals` are **not** reused: the first
would mean one column holding two different ideas, and the second defaults to 18,
which is the wrong default here in a way that is silent.

The operator ids match the [conditions engine](../../server/monitor-conditions/operators.js)
where they overlap, so a later move to that engine does not rename stored values.

### Why not the conditions engine

Declaring `supportsConditions` would give this type the existing AND/OR condition
editor for free, and that is where this should eventually go. It is not where it
starts, because the engine's `lt`/`gt`/`lte`/`gte` operators compare with
`Number(value)`. A uint256 at 18 decimals passes what a double holds exactly, so
those operators would silently round the one number the monitor exists to check.
Moving over means first adding operators that compare decimal strings exactly;
the flat columns here are the smaller change and the stored operator ids carry
over.

## The REST API

Before this, no `web3_*` field was writable through `/api/v1`, so no web3 monitor
of any kind could be created by an agent. All three types' fields are added
together, along with a read-only `GET /api/v1/web3-networks`: without it a caller
has no way to discover the `web3NetworkId` it has to supply.

`rpc_url` stays out of that listing. It is a credential — a hosted endpoint
carries its API key in the URL — and it is the same rule the socket path and the
other credential-bearing resources follow.

**The value itself is not readable over the API.** It goes into the heartbeat
message, and no `/api/v1` endpoint returns that message for any monitor type, so
a caller sees up or down and nothing more. For this type that gap bites harder
than for the others: a monitor whose calldata or word index is wrong looks
healthy, and the mistake only surfaces in the UI, which is why the form has a
test-read button and the agent skill says the encoding is the caller's
responsibility. Exposing the last heartbeat message — or the decoded value as a
first-class field — is the obvious next step and is deliberately not part of this
change.

## Verification

- A value above, at and below its threshold, for each operator.
- A threshold whose scaled value exceeds `2^53`, to prove the comparison is not
  going through a double.
- A negative `int256`, and a threshold that is negative.
- A word index past the end of the result, and an empty `0x` result.
- An `address` word with dirty top bytes.
- `gte` refused on an address.
- A revert, a JSON-RPC error, and a chain id that disagrees with the network.
