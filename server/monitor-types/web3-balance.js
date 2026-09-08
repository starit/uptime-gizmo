const { MonitorType } = require("./monitor-type");
const { UP } = require("../../src/util");
const dayjs = require("dayjs");
const {
    getNativeBalance,
    getTokenBalance,
    scaleToInteger,
    formatUnits,
    isAddress,
} = require("../modules/web3-rpc");
const { formatWeb3ResultMessage, runWeb3NetworkOperation } = require("./web3-network");

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

        const result = await runWeb3NetworkOperation(monitor, (network, timeout) => {
            return contract
                ? getTokenBalance(network.rpc_url, contract, address, timeout())
                : getNativeBalance(network.rpc_url, address, timeout());
        });
        const balance = result.value;

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
