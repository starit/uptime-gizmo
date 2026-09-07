const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const { canonicalizeConfigurationDocument } = require("../../server/configuration-backup/document");
const { RESOURCE_NAMES } = require("../../server/configuration-backup/registry");
const { internals } = require("../../server/routers/v1-router");
const { isValidTagColor, safeTagColor, validateTagColor } = require("../../src/tag-color");

/**
 * Build the smallest valid archive containing one tag.
 * @param {string} color Tag color
 * @returns {object} configuration archive
 */
function configurationWithTag(color) {
    const resources = Object.fromEntries(RESOURCE_NAMES.map((resource) => [resource, []]));
    resources.settings = {};
    resources.tags = [{ id: 1, name: "production", color, created_date: "2026-09-07 00:00:00" }];
    return {
        format: "uptime-gizmo-configuration",
        formatVersion: 1,
        appVersion: "3.0.0-beta.4-test",
        createdAt: "2026-09-07T00:00:00.000Z",
        scope: "configuration",
        resources,
    };
}

describe("tag colors", () => {
    test("accepts only the supported hex formats", () => {
        assert.strictEqual(isValidTagColor("#abc"), true);
        assert.strictEqual(isValidTagColor("#12ABef"), true);
        assert.strictEqual(isValidTagColor("#abcd"), false);
        assert.strictEqual(isValidTagColor("red"), false);
        assert.strictEqual(isValidTagColor("url(https://example.invalid/pixel)"), false);
        assert.strictEqual(isValidTagColor("#fff; background: url(https://example.invalid/pixel)"), false);
    });

    test("uses a safe fallback for invalid stored colors", () => {
        assert.strictEqual(safeTagColor("#2F9E68"), "#2F9E68");
        assert.strictEqual(safeTagColor("url(https://example.invalid/pixel)"), "var(--color-tag-default)");
        assert.throws(() => validateTagColor("url(https://example.invalid/pixel)"), /hexadecimal color/);
    });

    test("the REST field contract rejects arbitrary CSS", () => {
        assert.throws(
            () => internals.parseWith(internals.TAG_FIELDS, { name: "production", color: "url(https://example.invalid/pixel)" }, false),
            /hexadecimal color/
        );
        assert.deepStrictEqual(
            internals.parseWith(internals.TAG_FIELDS, { name: "production", color: "#0a7" }, false),
            { name: "production", color: "#0a7" }
        );
    });

    test("configuration imports reject arbitrary CSS tag colors", () => {
        assert.throws(
            () => canonicalizeConfigurationDocument(configurationWithTag("url(https://example.invalid/pixel)")),
            /archive\.resources\.tags\[0\]\.color must be a hexadecimal color/
        );
        assert.strictEqual(canonicalizeConfigurationDocument(configurationWithTag("#1E64E7")).resources.tags[0].color, "#1E64E7");
    });
});
