"use strict";

const DEFAULT_TAG_COLOR = "var(--color-tag-default)";
const DEFAULT_TAG_HEX_COLOR = "#4B5563";
const TAG_COLOR_PATTERN = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;

/**
 * Whether a value is a supported tag color rather than an arbitrary CSS value.
 * @param {unknown} value Candidate color
 * @returns {boolean} true for #RGB or #RRGGBB
 */
function isValidTagColor(value) {
    return typeof value === "string" && TAG_COLOR_PATTERN.test(value);
}

/**
 * Reject a tag color before it can be persisted.
 * @param {unknown} value Candidate color
 * @returns {void}
 * @throws {Error} when the value is not a supported hex color
 */
function validateTagColor(value) {
    if (!isValidTagColor(value)) {
        throw new Error("Tag color must be a hexadecimal color in #RGB or #RRGGBB format");
    }
}

/**
 * Keep legacy or externally-written invalid values out of inline CSS.
 * @param {unknown} value Stored tag color
 * @returns {string} Safe CSS color
 */
function safeTagColor(value) {
    return isValidTagColor(value) ? value : DEFAULT_TAG_COLOR;
}

module.exports = {
    DEFAULT_TAG_COLOR,
    DEFAULT_TAG_HEX_COLOR,
    TAG_COLOR_PATTERN,
    isValidTagColor,
    safeTagColor,
    validateTagColor,
};
