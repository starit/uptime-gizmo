const { describe, test } = require("node:test");
const assert = require("node:assert");

describe("resolvePreviousVersionRevision()", () => {
    test("resolves HEAD without fetching tags", async () => {
        const { resolvePreviousVersionRevision } = await import("../../extra/generate-changelog.mjs");
        const revision = resolvePreviousVersionRevision("HEAD", { fetchTags: false });
        assert.strictEqual(revision, "HEAD");
    });

    test("rejects a missing tag with a clear error", async () => {
        const { resolvePreviousVersionRevision } = await import("../../extra/generate-changelog.mjs");
        assert.throws(
            () => resolvePreviousVersionRevision("99.0.0-definitely-missing", { fetchTags: false }),
            (error) => {
                assert.match(error.message, /99\.0\.0-definitely-missing/);
                assert.match(error.message, /not a git tag or commit/);
                return true;
            }
        );
    });

    test("rejects option-like input", async () => {
        const { resolvePreviousVersionRevision } = await import("../../extra/generate-changelog.mjs");
        assert.throws(
            () => resolvePreviousVersionRevision("--all", { fetchTags: false }),
            /not a valid git tag or commit/
        );
    });
});
