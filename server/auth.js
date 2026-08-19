const basicAuth = require("express-basic-auth");
const passwordHash = require("./password-hash");
const { R } = require("redbean-node");
const { log } = require("../src/util");
const { loginRateLimiter, apiRateLimiter } = require("./rate-limiter");
const { Settings } = require("./settings");
const dayjs = require("dayjs");

/**
 * Login to web app
 * @param {string} username Username to login with
 * @param {string} password Password to login with
 * @returns {Promise<(Bean|null)>} User or null if login failed
 */
exports.login = async function (username, password) {
    if (typeof username !== "string" || typeof password !== "string") {
        return null;
    }

    let user = await R.findOne("user", "TRIM(username) = ? AND active = 1 ", [username.trim()]);

    if (user && passwordHash.verify(password, user.password)) {
        // Upgrade the hash to bcrypt
        if (passwordHash.needRehash(user.password)) {
            await R.exec("UPDATE `user` SET password = ? WHERE id = ? ", [
                await passwordHash.generate(password),
                user.id,
            ]);
        }
        return user;
    }

    return null;
};

/**
 * Validate a provided API key
 * Resolve an API key to its record.
 *
 * Returns the key row rather than a boolean so callers can see who is asking
 * and what the key permits. An expired, inactive or unknown key resolves to
 * null, which is the only "not authorised" answer.
 * @param {string} key API key to verify
 * @returns {Promise<object|null>} the api_key record, or null
 */
async function resolveAPIKey(key) {
    if (typeof key !== "string") {
        return null;
    }

    // uk prefix + key ID is before _
    let index = key.substring(2, key.indexOf("_"));
    let clear = key.substring(key.indexOf("_") + 1, key.length);

    let hash = await R.findOne("api_key", " id=? ", [index]);

    if (hash === null) {
        return null;
    }

    let current = dayjs();
    let expiry = dayjs(hash.expires);
    if (expiry.diff(current) < 0 || !hash.active) {
        return null;
    }

    /*
     * And the account behind it has to still be allowed in.
     *
     * A key was only ever checked for being active and unexpired. With one
     * account that made no difference; with several, disabling someone would
     * take away their password and leave their keys working — a way back in
     * after access was withdrawn.
     */
    const owner = await R.findOne("user", " id = ? ", [ hash.user_id ]);
    if (!owner || !owner.active) {
        log.warn("api-auth", `API key ${hash.id} belongs to an account that cannot sign in`);
        return null;
    }

    if (!passwordHash.verify(clear, hash.key)) {
        return null;
    }

    return hash;
}

/**
 * Verify an API key
 * @param {string} key API key to verify
 * @returns {Promise<boolean>} API is ok?
 */
async function verifyAPIKey(key) {
    return (await resolveAPIKey(key)) !== null;
}

/**
 * Callback for basic auth authorizers
 * @callback authCallback
 * @param {any} err Any error encountered
 * @param {boolean} authorized Is the client authorized?
 */

/**
 * Custom authorizer for express-basic-auth
 * @param {express.Request} req Request the principal is attached to
 * @param {string} username Username to login with
 * @param {string} password Password to login with
 * @param {authCallback} callback Callback to handle login result
 * @returns {void}
 */
function apiAuthorizer(req, username, password, callback) {
    // API Rate Limit
    apiRateLimiter.pass(null, 0).then((pass) => {
        if (pass) {
            resolveAPIKey(password).then((apiKey) => {
                const valid = apiKey !== null;
                if (!valid) {
                    log.warn("api-auth", "Failed API auth attempt: invalid API Key");
                } else {
                    // express-basic-auth invokes the authorizer as a plain
                    // function, so the request is only reachable through a
                    // closure. apiAuth builds this middleware per request, so
                    // capturing req here cannot leak across requests.
                    req.principal = {
                        userID: apiKey.user_id,
                        apiKeyID: apiKey.id,
                        readOnly: Boolean(apiKey.read_only),
                    };
                }
                callback(null, valid);
                // Only allow a set number of api requests per minute
                // (currently set to 60)
                apiRateLimiter.removeTokens(1);
            });
        } else {
            log.warn("api-auth", "Failed API auth attempt: rate limit exceeded");
            callback(null, false);
        }
    });
}

/**
 * Custom authorizer for express-basic-auth
 * @param {string} username Username to login with
 * @param {string} password Password to login with
 * @param {authCallback} callback Callback to handle login result
 * @returns {void}
 */
function userAuthorizer(username, password, callback) {
    // Login Rate Limit
    loginRateLimiter.pass(null, 0).then((pass) => {
        if (pass) {
            exports.login(username, password).then((user) => {
                callback(null, user != null);

                if (user == null) {
                    log.warn("basic-auth", "Failed basic auth attempt: invalid username/password");
                    loginRateLimiter.removeTokens(1);
                }
            });
        } else {
            log.warn("basic-auth", "Failed basic auth attempt: rate limit exceeded");
            callback(null, false);
        }
    });
}

/**
 * Use basic auth if auth is not disabled
 * @param {express.Request} req Express request object
 * @param {express.Response} res Express response object
 * @param {express.NextFunction} next Next handler in chain
 * @returns {Promise<void>}
 */
exports.basicAuth = async function (req, res, next) {
    const middleware = basicAuth({
        authorizer: userAuthorizer,
        authorizeAsync: true,
        challenge: true,
    });

    const disabledAuth = await Settings.get("disableAuth");

    if (!disabledAuth) {
        middleware(req, res, next);
    } else {
        next();
    }
};

/**
 * Use use API Key if API keys enabled, else use basic auth
 * @param {express.Request} req Express request object
 * @param {express.Response} res Express response object
 * @param {express.NextFunction} next Next handler in chain
 * @returns {Promise<void>}
 */
exports.apiAuth = async function (req, res, next) {
    if (!(await Settings.get("disableAuth"))) {
        let usingAPIKeys = await Settings.get("apiKeysEnabled");
        let middleware;
        if (usingAPIKeys) {
            middleware = basicAuth({
                authorizer: (username, password, cb) => apiAuthorizer(req, username, password, cb),
                authorizeAsync: true,
                challenge: true,
            });
        } else {
            middleware = basicAuth({
                authorizer: userAuthorizer,
                authorizeAsync: true,
                challenge: true,
            });
        }
        middleware(req, res, next);
    } else {
        next();
    }
};

/**
 * Reject a request made with a read-only credential.
 *
 * A key never exceeds the authority of the user it belongs to, and a read-only
 * key may only read, whoever owns it. See docs/plans/multi-user.md.
 * @param {express.Request} req Express request object
 * @param {express.Response} res Express response object
 * @param {express.NextFunction} next Next handler in chain
 * @returns {void}
 */
exports.requireWrite = function (req, res, next) {
    if (req.principal?.readOnly) {
        res.status(403).json({
            ok: false,
            msg: "This API key is read-only.",
        });
        return;
    }
    next();
};

/**
 * Reject a request whose principal is not an administrator.
 *
 * Read-only is checked first, so a read-only key held by an admin is still
 * refused on a mutating admin route.
 * @param {express.Request} req Express request object
 * @param {express.Response} res Express response object
 * @param {express.NextFunction} next Next handler in chain
 * @returns {Promise<void>}
 */
exports.requireAdmin = async function (req, res, next) {
    const userID = req.principal?.userID;
    const user = userID ? await R.findOne("user", " id = ? AND active = 1 ", [ userID ]) : null;

    if (!user?.admin) {
        res.status(403).json({
            ok: false,
            msg: "This operation requires an administrator.",
        });
        return;
    }
    next();
};
