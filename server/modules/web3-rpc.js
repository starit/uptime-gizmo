const axios = require("axios");

/*
 * The little of Ethereum JSON-RPC this project needs.
 *
 * A handful of reads and some ABI decoding is not enough to justify a chain
 * library. A call is a four-byte selector followed by arguments padded to 32
 * bytes, a result is a sequence of 32-byte words, both of which are string
 * manipulation, and the transport is the HTTP client already in the tree.
 *
 * Nothing here composes calldata from an ABI. The two built-in selectors below
 * are fixed, and a contract-value monitor supplies its own hex: encoding is a
 * large surface whose failure mode is a call that succeeds and returns the wrong
 * number.
 *
 * An RPC endpoint is a URL an operator supplied, so it is treated as one: the
 * response size is bounded, the shape is checked before it is trusted, and a
 * JSON-RPC error is surfaced as a message rather than discarded.
 *
 * See docs/plans/web3-balance-monitoring.md and
 * docs/plans/web3-contract-monitoring.md.
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


/**
 * Scale a decimal string that may be negative.
 *
 * `scaleToInteger` refuses a leading `-` on purpose: a negative balance floor is
 * meaningless, and accepting one would hide a typo in the number the monitor
 * exists to protect. A contract value is different — a funding rate, an oracle
 * answer or a protocol's net position is routinely below zero — so the sign is
 * split off here and the same digit-shifting conversion does the rest.
 * @param {string} amount decimal string, optionally signed
 * @param {number} decimals places to scale by
 * @returns {bigint} the amount as an integer
 * @throws {Error} when the string is not a plain decimal, or is too precise
 */
function scaleSignedToInteger(amount, decimals) {
    const text = String(amount ?? "").trim();
    const negative = text.startsWith("-");
    const magnitude = scaleToInteger(negative ? text.slice(1) : text, decimals);
    return negative ? -magnitude : magnitude;
}

/** Which block a contract value is read at. */
const BLOCK_TAGS = [ "latest", "safe", "finalized" ];

/** How the 32-byte word a call returns is interpreted. */
const VALUE_TYPES = [ "uint256", "int256", "bool", "address", "bytes32" ];

/**
 * The comparisons a contract value monitor can make.
 *
 * The ids match ../monitor-conditions/operators.js where they overlap, so
 * putting this type on the conditions engine later does not rename stored values.
 */
const VALUE_OPERATORS = [ "gte", "lte", "gt", "lt", "eq", "ne" ];

/** Written into the heartbeat message, so ASCII rather than ≥ and ≤. */
const OPERATOR_SYMBOLS = {
    gte: ">=",
    lte: "<=",
    gt: ">",
    lt: "<",
    eq: "==",
    ne: "!=",
};

/**
 * Types that have no order, so only equality applies.
 *
 * Offered a `gte`, an address comparison would look configured and test nothing.
 */
const UNORDERED_TYPES = [ "address", "bytes32", "bool" ];

/** Calldata longer than this is not a read of a single value. */
const MAX_CALL_DATA_BYTES = 8 * 1024;

/** Two's-complement boundary for int256. */
const INT256_MAX = (1n << 255n) - 1n;
const TWO_256 = 1n << 256n;

/**
 * Whether a string is 0x followed by whole bytes.
 * @param {string} value candidate hex string
 * @returns {boolean} true when it is 0x-prefixed and an even number of digits
 */
function isHexBytes(value) {
    return typeof value === "string" && /^0x([0-9a-fA-F]{2})*$/.test(value);
}

/**
 * Read a contract by sending calldata as given.
 *
 * The calldata is not composed here from an ABI. Encoding is a large surface
 * whose failure mode is a call that succeeds and returns the wrong number, and
 * the callers of this — an agent through the REST API, or an operator reading a
 * contract at this level — already have the hex.
 * @param {string} rpcUrl endpoint to call
 * @param {string} to contract to call
 * @param {string} data 0x-prefixed calldata
 * @param {string} blockTag which block to read at
 * @param {number} timeoutMs how long to wait
 * @returns {Promise<string>} the 0x-prefixed return data
 * @throws {Error} when the arguments are malformed, or the call returns nothing
 */
async function ethCall(rpcUrl, to, data, blockTag, timeoutMs) {
    if (!isAddress(to)) {
        throw new Error(`Not a contract address: ${to}`);
    }
    if (!isHexBytes(data)) {
        throw new Error("The calldata is not 0x-prefixed whole bytes");
    }
    const tag = blockTag || "latest";
    if (!BLOCK_TAGS.includes(tag)) {
        throw new Error(`Not a block tag this reads at: ${tag}`);
    }

    const result = await rpcCall(rpcUrl, "eth_call", [ { to, data }, tag ], timeoutMs);

    /*
     * An address holding no code answers "0x" rather than failing, and so does a
     * function that returns nothing. Either way there is no value to compare, and
     * treating the absence as zero is how a mistyped address ends up alerting as
     * if a pool had been drained.
     */
    if (result === "0x") {
        throw new Error(`The call to ${to} returned no data; check the address and the calldata`);
    }
    if (!isHexBytes(result)) {
        throw new Error(`The call returned something that is not hex: ${result}`);
    }

    return result;
}

