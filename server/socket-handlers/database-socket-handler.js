const { checkAdmin, checkLogin, doubleCheckPassword } = require("../util-server");
const Database = require("../database");
const { getConfigurationImportStatus, issueTransferTicket } = require("../configuration-backup/transfer");

/**
 * Handlers for database
 * @param {Socket} socket Socket.io instance
 * @returns {void}
 */
module.exports.databaseSocketHandler = (socket) => {
    // Post or edit incident
    socket.on("getDatabaseSize", async (callback) => {
        try {
            checkLogin(socket);
            callback({
                ok: true,
                size: await Database.getSize(),
            });
        } catch (error) {
            callback({
                ok: false,
                msg: error.message,
            });
        }
    });

    socket.on("shrinkDatabase", async (callback) => {
        try {
            checkLogin(socket);
            await Database.shrink();
            callback({
                ok: true,
            });
        } catch (error) {
            callback({
                ok: false,
                msg: error.message,
            });
        }
    });

    socket.on("createConfigurationTransferTicket", async (purpose, currentPassword, callback) => {
        try {
            await checkAdmin(socket);
            await doubleCheckPassword(socket, currentPassword);
            callback({
                ok: true,
                ...issueTransferTicket(purpose, socket.loginUserID),
            });
        } catch (error) {
            callback({
                ok: false,
                msg: error.message,
            });
        }
    });

    socket.on("getConfigurationImportStatus", async (callback) => {
        try {
            await checkAdmin(socket);
            callback({
                ok: true,
                data: await getConfigurationImportStatus(Database.dataDir),
            });
        } catch (error) {
            callback({
                ok: false,
                msg: error.message,
            });
        }
    });
};
