const { setSetting, setting } = require("./util-server");
const axios = require("axios");
const compareVersions = require("compare-versions");
const { log } = require("../src/util");

exports.version = require("../package.json").version;
exports.latestVersion = null;

// How much time in ms to wait between update checks
const UPDATE_CHECKER_INTERVAL_MS = 1000 * 60 * 60 * 48;

/*
 * This fork's own releases, read from GitHub.
 *
 * It used to ask uptime.kuma.pet, which is upstream's endpoint. Every instance
 * would have reported in to somebody else's infrastructure, and — worse — it
 * compared this version against upstream's releases: an Uptime Kuma release
 * would have told every Gizmo user they were out of date and pointed them at a
 * different product.
 *
 * The releases API needs no infrastructure of its own. A prerelease is what
 * "beta" means here; GitHub marks them, so the two channels come from one call.
 */
const UPDATE_CHECKER_LATEST_VERSION_URL = "https://api.github.com/repos/starit/uptime-gizmo/releases";

let interval;

exports.startInterval = () => {
    let check = async () => {
        if ((await setting("checkUpdate")) === false) {
            return;
        }

        log.debug("update-checker", "Retrieving latest versions");

        try {
            const res = await axios.get(UPDATE_CHECKER_LATEST_VERSION_URL, {
                timeout: 15000,
                headers: { Accept: "application/vnd.github+json" },
            });

            const releases = Array.isArray(res.data) ? res.data : [];
            // A tag may or may not carry a leading v; the comparison cannot.
            const versionOf = (release) => String(release?.tag_name ?? "").replace(/^v/, "");
            const usable = (release) => !release?.draft && compareVersions.validate(versionOf(release));

            const stable = releases.filter((r) => usable(r) && !r.prerelease).map(versionOf);
            const beta = releases.filter((r) => usable(r) && r.prerelease).map(versionOf);
            const newest = (list) => list.sort((a, b) => compareVersions.compare(b, a, ">") ? 1 : -1)[0];

            let latestStable = newest(stable);
            let latestBeta = newest(beta);

            // For debug
            if (process.env.TEST_CHECK_VERSION === "1") {
                latestStable = "1000.0.0";
            }

            let checkBeta = await setting("checkBeta");

            if (checkBeta && latestBeta && (!latestStable || compareVersions.compare(latestBeta, latestStable, ">"))) {
                exports.latestVersion = latestBeta;
                return;
            }

            if (latestStable) {
                exports.latestVersion = latestStable;
            }
        } catch (_) {
            log.info("update-checker", "Failed to check for new versions");
        }
    };

    check();
    interval = setInterval(check, UPDATE_CHECKER_INTERVAL_MS);
};

/**
 * Enable the check update feature
 * @param {boolean} value Should the check update feature be enabled?
 * @returns {Promise<void>}
 */
exports.enableCheckUpdate = async (value) => {
    await setSetting("checkUpdate", value);

    clearInterval(interval);

    if (value) {
        exports.startInterval();
    }
};

exports.socket = null;