/**
 * Take one 32-byte word out of ABI-encoded return data.
 *
 * A word past the end of the result is an error rather than zero. It is the most
 * dangerous mistake available here: read as zero, a monitor pointed at word 3 of
 * a two-word result would report a reserve of zero and alert as if the pool had
 * been emptied — or, with a `lte` threshold, succeed forever.
 * @param {string} result 0x-prefixed return data
 * @param {number} index which 32-byte word to read
 * @returns {string} 64 lowercase hex characters, no prefix
 * @throws {Error} when the result is malformed or has no such word
 */
function readWord(result, index) {
    if (!isHexBytes(result)) {
        throw new Error("The call result is not 0x-prefixed whole bytes");
    }
    if (!Number.isInteger(index) || index < 0) {
        throw new Error(`Not a word index: ${index}`);
    }

    const body = result.slice(2).toLowerCase();
    const start = index * 64;

    if (body.length < start + 64) {
        throw new Error(
            `The call returned ${body.length / 2} bytes, which has no 32-byte word at index ${index}`
        );
    }

    return body.slice(start, start + 64);
}

/**
 * Interpret a 32-byte word as the type it is supposed to hold.
 *
 * Numeric types come back as BigInt and the rest as a lowercase 0x string, which
 * is what keeps the comparison exact for the first group and an equality test for
 * the second.
 * @param {string} word 64 hex characters, no prefix
 * @param {string} type one of VALUE_TYPES
 * @returns {bigint|string} the decoded value
 * @throws {Error} when the word cannot hold that type
 */
function decodeWord(word, type) {
    if (typeof word !== "string" || !/^[0-9a-fA-F]{64}$/.test(word)) {
        throw new Error("Not a 32-byte word");
    }

    const hex = word.toLowerCase();
    const raw = BigInt("0x" + hex);

    switch (type) {
        case "uint256":
            return raw;

        case "int256":
            /*
             * Two's complement. Read unsigned, -1 becomes 2^256-1, which turns
             * "just below zero" into the largest number there is and passes any
             * gte threshold that exists.
             */
            return raw > INT256_MAX ? raw - TWO_256 : raw;

        case "bool":
            if (raw > 1n) {
                throw new Error(`Expected a bool but the word is 0x${hex}`);
            }
            return raw;

        case "address":
            /*
             * ABI left-pads an address, so anything in the top twelve bytes means
             * this word is not one — which nearly always means the word index is
             * pointing somewhere else in the result.
             */
            if (!/^0{24}/.test(hex)) {
                throw new Error(`Not an address-shaped word: 0x${hex}`);
            }
            return "0x" + hex.slice(24);

        case "bytes32":
            return "0x" + hex;

        default:
            throw new Error(`Not a value type this decodes: ${type}`);
    }
}

/**
 * Turn a stored threshold into something comparable with a decoded value.
 * @param {string} threshold as the operator or agent wrote it
 * @param {string} type one of VALUE_TYPES
 * @param {number} decimals places to scale a numeric threshold by
 * @returns {bigint|string} the threshold, matching what decodeWord returns
 * @throws {Error} when it cannot be used with that type
 */
function parseThreshold(threshold, type, decimals) {
    const text = String(threshold ?? "").trim();

    if (type === "bool") {
        const lowered = text.toLowerCase();
        if (lowered === "true" || lowered === "1") {
            return 1n;
        }
        if (lowered === "false" || lowered === "0") {
            return 0n;
        }
        throw new Error(`A bool threshold must be true or false, not ${text}`);
    }

    if (type === "address") {
        if (!isAddress(text)) {
            throw new Error(`Not an address: ${text}`);
        }
        return text.toLowerCase();
    }

    if (type === "bytes32") {
        if (!/^0x[0-9a-fA-F]{64}$/.test(text)) {
            throw new Error(`Not a 32-byte value: ${text}`);
        }
        return text.toLowerCase();
    }

    const scaled = scaleSignedToInteger(text, decimals);
    if (type === "uint256" && scaled < 0n) {
        throw new Error("A uint256 threshold cannot be negative");
    }
    return scaled;
}

/**
 * Render a decoded value the way the heartbeat message shows it.
 * @param {bigint|string} value from decodeWord
 * @param {string} type one of VALUE_TYPES
 * @param {number} decimals places the value is scaled by
 * @returns {string} human-readable value
 */
function formatValue(value, type, decimals) {
    if (type === "bool") {
        return value === 1n ? "true" : "false";
    }
    if (type === "address" || type === "bytes32") {
        return String(value);
    }
    return formatUnits(value, decimals || 0);
}

