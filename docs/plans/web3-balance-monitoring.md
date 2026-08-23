# Web3 balance monitoring

## Objective

Watch the balance of an address and alert when it falls below a floor. Two cases:
the chain's own token, and any ERC-20 on that chain.

The motivating failure is mundane and expensive: a relayer, paymaster, faucet or
deployer account runs dry, and the first anyone hears of it is that transactions
stopped landing. A balance is exactly the kind of thing that decays slowly,
predictably, and unnoticed — which is what monitoring is for.

## Scope

**In scope.** Native balance. ERC-20 balance. A per-monitor minimum. Networks
configured once in settings and reused across monitors.

**Not in scope for the first version.** Multi-signature or contract-owned balance
aggregation, NFT ownership, allowances, gas-price alerts, historical charts of
balance over time, and any form of transaction sending. Nothing here signs
anything or holds a private key; this feature reads public state and nothing more.

Reading an arbitrary value out of a contract — reserves, an oracle answer, a
paused flag — is a third type on the same networks, planned separately in
[web3-contract-monitoring.md](web3-contract-monitoring.md). It inherits the
integer arithmetic and the chain-id guard decided here.

## Networks live in settings, not on the monitor

An RPC endpoint is instance-level infrastructure, in the same way a proxy or a
Docker host is: several monitors point at the same one, and it changes for
reasons that have nothing to do with any particular monitor. So networks get
their own settings section and their own table, and a monitor references one.

The alternative — an RPC URL field on every monitor — means changing a provider
requires editing every monitor that used it, and puts the same credential in a
dozen rows.

### The RPC URL is a credential

A hosted endpoint carries its key in the URL:
`https://eth-mainnet.g.alchemy.com/v2/<key>`. Anyone holding that string spends
the owner's quota, and on some providers can read their usage. It is the same
shape of problem as `docker_host.docker_daemon` and `remote_browser.url`, and it
gets the same treatment: stored, used, never returned by the REST API. The
network's name and chain id are safe and are returned.

See the decisions section of [the REST API plan](rest-api.md) for the general
rule this follows.

## Amounts are integers, and must stay integers

A chain reports balances as integers of the smallest unit — wei for Ether, and
`10^decimals` for an ERC-20. One Ether is `10^18` wei, which exceeds what a
double can represent exactly: `Number` loses precision above `2^53`, so a balance
of `1000000000000000001` wei compares equal to `1000000000000000000`.

Every comparison therefore happens in `BigInt`, and the threshold is stored as a
**decimal string** rather than a float column. The user types `0.05`; that is
scaled to `50000000000000000` at check time using the token's own `decimals` and
compared as an integer. Storing `0.05` as a float and multiplying at check time
would reintroduce exactly the error the BigInt comparison exists to avoid.

Displayed balances are formatted from the integer by inserting a decimal point,
never by dividing.

## Decimals are read from the chain, and can be corrected

`decimals()` is part of the ERC-20 interface, so the value is fetched once when a
monitor is created and stored. It stays editable because the interface is a
convention rather than a guarantee: contracts exist that omit the method, and
contracts exist that report a value at odds with how the token is presented
everywhere else. An operator who knows better must be able to say so.

A wrong `decimals` is a silent failure — a threshold off by a factor of ten
alerts too eagerly or never at all — so the value is shown in the form rather
than hidden.

## Below the floor is Down

A balance under its minimum is a failure, not a distinct state. That keeps it on
the same path as every other monitor: retries, notifications, status pages,
uptime history, and the `/api/v1` summaries all work without learning a new
concept.

The alternative — a separate state for "reachable but underfunded" — is more
precise and buys nothing here, because the operator's response to both is the
same and the message already says which happened.

## No new dependency

Two JSON-RPC calls and two ABI-encoded reads is not enough to justify pulling in
a chain library. `eth_getBalance` takes an address. `balanceOf(address)` and
`decimals()` are a four-byte selector followed by a 32-byte argument, which is
string manipulation. The request goes over the HTTP client already in the tree.

An RPC endpoint is a URL supplied by an operator, so it is treated as one: the
response is parsed defensively, the size is bounded, and a JSON-RPC `error`
object is surfaced as the monitor's failure message rather than thrown away.

## Data model

```text
web3_network
    id, user_id, name, chain_id, rpc_url (credential), active, created_date

monitor  (new columns)
    web3_network_id        which network to query
    web3_address           the address being watched
    web3_token_contract    null for the chain's own token
    web3_token_decimals    18 for most, read from the contract
    web3_min_balance       decimal string, e.g. "0.05"
```

`chain_id` is stored so a mismatch can be reported: an endpoint quietly
repointed at a different network would otherwise show a plausible balance for the
wrong chain.

## RPC health is a second type, not a flag on the first

Reachability alone does not need a monitor type: an HTTP check with a JSON body
already covers it. What it cannot see is a node that has fallen out of consensus,
lost its peers, or sits behind a load balancer with one stale member. It keeps
answering every call successfully and keeps returning a block number; the number
simply stops going up, the application reads a chain minutes behind, transactions
never land, and every ordinary monitor stays green.

So the check is the age of the newest block, and reachability comes free with it.

It is a separate type rather than an extra field on a balance monitor because one
network serves many addresses: a stalled node should raise one alert, not turn
every balance monitor red at once, and the two failures call for different
responses.

**The limit is per monitor with no default.** Block production differs by orders
of magnitude — around twelve seconds on Ethereum, two on Polygon, under one on
some rollups — and some chains only produce a block when there is something to
put in it, so idleness there is not a fault. Any default would be wrong for most
chains.

**A block can be newer than now.** Its timestamp is set by whoever produced it,
and a server whose clock runs slow will see blocks from the future. Age is
clamped at zero: reported negative it would sail under any limit, and reported as
a large positive it would alert constantly.

**Block height going backwards is not an alert.** A hosted endpoint is a pool,
and consecutive requests can land on different members, so a height that dips by
one or two is ordinary. It is recorded in the message and nothing more.

## Verification

- A balance above and below its floor, for both native and ERC-20.
- A threshold whose scaled value exceeds `2^53`, to prove the comparison is not
  going through a double.
- An RPC that returns a JSON-RPC error, one that returns malformed JSON, and one
  that does not answer.
- A `chain_id` that disagrees with the configured network.
- The REST API never returning `rpc_url`.
