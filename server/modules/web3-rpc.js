const axios = require("axios");

/*
 * The little of Ethereum JSON-RPC this project needs.
 *
 * Two reads and two ABI-encoded calls is not enough to justify a chain library.
 * A call is a four-byte selector followed by its argument padded to 32 bytes,
 * which is string manipulation, and the transport is the HTTP client already in
 * the tree.
 *
 * An RPC endpoint is a URL an operator supplied, so it is treated as one: the
 * response size is bounded, the shape is checked before it is trusted, and a
 * JSON-RPC error is surfaced as a message rather than discarded.
 *
 * See docs/plans/web3-balance-monitoring.md.
 */

/** Selector for `balanceOf(address)`. */
const BALANCE_OF = "0x70a08231";
/** Selector for `decimals()`. */
const DECIMALS = "0x313ce567";

/** A response larger than this is not an answer to any call made here. */
const MAX_RESPONSE_BYTES = 256 * 1024;

/**
 * Whether a string is a 20-byte hex address.
 * @param {string} value candidate address
 * @returns {boolean} true when it is well formed
 */
function isAddress(value) {
    return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
}

/**
 * Left-pad an address to the 32 bytes an ABI argument occupies.
 * @param {string} address 0x-prefixed 20-byte address
 * @returns {string} 64 hex characters, no prefix
 * @throws {Error} when the address is malformed
 */
function encodeAddress(address) {
    if (!isAddress(address)) {
        throw new Error(`Not an address: ${address}`);
    }
    return address.slice(2).toLowerCase().padStart(64, "0");
}

/**
 * Make one JSON-RPC call.
 * @param {string} rpcUrl endpoint to call
 * @param {string} method JSON-RPC method
 * @param {Array} params method parameters
 * @param {number} timeoutMs how long to wait
 * @returns {Promise<any>} the result, whose shape depends on the method
 * @throws {Error} on transport failure, a JSON-RPC error, or an unusable body
 */
async function rpcCall(rpcUrl, method, params, timeoutMs) {
    let response;
    try {
        response = await axios.post(
            rpcUrl,
            { jsonrpc: "2.0", id: 1, method, params },
            {
                timeout: timeoutMs,
                maxContentLength: MAX_RESPONSE_BYTES,
                maxBodyLength: MAX_RESPONSE_BYTES,
                headers: { "Content-Type": "application/json" },
                // The endpoint decides its own status codes; a JSON-RPC error
                // can arrive with a 200 and a transport error with a body worth
                // reading, so both are handled below rather than by axios.
                validateStatus: () => true,
            }
        );
    } catch (e) {
        throw new Error(`RPC request failed: ${e.message}`);
    }

    if (response.status >= 400) {
        throw new Error(`RPC returned HTTP ${response.status}`);
    }

    const body = response.data;
    if (!body || typeof body !== "object") {
        throw new Error("RPC returned a body that is not JSON-RPC");
    }

    if (body.error) {
        const message = typeof body.error.message === "string" ? body.error.message : JSON.stringify(body.error);
        throw new Error(`RPC error: ${message}`);
    }

    /*
     * Presence rather than type: most calls here answer with a hex quantity but
     * a block is an object, and callers validate the shape they asked for. `in`
     * rather than a truthiness check because false and null are real answers
     * from some methods.
     */
    if (!("result" in body)) {
        throw new Error(`RPC returned no result for ${method}`);
    }

    return body.result;
}

/**
 * Parse a hex quantity into a BigInt.
 *
 * Never through Number: a balance in wei passes 2^53 at around 0.01 Ether, and
 * beyond that a double silently rounds, which is the one thing a balance
 * comparison cannot tolerate.
 * @param {string} hex 0x-prefixed hex quantity
 * @param {string} what what was being read, for the error message
 * @returns {bigint} the value
 * @throws {Error} when the string is not a hex quantity
 */
function toBigInt(hex, what) {
    if (typeof hex !== "string" || !/^0x[0-9a-fA-F]*$/.test(hex)) {
        throw new Error(`${what} was not a hex quantity: ${hex}`);
    }
    return BigInt(hex === "0x" ? "0x0" : hex);
}

/**
 * The chain's own token balance of an address.
 * @param {string} rpcUrl endpoint to call
 * @param {string} address address to read
 * @param {number} timeoutMs how long to wait
 * @returns {Promise<bigint>} balance in the chain's smallest unit
 */
async function getNativeBalance(rpcUrl, address, timeoutMs) {
    if (!isAddress(address)) {
        throw new Error(`Not an address: ${address}`);
    }
    return toBigInt(await rpcCall(rpcUrl, "eth_getBalance", [ address, "latest" ], timeoutMs), "Balance");
}

/**
 * An ERC-20 balance of an address.
 * @param {string} rpcUrl endpoint to call
 * @param {string} contract token contract
 * @param {string} address address to read
 * @param {number} timeoutMs how long to wait
 * @returns {Promise<bigint>} balance in the token's smallest unit
 */
