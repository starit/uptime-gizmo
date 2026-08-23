const { describe, it } = require("node:test");
const assert = require("node:assert");
const {
    scaleToInteger,
    scaleSignedToInteger,
    formatUnits,
    isAddress,
    blockAgeSeconds,
    isHexBytes,
    readWord,
    decodeWord,
    parseThreshold,
    formatValue,
    compareValue,
    validateContractRead,
} = require("../../server/modules/web3-rpc");

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

/*
 * Reading a value out of a contract.
 *
 * Two mistakes here are silent and dangerous in the same way a rounded balance
 * is: calldata that reads the wrong function, and a word index pointing at the
 * wrong part of the result. Neither can be caught by these tests — only a real
 * call can — so what is pinned instead is that the cases which *are* detectable
 * fail loudly: a word that is not there, an unsigned read of a negative number,
 * an ordering comparison on something that has no order.
 */

/**
 * Pad a hex value into the 32-byte word ABI encoding would put it in.
 * @param {string} hex value, with or without the 0x prefix
 * @returns {string} 64 hex characters, no prefix
 */
const word = (hex) => hex.replace(/^0x/, "").toLowerCase().padStart(64, "0");

/**
 * Build a call result out of the words it returned.
 * @param {...string} words values, one per 32-byte word
 * @returns {string} 0x-prefixed return data
 */
const result = (...words) => "0x" + words.map(word).join("");

describe("web3 signed amounts", () => {
    it("scales a negative decimal", () => {
        assert.strictEqual(scaleSignedToInteger("-1", 18), -(10n ** 18n));
        assert.strictEqual(scaleSignedToInteger("-0.05", 18), -50000000000000000n);
        assert.strictEqual(scaleSignedToInteger("-0", 0), 0n);
    });

    it("still scales a positive one", () => {
        assert.strictEqual(scaleSignedToInteger("1.5", 6), 1500000n);
        assert.strictEqual(scaleSignedToInteger("1000", 0), 1000n);
    });

    /*
     * The unsigned conversion keeps refusing a sign. A negative balance floor is
     * meaningless, and accepting one there would hide a typo in the number the
     * monitor exists to protect.
     */
    it("leaves the unsigned conversion alone", () => {
        assert.throws(() => scaleToInteger("-1", 18), /plain decimal/);
    });

    it("refuses a sign on its own", () => {
        for (const bad of [ "-", "--1", "-1-", "" ]) {
            assert.throws(() => scaleSignedToInteger(bad, 0), /plain decimal/, `accepted ${JSON.stringify(bad)}`);
        }
    });
});

describe("web3 hex data", () => {
    it("accepts 0x followed by whole bytes", () => {
        assert.ok(isHexBytes("0x"));
        assert.ok(isHexBytes("0x18160ddd"));
        assert.ok(isHexBytes("0xAB"));
    });

    it("rejects an odd number of digits, or no prefix", () => {
        for (const bad of [ "0x1", "0x18160ddd0", "18160ddd", "0xzz", "", null, undefined, 4 ]) {
            assert.strictEqual(isHexBytes(bad), false, `accepted ${JSON.stringify(bad)}`);
        }
    });
});

describe("web3 return words", () => {
    it("takes the word the index asks for", () => {
        const three = result("0x01", "0x02", "0x03");
        assert.strictEqual(decodeWord(readWord(three, 0), "uint256"), 1n);
        assert.strictEqual(decodeWord(readWord(three, 1), "uint256"), 2n);
        assert.strictEqual(decodeWord(readWord(three, 2), "uint256"), 3n);
    });

    /*
     * The most dangerous configuration mistake available here. Read as zero, a
     * monitor pointed past the end of the result would report a reserve of zero
     * and alert as if the pool had been emptied — or, with a `lte` threshold,
     * pass forever while testing nothing.
     */
    it("refuses a word that is not there rather than reading zero", () => {
        assert.throws(() => readWord(result("0x01", "0x02"), 2), /no 32-byte word at index 2/);
        assert.throws(() => readWord("0x", 0), /no 32-byte word at index 0/);
        // A result truncated mid-word is not a word either.
        assert.throws(() => readWord("0x" + "ab".repeat(31), 0), /no 32-byte word/);
    });

    it("refuses a nonsense index", () => {
        for (const bad of [ -1, 1.5, NaN, "0" ]) {
            assert.throws(() => readWord(result("0x01"), bad), /word index/, `accepted ${JSON.stringify(bad)}`);
        }
    });

    it("refuses a result that is not hex", () => {
        for (const bad of [ "revert", "0x1", null, undefined ]) {
            assert.throws(() => readWord(bad, 0), /whole bytes/, `accepted ${JSON.stringify(bad)}`);
        }
    });
});

