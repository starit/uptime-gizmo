const basicAuth = require("express-basic-auth");
const passwordHash = require("./password-hash");
const { R } = require("redbean-node");
const { log } = require("../src/util");
const {
    loginRateLimiter,
    apiAuthFailureRateLimiter,
    apiThroughputRateLimiter,
    isUnlimitedApiKey,
} = require("./rate-limiter");
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
 * Callback for basic auth authorizers
 * @callback authCallback
 * @param {any} err Any error encountered
 * @param {boolean} authorized Is the client authorized?
 */

/**
 * The account the instance's resources hang off.
 *
 * Recorded at first login and read here so an API key sees the same estate the
 * browser does. Falls back to the key's own account, which is correct for an
 * instance that has only ever had one.
 * @param {number} fallback account to use when nothing is recorded yet
 * @returns {Promise<number>} the owning account's id
 */
async function estateOwnerID(fallback) {
    const recorded = await Settings.get("instanceOwnerId");
    return recorded ? Number(recorded) : fallback;
}

/**
 * Custom authorizer for express-basic-auth
 * @param {express.Request} req Request the principal is attached to
 * @param {string} username Username to login with
 * @param {string} password Password to login with
 * @param {authCallback} callback Callback to handle login result
 * @returns {void}
 */
function apiAuthorizer(req, username, password, callback) {
    /*
     * Bound how fast a key can be guessed, not how fast a valid one can be
     * used. A token is spent below only when an attempt fails, so a client
     * holding a real key never draws this bucket down however hard it polls,
     * and one source guessing cannot exhaust the allowance of the rest.
     */
    const source = authSource(req);
    apiAuthFailureRateLimiter.hasAllowance(source).then((allowed) => {
        if (allowed) {
            resolveAPIKey(password).then(async (apiKey) => {
                const valid = apiKey !== null;
                if (!valid) {
                    await apiAuthFailureRateLimiter.removeTokens(source, 1);
                    log.warn("api-auth", "Failed API auth attempt: invalid API Key");
                } else {
                    // express-basic-auth invokes the authorizer as a plain
                    // function, so the request is only reachable through a
                    // closure. apiAuth builds this middleware per request, so
                    // capturing req here cannot leak across requests.
                    /*
                     * Two identities, named apart on purpose.
                     *
                     * accountID is whose key this is. estateID is what the
                     * instance's resources hang off, which every session in the
                     * browser also adopts — so a key belonging to someone who is
                     * not the owner still sees the estate its owner can see, and
                     * the API agrees with the interface instead of reporting an
                     * empty instance.
                     *
                     * Calling both of them userID is what let a room name mean
                     * two things at once elsewhere in this change.
                     */
                    req.principal = {
                        accountID: apiKey.user_id,
                        estateID: await estateOwnerID(apiKey.user_id),
                        apiKeyID: apiKey.id,
                        readOnly: Boolean(apiKey.read_only),
                    };
                }
                callback(null, valid);
            });
        } else {
            log.warn("api-auth", "Failed API auth attempt: too many failed attempts from this source");
            callback(null, false);
        }
    });
}

/**
 * Which bucket a request's failed authentication attempts count against.
 *
 * Express reports the peer address, which behind a proxy is the proxy. Trusting
 * a forwarded header unconditionally would let a caller choose its own bucket
 * by sending whatever address it liked, so the header is read only when this
 * instance has been configured to sit behind a proxy.
 * @param {express.Request} req Request the attempt arrived on
 * @returns {string} Bucket key for that source
 */
function authSource(req) {
    if (req?.app?.get("trust proxy")) {
        return req.ip || "unknown";
    }
    return req?.socket?.remoteAddress || req?.ip || "unknown";
}

/**
 * Spend one unit of the authenticated key's throughput allowance.
 *
 * Runs after authentication, because until the key is resolved there is no
 * bucket to spend from. A key the operator named as a service key is exempt:
 * it belongs to something the instance is operated by rather than to a person
 * using it, and throttling it throttles every tenant it serves.
 * @param {express.Request} req Express request object
 * @param {express.Response} res Express response object
 * @param {express.NextFunction} next Next handler in chain
 * @returns {Promise<void>}
 */
async function apiThroughputGate(req, res, next) {
    const apiKeyID = req.principal?.apiKeyID;
    if (apiKeyID === undefined || isUnlimitedApiKey(apiKeyID)) {
        next();
        return;
    }

    const remaining = await apiThroughputRateLimiter.removeTokens(String(apiKeyID), 1);
    if (remaining < 0) {
        log.warn("api-auth", `API key ${apiKeyID} exceeded its request allowance`);
        res.status(429).set("Retry-After", "60").json({
            ok: false,
            msg: apiThroughputRateLimiter.errorMessage,
        });
        return;
    }
    next();
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
        /*
         * The throughput gate runs on the far side of authentication so that it
         * has a principal to charge, and answers 429 itself rather than letting
         * a spent allowance look like a rejected credential.
         */
        middleware(req, res, () => apiThroughputGate(req, res, next));
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
