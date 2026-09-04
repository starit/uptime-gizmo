const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { R } = require("redbean-node");
const { Settings } = require("../settings");
const {
    createConfigurationDocument,
    parseConfigurationDocument,
    serializeConfigurationDocument,
    summarizeConfigurationDocument,
} = require("./document");
const {
    CONFIGURATION_TABLES,
    DELETE_ORDER,
    HISTORY_TABLES,
    INSERT_ORDER,
    LIMITS,
    PORTABLE_SETTING_KEYS,
    SETTING_REGISTRY,
    TABLE_REGISTRY,
} = require("./registry");

const fsAsync = fs.promises;
const PENDING_FILENAME = "configuration-import.pending.json";
const FAILED_FILENAME = "configuration-import.failed.json";
const RESULT_FILENAME = "configuration-import.result.json";

/**
 * Read the configured archive byte limit without allowing unsafe or unbounded
 * values. The environment value is bytes.
 * @returns {number} maximum archive size
 */
function getMaxBytes() {
    const configured = Number.parseInt(process.env.UPTIME_GIZMO_BACKUP_MAX_BYTES ?? "", 10);
    if (!Number.isSafeInteger(configured) || configured < 1024) {
        return LIMITS.maxBytes;
    }
    return Math.min(configured, 1024 * 1024 * 1024);
}

/**
 * Resolve private import paths below the already validated data directory.
 * @param {string} dataDir application data directory
 * @returns {object} paths
 */
function importPaths(dataDir) {
    return {
        pending: path.join(dataDir, PENDING_FILENAME),
        failed: path.join(dataDir, FAILED_FILENAME),
        result: path.join(dataDir, RESULT_FILENAME),
    };
}

/**
 * Atomically replace a private file.
 * @param {string} filename final path
 * @param {Buffer|string} data file content
 * @returns {Promise<void>} nothing
 */