describe("web3 value decoding", () => {
    it("reads an unsigned integer", () => {
        assert.strictEqual(decodeWord(word("0x00"), "uint256"), 0n);
        assert.strictEqual(decodeWord(word("0xff"), "uint256"), 255n);
        assert.strictEqual(decodeWord("f".repeat(64), "uint256"), 2n ** 256n - 1n);
    });

    /*
     * Two's complement, and the reason it matters: read unsigned, -1 becomes the
     * largest number there is and passes every `gte` threshold that exists. A
     * funding rate, an oracle answer and a protocol's net position are all
     * routinely below zero.
     */
    it("reads a signed integer below zero", () => {
        assert.strictEqual(decodeWord("f".repeat(64), "int256"), -1n);
        assert.strictEqual(decodeWord(word("0x00"), "int256"), 0n);
        assert.strictEqual(decodeWord(word("0x2a"), "int256"), 42n);

        const minusThousand = (1n << 256n) - 1000n;
        assert.strictEqual(decodeWord(minusThousand.toString(16).padStart(64, "0"), "int256"), -1000n);

        // The boundary itself: one below it is the largest positive int256.
        assert.strictEqual(decodeWord(((1n << 255n) - 1n).toString(16).padStart(64, "0"), "int256"), 2n ** 255n - 1n);
        assert.strictEqual(decodeWord((1n << 255n).toString(16).padStart(64, "0"), "int256"), -(2n ** 255n));
    });

    it("reads a bool, and refuses a word that is not one", () => {
        assert.strictEqual(decodeWord(word("0x00"), "bool"), 0n);
        assert.strictEqual(decodeWord(word("0x01"), "bool"), 1n);
        assert.throws(() => decodeWord(word("0x02"), "bool"), /Expected a bool/);
    });

    it("reads an address out of its padding", () => {
        const address = "0xabcdef0123456789abcdef0123456789abcdef01";
        assert.strictEqual(decodeWord(word(address), "address"), address);
        // Case is normalised, so an equality threshold does not depend on it.
        assert.strictEqual(decodeWord(word(address.toUpperCase().replace("0X", "0x")), "address"), address);
    });

    /*
     * ABI left-pads an address, so anything in the top twelve bytes means this
     * word is not one — which nearly always means the index points elsewhere in
     * the result, and the alternative is silently reporting the wrong 20 bytes.
     */
    it("refuses an address-shaped read of a word that is not one", () => {
        assert.throws(() => decodeWord("f".repeat(64), "address"), /Not an address-shaped word/);
        assert.throws(() => decodeWord("1" + "0".repeat(63), "address"), /Not an address-shaped word/);
    });

    it("reads a bytes32 verbatim", () => {
        assert.strictEqual(decodeWord("f".repeat(64), "bytes32"), "0x" + "f".repeat(64));
    });

    it("refuses a type it does not know, and a word that is not 32 bytes", () => {
        assert.throws(() => decodeWord(word("0x01"), "uint128"), /not a value type|Not a value type/);
        assert.throws(() => decodeWord("0x01", "uint256"), /32-byte word/);
    });
});

