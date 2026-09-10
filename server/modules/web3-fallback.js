const MAX_FALLBACK_NETWORKS = 10;

/**
 * Validate an ordered list of network IDs without coercing malformed input.
 * @param {unknown} value API array
 * @returns {number[]} validated IDs
 * @throws {Error} when the list is malformed, too long, or contains duplicates
 */
function normalizeFallbackIDs(value) {
    if (!Array.isArray(value) || value.length > MAX_FALLBACK_NETWORKS) {
        throw new Error(`web3FallbackNetworkIds must be an array of at most ${MAX_FALLBACK_NETWORKS} network IDs`);
    }
    if (value.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
        throw new Error("web3FallbackNetworkIds must contain positive integers");
    }
    if (new Set(value).size !== value.length) {
        throw new Error("web3FallbackNetworkIds must not contain duplicates");
    }
    return value;
}

/**
 * Read new rows and legacy single-fallback rows. An explicit [] clears fallback.
 * @param {object} monitor database row
 * @returns {number[]} ordered IDs
 */
function getFallbackIDs(monitor) {
    if (monitor.web3_fallback_network_ids != null) {
        const value = monitor.web3_fallback_network_ids;
        return normalizeFallbackIDs(typeof value === "string" ? JSON.parse(value) : value);
    }
    return monitor.web3_fallback_network_id == null ? [] : [Number(monitor.web3_fallback_network_id)];
}

/**
 * Keep the legacy projection in sync with the first fallback.
 * @param {object} monitor database row
 * @param {number[]} ids ordered fallback IDs
 * @returns {void}
 */
function setFallbackIDs(monitor, ids) {
    monitor.web3_fallback_network_ids = JSON.stringify(normalizeFallbackIDs(ids));
    monitor.web3_fallback_network_id = ids[0] ?? null;
}

module.exports = { getFallbackIDs, normalizeFallbackIDs, setFallbackIDs };
