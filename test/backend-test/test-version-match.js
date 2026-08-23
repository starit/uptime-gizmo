const { describe, test } = require("node:test");
const assert = require("node:assert");
const { frontendBackendVersionsMatch } = require("../../src/util-version-match");

describe("frontendBackendVersionsMatch()", () => {
    test("treats a missing backend version as matched (boot)", () => {
        assert.strictEqual(frontendBackendVersionsMatch(undefined, "3.0.0-beta.1"), true);
        assert.strictEqual(frontendBackendVersionsMatch("", "3.0.0-beta.1"), true);
    });

    test("requires an exact match for releases", () => {
        assert.strictEqual(frontendBackendVersionsMatch("3.0.0-beta.1", "3.0.0-beta.1"), true);
        assert.strictEqual(frontendBackendVersionsMatch("3.0.0-beta.2", "3.0.0-beta.1"), false);
    });

    test("allows the nightly stamp applied after dist is compiled", () => {
        assert.strictEqual(
            frontendBackendVersionsMatch("3.0.0-beta.1-nightly-20260823010203", "3.0.0-beta.1"),
            true
        );
    });

    test("rejects a nightly stamp on a different base version", () => {
        assert.strictEqual(
            frontendBackendVersionsMatch("3.0.0-beta.2-nightly-20260823010203", "3.0.0-beta.1"),
            false
        );
    });

    test("rejects a loose prefix that is not a 14-digit stamp", () => {
        assert.strictEqual(frontendBackendVersionsMatch("3.0.0-beta.1-nightly-oops", "3.0.0-beta.1"), false);
        assert.strictEqual(frontendBackendVersionsMatch("3.0.0-beta.1-nightly-", "3.0.0-beta.1"), false);
    });
});
