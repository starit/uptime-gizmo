const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { normalizePingAddress } = require("../../server/util-server");

describe("Server Utilities: normalizePingAddress", () => {
    test("should convert IDN domains to Punycode before pinging", () => {
        assert.strictEqual(normalizePingAddress("münchen.de"), "xn--mnchen-3ya.de");
    });

    test("should strip brackets from IPv6 addresses before pinging", () => {
        assert.strictEqual(normalizePingAddress("[2606:4700:4700::1111]"), "2606:4700:4700::1111");
    });

    test("should leave standard ASCII domains unchanged", () => {
        assert.strictEqual(normalizePingAddress("invalid-domain.test"), "invalid-domain.test");
    });
});
