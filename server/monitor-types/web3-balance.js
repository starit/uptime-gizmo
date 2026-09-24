const { MonitorType } = require("./monitor-type");
const { UP } = require("../../src/util");
const dayjs = require("dayjs");
const {
    getNativeBalance,
    getTokenBalance,
    getLatestBlock,
    blockAgeSeconds,
    scaleToInteger,
    formatUnits,
    isAddress,
} = require("../modules/web3-rpc");
const { formatWeb3ResultMessage, runWeb3NetworkOperation } = require("./web3-network");
const { getFallbackIDs } = require("../modules/web3-fallback");

/**
 * How stale a network's own latest block can be before a balance read against
 * it is untrustworthy on its own, rather than a normal gap between blocks.
 *
 * There is deliberately no per-chain tuning here, unlike Web3 RPC Health's
 * configured limit: this is not a judgment about whether the chain is healthy,
 * only a coarse sanity check on whether *this* read is fresh enough to act on.
 * 15 minutes is far beyond the block time of any chain this feature targets,
 * including an idle one, so it only catches a read that is stale by a wide
 * margin — such as a pool member serving an old, cached, or rolled-back view
 * of the account rather than its current state.
 */
const MAX_TRUSTED_BLOCK_AGE_SECONDS = 15 * 60;

/**
 * Watch the balance of an address and fail when it falls below a floor.
 *
 * The failure this exists for is quiet: a relayer, paymaster or deployer runs
 * dry and the first sign is that transactions stopped landing. A balance decays
 * slowly and predictably, which is exactly what a monitor is good at noticing.
 *
 * Every amount is a BigInt. A chain counts in units of 10^-18, so a balance
 * passes what a double represents exactly at around 0.01 Ether — beyond that,
 * arithmetic silently rounds, and a threshold comparison that rounds is worse
 * than none because it fails in the direction of saying nothing is wrong.
 *
 * See docs/plans/web3-balance-monitoring.md.
 */
class Web3BalanceMonitorType extends MonitorType {
    name = "web3-balance";

    /**
     * @inheritdoc
     */
    async check(monitor, heartbeat, _server) {
        const started = dayjs().valueOf();

        const address = (monitor.web3_address ?? "").trim();
        if (!isAddress(address)) {
            throw new Error("A valid address is required");
        }

        const contract = (monitor.web3_token_contract ?? "").trim();
        const decimals = Number.isInteger(monitor.web3_token_decimals) ? monitor.web3_token_decimals : 18;

        const readBalance = (network, timeout) => contract
            ? getTokenBalance(network.rpc_url, contract, address, timeout())
            : getNativeBalance(network.rpc_url, address, timeout());

        // Only worth the extra RPC call when there is a fallback network to
        // confirm a stale-looking read against; a monitor with none has
        // nothing to cross-check with, so this would just be added latency.
        const hasFallback = getFallbackIDs(monitor).length > 0;

        const result = await runWeb3NetworkOperation(monitor, async (network, timeout) => {
            if (!hasFallback) {
                return { balance: await readBalance(network, timeout), blockAge: null };
            }
            // The block read is a bonus freshness signal, not a second thing
            // the balance read now depends on: an endpoint whose key or plan
            // does not cover eth_getBlockByNumber must not lose a balance it
            // read successfully, so its failure here becomes "unknown
            // freshness" rather than failing the whole attempt.
            const [balance, block] = await Promise.all([
                readBalance(network, timeout),
                getLatestBlock(network.rpc_url, timeout()).catch(() => null),
            ]);
            return { balance, blockAge: block ? blockAgeSeconds(block.timestamp, Date.now() / 1000) : null };
        }, {
            // A well-formed zero is exactly what a lagging pool member serves
            // for a funded address, and a balance read against a stale block
            // can be any amount but the wrong, out-of-date one — the account's
            // past state rather than its current one. Both are confirmed
            // against a fallback network before they trip the minimum.
            isSuspicious: (reading) => reading.balance === 0n
                || (reading.blockAge !== null && reading.blockAge > MAX_TRUSTED_BLOCK_AGE_SECONDS),
            describeSuspicious: (reading) => reading.balance === 0n
                ? "a zero balance"
                : `a balance read against a block ${Math.round(reading.blockAge / 60)} minutes old`,
        });
        const balance = result.value.balance;

        heartbeat.ping = dayjs().valueOf() - started;

        const shown = formatUnits(balance, decimals);
        const minimum = (monitor.web3_min_balance ?? "").trim();

        // No floor set is a legitimate configuration: it watches that the
        // endpoint answers and records the balance, without alerting on it.
        if (!minimum) {
            heartbeat.msg = formatWeb3ResultMessage(result, `Balance ${shown}`);
            heartbeat.status = UP;
            return;
        }

        const floor = scaleToInteger(minimum, decimals);

        if (balance < floor) {
            throw new Error(`Balance ${shown} is below the minimum of ${minimum}`);
        }

        heartbeat.msg = formatWeb3ResultMessage(result, `Balance ${shown}, minimum ${minimum}`);
        heartbeat.status = UP;
    }
}

module.exports = {
    Web3BalanceMonitorType,
};
