const {
    CONFIGURATION_TABLES,
    FORMAT_NAME,
    FORMAT_VERSION,
    LIMITS,
    PORTABLE_SETTING_KEYS,
    RESOURCE_NAMES,
    TABLE_REGISTRY,
} = require("./registry");
const { TextDecoder } = require("util");

const TOP_LEVEL_KEYS = ["format", "formatVersion", "appVersion", "createdAt", "scope", "resources"];
const RESOURCE_KEYS = [...RESOURCE_NAMES, "settings"].sort();
const DANGEROUS_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** Error raised for an invalid or unsupported configuration document. */
class ConfigurationDocumentError extends Error {
    /**
     * @param {string} message safe validation message
     */
    constructor(message) {
        super(message);
        this.name = "ConfigurationDocumentError";
    }
}

/**
 * Return a stable database-independent scalar.
 * @param {unknown} value database value
 * @returns {unknown} normalized value
 * @throws {ConfigurationDocumentError} when an integer cannot be represented safely
 */
function normalizeScalar(value) {
    if (value instanceof Date) {
        return value
            .toISOString()
            .replace("T", " ")
            .replace(/\.\d{3}Z$/, "");
    }
    if (typeof value === "bigint") {
        const number = Number(value);
        if (!Number.isSafeInteger(number)) {
            throw new ConfigurationDocumentError("A database integer is outside the supported range");
        }
        return number;
    }
    if (Buffer.isBuffer(value)) {
        return value.toString("utf8");
    }
    return value;
}

/**
 * Convert one database row into the canonical archive shape.
 * @param {object} row database row
 * @param {object} entry registry entry
 * @returns {object} normalized row
 */
function normalizeRow(row, entry) {
    const normalized = {};
    const booleanColumns = new Set(entry.booleanColumns ?? []);

    for (const column of entry.columns) {
        let value = normalizeScalar(row[column]);
        if (booleanColumns.has(column) && value !== null) {
            value = Boolean(value);
        }
        normalized[column] = value;
    }

    return normalized;
}

/**
 * Parse a setting value exactly as Settings.getSettings does.
 * @param {unknown} value stored setting value
 * @returns {unknown} parsed value
 */
function parseSettingValue(value) {
    if (typeof value !== "string") {
        return normalizeScalar(value);
    }

    try {
        return JSON.parse(value);
    } catch (_) {
        return value;
    }
}

/**
 * Create a configuration-only document inside a consistent read transaction.
 * @param {import("knex").Knex} knex database connection
 * @param {string} appVersion application version
 * @param {Date} now creation time
 * @returns {Promise<object>} canonical document
 */
async function createConfigurationDocument(knex, appVersion, now = new Date()) {
    return knex.transaction(async (trx) => {
        const resources = {};

        for (const table of CONFIGURATION_TABLES) {
            const entry = TABLE_REGISTRY[table];
            let query = trx(table).select(entry.columns).orderBy("id", "asc");
            if (entry.exportWhere) {
                query = query.where(entry.exportWhere);
            }
            resources[entry.resource] = (await query).map((row) => normalizeRow(row, entry));
        }

        const settingRows = await trx("setting")
            .select(["key", "value"])
            .whereIn("key", PORTABLE_SETTING_KEYS)
            .orderBy("key", "asc");
        resources.settings = Object.fromEntries(settingRows.map((row) => [row.key, parseSettingValue(row.value)]));

        return canonicalizeConfigurationDocument({
            format: FORMAT_NAME,
            formatVersion: FORMAT_VERSION,
            appVersion,
            createdAt: now.toISOString(),
            scope: "configuration",
            resources,
        });
    });
}

/**
 * Reject non-plain input objects, including arrays and custom prototypes.
 * @param {unknown} value candidate
 * @param {string} path field path
 * @returns {void} nothing
 * @throws {ConfigurationDocumentError} when value is not a plain object
 */
function assertPlainObject(value, path) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new ConfigurationDocumentError(`${path} must be an object`);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
        throw new ConfigurationDocumentError(`${path} must be plain data`);
    }
}

/**
 * Require exact known fields. Missing row columns remain allowed so a future
 * format adapter can fill defaults without weakening unknown-field rejection.
 * @param {object} value object to inspect
 * @param {string[]} allowed allowed keys
 * @param {string} path field path
 * @param {string[]} required required keys
 * @returns {void}
 * @throws {ConfigurationDocumentError} when a key is missing or unsupported
 */
function assertKnownKeys(value, allowed, path, required = []) {
    const allowedSet = new Set(allowed);
    for (const key of Object.keys(value)) {
        if (!allowedSet.has(key)) {
            throw new ConfigurationDocumentError(`${path}.${key} is not supported by this archive version`);
        }
    }
    for (const key of required) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) {
            throw new ConfigurationDocumentError(`${path}.${key} is required`);
        }
    }
}

