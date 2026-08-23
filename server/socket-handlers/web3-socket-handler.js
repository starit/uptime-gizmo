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
 * Handlers for Web3 networks.
 * @param {Socket} socket Socket.io instance
 * @returns {void}
 */
module.exports.web3SocketHandler = (socket) => {
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
                throw new Error(`Could not reach the endpoint: ${e.message}`);
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
        try {
            checkLogin(socket);

            const bean = await ownedNetwork(networkID, socket.userID);

            /*
             * Monitors reference the network, and the foreign key nulls the
             * column rather than removing them. Saying how many will stop
             * working is more use than a silent success.
             */
            const inUse = await R.count("monitor", " web3_network_id = ? ", [ bean.id ]);

            await R.trash(bean);
            await sendWeb3NetworkList(socket);

            callback({
                ok: true,
                msg: "successDeleted",
                msgi18n: true,
                affectedMonitors: inUse,
            });
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

            const bean = await ownedNetwork(networkID, socket.userID);

            if (!isAddress(contract)) {
                throw new Error("Not a contract address");
            }

            const decimals = await getTokenDecimals(bean.rpc_url, contract, PROBE_TIMEOUT_MS);
            callback({ ok: true, decimals });
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

            const bean = await ownedNetwork(networkID, socket.userID);

            // The same rules the monitor is saved under, minus the threshold:
            // this reads a value rather than judging one.
            validateContractRead({ ...read, operator: "", threshold: "" });

            const raw = await ethCall(
                bean.rpc_url,
                String(read.to).trim(),
                String(read.data).trim(),
                read.blockTag,
                PROBE_TIMEOUT_MS
            );

            const type = read.type || "uint256";
            const value = decodeWord(readWord(raw, Number(read.offset ?? 0)), type);

            callback({
                ok: true,
                raw,
                value: formatValue(value, type, Number(read.decimals ?? 0)),
            });
        } catch (e) {
            log.debug("web3", `contract read failed: ${e.message}`);
            callback({ ok: false, msg: e.message });
        }
    });
};
