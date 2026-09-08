const { MonitorType } = require("./monitor-type");
const { UP } = require("../../src/util");
const dayjs = require("dayjs");
const { getLatestBlock, blockAgeSeconds } = require("../modules/web3-rpc");
const { formatWeb3ResultMessage, runWeb3NetworkOperation } = require("./web3-network");

/**
 * Whether an RPC endpoint is serving a chain that is still moving.
 *
 * Reachability is the part that does not need this monitor — an HTTP check with
 * a JSON body already covers it. What it cannot see is the failure that matters:
 * a node that has fallen out of consensus, lost its peers, or sits behind a load
 * balancer with one stale member keeps answering every call successfully and
 * keeps returning a block number. The number simply stops going up, the
 * application reads a chain that is minutes behind, transactions never land, and
 * every ordinary monitor stays green.
 *
 * So the check is the age of the newest block, and the reachability comes free
 * with it.
 *
 * See docs/plans/web3-balance-monitoring.md.
 */
class Web3RpcMonitorType extends MonitorType {
    name = "web3-rpc";

    /**
     * @inheritdoc
     */
    async check(monitor, heartbeat, _server) {
        const started = dayjs().valueOf();

        const result = await runWeb3NetworkOperation(
            monitor,
            (network, timeout) => getLatestBlock(network.rpc_url, timeout())
        );
        const block = result.value;
        heartbeat.ping = dayjs().valueOf() - started;

        const age = blockAgeSeconds(block.timestamp, Date.now() / 1000);
        const maxAge = monitor.web3_max_block_age;

        /*
         * No limit set still earns its place: the endpoint answered, it is
         * serving the right chain, and the height and age are recorded on every
         * heartbeat, which is what makes a stall visible in hindsight.
         */
        if (!maxAge) {
            heartbeat.msg = formatWeb3ResultMessage(result, `Block ${block.number}, ${age}s old`);
            heartbeat.status = UP;
            return;
        }

        if (age > maxAge) {
            throw new Error(`Block ${block.number} is ${age}s old, over the limit of ${maxAge}s`);
        }

        heartbeat.msg = formatWeb3ResultMessage(result, `Block ${block.number}, ${age}s old, limit ${maxAge}s`);
        heartbeat.status = UP;
    }
}

module.exports = {
    Web3RpcMonitorType,
};