/**
 * Enforce limits before any database writes.
 * @param {unknown} value value to walk
 * @param {string} path path for errors
 * @param {number} depth current depth
 * @param {{nodes:number}} state shared value counter
 * @returns {void}
 * @throws {ConfigurationDocumentError} when a value exceeds a safety limit
 */
function assertValueLimits(value, path, depth = 0, state = { nodes: 0 }) {
    state.nodes++;
    if (state.nodes > LIMITS.maxNodes) {
        throw new ConfigurationDocumentError("The configuration archive has too many values");
    }
    if (depth > LIMITS.maxDepth) {
        throw new ConfigurationDocumentError(`${path} is nested too deeply`);
    }
    if (typeof value === "string" && value.length > LIMITS.maxStringLength) {
        throw new ConfigurationDocumentError(`${path} is too long`);
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
        throw new ConfigurationDocumentError(`${path} must be a finite number`);
    }
    if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol") {
        throw new ConfigurationDocumentError(`${path} contains an unsupported value`);
    }
    if (Array.isArray(value)) {
        for (let index = 0; index < value.length; index++) {
            assertValueLimits(value[index], `${path}[${index}]`, depth + 1, state);
        }
    } else if (value !== null && typeof value === "object") {
        assertPlainObject(value, path);
        for (const [key, child] of Object.entries(value)) {
            if (DANGEROUS_OBJECT_KEYS.has(key)) {
                throw new ConfigurationDocumentError(`${path}.${key} is not allowed`);
            }
            assertValueLimits(child, `${path}.${key}`, depth + 1, state);
        }
    }
}

/**
 * Validate one positive integer id.
 * @param {unknown} value candidate id
 * @param {string} path field path
 * @param {boolean} nullable whether null/zero means no relation
 * @returns {number|null} normalized id
 * @throws {ConfigurationDocumentError} when the value is not a supported id
 */
function validateID(value, path, nullable = false) {
    if (nullable && (value === null || value === 0)) {
        return null;
    }
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new ConfigurationDocumentError(`${path} must be a positive integer`);
    }
    return value;
}

/**
 * Return a safe canonical copy and validate all relations.
 * @param {unknown} input parsed archive
 * @returns {object} canonical archive
 * @throws {ConfigurationDocumentError} when the document is invalid or unsupported
 */
function canonicalizeConfigurationDocument(input) {
    assertPlainObject(input, "archive");
    assertKnownKeys(input, TOP_LEVEL_KEYS, "archive", TOP_LEVEL_KEYS);

    if (input.format !== FORMAT_NAME) {
        throw new ConfigurationDocumentError("This is not an Uptime Gizmo configuration archive");
    }
    if (input.formatVersion !== FORMAT_VERSION) {
        throw new ConfigurationDocumentError(`Unsupported configuration archive version: ${input.formatVersion}`);
    }
    if (input.scope !== "configuration") {
        throw new ConfigurationDocumentError("Only configuration archives can be imported");
    }
    if (typeof input.appVersion !== "string" || input.appVersion.length === 0 || input.appVersion.length > 100) {
        throw new ConfigurationDocumentError("archive.appVersion is invalid");
    }
    if (typeof input.createdAt !== "string" || Number.isNaN(Date.parse(input.createdAt))) {
        throw new ConfigurationDocumentError("archive.createdAt is invalid");
    }

    assertPlainObject(input.resources, "archive.resources");
    assertKnownKeys(input.resources, RESOURCE_KEYS, "archive.resources", RESOURCE_KEYS);

    const canonicalResources = {};
    const idSets = {};
    let totalRows = 0;

    for (const table of CONFIGURATION_TABLES) {
        const entry = TABLE_REGISTRY[table];
        const rows = input.resources[entry.resource];
        if (!Array.isArray(rows)) {
            throw new ConfigurationDocumentError(`archive.resources.${entry.resource} must be an array`);
        }
        if (rows.length > LIMITS.maxRowsPerResource) {
            throw new ConfigurationDocumentError(`archive.resources.${entry.resource} has too many rows`);
        }

        totalRows += rows.length;
        const ids = new Set();
        canonicalResources[entry.resource] = rows.map((row, index) => {
            const path = `archive.resources.${entry.resource}[${index}]`;
            assertPlainObject(row, path);
            assertKnownKeys(row, entry.columns, path, ["id"]);
            const id = validateID(row.id, `${path}.id`);
            if (ids.has(id)) {
                throw new ConfigurationDocumentError(`${path}.id is duplicated`);
            }
            ids.add(id);

            const copy = {};
            for (const column of entry.columns) {
                if (Object.prototype.hasOwnProperty.call(row, column)) {
                    const value = row[column];
                    if (value !== null && !["string", "number", "boolean"].includes(typeof value)) {
                        throw new ConfigurationDocumentError(`${path}.${column} must be a scalar value`);
                    }
                    if (entry.booleanColumns?.includes(column) && value !== null) {
                        if (value !== true && value !== false && value !== 0 && value !== 1) {
                            throw new ConfigurationDocumentError(`${path}.${column} must be a boolean`);
                        }
                        copy[column] = Boolean(value);
                    } else {
                        copy[column] = value;
                    }
                }
            }
            return copy;
        });
        idSets[entry.resource] = ids;
    }

    if (totalRows > LIMITS.maxRows) {
        throw new ConfigurationDocumentError("The configuration archive has too many rows");
    }

    for (const table of CONFIGURATION_TABLES) {
        const entry = TABLE_REGISTRY[table];
        for (let index = 0; index < canonicalResources[entry.resource].length; index++) {
            const row = canonicalResources[entry.resource][index];
            for (const [column, targetResource] of Object.entries(entry.references ?? {})) {
                if (!Object.prototype.hasOwnProperty.call(row, column)) {
                    continue;
                }
                const reference = validateID(
                    row[column],
                    `archive.resources.${entry.resource}[${index}].${column}`,
                    true
                );
                if (reference !== null && !idSets[targetResource].has(reference)) {
                    throw new ConfigurationDocumentError(
                        `archive.resources.${entry.resource}[${index}].${column} refers to a missing ${targetResource} row`
                    );
                }
                row[column] = reference;
            }
        }
    }

    for (const [index, incident] of canonicalResources.activeIncidents.entries()) {
        if (incident.active !== true && incident.active !== 1) {
            throw new ConfigurationDocumentError(`archive.resources.activeIncidents[${index}].active must be true`);
        }
        incident.active = true;
    }

    assertPlainObject(input.resources.settings, "archive.resources.settings");
    assertKnownKeys(input.resources.settings, PORTABLE_SETTING_KEYS, "archive.resources.settings");
    canonicalResources.settings = {};
    for (const key of Object.keys(input.resources.settings).sort()) {
        canonicalResources.settings[key] = input.resources.settings[key];
    }

    const canonical = {
        format: FORMAT_NAME,
        formatVersion: FORMAT_VERSION,
        appVersion: input.appVersion,
        createdAt: new Date(input.createdAt).toISOString(),
        scope: "configuration",
        resources: canonicalResources,
    };
    assertValueLimits(canonical, "archive");
    return canonical;
}