async function writePrivateFile(filename, data) {
    const temporary = `${filename}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
    try {
        await fsAsync.writeFile(temporary, data, { mode: 0o600, flag: "wx" });
        await fsAsync.chmod(temporary, 0o600);
        await fsAsync.rename(temporary, filename);
    } finally {
        await fsAsync.rm(temporary, { force: true });
    }
}

/**
 * Store only a validated, canonical configuration document for the next start.
 * @param {string} dataDir private data directory
 * @param {Buffer} upload uploaded bytes
 * @returns {Promise<object>} staged status
 */
async function stageConfigurationImport(dataDir, upload) {
    const document = parseConfigurationDocument(upload, getMaxBytes());
    const serialized = serializeConfigurationDocument(document, getMaxBytes());
    const archiveDigest = crypto.createHash("sha256").update(serialized).digest("hex");
    const paths = importPaths(dataDir);
    // Clear an earlier applied result before replacing the staged archive. This
    // distinguishes an intentional re-import of identical bytes from recovery
    // after a committed import whose pending file could not be removed.
    await fsAsync.rm(paths.result, { force: true });
    await writePrivateFile(paths.pending, serialized);
    await fsAsync.rm(paths.failed, { force: true });
    try {
        await writePrivateFile(
            paths.result,
            JSON.stringify(
                {
                    state: "pending",
                    stagedAt: new Date().toISOString(),
                    archiveDigest,
                    sourceAppVersion: document.appVersion,
                    summary: summarizeConfigurationDocument(document),
                },
                null,
                2
            ) + "\n"
        );
    } catch (_) {
        // The pending file is authoritative; status can be derived from it.
    }

    return {
        state: "pending",
        requiresRestart: true,
        sourceAppVersion: document.appVersion,
        summary: summarizeConfigurationDocument(document),
    };
}

/**
 * Read a small non-secret status file. If it is unavailable, derive pending
 * state from the staged archive without exposing its contents.
 * @param {string} dataDir private data directory
 * @returns {Promise<object>} status
 */
async function getConfigurationImportStatus(dataDir) {
    const paths = importPaths(dataDir);
    let value = null;
    try {
        value = JSON.parse(await fsAsync.readFile(paths.result, "utf8"));
    } catch (_) {
        // A missing or damaged status file does not affect the staged archive.
    }

    if (fs.existsSync(paths.pending)) {
        if (value?.state === "pending" || value?.state === "applied") {
            return value;
        }
        return { state: "pending", requiresRestart: true };
    }
    if (fs.existsSync(paths.failed)) {
        return value?.state === "failed" ? value : { state: "failed" };
    }
    if (value && typeof value === "object" && typeof value.state === "string") {
        return value;
    }
    return { state: "none" };
}

/**
 * Determine the owner that all estate configuration belongs to on this target.
 * @param {import("knex").Knex.Transaction} trx transaction
 * @returns {Promise<number>} target owner id
 */
async function getTargetOwnerID(trx) {
    const settingRow = await trx("setting").select("value").where({ key: "instanceOwnerId" }).first();
    if (settingRow) {
        try {
            const ownerID = Number(JSON.parse(settingRow.value));
            if (Number.isSafeInteger(ownerID) && ownerID > 0) {
                const owner = await trx("user").select("id").where({ id: ownerID, active: 1 }).first();
                if (owner) {
                    return ownerID;
                }
            }
        } catch (_) {
            // Fall back to an active administrator below.
        }
    }

    const owner = await trx("user").select("id").where({ active: 1 }).orderBy("admin", "desc").orderBy("id").first();
    if (!owner) {
        throw new Error("The target instance has no active user to own imported configuration");
    }
    return owner.id;
}

/**
 * Insert rows in bounded chunks and remap ownership. Monitor parents are
 * restored after all monitors exist so arbitrary valid parent ordering works.
 * @param {import("knex").Knex.Transaction} trx transaction
 * @param {string} table table name
 * @param {object[]} sourceRows canonical rows
 * @param {number} ownerID target owner id
 * @returns {Promise<void>} nothing
 */
async function insertConfigurationRows(trx, table, sourceRows, ownerID) {
    if (sourceRows.length === 0) {
        return;
    }

    const entry = TABLE_REGISTRY[table];
    const parentUpdates = [];
    const rows = sourceRows.map((source) => {
        const row = {};
        for (const column of entry.columns) {
            if (Object.prototype.hasOwnProperty.call(source, column)) {
                row[column] = source[column];
            }
        }
        for (const ownerColumn of entry.ownerColumns ?? []) {
            row[ownerColumn] = ownerID;
        }
        if (table === "monitor" && row.parent != null) {
            parentUpdates.push({ id: row.id, parent: row.parent });
            row.parent = null;
        }
        return row;
    });

    await trx.batchInsert(table, rows, table === "monitor" ? 100 : 500);
    for (const update of parentUpdates) {
        await trx("monitor").where({ id: update.id }).update({ parent: update.parent });
    }
}

/**
 * Replace configuration and derived/history rows in one transaction while
 * preserving users, personal API keys, authentication, and host settings.
 * @param {import("knex").Knex} knex database connection
 * @param {object} document canonical document
 * @param {string|null} archiveDigest canonical archive digest used as a commit marker
 * @returns {Promise<object>} apply summary
 */
async function replaceConfiguration(knex, document, archiveDigest = null) {
    const canonical = parseConfigurationDocument(
        serializeConfigurationDocument(document, getMaxBytes()),
        getMaxBytes()
    );

    return knex.transaction(async (trx) => {
        const ownerID = await getTargetOwnerID(trx);

        for (const table of HISTORY_TABLES) {
            if (TABLE_REGISTRY[table]?.optional && !(await trx.schema.hasTable(table))) {
                continue;
            }
            await trx(table).delete();
        }

        for (const table of DELETE_ORDER) {
            await trx(table).delete();
        }

        for (const table of INSERT_ORDER) {
            const entry = TABLE_REGISTRY[table];
            await insertConfigurationRows(trx, table, canonical.resources[entry.resource], ownerID);
        }

        await trx("setting").whereIn("key", PORTABLE_SETTING_KEYS).delete();
        const settingRows = Object.entries(canonical.resources.settings).map(([key, value]) => ({
            key,
            value: JSON.stringify(value),
            type: Object.prototype.hasOwnProperty.call(SETTING_REGISTRY[key], "type")
                ? SETTING_REGISTRY[key].type
                : "general",
        }));
        if (settingRows.length > 0) {
            await trx.batchInsert("setting", settingRows, 500);
        }

        if (archiveDigest) {
            const marker = {
                value: JSON.stringify(archiveDigest),
                type: null,
            };
            const updated = await trx("setting").where({ key: "configurationImportAppliedDigest" }).update(marker);
            if (updated === 0) {
                await trx("setting").insert({ key: "configurationImportAppliedDigest", ...marker });
            }
        }

        for (const table of CONFIGURATION_TABLES) {
            const entry = TABLE_REGISTRY[table];
            const countRow = await trx(table).count({ count: "*" }).first();
            const count = Number(countRow.count);
            if (count !== canonical.resources[entry.resource].length) {
                throw new Error(`Post-import verification failed for ${entry.resource}`);
            }
        }

        return {
            ownerID,
            summary: summarizeConfigurationDocument(canonical),
        };
    });
}

/**
 * Apply a pending configuration before runtime services and monitors start.
 * Invalid or failed imports are retained privately for diagnosis and never
 * partially modify the database.
 * @param {string} dataDir private data directory
 * @param {import("knex").Knex} knex database connection
 * @returns {Promise<object>} apply status
 */
async function applyPendingConfigurationImport(dataDir, knex = R.knex) {
    const paths = importPaths(dataDir);
    if (!fs.existsSync(paths.pending)) {
        return { state: "none" };
    }

    let document;
    let phase = "read";
    try {
        const stat = await fsAsync.stat(paths.pending);
        if (stat.size > getMaxBytes()) {
            throw new Error("The staged archive exceeds the configured size limit");
        }
        const serialized = await fsAsync.readFile(paths.pending);
        phase = "validate";
        document = parseConfigurationDocument(serialized, getMaxBytes());
        const canonical = serializeConfigurationDocument(document, getMaxBytes());
        const archiveDigest = crypto.createHash("sha256").update(canonical).digest("hex");
        phase = "prepare";
        const markerRow = await knex("setting")
            .select("value")
            .where({ key: "configurationImportAppliedDigest" })
            .first();
        let appliedDigest = null;
        try {
            appliedDigest = JSON.parse(markerRow?.value);
        } catch (_) {
            // An invalid marker is safely replaced in the import transaction.
        }

        let previousStatus = null;
        try {
            previousStatus = JSON.parse(await fsAsync.readFile(paths.result, "utf8"));
        } catch (_) {
            // A missing or damaged status cannot prove that this staged file
            // belongs to an already committed import.
        }

        phase = "replace";
        const result =
            appliedDigest === archiveDigest &&
            previousStatus?.state === "applied" &&
            previousStatus.archiveDigest === archiveDigest
                ? { summary: summarizeConfigurationDocument(document) }
                : await replaceConfiguration(knex, document, archiveDigest);
        Settings.cacheList = {};
        const status = {
            state: "applied",
            appliedAt: new Date().toISOString(),
            archiveDigest,
            sourceAppVersion: document.appVersion,
            summary: result.summary,
        };
        try {
            await writePrivateFile(paths.result, JSON.stringify(status, null, 2) + "\n");
            await fsAsync.rm(paths.pending, { force: true });
            await fsAsync.rm(paths.failed, { force: true });
        } catch (_) {
            // The database transaction already committed successfully. A
            // status-file failure leaves the pending file in place. The
            // transactional digest marker prevents it from being applied twice.
        }
        return status;
    } catch (_) {
        try {
            await fsAsync.rm(paths.failed, { force: true });
            await fsAsync.rename(paths.pending, paths.failed);
            await fsAsync.chmod(paths.failed, 0o600);
        } catch (_) {
            // Keep the original pending file if it cannot be renamed.
        }
        const status = {
            state: "failed",
            failedAt: new Date().toISOString(),
            phase,
        };
        try {
            await writePrivateFile(paths.result, JSON.stringify(status, null, 2) + "\n");
        } catch (_) {
            // The retained failed archive is enough to derive failure state.
        }
        return status;
    }
}

/**
 * Export and serialize from the current database.
 * @param {string} appVersion application version
 * @param {import("knex").Knex} knex database connection
 * @returns {Promise<Buffer>} archive bytes
 */
async function exportConfiguration(appVersion, knex = R.knex) {
    return serializeConfigurationDocument(await createConfigurationDocument(knex, appVersion), getMaxBytes());
}

module.exports = {
    FAILED_FILENAME,
    PENDING_FILENAME,
    RESULT_FILENAME,
    applyPendingConfigurationImport,
    exportConfiguration,
    getConfigurationImportStatus,
    getMaxBytes,
    replaceConfiguration,
    stageConfigurationImport,
};
