const { RateLimiter } = require("limiter");
const { log } = require("../src/util");

/*
 * How many requests one API key may make per minute, and which keys are exempt.
 *
 * Both are read once at startup. A quota is an operational property of a
 * deployment rather than of the key itself: the same key against a larger
 * instance should get a larger allowance without rewriting a row.
 */
const DEFAULT_API_THROUGHPUT_PER_MINUTE = 60;

const apiThroughputTokensPerMinute = (() => {
    const configured = parseInt(process.env.UPTIME_GIZMO_API_RATE_LIMIT_PER_MINUTE, 10);
    if (Number.isInteger(configured) && configured > 0) {
        return configured;
    }
    return DEFAULT_API_THROUGHPUT_PER_MINUTE;
})();

const unlimitedApiKeyIds = new Set(
    (process.env.UPTIME_GIZMO_API_RATE_LIMIT_UNLIMITED_KEY_IDS || "")
        .split(",")
        .map((entry) => parseInt(entry.trim(), 10))
        .filter((entry) => Number.isInteger(entry) && entry > 0)
);

class KumaRateLimiter {
    /**
     * @param {object} config Rate limiter configuration object
     */
    constructor(config) {
        this.errorMessage = config.errorMessage;
        this.tokensPerInterval = config.tokensPerInterval;
        this.rateLimiter = new RateLimiter(config);
    }

    /**
     * Callback for pass
     * @callback passCB
     * @param {object} err Too many requests
     */

    /**
     * Should the request be passed through
     * @param {passCB} callback Callback function to call with decision
     * @param {number} num Number of tokens to remove
     * @returns {Promise<boolean>} Should the request be allowed?
     */
    async pass(callback, num = 1) {
        const remainingRequests = await this.removeTokens(num);
        if (remainingRequests < this.tokensPerInterval * 0.2) {
            log.warn(
                "rate-limit",
                `${remainingRequests}/${this.tokensPerInterval} remaining requests until rate limiting`
            );
        } else {
            log.debug(
                "rate-limit",
                `${remainingRequests}/${this.tokensPerInterval} remaining requests until rate limiting`
            );
        }
        if (remainingRequests < 0) {
            if (callback) {
                callback({
                    ok: false,
                    msg: this.errorMessage,
                });
            }
            return false;
        }
        return true;
    }

    /**
     * Remove a given number of tokens
     * @param {number} num Number of tokens to remove
     * @returns {Promise<number>} Number of remaining tokens
     */
    async removeTokens(num = 1) {
        return await this.rateLimiter.removeTokens(num);
    }
}

/*
 * A rate limiter that keeps one bucket per caller instead of one for everyone.
 *
 * A single shared bucket makes every caller answer for every other caller: one
 * client polling hard, or one attacker guessing keys, spends the allowance the
 * rest depend on. Which caller a bucket belongs to is the caller's decision —
 * a source address for guessing attempts, an API key for throughput.
 *
 * Buckets are held in memory and are therefore per process. That is the same
 * scope the limiters here have always had, and it is worth knowing when running
 * more than one process: each keeps its own allowance.
 */
class KeyedKumaRateLimiter {
    /**
     * @param {object} config Rate limiter configuration object
     * @param {number} config.tokensPerInterval Tokens each bucket gets per interval
     * @param {string} config.interval Interval the tokens are granted over
     * @param {string} config.errorMessage Message returned when a bucket is empty
     * @param {number} config.maxBuckets Most buckets to hold before evicting idle ones
     */
    constructor(config) {
        this.config = config;
        this.errorMessage = config.errorMessage;
        this.tokensPerInterval = config.tokensPerInterval;
        /*
         * Bounded on purpose. Buckets are created per caller, and for the
         * failure limiter the caller is whoever is connecting — an attacker
         * rotating source addresses would otherwise grow this map without
         * limit, turning a rate limiter into a memory exhaustion vector.
         */
        this.maxBuckets = config.maxBuckets ?? 10000;
        this.buckets = new Map();
    }