/**
 * Serialize and enforce the final byte bound.
 * @param {object} document canonical document
 * @param {number} maxBytes byte limit
 * @returns {Buffer} UTF-8 JSON
 * @throws {ConfigurationDocumentError} when the document is invalid or too large
 */
function serializeConfigurationDocument(document, maxBytes = LIMITS.maxBytes) {
    const buffer = Buffer.from(JSON.stringify(canonicalizeConfigurationDocument(document), null, 2) + "\n", "utf8");
    if (buffer.length > maxBytes) {
        throw new ConfigurationDocumentError("The configuration archive exceeds the configured size limit");
    }
    return buffer;
}

/**
 * Parse a bounded JSON upload.
 * @param {Buffer} buffer uploaded bytes
 * @param {number} maxBytes byte limit
 * @returns {object} canonical document
 * @throws {ConfigurationDocumentError} when the upload is invalid or too large
 */
function parseConfigurationDocument(buffer, maxBytes = LIMITS.maxBytes) {
    if (!Buffer.isBuffer(buffer)) {
        throw new ConfigurationDocumentError("The uploaded archive is invalid");
    }
    if (buffer.length === 0) {
        throw new ConfigurationDocumentError("The uploaded archive is empty");
    }
    if (buffer.length > maxBytes) {
        throw new ConfigurationDocumentError("The uploaded archive exceeds the configured size limit");
    }

    let json;
    try {
        json = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch (_) {
        throw new ConfigurationDocumentError("The uploaded file is not valid UTF-8");
    }

    let parsed;
    try {
        parsed = JSON.parse(json);
    } catch (_) {
        throw new ConfigurationDocumentError("The uploaded file is not valid JSON");
    }
    return canonicalizeConfigurationDocument(parsed);
}

/**
 * Counts shown before restart and after apply.
 * @param {object} document canonical document
 * @returns {object} resource counts
 */
function summarizeConfigurationDocument(document) {
    const summary = {};
    for (const resource of RESOURCE_NAMES) {
        summary[resource] = document.resources[resource].length;
    }
    summary.settings = Object.keys(document.resources.settings).length;
    return summary;
}

module.exports = {
    ConfigurationDocumentError,
    canonicalizeConfigurationDocument,
    createConfigurationDocument,
    parseConfigurationDocument,
    serializeConfigurationDocument,
    summarizeConfigurationDocument,
};
