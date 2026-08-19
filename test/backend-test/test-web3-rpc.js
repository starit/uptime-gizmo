const { describe, it } = require("node:test");
const assert = require("node:assert");
const { scaleToInteger, formatUnits, isAddress, blockAgeSeconds } = require("../../server/modules/web3-rpc");

/*
 * The arithmetic, which is where this feature can be wrong without saying so.
 *
 * A balance comparison that loses precision fails in the worst direction: it
 * reports that a drained account is funded. These tests exist to pin the two
 * conversions that stand between an operator's "0.05" and an integer comparison
 * against a number with eighteen zeroes after it.
 */

describe("web3 amounts survive being converted", () => {
    it("scales a decimal to the chain's smallest unit", () => {
        assert.strictEqual(scaleToInteger("1", 18), 10n ** 18n);
        assert.strictEqual(scaleToInteger("0.05", 18), 50000000000000000n);
        assert.strictEqual(scaleToInteger("0", 18), 0n);
        assert.strictEqual(scaleToInteger("1.5", 6), 1500000n);
        assert.strictEqual(scaleToInteger("100", 0), 100n);
    });

    /*
     * The reason the whole path is BigInt. 2^53 is where a double stops being
     * able to tell consecutive integers apart, and a wei balance passes it at
     * about 0.01 Ether — so this is not an edge case, it is every balance.
     */
    it("keeps digits a double would lose", () => {
        const scaled = scaleToInteger("0.123456789012345678", 18);
        assert.strictEqual(scaled, 123456789012345678n);
        assert.ok(scaled > BigInt(Number.MAX_SAFE_INTEGER), "the fixture no longer exceeds a double's range");
        // The point of the exercise: Number() cannot round-trip this.
        assert.notStrictEqual(BigInt(Number(scaled)), scaled);
    });

    it("refuses an amount more precise than the token allows", () => {
        // Six decimals, seven given: silently truncating would set a floor a
        // factor of ten away from the one that was asked for.
        assert.throws(() => scaleToInteger("1.1234567", 6), /more precise/);
    });

    it("refuses anything that is not a plain decimal", () => {
        for (const bad of [ "1e18", "0x10", "-1", "1.2.3", "", " ", "abc", null, undefined ]) {
            assert.throws(() => scaleToInteger(bad, 18), /plain decimal/, `accepted ${JSON.stringify(bad)}`);
        }
    });

    it("renders an integer balance without dividing", () => {
        assert.strictEqual(formatUnits(10n ** 18n, 18), "1");
        assert.strictEqual(formatUnits(50000000000000000n, 18), "0.05");
        assert.strictEqual(formatUnits(0n, 18), "0");
        assert.strictEqual(formatUnits(1n, 18), "0.000000000000000001");
        assert.strictEqual(formatUnits(1500000n, 6), "1.5");
        assert.strictEqual(formatUnits(123456789012345678n, 18), "0.123456789012345678");
    });

    it("round-trips an amount through both conversions", () => {
        for (const [ amount, decimals ] of [
            [ "0.05", 18 ],
            [ "1234.5678", 8 ],
            [ "0.000000000000000001", 18 ],
            [ "999999999999", 6 ],
        ]) {
            assert.strictEqual(formatUnits(scaleToInteger(amount, decimals), decimals), amount);
        }
    });

    /*
     * The comparison the monitor actually makes, at a magnitude where doing it
     * in floating point would give the wrong answer.
     */
    it("compares balances that differ by one unit", () => {
        const floor = scaleToInteger("1", 18);
        const justUnder = floor - 1n;

        assert.ok(justUnder < floor, "one unit below the floor did not compare as below it");
        assert.strictEqual(Number(justUnder), Number(floor), "the fixture no longer demonstrates the problem");
    });
});

describe("web3 addresses", () => {
    it("accepts a 20-byte hex address in either case", () => {
        assert.ok(isAddress("0x0000000000000000000000000000000000000000"));
        assert.ok(isAddress("0xAbCdEf0123456789aBcDeF0123456789AbCdEf01"));
    });

    it("rejects anything else", () => {
        for (const bad of [
            "0x123",
            "0x00000000000000000000000000000000000000000",
            "0000000000000000000000000000000000000000",
            "0xzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
            "",
            null,
            undefined,
            123,
        ]) {
            assert.strictEqual(isAddress(bad), false, `accepted ${JSON.stringify(bad)}`);
        }
    });
});

describe("block age", () => {
    const now = 1_760_000_000;

    it("measures how far behind the newest block is", () => {
        assert.strictEqual(blockAgeSeconds(BigInt(now), now), 0);
        assert.strictEqual(blockAgeSeconds(BigInt(now - 12), now), 12);
        assert.strictEqual(blockAgeSeconds(BigInt(now - 3600), now), 3600);
    });

    /*
     * A block timestamp is set by whoever produced the block, not by the machine
     * reading it, so a block can legitimately be a second or two ahead of local
     * time — and a server whose own clock runs slow can see it much further
     * ahead. Reported as a negative age it would sail under any limit; reported
     * as a large positive one it would alert constantly. Zero is the only honest
     * answer to "how old is something that has not happened yet".
     */
    it("treats a block from the future as new rather than as ancient", () => {
        assert.strictEqual(blockAgeSeconds(BigInt(now + 2), now), 0);
        assert.strictEqual(blockAgeSeconds(BigInt(now + 86400), now), 0);
    });

    it("handles a fractional local clock", () => {
        assert.strictEqual(blockAgeSeconds(BigInt(now - 5), now + 0.9), 5);
    });

    it("survives a block height past what a double holds", () => {
        // Timestamps are small, but the same conversion path carries heights,
        // and nothing should silently round on the way through.
        const far = 2n ** 60n;
        assert.strictEqual(blockAgeSeconds(far, now), 0);
    });
});
