const { R } = require("redbean-node");
const { checkLogin } = require("../util-server");
const { sendWeb3NetworkList } = require("../client");
const {
    getChainId,
    getTokenDecimals,
    isAddress,
    ethCall,
    readWord,
    decodeWord,
    formatValue,
    validateContractRead,
} = require("../modules/web3-rpc");
const { log } = require("../../src/util");
const { getFallbackIDs, normalizeFallbackIDs, setFallbackIDs } = require("../modules/web3-fallback");
const { assertWeb3NetworkSelection, runWeb3NetworkOperation } = require("../monitor-types/web3-network");

/** How long a settings-time probe of an endpoint may take. */
const PROBE_TIMEOUT_MS = 15000;

/**
 * Load a network the caller owns.
 * @param {number} id network id
 * @param {number} userID the authenticated user
 * @returns {Promise<object>} the bean
 * @throws {Error} when it does not exist or belongs to somebody else
 */
async function ownedNetwork(id, userID) {
    const bean = await R.findOne("web3_network", " id = ? AND user_id = ? ", [ id, userID ]);
    if (!bean) {
        throw new Error("No such network");
    }
    return bean;
}

/**
 * Resolve an owner-scoped selection for form previews; numeric IDs remain valid
 * for older clients.
 * @param {number|object} selection primary ID or selection with fallbackNetworkIds
 * @param {number} userID authenticated owner
 * @param {Function} operation RPC reads
 * @returns {Promise<object>} result from the shared failover runner
 */
async function previewOperation(selection, userID, operation) {
    const primaryID = typeof selection === "object" && selection !== null ? selection.networkId : selection;
    const ids = normalizeFallbackIDs(typeof selection === "object" && selection !== null ? selection.fallbackNetworkIds ?? [] : []);
    const findOwnedNetwork = (id) => ownedNetwork(id, userID);
    await assertWeb3NetworkSelection(primaryID, ids, userID, { findOwnedNetwork });
    return runWeb3NetworkOperation({
        web3_network_id: primaryID,
        web3_fallback_network_ids: JSON.stringify(ids),
        timeout: PROBE_TIMEOUT_MS / 1000,
    }, operation, { findNetwork: findOwnedNetwork });
}

/**
 * Resolve monitors affected by deleting a network and the fallback changes the
 * deletion would make. Preview and mutation share this calculation so the
 * confirmation cannot describe different behavior from the delete itself.
 * @param {object} database RedBean instance or transaction
 * @param {object} bean owned Web3 network bean
 * @returns {Promise<object>} usage plan and affected monitor counts
 */
async function inspectNetworkUsage(database, bean) {
    let primaryMonitors = 0;
    let fallbackMonitors = 0;
    let promotedMonitors = 0;
    const affected = [];
    const monitors = await database.find("monitor", " web3_network_id IS NOT NULL OR web3_fallback_network_id IS NOT NULL OR web3_fallback_network_ids IS NOT NULL ");

    for (const monitor of monitors) {
        const ids = getFallbackIDs(monitor);
        const isPrimary = Number(monitor.web3_network_id) === Number(bean.id);
        const isFallback = ids.includes(Number(bean.id));
        if (!isPrimary && !isFallback) {
            continue;
        }

        let remaining = ids.filter((id) => id !== Number(bean.id));
        let promotedNetworkID = null;
        if (isPrimary) {
            primaryMonitors++;
            const eligible = [];
            for (const id of remaining) {
                const network = await database.findOne("web3_network", " id = ? ", [id]);
                if (network?.active && bean.chain_id && String(network.chain_id) === String(bean.chain_id)
                    && Number(network.user_id) === Number(bean.user_id)) {
                    eligible.push(id);
                }
            }
            promotedNetworkID = eligible.shift() ?? null;
            remaining = eligible;
            if (promotedNetworkID) {
                promotedMonitors++;
            }
        } else {
            fallbackMonitors++;
        }

        affected.push({
            monitor,
            nextPrimaryNetworkID: isPrimary ? promotedNetworkID : monitor.web3_network_id,
            remainingFallbackIDs: remaining,
        });
    }

    return {
        monitors: affected,
        affectedMonitors: primaryMonitors + fallbackMonitors,
        affectedPrimaryMonitors: primaryMonitors - promotedMonitors,
        affectedFallbackMonitors: fallbackMonitors,
        promotedMonitors,
    };
}

/**
 * Return only the safe, read-only summary used by the confirmation dialog.
 * @param {object} database RedBean instance
 * @param {object} bean owned Web3 network bean
 * @returns {Promise<object>} affected monitor counts
 */
async function getNetworkDeleteImpact(database, bean) {
    const impact = await inspectNetworkUsage(database, bean);
    return {
        affectedMonitors: impact.affectedMonitors,
        affectedPrimaryMonitors: impact.affectedPrimaryMonitors,
        affectedFallbackMonitors: impact.affectedFallbackMonitors,
        promotedMonitors: impact.promotedMonitors,
    };
}

