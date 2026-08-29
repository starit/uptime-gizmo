const { describe, test } = require("node:test");
const assert = require("node:assert");
const { KeyedKumaRateLimiter } = require("../../server/rate-limiter");

/**
 * Build a limiter with a small allowance so exhaustion is reachable in a test.
 * @param {object} overrides Configuration to merge over the defaults
 * @returns {KeyedKumaRateLimiter} The limiter under test
 */
function limiter(overrides = {}) {
    return new KeyedKumaRateLimiter({
        tokensPerInterval: 2,
        interval: "minute",
        fireImmediately: true,
        errorMessage: "Too frequently, try again later.",
        ...overrides,
    });
}

describe("KeyedKumaRateLimiter", () => {
    test("removeTokens() spends only the named caller's allowance", async () => {
        const rateLimiter = limiter();

        assert.ok((await rateLimiter.removeTokens("caller-a")) >= 0);
        assert.ok((await rateLimiter.removeTokens("caller-a")) >= 0);
        assert.ok(
            (await rateLimiter.removeTokens("caller-a")) < 0,
            "the third request exhausts caller-a"
        );

        assert.ok(
            (await rateLimiter.removeTokens("caller-b")) >= 0,
            "another caller is unaffected by the first one's spending"
        );
    });

    test("hasAllowance() reports remaining allowance without spending it", async () => {
        const rateLimiter = limiter();

        assert.equal(await rateLimiter.hasAllowance("caller"), true);
        assert.equal(await rateLimiter.hasAllowance("caller"), true);
        assert.ok(
            (await rateLimiter.removeTokens("caller", 2)) >= 0,
            "checking twice left the full allowance intact"
        );
        assert.equal(await rateLimiter.hasAllowance("caller"), false);
    });

    test("bucketFor() bounds how many buckets are held", async () => {
        const rateLimiter = limiter({ maxBuckets: 10 });

        for (let index = 0; index < 100; index += 1) {
            await rateLimiter.removeTokens(`caller-${index}`);
        }

        assert.ok(
            rateLimiter.buckets.size <= 10,
            `expected at most 10 buckets, found ${rateLimiter.buckets.size}`
        );
    });

    test("bucketFor() keeps the most recently used caller when evicting", async () => {
        const rateLimiter = limiter({ maxBuckets: 4 });

        await rateLimiter.removeTokens("busy", 2);
        for (let index = 0; index < 20; index += 1) {
            await rateLimiter.removeTokens(`filler-${index}`);
            // Touching "busy" on every round keeps it newest, so eviction must
            // reach for the fillers instead.
            await rateLimiter.hasAllowance("busy");
        }

        assert.equal(
            await rateLimiter.hasAllowance("busy"),
            false,
            "an evicted bucket would have come back with a full allowance"
        );
    });
});

describe("API throughput configuration", () => {
    /**
     * Load the rate limiter module fresh with a given environment.
     * @param {object} environment Environment variables to apply
     * @returns {object} The freshly loaded module
     */
    function loadWith(environment) {
        const previous = {};
        for (const [ name, value ] of Object.entries(environment)) {
            previous[name] = process.env[name];
            if (value === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = value;
            }
        }
        delete require.cache[require.resolve("../../server/rate-limiter")];
        try {
            return require("../../server/rate-limiter");
        } finally {
            for (const [ name, value ] of Object.entries(previous)) {
                if (value === undefined) {
                    delete process.env[name];
                } else {
                    process.env[name] = value;
                }
            }
            delete require.cache[require.resolve("../../server/rate-limiter")];
        }
    }

    test("defaults to 60 requests a minute for each key", () => {
        const { apiThroughputTokensPerMinute } = loadWith({
            UPTIME_GIZMO_API_RATE_LIMIT_PER_MINUTE: undefined,
        });

        assert.equal(apiThroughputTokensPerMinute, 60);
    });

    test("takes the configured allowance when it is a positive integer", () => {
        assert.equal(
            loadWith({ UPTIME_GIZMO_API_RATE_LIMIT_PER_MINUTE: "600" }).apiThroughputTokensPerMinute,
            600
        );
    });

    test("falls back to the default rather than accepting a nonsense allowance", () => {
        for (const configured of [ "0", "-5", "many" ]) {
            assert.equal(
                loadWith({ UPTIME_GIZMO_API_RATE_LIMIT_PER_MINUTE: configured }).apiThroughputTokensPerMinute,
                60,
                `expected "${configured}" to be refused`
            );
        }
    });

    test("isUnlimitedApiKey() exempts only the keys the operator named", () => {
        const { isUnlimitedApiKey } = loadWith({
            UPTIME_GIZMO_API_RATE_LIMIT_UNLIMITED_KEY_IDS: "2, 7",
        });

        assert.equal(isUnlimitedApiKey(2), true);
        assert.equal(isUnlimitedApiKey("7"), true, "an id arriving as a string still matches");
        assert.equal(isUnlimitedApiKey(3), false);
    });

    test("isUnlimitedApiKey() exempts nothing when unconfigured", () => {
        const { isUnlimitedApiKey } = loadWith({
            UPTIME_GIZMO_API_RATE_LIMIT_UNLIMITED_KEY_IDS: undefined,
        });

        assert.equal(isUnlimitedApiKey(1), false);
        assert.equal(isUnlimitedApiKey(2), false);
    });
});
