# Web3 monitoring

Three monitor types for EVM chains. They **read** public state. They do not hold a private key and they never send a transaction.

## Networks first

**Settings → Web3 Networks.** A network is a name plus an RPC URL. Saving it asks the endpoint for its chain ID and stores that, so a later check can tell if the URL started serving a different chain.

The RPC URL is a credential (hosted providers put the key in the path). It is shared by every monitor on that chain. Configure it once here, not on each monitor.

Ethereum JSON-RPC only: Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, testnets, a local node. Bitcoin, Solana, and Cosmos are not supported.

Then add a monitor and pick the network.

## Balance

**Web3 Balance.** Watches one address.

- Native token if you leave **Token Contract** empty.
- ERC-20 if you fill the contract. Decimals are read from the chain and you can correct them.
- Optional **Minimum Balance**. Below that floor the monitor is down.

Amounts are compared as integers. Type the threshold as a decimal string (`0.05`); do not rely on floating-point. A `Number` cannot represent 18-decimal wei exactly, which is how a drained account can look funded.

## RPC health

**Web3 RPC Health.** The node answering is not enough. If the newest block is older than **Maximum Block Age** (seconds; default 120), the monitor goes down. That is the stale-but-still-serving case.

## Contract value

**Web3 Contract Value.** One `eth_call` per check, then compare one decoded word to a threshold.

You supply:

- Contract address
- **Calldata** as hex (`0x…`). Nothing here encodes it from an ABI. Wrong calldata that still returns a number is the worst failure a monitor can have — you own the encoding.
- **Value type:** `uint256`, `int256`, `bool`, `address`, or `bytes32`
- **Word index** into the ABI-encoded result (0 is the first 32-byte word). Past the end is an error, not zero.
- Optional comparison and threshold (again a decimal **string**)

The form makes the call once before save so you can see the value. `int256` is two’s complement; a negative funding rate is not `2^256 - 1`.

Not in this type: events/logs, strings or arrays, multiple conditions, or writing the chain.

## API and agents

`GET /api/v1/web3-networks` returns id, name, and chain id — not the RPC URL. Create the three types through `/api/v1/monitors` or the MCP `create_monitor` tool; pass `web3NetworkId` from that list.