/**
 * Delete a network without leaving monitors with a fallback but no primary.
 * A still-active same-chain fallback becomes the new primary. Any fallback
 * that no longer meets that boundary is cleared before the foreign key nulls
 * the deleted primary.
 * @param {object} database RedBean instance
 * @param {object} bean owned Web3 network bean
 * @returns {Promise<object>} affected monitor counts
 */
async function deleteNetworkAndReassign(database, bean) {
    const transaction = await database.begin();
    try {
        const { monitors, ...impact } = await inspectNetworkUsage(transaction, bean);
        for (const item of monitors) {
            item.monitor.web3_network_id = item.nextPrimaryNetworkID;
            setFallbackIDs(item.monitor, item.remainingFallbackIDs);
            await transaction.store(item.monitor);
        }
        await transaction.trash(bean);
        await transaction.commit();

        return {
            ...impact,
            affectedMonitorIDs: monitors.map((item) => Number(item.monitor.id)),
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

/**
 * Restart affected monitors that are currently running so their timers and
 * heartbeat closures use fresh beans loaded from the committed database state.
 * Paused monitors remain paused and load the new selection when resumed.
 * @param {object} server running server instance
 * @param {number} userID authenticated owner
 * @param {number[]} monitorIDs affected monitor ids
 * @param {Function} restartMonitor monitor lifecycle hook
 * @param {Function|undefined} pauseMonitor monitor lifecycle hook used after a failed restart
 * @returns {Promise<number[]>} IDs that could not be restarted
 */
async function restartRunningMonitors(server, userID, monitorIDs, restartMonitor, pauseMonitor) {
    const failedMonitorIDs = [];
    for (const monitorID of monitorIDs) {
        if (server.monitorList[monitorID]?.active) {
            try {
                await restartMonitor(userID, monitorID);
            } catch (error) {
                failedMonitorIDs.push(monitorID);
                log.error("web3", `Monitor ${monitorID} could not restart after a network deletion; stopping it`);
                try {
                    if (typeof pauseMonitor === "function") {
                        await pauseMonitor(userID, monitorID);
                    } else {
                        await server.monitorList[monitorID]?.stop?.();
                        delete server.monitorList[monitorID];
                    }
                } catch (stopError) {
                    log.error("web3", `Monitor ${monitorID} could not be stopped after its restart failed`);
                    try {
                        await server.monitorList[monitorID]?.stop?.();
                    } finally {
                        delete server.monitorList[monitorID];
                    }
                }
            }
        }
    }
    return failedMonitorIDs;
}

/**
 * Handlers for Web3 networks.
 * @param {Socket} socket Socket.io instance
 * @param {{restartMonitor?: Function, pauseMonitor?: Function}} lifecycle monitor lifecycle hooks
 * @returns {void}
 */
module.exports.web3SocketHandler = (socket, lifecycle = {}) => {
    socket.on("addWeb3Network", async (network, networkID, callback) => {
        try {
            checkLogin(socket);

            const bean = networkID ? await ownedNetwork(networkID, socket.userID) : R.dispense("web3_network");

            const name = String(network?.name ?? "").trim();
            const rpcUrl = String(network?.rpcUrl ?? "").trim();

            if (!name) {
                throw new Error("A name is required");
            }
            /*
             * http and https only. An endpoint is a URL an operator typed, and
             * anything else here — a file: path, say — is a request for the
             * server to read something local on their behalf.
             */
            let parsed;
            try {
                parsed = new URL(rpcUrl);
            } catch (e) {
                throw new Error("The RPC URL is not a URL");
            }
            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                throw new Error("The RPC URL must be http or https");
            }

            bean.name = name;
            bean.rpc_url = rpcUrl;
            bean.user_id = socket.userID;
            bean.active = network?.active !== false;

            /*
             * Ask the endpoint which chain it serves rather than making the
             * operator look it up. Stored so a check can notice later that the
             * endpoint has been repointed: a mismatched chain answers every call
             * successfully and reports a balance that is plausible and wrong.
             */
            try {
                bean.chain_id = await getChainId(rpcUrl, PROBE_TIMEOUT_MS);
            } catch (e) {
                // The probe is eth_chainId. Saying "could not reach" was a lie
                // for HTTP 400: the endpoint answered, and the reason is in
                // e.message.
                throw new Error(`Could not read chain ID: ${e.message}`);
            }

            await R.store(bean);
            await sendWeb3NetworkList(socket);

            callback({
                ok: true,
                msg: "Saved.",
                msgi18n: true,
                id: bean.id,
                chainId: bean.chain_id,
            });
        } catch (e) {
            callback({ ok: false, msg: e.message });
        }
    });

    socket.on("deleteWeb3Network", async (networkID, callback) => {
        let deletion;
        let server;
        try {
            checkLogin(socket);

            const bean = await ownedNetwork(networkID, socket.userID);
            if (typeof lifecycle.restartMonitor !== "function") {
                throw new Error("Web3 monitor restart lifecycle is unavailable");
            }
            const { UptimeGizmoServer } = require("../uptime-gizmo-server");
            server = UptimeGizmoServer.getInstance();
            deletion = await deleteNetworkAndReassign(R, bean);
        } catch (e) {
            callback({ ok: false, msg: e.message });
            return;
        }

        const { affectedMonitorIDs, ...affected } = deletion;
        let runtimeRestartFailures = [];
        if (affected.affectedMonitors > 0) {
            runtimeRestartFailures = await restartRunningMonitors(
                server,
                socket.userID,
                affectedMonitorIDs,
                lifecycle.restartMonitor,
                lifecycle.pauseMonitor
            );
            try {
                await server.sendMonitorList(socket);
            } catch (error) {
                log.error("web3", "Could not refresh the monitor list after deleting a Web3 network");
            }
        }
        try {
            await sendWeb3NetworkList(socket);
        } catch (error) {
            log.error("web3", "Could not refresh the Web3 network list after deletion");
        }

        callback({
            ok: true,
            msg: "successDeleted",
            msgi18n: true,
            ...affected,
            runtimeRestartFailures: runtimeRestartFailures.length,
        });
    });

    socket.on("getWeb3NetworkDeleteImpact", async (networkID, callback) => {
        try {
            checkLogin(socket);
            const bean = await ownedNetwork(networkID, socket.userID);
            callback({ ok: true, ...await getNetworkDeleteImpact(R, bean) });
        } catch (e) {
            callback({ ok: false, msg: e.message });
        }
    });

    /** The stored URL, sent only to the owner filling in the edit form. */
    socket.on("getWeb3Network", async (networkID, callback) => {
        try {
            checkLogin(socket);

            const bean = await ownedNetwork(networkID, socket.userID);

            callback({
                ok: true,
                network: {
                    id: bean.id,
                    name: bean.name,
                    chainId: bean.chain_id,
                    rpcUrl: bean.rpc_url,
                    active: Boolean(bean.active),
                },
            });
        } catch (e) {
            callback({ ok: false, msg: e.message });
        }
    });

    /**
     * Read a token's decimals so the operator does not have to.
     *
     * The answer is stored on the monitor rather than read on every check: it
     * does not change, and a check that depends on two calls fails twice as
     * often. It stays editable because the interface is a convention — contracts
     * exist that omit the method or report a value at odds with how the token is
     * presented everywhere else.
     */
    socket.on("web3TokenDecimals", async (networkID, contract, callback) => {
        try {
            checkLogin(socket);

            if (!isAddress(contract)) {
                throw new Error("Not a contract address");
            }

            const result = await previewOperation(networkID, socket.userID,
                (network, timeout) => getTokenDecimals(network.rpc_url, contract, timeout()));
            callback({ ok: true, decimals: result.value, usedFallback: result.usedFallback, networkId: result.network.id });
        } catch (e) {
            log.debug("web3", `decimals lookup failed: ${e.message}`);
            callback({ ok: false, msg: e.message });
        }
    });

    /**
     * Make a contract read once, now, and hand back what it decoded.
     *
     * The two mistakes a contract monitor invites — calldata that reads the
     * wrong function, and a word index pointing at the wrong part of the result
     * — both produce a monitor that runs happily and reports a number that means
     * something else. Neither is visible without doing the read, so the form can
     * ask for it before the monitor is saved.
     *
     * Nothing is stored. It is the same call the check makes, on a network the
     * caller already owns, so it grants no reach they did not have.
     */
    socket.on("web3ContractRead", async (networkID, read, callback) => {
        try {
            checkLogin(socket);

            // The same rules the monitor is saved under, minus the threshold:
            // this reads a value rather than judging one.
            validateContractRead({ ...read, operator: "", threshold: "" });

            const result = await previewOperation(networkID, socket.userID, async (network, timeout) => {
                const raw = await ethCall(
                    network.rpc_url,
                    String(read.to).trim(),
                    String(read.data).trim(),
                    read.blockTag,
                    timeout()
                );

                const type = read.type || "uint256";
                const value = decodeWord(readWord(raw, Number(read.offset ?? 0)), type);
                return { raw, value: formatValue(value, type, Number(read.decimals ?? 0)) };
            });

            callback({
                ok: true,
                ...result.value,
                usedFallback: result.usedFallback,
                networkId: result.network.id,
            });
        } catch (e) {
            log.debug("web3", `contract read failed: ${e.message}`);
            callback({ ok: false, msg: e.message });
        }
    });
};

module.exports.internals = {
    deleteNetworkAndReassign,
    getNetworkDeleteImpact,
    inspectNetworkUsage,
    restartRunningMonitors,
};
