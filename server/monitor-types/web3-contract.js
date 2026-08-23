const { MonitorType } = require("./monitor-type");
const { R } = require("redbean-node");
const { UP } = require("../../src/util");
const dayjs = require("dayjs");
const {
    ethCall,
    readWord,
    decodeWord,
    parseThreshold,
    formatValue,
    compareValue,
    getChainId,
    isAddress,
    OPERATOR_SYMBOLS,
} = require("../modules/web3-rpc");

/**
 * Watch one value inside a contract.
 *
 * The other two web3 types answer questions about infrastructure — is the
 * endpoint serving a chain that still moves, does an account still have gas.
 * Most of what actually goes wrong on-chain is state: a pool's reserves drain,
 * an oracle stops being updated, a contract gets paused, a proxy's admin
 * changes. Each of those is a value that can be read for free and compared
 * against a number, and each is invisible to a monitor that only checks whether
 * the node answers.
 *
 * The calldata is sent as given rather than composed from an ABI, the value is
 * one 32-byte word chosen by index, and every numeric comparison is BigInt for
 * the same reason the balance type's is: a uint256 at 18 decimals is past where
 * a double can tell consecutive integers apart.
 *
 * See docs/plans/web3-contract-monitoring.md.
 */
class Web3ContractMonitorType extends MonitorType {
    name = "web3-contract";

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

        const to = (monitor.web3_call_to ?? "").trim();
        if (!isAddress(to)) {
            throw new Error("A valid contract address is required");
        }

        const timeout = (monitor.timeout || 20) * 1000;

        /*
         * Confirm the endpoint is still serving the chain it was configured for
         * before reading anything from it. The same contract address on another
         * chain is a different contract, and it answers with a value that is
         * plausible and wrong.
         */
        if (network.chain_id) {
            const actual = await getChainId(network.rpc_url, timeout);
            if (actual !== String(network.chain_id)) {
                throw new Error(
                    `The endpoint is serving chain ${actual}, but this network is configured as ${network.chain_id}`
                );
            }
        }

        const data = (monitor.web3_call_data ?? "").trim();
        const blockTag = (monitor.web3_block_tag ?? "latest").trim() || "latest";
        const result = await ethCall(network.rpc_url, to, data, blockTag, timeout);

        heartbeat.ping = dayjs().valueOf() - started;

        const type = (monitor.web3_value_type ?? "uint256").trim() || "uint256";
        const offset = Number(monitor.web3_value_offset ?? 0);
        const decimals = Number.isInteger(monitor.web3_value_decimals) ? monitor.web3_value_decimals : 0;

        const value = decodeWord(readWord(result, offset), type);
        const shown = formatValue(value, type, decimals);

        const operator = (monitor.web3_value_operator ?? "").trim();
        const wanted = (monitor.web3_value_threshold ?? "").trim();

        /*
         * No comparison set is a legitimate configuration, the same as an unset
         * balance floor: the call is made, the value lands in every heartbeat
         * message, and nothing alerts on it.
         */
        if (!operator || !wanted) {
            heartbeat.msg = `Value ${shown}`;
            heartbeat.status = UP;
            return;
        }

        const threshold = parseThreshold(wanted, type, decimals);
        const symbol = OPERATOR_SYMBOLS[operator] ?? operator;

        if (!compareValue(value, operator, threshold)) {
            throw new Error(`Value ${shown} is not ${symbol} ${wanted}`);
        }

        heartbeat.msg = `Value ${shown} ${symbol} ${wanted}`;
        heartbeat.status = UP;
    }
}

module.exports = {
    Web3ContractMonitorType,
};
