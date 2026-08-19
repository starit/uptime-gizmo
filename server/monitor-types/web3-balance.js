const { MonitorType } = require("./monitor-type");
const { R } = require("redbean-node");
const { UP } = require("../../src/util");
const dayjs = require("dayjs");
const {
    getNativeBalance,
    getTokenBalance,
    getChainId,
    scaleToInteger,
    formatUnits,
    isAddress,
} = require("../modules/web3-rpc");

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

        const network = await R.findOne("web3_network", " id = ? ", [ monitor.web3_network_id ]);
        if (!network) {
            throw new Error("No network is configured for this monitor");
        }
        if (!network.active) {
            throw new Error(`The network "${network.name}" is disabled`);
        }

        const address = (monitor.web3_address ?? "").trim();
        if (!isAddress(address)) {
            throw new Error("A valid address is required");
        }

        const timeout = (monitor.timeout || 20) * 1000;
        const contract = (monitor.web3_token_contract ?? "").trim();
        const decimals = Number.isInteger(monitor.web3_token_decimals) ? monitor.web3_token_decimals : 18;

        /*
         * Confirm the endpoint is still serving the chain it was configured for
         * before reading anything from it. An endpoint quietly repointed at a
         * different network answers every call successfully and reports a
         * balance that is plausible and wrong.
         */
        if (network.chain_id) {
            const actual = await getChainId(network.rpc_url, timeout);
            if (actual !== String(network.chain_id)) {
                throw new Error(
                    `The endpoint is serving chain ${actual}, but this network is configured as ${network.chain_id}`
                );
            }
        }

        const balance = contract
            ? await getTokenBalance(network.rpc_url, contract, address, timeout)
            : await getNativeBalance(network.rpc_url, address, timeout);

        heartbeat.ping = dayjs().valueOf() - started;

        const shown = formatUnits(balance, decimals);
        const minimum = (monitor.web3_min_balance ?? "").trim();

        // No floor set is a legitimate configuration: it watches that the
        // endpoint answers and records the balance, without alerting on it.
        if (!minimum) {
            heartbeat.msg = `Balance ${shown}`;
            heartbeat.status = UP;
            return;
        }

        const floor = scaleToInteger(minimum, decimals);

        if (balance < floor) {
            throw new Error(`Balance ${shown} is below the minimum of ${minimum}`);
        }

        heartbeat.msg = `Balance ${shown}, minimum ${minimum}`;
        heartbeat.status = UP;
    }
}

module.exports = {
    Web3BalanceMonitorType,
};
