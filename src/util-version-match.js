/*
 * Nightly images rewrite package.json after dist is already compiled, so the
 * backend is `<frontend>-nightly-YYYYMMDDHHmmss` while the UI still has
 * `<frontend>`. That pair is the same build. Any other difference is mixed
 * dist and server.
 */

/** @type {RegExp} */
const NIGHTLY_STAMP = /^(.*)-nightly-\d{14}$/;

/**
 * Whether About should treat frontend and backend as the same build.
 * @param {unknown} backendVersion From the server info payload
 * @param {unknown} frontendVersion Baked in at `pnpm run build`
 * @returns {boolean} Same build?
 */
function frontendBackendVersionsMatch(backendVersion, frontendVersion) {
    if (!backendVersion) {
        return true;
    }
    if (backendVersion === frontendVersion) {
        return true;
    }
    if (typeof backendVersion !== "string" || typeof frontendVersion !== "string") {
        return false;
    }
    const stamped = backendVersion.match(NIGHTLY_STAMP);
    return Boolean(stamped && stamped[1] === frontendVersion);
}

module.exports = {
    frontendBackendVersionsMatch,
};
