const { R } = require("redbean-node");
const { getChainId, rpcHostFromUrl } = require("../modules/web3-rpc");

const DEFAULT_TIMEOUT_MS = 20000;
const PRIMARY_BUDGET_SHARE = 0.6;
const MAX_FAILURE_MESSAGE_CHARS = 200;

/**
 * One line of bounded diagnostic text without an RPC URL added by this module.
 * @param {unknown} error caught value
 * @returns {string} safe heartbeat text
 */
function describeFailure(error) {
    const message = error instanceof Error ? error.message : String(error);
    const withoutRpcPaths = message.replace(/https?:\/\/[^\s"'<>]+/gi, (candidate) => {
        try {
            const parsed = new URL(candidate);
            return `${parsed.protocol}//${parsed.host}/…`;
        } catch (_) {
            return "[RPC URL]";
        }
    });
    const flat = withoutRpcPaths.replace(/\s+/g, " ").trim() || "unknown error";
    return flat.length > MAX_FAILURE_MESSAGE_CHARS
        ? `${flat.slice(0, MAX_FAILURE_MESSAGE_CHARS)}…`
        : flat;
}

/**
 * Human-readable network identity that never contains the credential-bearing
 * path of its RPC URL.
 * @param {object} network Web3 network row
 * @returns {string} name and optional host
 */
function networkLabel(network) {
    const rawName = String(network?.name ?? "Fallback network").replace(/\s+/g, " ").trim();
    const name = (rawName || "Fallback network").slice(0, 80);
    const host = rpcHostFromUrl(network?.rpc_url);
    return host ? `${name} (${host})` : name;
}

/**
 * Milliseconds remaining before one attempt's deadline.
 * @param {number} deadline epoch milliseconds
 * @param {() => number} now clock
 * @returns {number} positive timeout
 * @throws {Error} when no time remains
 */
function remainingTimeout(deadline, now) {
    const remaining = Math.floor(deadline - now());
    if (remaining <= 0) {
        throw new Error("RPC timeout budget was exhausted");
    }
    return remaining;
}

/**
 * Check one configured network and run the monitor's RPC reads.
 * @param {object|null} network network row
 * @param {string} expectedChainId chain the monitor must stay on
 * @param {number} deadline attempt deadline
 * @param {(network: object, timeout: () => number) => Promise<any>} operation RPC reads only
 * @param {() => number} now clock
 * @param {(url:string, timeout:number) => Promise<string>} probeChainId chain probe
 * @returns {Promise<any>} operation result
 */
async function runOnNetwork(network, expectedChainId, deadline, operation, now, probeChainId = getChainId) {
    if (!network) {
        throw new Error("The network no longer exists");
    }
    if (!network.active) {
        throw new Error(`The network "${network.name}" is disabled`);
    }

    const configuredChainId = String(network.chain_id ?? "");
    if (configuredChainId || expectedChainId) {
        const actualChainId = await probeChainId(network.rpc_url, remainingTimeout(deadline, now));
        if (configuredChainId && actualChainId !== configuredChainId) {
            throw new Error(
                `The endpoint is serving chain ${actualChainId}, but network "${network.name}" is configured as ${configuredChainId}`
            );
        }
        if (expectedChainId && actualChainId !== expectedChainId) {
            throw new Error(
                `The endpoint is serving chain ${actualChainId}, but the primary network uses chain ${expectedChainId}`
            );
        }
    }

    return operation(network, () => remainingTimeout(deadline, now));
}

/**
 * Run RPC reads on the primary network, then once on the optional fallback.
 * Business rules must run after this function returns so a valid low balance,
 * stale block, or failed contract comparison is never retried elsewhere.
 * @param {object} monitor monitor row
 * @param {(network: object, timeout: () => number) => Promise<any>} operation RPC reads only
 * @param {{findNetwork?: Function, now?: () => number, probeChainId?: Function}} options test seams
 * @returns {Promise<{value:any, network:object, usedFallback:boolean, primaryFailure:string|null}>} result
 */