async function getTokenBalance(rpcUrl, contract, address, timeoutMs) {
    if (!isAddress(contract)) {
        throw new Error(`Not a contract address: ${contract}`);
    }
    const data = BALANCE_OF + encodeAddress(address);
    const result = await rpcCall(rpcUrl, "eth_call", [ { to: contract, data }, "latest" ], timeoutMs);

    /*
     * A call to an address holding no code returns "0x" rather than failing, so
     * a mistyped contract would otherwise read as a balance of zero and alert
     * as if the account had been drained.
     */
    if (result === "0x") {
        throw new Error(`No token contract at ${contract} on this network`);
    }

    return toBigInt(result, "Token balance");
}

/**
 * A token's declared decimals.
 * @param {string} rpcUrl endpoint to call
 * @param {string} contract token contract
 * @param {number} timeoutMs how long to wait
 * @returns {Promise<number>} decimals the contract reports
 * @throws {Error} when the contract does not answer, or answers implausibly
 */
async function getTokenDecimals(rpcUrl, contract, timeoutMs) {
    if (!isAddress(contract)) {
        throw new Error(`Not a contract address: ${contract}`);
    }
    const result = await rpcCall(rpcUrl, "eth_call", [ { to: contract, data: DECIMALS }, "latest" ], timeoutMs);

    if (result === "0x") {
        throw new Error(`The contract at ${contract} does not report decimals; enter it manually`);
    }

    const value = toBigInt(result, "Decimals");
    // ERC-20 declares decimals as uint8. Anything outside that is a contract
    // doing something else, and guessing on the operator's behalf would set a
    // threshold wrong by orders of magnitude.
    if (value > 36n) {
        throw new Error(`The contract reported ${value} decimals, which is not usable; enter it manually`);
    }
    return Number(value);
}

/**
 * The chain id the endpoint is actually serving.
 * @param {string} rpcUrl endpoint to call
 * @param {number} timeoutMs how long to wait
 * @returns {Promise<string>} chain id in decimal
 */
async function getChainId(rpcUrl, timeoutMs) {
    return toBigInt(await rpcCall(rpcUrl, "eth_chainId", [], timeoutMs), "Chain id").toString();
}

/**
 * The newest block the endpoint knows about.
 * @param {string} rpcUrl endpoint to call
 * @param {number} timeoutMs how long to wait
 * @returns {Promise<{number: bigint, timestamp: bigint}>} height and when it was produced
 * @throws {Error} when the endpoint answers with something that is not a block
 */
async function getLatestBlock(rpcUrl, timeoutMs) {
    // false: headers only. The transaction list of a full block is megabytes
    // that nothing here reads.
    const block = await rpcCall(rpcUrl, "eth_getBlockByNumber", [ "latest", false ], timeoutMs);

    if (!block || typeof block !== "object") {
        throw new Error("The endpoint returned no latest block");
    }

    return {
        number: toBigInt(block.number, "Block number"),
        timestamp: toBigInt(block.timestamp, "Block timestamp"),
    };
}

/**
 * How old a block is, in seconds.
 *
 * Clamped at zero. A block timestamp is set by whoever produced the block, not
 * by the machine reading it, so it can sit slightly ahead of local time — and a
 * server whose own clock is behind would otherwise report a negative age and,
 * depending on how it was compared, a permanently stale chain.
 * @param {bigint} blockTimestamp seconds since the epoch, from the block
 * @param {number} nowSeconds seconds since the epoch, locally
 * @returns {number} age in seconds, never negative
 */
function blockAgeSeconds(blockTimestamp, nowSeconds) {
    const age = Math.floor(nowSeconds) - Number(blockTimestamp);
    return age < 0 ? 0 : age;
}

/**
 * Scale a decimal string into the integer the chain works in.
 *
 * "0.05" with 18 decimals becomes 50000000000000000n. Done by moving the point
 * rather than by multiplying, because the multiplication would happen in
 * floating point and lose the low digits of exactly the number being protected.
 * @param {string} amount decimal string as the operator typed it
 * @param {number} decimals places the token uses
 * @returns {bigint} the amount in the token's smallest unit
 * @throws {Error} when the string is not a plain decimal, or is too precise
 */
function scaleToInteger(amount, decimals) {
    const text = String(amount ?? "").trim();
    if (!/^\d+(\.\d+)?$/.test(text)) {
        throw new Error(`Not a plain decimal amount: ${amount}`);
    }

    const [ whole, fraction = "" ] = text.split(".");
    if (fraction.length > decimals) {
        throw new Error(`${amount} is more precise than the token's ${decimals} decimals`);
    }

    return BigInt(whole + fraction.padEnd(decimals, "0"));
}

/**
 * Render an integer balance as a decimal string.
 *
 * By inserting a point, never by dividing: the division would be in floating
 * point and would misreport the balance it was called to display.
 * @param {bigint} value amount in the smallest unit
 * @param {number} decimals places the token uses
 * @returns {string} human-readable amount
 */
function formatUnits(value, decimals) {
    const negative = value < 0n;
    const digits = (negative ? -value : value).toString().padStart(decimals + 1, "0");
    const whole = digits.slice(0, digits.length - decimals);
    const fraction = digits.slice(digits.length - decimals).replace(/0+$/, "");
    return `${negative ? "-" : ""}${whole}${fraction ? "." + fraction : ""}`;
}

module.exports = {
    getLatestBlock,
    blockAgeSeconds,
    getNativeBalance,
    getTokenBalance,
    getTokenDecimals,
    getChainId,
    scaleToInteger,
    formatUnits,
    isAddress,
};