    /**
     * Find the bucket for a caller, creating it if this is the first time.
     * @param {string} bucketKey Which caller the bucket belongs to
     * @returns {RateLimiter} That caller's limiter
     */
    bucketFor(bucketKey) {
        const existing = this.buckets.get(bucketKey);
        if (existing) {
            // Reinsert so iteration order stays least-recently-used first.
            this.buckets.delete(bucketKey);
            existing.lastUsed = Date.now();
            this.buckets.set(bucketKey, existing);
            return existing.limiter;
        }

        if (this.buckets.size >= this.maxBuckets) {
            this.evictOldest();
        }

        const bucket = {
            limiter: new RateLimiter(this.config),
            lastUsed: Date.now(),
        };
        this.buckets.set(bucketKey, bucket);
        return bucket.limiter;
    }

    /**
     * Drop the least recently used tenth of the buckets.
     *
     * Evicting one at a time would evict on nearly every request once the map
     * is full. A bucket that is evicted while still holding spent tokens comes
     * back full, so eviction is a small amnesty rather than a correctness
     * problem — but it should not be the common path either.
     * @returns {void}
     */
    evictOldest() {
        const target = Math.max(1, Math.floor(this.maxBuckets / 10));
        let removed = 0;
        for (const key of this.buckets.keys()) {
            this.buckets.delete(key);
            removed += 1;
            if (removed >= target) {
                return;
            }
        }
    }

    /**
     * Take tokens from a caller's bucket.
     * @param {string} bucketKey Which caller is spending
     * @param {number} num Number of tokens to remove
     * @returns {Promise<number>} Tokens left, negative when the bucket is empty
     */
    async removeTokens(bucketKey, num = 1) {
        return this.bucketFor(bucketKey).removeTokens(num);
    }

    /**
     * Whether a caller could spend a token, without spending one.
     *
     * Removing zero tokens reports what is left, and what is left has to be a
     * whole token for the next request to be affordable — tokens refill
     * continuously, so a bucket holding a fraction of one is already empty as
     * far as the next caller is concerned.
     * @param {string} bucketKey Which caller to check
     * @returns {Promise<boolean>} True while a further request would be allowed
     */
    async hasAllowance(bucketKey) {
        return (await this.bucketFor(bucketKey).removeTokens(0)) >= 1;
    }
}

const loginRateLimiter = new KumaRateLimiter({
    tokensPerInterval: 20,
    interval: "minute",
    fireImmediately: true,
    errorMessage: "Too frequently, try again later.",
});

/*
 * Two limits, because there are two things to limit and they want different
 * shapes.
 *
 * Guessing an API key is bounded per source address and spends a token only on
 * a failed attempt, so a client holding a valid key never touches it however
 * hard it polls. Throughput is bounded per key, so one client cannot spend
 * another's allowance, and it is sized by the deployment rather than fixed:
 * the original single 60/minute bucket was added for a Prometheus scraper and
 * later inherited by a management API that a fleet controller drives.
 */
const apiAuthFailureRateLimiter = new KeyedKumaRateLimiter({
    tokensPerInterval: 20,
    interval: "minute",
    fireImmediately: true,
    errorMessage: "Too many failed API key attempts, try again later.",
});

const apiThroughputRateLimiter = new KeyedKumaRateLimiter({
    tokensPerInterval: apiThroughputTokensPerMinute,
    interval: "minute",
    fireImmediately: true,
    errorMessage: "Too frequently, try again later.",
    /* Bounded by the number of API keys that exist, so this is generous. */
    maxBuckets: 1000,
});

/**
 * Whether a key is exempt from throughput limiting.
 *
 * A service key belongs to something this instance is operated by rather than
 * to a person using it — a fleet controller that polls health, reconciles
 * desired state and forwards writes for every tenant it serves. Throttling it
 * throttles the whole estate, so the operator names those keys explicitly.
 * @param {number} apiKeyId Which key is being checked
 * @returns {boolean} True when the key has no throughput limit
 */
function isUnlimitedApiKey(apiKeyId) {
    return unlimitedApiKeyIds.has(Number(apiKeyId));
}

const twoFaRateLimiter = new KumaRateLimiter({
    tokensPerInterval: 30,
    interval: "minute",
    fireImmediately: true,
    errorMessage: "Too frequently, try again later.",
});

module.exports = {
    KeyedKumaRateLimiter,
    loginRateLimiter,
    apiAuthFailureRateLimiter,
    apiThroughputRateLimiter,
    apiThroughputTokensPerMinute,
    isUnlimitedApiKey,
    twoFaRateLimiter,
};