async function runWeb3NetworkOperation(monitor, operation, options = {}) {
    const findNetwork = options.findNetwork ?? ((id) => R.findOne("web3_network", " id = ? ", [ id ]));
    const now = options.now ?? Date.now;
    const probeChainId = options.probeChainId ?? getChainId;
    const primaryID = monitor.web3_network_id ?? null;
    const fallbackID = monitor.web3_fallback_network_id ?? null;
    const [primary, fallback] = await Promise.all([
        primaryID ? findNetwork(primaryID) : null,
        fallbackID ? findNetwork(fallbackID) : null,
    ]);

    const configuredSeconds = Number(monitor.timeout || DEFAULT_TIMEOUT_MS / 1000);
    const totalTimeout = Number.isFinite(configuredSeconds) && configuredSeconds > 0
        ? Math.max(1000, Math.floor(configuredSeconds * 1000))
        : DEFAULT_TIMEOUT_MS;
    const started = now();
    const finalDeadline = started + totalTimeout;
    const primaryDeadline = fallbackID
        ? started + Math.max(1, Math.floor(totalTimeout * PRIMARY_BUDGET_SHARE))
        : finalDeadline;
    const expectedChainId = String(primary?.chain_id ?? fallback?.chain_id ?? "");

    try {
        const value = await runOnNetwork(primary, expectedChainId, primaryDeadline, operation, now, probeChainId);
        return { value, network: primary, usedFallback: false, primaryFailure: null };
    } catch (primaryError) {
        if (!fallbackID) {
            throw primaryError;
        }

        const primaryFailure = describeFailure(primaryError);
        try {
            const value = await runOnNetwork(fallback, expectedChainId, finalDeadline, operation, now, probeChainId);
            return { value, network: fallback, usedFallback: true, primaryFailure };
        } catch (fallbackError) {
            throw new Error(
                `Primary RPC failed: ${primaryFailure}; fallback RPC failed: ${describeFailure(fallbackError)}`
            );
        }
    }
}

/**
 * Add fallback use to a successful heartbeat without exposing an RPC URL.
 * @param {object} result result from runWeb3NetworkOperation
 * @param {string} message successful monitor result
 * @returns {string} heartbeat message
 */
function formatWeb3ResultMessage(result, message) {
    if (!result.usedFallback) {
        return message;
    }
    return `${message}; used fallback ${networkLabel(result.network)} after primary failed: ${result.primaryFailure}`;
}

/**
 * Validate monitor network references in Socket.IO and REST write paths.
 * @param {number|null} primaryID primary network id
 * @param {number|null} fallbackID fallback network id
 * @param {number|null} userID instance owner id
 * @param {{findOwnedNetwork?: Function}} options test seam
 * @returns {Promise<void>} nothing
 */
async function assertWeb3NetworkSelection(primaryID, fallbackID, userID, options = {}) {
    const findOwnedNetwork = options.findOwnedNetwork
        ?? ((id) => R.findOne("web3_network", " id = ? AND user_id = ? ", [ id, userID ]));

    for (const [field, id] of [
        ["web3NetworkId", primaryID],
        ["web3FallbackNetworkId", fallbackID],
    ]) {
        if (id !== null && id !== undefined && (!Number.isSafeInteger(Number(id)) || Number(id) <= 0)) {
            throw new Error(`${field} must be a positive integer`);
        }
    }

    if (fallbackID !== null && fallbackID !== undefined && !primaryID) {
        throw new Error("web3FallbackNetworkId requires web3NetworkId");
    }
    if (primaryID && fallbackID && Number(primaryID) === Number(fallbackID)) {
        throw new Error("The fallback Web3 network must differ from the primary network");
    }

    const [primary, fallback] = await Promise.all([
        primaryID ? findOwnedNetwork(primaryID) : null,
        fallbackID ? findOwnedNetwork(fallbackID) : null,
    ]);
    if (primaryID && !primary) {
        throw new Error("web3NetworkId must be a network you own; see GET /api/v1/web3-networks");
    }
    if (fallbackID && !fallback) {
        throw new Error("web3FallbackNetworkId must be a network you own; see GET /api/v1/web3-networks");
    }
    if (!fallback) {
        return;
    }
    if (!fallback.active) {
        throw new Error("The fallback Web3 network must be active");
    }
    if (!primary.chain_id || !fallback.chain_id || String(primary.chain_id) !== String(fallback.chain_id)) {
        throw new Error("The primary and fallback Web3 networks must use the same chain ID");
    }
}

module.exports = {
    assertWeb3NetworkSelection,
    formatWeb3ResultMessage,
    runWeb3NetworkOperation,
    internals: {
        describeFailure,
        networkLabel,
        remainingTimeout,
        runOnNetwork,
    },
};
