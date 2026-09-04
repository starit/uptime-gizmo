const crypto = require("crypto");
const { ConfigurationDocumentError } = require("./document");
const {
    exportConfiguration,
    getConfigurationImportStatus,
    getMaxBytes,
    stageConfigurationImport,
} = require("./service");

const TICKET_HEADER = "x-uptime-gizmo-transfer-ticket";
const TICKET_LIFETIME_MS = 60 * 1000;
const tickets = new Map();

/** A safe client-facing transfer request error. */
class TransferRequestError extends Error {}

/**
 * Mint one random, short-lived, purpose-bound bearer ticket.
 * @param {"export"|"import"} purpose transfer purpose
 * @param {number} loginUserID authenticated administrator id
 * @returns {{ticket:string, expiresAt:string}} ticket response
 * @throws {Error} when the purpose is unsupported
 */
function issueTransferTicket(purpose, loginUserID) {
    if (purpose !== "export" && purpose !== "import") {
        throw new Error("Unsupported transfer purpose");
    }
    const now = Date.now();
    for (const [ticket, value] of tickets) {
        if (value.expiresAt <= now) {
            tickets.delete(ticket);
        }
    }

    const ticket = crypto.randomBytes(32).toString("base64url");
    const expiresAt = now + TICKET_LIFETIME_MS;
    tickets.set(ticket, { purpose, loginUserID, expiresAt });
    return { ticket, expiresAt: new Date(expiresAt).toISOString() };
}

/**
 * Consume a ticket before doing work so retries and concurrent use fail closed.
 * @param {unknown} candidate header value
 * @param {"export"|"import"} purpose expected purpose
 * @returns {object} ticket record
 * @throws {Error} when the ticket is invalid, expired, or for another purpose
 */
function consumeTransferTicket(candidate, purpose) {
    if (typeof candidate !== "string" || candidate.length > 128) {
        throw new TransferRequestError("A valid transfer ticket is required");
    }
    const record = tickets.get(candidate);
    tickets.delete(candidate);
    if (!record || record.purpose !== purpose || record.expiresAt <= Date.now()) {
        throw new TransferRequestError("The transfer ticket is invalid or expired");
    }
    return record;
}

/**
 * Read an octet-stream body without allowing Express to buffer an unbounded
 * upload. The global JSON parser deliberately does not handle this media type.
 * @param {import("express").Request} request request stream
 * @param {number} maxBytes maximum bytes
 * @returns {Promise<Buffer>} body
 */
async function readBoundedBody(request, maxBytes) {
    const declaredLength = Number.parseInt(request.headers["content-length"] ?? "", 10);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        throw new TransferRequestError("The uploaded archive exceeds the configured size limit");
    }

    const chunks = [];
    let length = 0;
    for await (const chunk of request) {
        length += chunk.length;
        if (length > maxBytes) {
            request.destroy();
            throw new TransferRequestError("The uploaded archive exceeds the configured size limit");
        }
        chunks.push(chunk);
    }
    return Buffer.concat(chunks, length);
}

/**
 * Register private UI transfer endpoints. They are intentionally outside v1:
 * browser integrations must not acquire an administrator's fresh password.
 * @param {import("express").Express} app express application
 * @param {string} dataDir private application data directory
 * @param {string} appVersion current app version
 * @returns {void}
 */
function registerConfigurationTransferRoutes(app, dataDir, appVersion) {
    app.get("/api/internal/configuration-export", async (request, response) => {
        try {
            consumeTransferTicket(request.get(TICKET_HEADER), "export");
            const archive = await exportConfiguration(appVersion);
            const day = new Date().toISOString().slice(0, 10);
            response.set({
                "Cache-Control": "no-store",
                "Content-Disposition": `attachment; filename="uptime-gizmo-configuration-${day}.ugbackup"`,
                "Content-Length": archive.length,
                "Content-Type": "application/vnd.uptime-gizmo.configuration+json",
                "X-Content-Type-Options": "nosniff",
            });
            response.send(archive);
        } catch (error) {
            const message =
                error instanceof TransferRequestError || error instanceof ConfigurationDocumentError
                    ? error.message
                    : "Unable to export configuration";
            response.status(400).set("Cache-Control", "no-store").json({ ok: false, msg: message });
        }
    });

    app.post("/api/internal/configuration-import", async (request, response) => {
        try {
            consumeTransferTicket(request.get(TICKET_HEADER), "import");
            if (request.is("application/octet-stream") === false) {
                throw new TransferRequestError("The configuration archive must be uploaded as an octet stream");
            }
            const result = await stageConfigurationImport(dataDir, await readBoundedBody(request, getMaxBytes()));
            response.set("Cache-Control", "no-store").json({ ok: true, ...result });
        } catch (error) {
            if (!response.headersSent) {
                const message =
                    error instanceof TransferRequestError || error instanceof ConfigurationDocumentError
                        ? error.message
                        : "Unable to stage the configuration archive";
                response.status(400).set("Cache-Control", "no-store").json({ ok: false, msg: message });
            }
        }
    });
}

module.exports = {
    TICKET_HEADER,
    consumeTransferTicket,
    getConfigurationImportStatus,
    issueTransferTicket,
    registerConfigurationTransferRoutes,
};
