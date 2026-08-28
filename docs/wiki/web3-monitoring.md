# Web3 monitoring

Three monitor types for EVM chains. Every check is Ethereum JSON-RPC (`eth_chainId`, `eth_getBalance`, `eth_getBlockByNumber`, `eth_call`) — not a generic chain-agnostic call. They **read** public state. They do not hold a private key and they never send a transaction.

## Networks first

**Settings → Web3 Networks.** A network is a name plus an RPC URL. Saving it asks the endpoint for its chain ID and stores that, so a later check can tell if the URL started serving a different chain.

The RPC URL is a credential (hosted providers put the key in the path). It is shared by every monitor on that chain. Configure it once here, not on each monitor.

Ethereum JSON-RPC only: Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, testnets, a local node. Bitcoin, Solana, and Cosmos are not supported. Solana and other non-EVM chains are [planned](../../ROADMAP.md); a Solana RPC URL will not work here.

Then add a monitor and pick the network.

## Balance

**Web3 Balance.** Watches one address.

- Native token if you leave **Token Contract** empty.
- ERC-20 if you fill the contract. Decimals are read from the chain and you can correct them.
- Optional **Minimum Balance**. Below that floor the monitor is down.

Amounts are compared as integers. Type the threshold as a decimal string (`0.05`); do not rely on floating-point. A `Number` cannot represent 18-decimal wei exactly, which is how a drained account can look funded.

## RPC health

**Web3 RPC Health.** The node answering is not enough. If the newest block is older than **Maximum Block Age** (seconds), the monitor goes down. That is the stale-but-still-serving case.

There is no default, deliberately: block production runs from twelve seconds on Ethereum to under one on some rollups, and some chains only produce a block when there is something to put in it. `120` is only the placeholder. Left empty, height and age are still recorded on every heartbeat without alerting.

## Contract value

**Web3 Contract Value.** One `eth_call` per check, then compare one decoded word to a threshold.

You supply:

- Contract address
- **Calldata** as hex (`0x…`). Nothing here encodes it from an ABI. Wrong calldata that still returns a number is the worst failure a monitor can have — you own the encoding.
- **Value type:** `uint256`, `int256`, `bool`, `address`, or `bytes32` — the same list the API publishes on `MonitorInput.web3ValueType`.
- **Word index** into the ABI-encoded result (0 is the first 32-byte word). Past the end is an error, not zero.
- Optional comparison and threshold (again a decimal **string**)

The form makes the call once before save so you can see the value. `int256` is two’s complement; a negative funding rate is not `2^256 - 1`.

### The threshold is the healthy state, not the alarm

The monitor is **down when the comparison fails**. So a comparison is written as
the condition that should hold, and "alert when X goes above 1000" is entered as
`<= 1000`, not `>= 1000`. Getting this backwards produces a monitor that is
green in exactly the situation you wanted to hear about.

### Worked example: how many Uniswap V2 pairs exist

The V2 factory keeps every pair it has created in one array, and
`allPairsLength()` returns its length. On Ethereum mainnet:

| Field | Value |
| --- | --- |
| Contract | `0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f` |
| Calldata | `0x574f2ba3` — the selector for `allPairsLength()`, no arguments |
| Value type | `uint256` |
| Word index | `0` |
| Decimals | `0` — a count, not an amount |

Read on 2026-08-25 it returned **519,654**, which cross-checks: `allPairs(519653)`
returns a pair address and `allPairs(519654)` reverts, so the number really is the
array length.

**Alerting above a ceiling** — the request "tell me when there are more than
100,000 pairs" is `<= 100000`, and the heartbeat reads
`Value 519654 is not <= 100000`. Worth knowing before you set it: this counter
only ever goes up, it passed 100,000 years ago, and a monitor like this is down
from the moment you save it. It is a good way to see the type work; it is not a
useful alert.

**A floor is the useful direction for a counter that only grows.** Set `>=`
slightly under the current value — say `>= 500000` — and the monitor is green
while the chain is the one you think it is. It goes down if the endpoint starts
serving a fork, a testnet, or a stale archive node whose factory has fewer
pairs, because on the real chain that number cannot decrease. Paired with the
network's stored chain ID, that is a fairly strong statement that you are reading
the chain you meant to read.

Not in this type: events/logs, strings or arrays, multiple conditions, or writing the chain.

## API and agents

`GET /api/v1/web3-networks` returns id, name, and chain id — not the RPC URL. Create the three types through `/api/v1/monitors` or the MCP `create_monitor` tool; pass `web3NetworkId` from that list.
