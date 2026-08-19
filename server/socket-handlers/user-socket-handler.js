const { R } = require("redbean-node");
const passwordHash = require("../password-hash");
const { checkAdmin, setting, setSetting } = require("../util-server");
const { log } = require("../../src/util");

/*
 * Account management: the only thing the administrator flag governs.
 *
 * Everything else about the instance is open to anyone who can sign in, which is
 * what it already is with a single account. See docs/plans/multi-user.md.
 */

/**
 * Everything about an account except the parts that authenticate it.
 * @param {object} bean user row
 * @returns {object} safe to send to a browser
 */
function toPublic(bean) {
    return {
        id: bean.id,
        username: bean.username,
        active: Boolean(bean.active),
        admin: Boolean(bean.admin),
        twofaEnabled: Boolean(bean.twofa_status),
    };
}

/**
 * How many administrators could still sign in if this one were removed.
 * @param {number} excludingID account about to be demoted or deleted
 * @returns {Promise<number>} remaining administrators
 */
async function otherAdmins(excludingID) {
    return await R.count("user", " admin = 1 AND active = 1 AND id != ? ", [ excludingID ]);
}

/**
 * Refuse to leave the instance without a way in.
 * @param {number} id account about to change
 * @returns {Promise<void>} resolves when the change is safe
 * @throws {Error} when it would remove the last administrator
 */
async function assertNotLastAdmin(id) {
    if ((await otherAdmins(id)) === 0) {
        throw new Error("This is the last administrator; the instance would have no way back in.");
    }
}

/**
 * Handlers for accounts.
 * @param {Socket} socket Socket.io instance
 * @returns {void}
 */
module.exports.userSocketHandler = (socket) => {
    socket.on("listUsers", async (callback) => {
        try {
            await checkAdmin(socket);
            const list = await R.findAll("user", " ORDER BY username ");
            callback({ ok: true, users: list.map(toPublic) });
        } catch (e) {
            callback({ ok: false, msg: e.message });
        }
    });

    socket.on("addUser", async (data, callback) => {
        try {
            await checkAdmin(socket);

            const username = String(data?.username ?? "").trim();
            const password = String(data?.password ?? "");

            if (!username) {
                throw new Error("A username is required");
            }
            if (password.length < 6) {
                throw new Error("The password must be at least 6 characters");
            }
            if (await R.findOne("user", " username = ? ", [ username ])) {
                throw new Error("That username is taken");
            }

            const bean = R.dispense("user");
            bean.username = username;
            bean.password = await passwordHash.generate(password);
            bean.active = 1;
            bean.admin = data?.admin ? 1 : 0;
            await R.store(bean);

            log.info("manage", `Added user ${username} (admin: ${Boolean(bean.admin)})`);
            callback({ ok: true, msg: "Saved.", msgi18n: true, id: bean.id });
        } catch (e) {
            callback({ ok: false, msg: e.message });
        }
    });

    socket.on("setUserAdmin", async (userID, isAdmin, callback) => {
        try {
            await checkAdmin(socket);

            const bean = await R.findOne("user", " id = ? ", [ userID ]);
            if (!bean) {
                throw new Error("No such account");
            }
            if (!isAdmin) {
                await assertNotLastAdmin(bean.id);
            }

            bean.admin = isAdmin ? 1 : 0;
            await R.store(bean);

            callback({ ok: true, msg: "Saved.", msgi18n: true });
        } catch (e) {
            callback({ ok: false, msg: e.message });
        }
    });

    socket.on("setUserActive", async (userID, isActive, callback) => {
        try {
            await checkAdmin(socket);

            const bean = await R.findOne("user", " id = ? ", [ userID ]);
            if (!bean) {
                throw new Error("No such account");
            }
            if (!isActive) {
                await assertNotLastAdmin(bean.id);
            }

            bean.active = isActive ? 1 : 0;
            await R.store(bean);

            /*
             * Disabling an account has to withdraw its API keys too. A key is
             * checked for being active and unexpired, not for the account behind
             * it still being allowed in, so leaving them enabled would leave a
             * way back after access was taken away.
             */
            if (!isActive) {
                await R.exec("UPDATE api_key SET active = 0 WHERE user_id = ? ", [ bean.id ]);
            }

            callback({ ok: true, msg: "Saved.", msgi18n: true });
        } catch (e) {
            callback({ ok: false, msg: e.message });
        }
    });

    socket.on("resetUserPassword", async (userID, newPassword, callback) => {
        try {
            await checkAdmin(socket);

            const bean = await R.findOne("user", " id = ? ", [ userID ]);
            if (!bean) {
                throw new Error("No such account");
            }
            if (String(newPassword ?? "").length < 6) {
                throw new Error("The password must be at least 6 characters");
            }

            bean.password = await passwordHash.generate(newPassword);
            await R.store(bean);

            log.info("manage", `Reset password for user ID ${bean.id}`);
            callback({ ok: true, msg: "Saved.", msgi18n: true });
        } catch (e) {
            callback({ ok: false, msg: e.message });
        }
    });

    socket.on("deleteUser", async (userID, callback) => {
        try {
            await checkAdmin(socket);

            const bean = await R.findOne("user", " id = ? ", [ userID ]);
            if (!bean) {
                throw new Error("No such account");
            }
            if (Number(bean.id) === Number(socket.loginUserID)) {
                throw new Error("You cannot delete the account you are signed in with.");
            }
            await assertNotLastAdmin(bean.id);

            /*
             * The estate points at one account. If that is the one being
             * removed, hand the resources to another administrator first —
             * otherwise every monitor, integration and maintenance window would
             * be orphaned and disappear from every session at once.
             */
            const ownerID = Number(await setting("instanceOwnerId"));
            if (ownerID === Number(bean.id)) {
                const heir = await R.findOne("user", " admin = 1 AND active = 1 AND id != ? ORDER BY id ", [ bean.id ]);
                if (!heir) {
                    throw new Error("No other administrator can take over this instance's monitors.");
                }

                for (const table of [
                    "monitor",
                    "notification",
                    "proxy",
                    "docker_host",
                    "remote_browser",
                    "web3_network",
                    "maintenance",
                ]) {
                    await R.exec(`UPDATE ${table} SET user_id = ? WHERE user_id = ?`, [ heir.id, bean.id ]);
                }

                await setSetting("instanceOwnerId", String(heir.id), "general");
                log.info("manage", `Instance ownership moved to user ID ${heir.id}`);
            }

            await R.exec("DELETE FROM api_key WHERE user_id = ? ", [ bean.id ]);
            await R.trash(bean);

            log.info("manage", `Deleted user ID ${userID}`);
            callback({ ok: true, msg: "successDeleted", msgi18n: true });
        } catch (e) {
            callback({ ok: false, msg: e.message });
        }
    });
};