/**
 * Test a decoded value against a threshold.
 *
 * BigInt throughout for the numeric types, which is the point of the whole path:
 * a uint256 at 18 decimals is past where a double can tell consecutive integers
 * apart, and a comparison that rounds fails in the direction of reporting that
 * nothing is wrong.
 * @param {bigint|string} value from decodeWord
 * @param {string} operator one of VALUE_OPERATORS
 * @param {bigint|string} threshold from parseThreshold
 * @returns {boolean} true when the comparison holds
 * @throws {Error} when the operator is unknown or does not apply
 */
function compareValue(value, operator, threshold) {
    if (typeof value !== typeof threshold) {
        throw new Error("The value and the threshold are not the same kind of thing");
    }

    switch (operator) {
        case "eq":
            return value === threshold;
        case "ne":
            return value !== threshold;
        default:
            break;
    }

    if (typeof value !== "bigint") {
        throw new Error(`${operator} does not apply to a value that has no order`);
    }

    switch (operator) {
        case "gte":
            return value >= threshold;
        case "lte":
            return value <= threshold;
        case "gt":
            return value > threshold;
        case "lt":
            return value < threshold;
        default:
            throw new Error(`Not a comparison this makes: ${operator}`);
    }
}

/**
 * Check a contract read is configured usably, before it is stored.
 *
 * Called from Monitor.validate(), so both the socket path and the REST API
 * refuse the same things and neither can drift from the other. Everything here
 * is a mistake that would otherwise surface as a monitor that runs and tests
 * nothing.
 * @param {object} config the monitor's contract-read fields
 * @param {string} config.to contract to call
 * @param {string} config.data 0x-prefixed calldata
 * @param {number} config.offset which word to read
 * @param {string} config.type one of VALUE_TYPES
 * @param {number} config.decimals places to scale by
 * @param {string} config.operator one of VALUE_OPERATORS, or empty
 * @param {string} config.threshold the threshold, or empty
 * @param {string} config.blockTag which block to read at
 * @returns {void}
 * @throws {Error} describing the first thing that is unusable
 */
function validateContractRead(config) {
    const to = String(config.to ?? "").trim();
    if (!isAddress(to)) {
        throw new Error("A contract address is required");
    }

    const data = String(config.data ?? "").trim();
    if (!isHexBytes(data)) {
        throw new Error("The calldata must be 0x-prefixed whole bytes");
    }
    // A four-byte selector is the shortest call that reads anything; shorter
    // than that hits the contract's fallback, which returns no value.
    if (data.length < 10) {
        throw new Error("The calldata must be at least a four-byte function selector");
    }
    if ((data.length - 2) / 2 > MAX_CALL_DATA_BYTES) {
        throw new Error(`The calldata is longer than ${MAX_CALL_DATA_BYTES} bytes`);
    }

    const offset = config.offset ?? 0;
    if (!Number.isInteger(Number(offset)) || Number(offset) < 0) {
        throw new Error("The word index must be a whole number, zero or more");
    }

    /*
     * The type, decimals and block tag fall back to their column defaults rather
     * than being required. A caller that omits them means "a plain integer at
     * the latest block", and validate() runs before the insert that would have
     * applied those defaults.
     */
    const type = String(config.type ?? "uint256").trim() || "uint256";
    if (!VALUE_TYPES.includes(type)) {
        throw new Error(`The value type must be one of ${VALUE_TYPES.join(", ")}`);
    }

    const decimals = Number(config.decimals ?? 0);
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
        throw new Error("Decimals must be a whole number between 0 and 36");
    }

    const tag = String(config.blockTag ?? "latest").trim() || "latest";
    if (!BLOCK_TAGS.includes(tag)) {
        throw new Error(`The block tag must be one of ${BLOCK_TAGS.join(", ")}`);
    }

    const operator = String(config.operator ?? "").trim();
    const threshold = String(config.threshold ?? "").trim();

    // Neither is the documented way to say "record the value without alerting
    // on it", the same as an unset balance floor.
    if (!operator && !threshold) {
        return;
    }
    if (!operator || !threshold) {
        throw new Error("A comparison needs both an operator and a threshold");
    }
    if (!VALUE_OPERATORS.includes(operator)) {
        throw new Error(`The operator must be one of ${VALUE_OPERATORS.join(", ")}`);
    }
    if (UNORDERED_TYPES.includes(type) && operator !== "eq" && operator !== "ne") {
        throw new Error(`${type} has no order, so only eq and ne apply`);
    }

    // Throws if the threshold cannot be used with this type, which is the point:
    // it is the same conversion the check will make.
    parseThreshold(threshold, type, decimals);
}

module.exports = {
    getLatestBlock,
    blockAgeSeconds,
    getNativeBalance,
    getTokenBalance,
    getTokenDecimals,
    getChainId,
    scaleToInteger,
    scaleSignedToInteger,
    formatUnits,
    isAddress,
    isHexBytes,
    ethCall,
    readWord,
    decodeWord,
    parseThreshold,
    formatValue,
    compareValue,
    validateContractRead,
    BLOCK_TAGS,
    VALUE_TYPES,
    VALUE_OPERATORS,
    OPERATOR_SYMBOLS,
    UNORDERED_TYPES,
    MAX_CALL_DATA_BYTES,
};
