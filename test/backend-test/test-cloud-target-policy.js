const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const {
    CloudTargetPolicyError,
    assertPublicAddress,
    assertPublicTargetShape,
    createSafeLookup,
    applyCloudPublicTargetPolicy,
    resolveAndValidate,
} = require("../../server/cloud-target-policy");

describe("Cloud public target policy", () => {
    test("accepts explicit public HTTP targets on configured ports", () => {
        assert.equal(assertPublicTargetShape("https://example.com/health").hostname, "example.com");
        assert.equal(assertPublicTargetShape("http://8.8.8.8/").hostname, "8.8.8.8");
    });

    test("rejects schemes, credentials, fragments, internal names, and blocked ports", () => {
        for (const target of [
            "file:///etc/passwd",
            "http://user:pass@example.com/",
            "https://example.com/#fragment",
            "http://metadata.google.internal/",
            "http://service.internal/",
            "https://example.com:22/",
        ]) {
            assert.throws(() => assertPublicTargetShape(target), CloudTargetPolicyError);
        }
    });

    test("rejects non-public IPv4, encoded IPv4, IPv6, mapped, and metadata addresses", () => {
        for (const address of [
            "0.0.0.0",
            "10.0.0.1",
            "100.64.0.1",
            "127.0.0.1",
            "169.254.169.254",
            "172.16.0.1",
            "192.168.0.1",
            "198.18.0.1",
            "::1",
            "::ffff:127.0.0.1",
            "fc00::1",
            "fe80::1",
            "ff02::1",
        ]) {
            assert.throws(() => assertPublicAddress(address), CloudTargetPolicyError);
        }
        assert.throws(() => assertPublicTargetShape("http://2130706433/"), CloudTargetPolicyError);
    });

    test("rejects a hostname when any A or AAAA result is non-public", async () => {
        await assert.rejects(() => resolveAndValidate("mixed.example", {
            resolver: async () => [
                { address: "8.8.8.8", family: 4 },
                { address: "127.0.0.1", family: 4 },
            ],
        }), CloudTargetPolicyError);
    });

    test("pins the connection lookup to validated public DNS results", async () => {
        const lookup = createSafeLookup({
            resolver: async () => [{ address: "8.8.4.4", family: 4 }],
        });
        const result = await new Promise((resolve, reject) => {
            lookup("public.example", { family: 4 }, (error, address, family) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({ address, family });
                }
            });
        });
        assert.deepEqual(result, { address: "8.8.4.4", family: 4 });
    });

    test("rechecks every redirect and bounds each monitor connection pool", () => {
        const previous = process.env.UPTIME_GIZMO_CLOUD_PUBLIC_TARGETS;
        process.env.UPTIME_GIZMO_CLOUD_PUBLIC_TARGETS = "true";
        try {
            const options = {
                url: "https://example.com/health",
                httpAgent: { options: {} },
                httpsAgent: { options: {} },
            };
            applyCloudPublicTargetPolicy(options, { proxy_id: null });
            assert.equal(options.httpAgent.maxSockets, 10);
            assert.equal(options.httpsAgent.maxSockets, 10);
            assert.throws(() => options.beforeRedirect({
                protocol: "http:",
                hostname: "169.254.169.254",
                path: "/latest/meta-data",
            }), CloudTargetPolicyError);
            assert.throws(() => options.beforeRedirect({
                protocol: "https:",
                hostname: "example.com",
                auth: "user:password",
                path: "/",
            }), CloudTargetPolicyError);
        } finally {
            if (previous === undefined) {
                delete process.env.UPTIME_GIZMO_CLOUD_PUBLIC_TARGETS;
            } else {
                process.env.UPTIME_GIZMO_CLOUD_PUBLIC_TARGETS = previous;
            }
        }
    });
});