describe("web3 thresholds", () => {
    it("scales a numeric threshold by the monitor's decimals", () => {
        assert.strictEqual(parseThreshold("1000", "uint256", 0), 1000n);
        assert.strictEqual(parseThreshold("1000", "uint256", 18), 1000n * 10n ** 18n);
        assert.strictEqual(parseThreshold("-2.5", "int256", 8), -250000000n);
    });

    it("refuses a negative threshold for a type that cannot be negative", () => {
        assert.throws(() => parseThreshold("-1", "uint256", 0), /cannot be negative/);
    });

    it("takes true and false for a bool, in either spelling", () => {
        assert.strictEqual(parseThreshold("true", "bool", 0), 1n);
        assert.strictEqual(parseThreshold("1", "bool", 0), 1n);
        assert.strictEqual(parseThreshold("False", "bool", 0), 0n);
        assert.strictEqual(parseThreshold("0", "bool", 0), 0n);
        assert.throws(() => parseThreshold("yes", "bool", 0), /must be true or false/);
    });

    it("normalises an address threshold and refuses a malformed one", () => {
        assert.strictEqual(
            parseThreshold("0xABCDEF0123456789abcdef0123456789ABCDEF01", "address", 0),
            "0xabcdef0123456789abcdef0123456789abcdef01"
        );
        assert.throws(() => parseThreshold("0x123", "address", 0), /Not an address/);
    });

    it("requires a bytes32 threshold to be 32 bytes", () => {
        assert.strictEqual(parseThreshold("0x" + "A".repeat(64), "bytes32", 0), "0x" + "a".repeat(64));
        assert.throws(() => parseThreshold("0xab", "bytes32", 0), /Not a 32-byte value/);
    });
});

describe("web3 value comparison", () => {
    it("makes each numeric comparison", () => {
        assert.strictEqual(compareValue(10n, "gte", 10n), true);
        assert.strictEqual(compareValue(9n, "gte", 10n), false);
        assert.strictEqual(compareValue(10n, "lte", 10n), true);
        assert.strictEqual(compareValue(11n, "lte", 10n), false);
        assert.strictEqual(compareValue(11n, "gt", 10n), true);
        assert.strictEqual(compareValue(10n, "gt", 10n), false);
        assert.strictEqual(compareValue(9n, "lt", 10n), true);
        assert.strictEqual(compareValue(10n, "lt", 10n), false);
        assert.strictEqual(compareValue(10n, "eq", 10n), true);
        assert.strictEqual(compareValue(10n, "ne", 10n), false);
    });

    it("compares negative values in the right direction", () => {
        assert.strictEqual(compareValue(-5n, "lt", 0n), true);
        assert.strictEqual(compareValue(-5n, "gte", -10n), true);
        assert.strictEqual(compareValue(-5n, "gte", -1n), false);
    });

    /*
     * The whole reason this path is BigInt rather than the conditions engine's
     * Number(): these two are indistinguishable as doubles, and a monitor whose
     * threshold sits at 18 decimals is comparing numbers this size every check.
     */
    it("separates values a double would call equal", () => {
        const threshold = parseThreshold("1", "uint256", 18);
        const justUnder = threshold - 1n;

        assert.strictEqual(compareValue(justUnder, "gte", threshold), false);
        assert.strictEqual(compareValue(threshold, "gte", threshold), true);
        assert.strictEqual(Number(justUnder), Number(threshold), "the fixture no longer demonstrates the problem");
    });

    it("compares addresses only for equality", () => {
        const a = "0xabcdef0123456789abcdef0123456789abcdef01";
        const b = "0x0000000000000000000000000000000000000001";

        assert.strictEqual(compareValue(a, "eq", a), true);
        assert.strictEqual(compareValue(a, "eq", b), false);
        assert.strictEqual(compareValue(a, "ne", b), true);
        assert.throws(() => compareValue(a, "gte", b), /no order/);
    });

    it("refuses a value and threshold that are different kinds of thing", () => {
        assert.throws(() => compareValue(1n, "eq", "0x01"), /same kind of thing/);
    });

    it("refuses an operator it does not know", () => {
        assert.throws(() => compareValue(1n, "approximately", 1n), /Not a comparison/);
    });
});

describe("web3 value formatting", () => {
    it("renders each type the way the heartbeat shows it", () => {
        assert.strictEqual(formatValue(1500000n, "uint256", 6), "1.5");
        assert.strictEqual(formatValue(1000n, "uint256", 0), "1000");
        assert.strictEqual(formatValue(-250000000n, "int256", 8), "-2.5");
        assert.strictEqual(formatValue(1n, "bool", 0), "true");
        assert.strictEqual(formatValue(0n, "bool", 0), "false");
        assert.strictEqual(formatValue("0x01", "address", 0), "0x01");
    });
});

describe("web3 contract read configuration", () => {
    const ok = {
        to: "0xabcdef0123456789abcdef0123456789abcdef01",
        data: "0x18160ddd",
        offset: 0,
        type: "uint256",
        decimals: 0,
        operator: "gte",
        threshold: "1000",
        blockTag: "latest",
    };

    it("accepts a usable read", () => {
        validateContractRead(ok);
    });

    /*
     * Recording the value without judging it is a legitimate configuration, the
     * same as an unset balance floor: the call still happens and the value lands
     * in every heartbeat.
     */
    it("accepts a read with no comparison at all", () => {
        validateContractRead({ ...ok, operator: "", threshold: "" });
    });

    it("refuses half a comparison", () => {
        assert.throws(() => validateContractRead({ ...ok, threshold: "" }), /both an operator and a threshold/);
        assert.throws(() => validateContractRead({ ...ok, operator: "" }), /both an operator and a threshold/);
    });

    /*
     * The type, decimals and block tag fall back to their column defaults: a
     * caller that omits them means "a plain integer at the latest block", and
     * validation runs before the insert that would have applied them.
     */
    it("lets the column defaults stand in", () => {
        validateContractRead({ to: ok.to, data: ok.data });
    });

    it("requires a contract address", () => {
        assert.throws(() => validateContractRead({ ...ok, to: "" }), /contract address is required/);
        assert.throws(() => validateContractRead({ ...ok, to: "0x123" }), /contract address is required/);
    });

    it("requires calldata that could name a function", () => {
        assert.throws(() => validateContractRead({ ...ok, data: "" }), /whole bytes/);
        assert.throws(() => validateContractRead({ ...ok, data: "18160ddd" }), /whole bytes/);
        assert.throws(() => validateContractRead({ ...ok, data: "0x18160dd" }), /whole bytes/);
        // Three bytes is not a selector, and a call short of one hits the
        // contract's fallback, which returns no value to compare.
        assert.throws(() => validateContractRead({ ...ok, data: "0x18160d" }), /four-byte function selector/);
    });

    it("refuses calldata too long to be a read", () => {
        assert.throws(
            () => validateContractRead({ ...ok, data: "0x" + "ab".repeat(9000) }),
            /longer than/
        );
    });

    it("refuses a nonsense word index, type, decimals or block tag", () => {
        assert.throws(() => validateContractRead({ ...ok, offset: -1 }), /word index/);
        assert.throws(() => validateContractRead({ ...ok, offset: 1.5 }), /word index/);
        assert.throws(() => validateContractRead({ ...ok, type: "uint128" }), /value type must be one of/);
        assert.throws(() => validateContractRead({ ...ok, decimals: 40 }), /between 0 and 36/);
        assert.throws(() => validateContractRead({ ...ok, decimals: -1 }), /between 0 and 36/);
        assert.throws(() => validateContractRead({ ...ok, blockTag: "pending" }), /block tag must be one of/);
        assert.throws(() => validateContractRead({ ...ok, operator: "approximately" }), /operator must be one of/);
    });

    /*
     * Ordering an address is meaningless, and offering the comparison would
     * invite a monitor that looks configured and tests nothing.
     */
    it("refuses an ordering comparison on a type with no order", () => {
        for (const type of [ "address", "bytes32", "bool" ]) {
            assert.throws(
                () => validateContractRead({ ...ok, type, operator: "gte", threshold: "1" }),
                /only eq and ne apply/,
                `allowed gte on ${type}`
            );
        }
    });

    it("refuses a threshold the type cannot hold", () => {
        assert.throws(
            () => validateContractRead({ ...ok, type: "address", operator: "eq", threshold: "1000" }),
            /Not an address/
        );
        assert.throws(
            () => validateContractRead({ ...ok, type: "uint256", decimals: 2, threshold: "1.234" }),
            /more precise/
        );
    });
});
