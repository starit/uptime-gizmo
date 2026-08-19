const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const compareVersions = require("compare-versions");

/*
 * Where this fork looks for its own releases.
 *
 * The checker used to ask uptime.kuma.pet — upstream's endpoint. Every instance
 * would have reported in to somebody else's infrastructure, and it compared this
 * version against upstream's releases, so an Uptime Kuma release would have told
 * every Gizmo user they were out of date and pointed them at a different
 * product. That is the kind of thing that is obvious once seen and invisible
 * until then, so it is written down.
 */

const SOURCE = fs.readFileSync(path.join(__dirname, "..", "..", "server", "check-version.js"), "utf8");

/*
 * Comments removed before checking, since the comment explaining why upstream's
 * endpoint was abandoned necessarily names it.
 */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("the update checker looks at this project", () => {
    it("does not ask upstream", () => {
        assert.doesNotMatch(CODE, /kuma\.pet/, "instances would report in to upstream and compare against its releases");
    });

    it("reads this repository's releases", () => {
        assert.match(CODE, /api\.github\.com\/repos\/starit\/uptime-gizmo\/releases/);
    });

    it("bounds the request", () => {
        // An update check is background work; it must not sit on a socket
        // indefinitely because a network is unreachable.
        assert.match(CODE, /timeout:\s*\d+/, "the update check has no timeout");
    });
});

/*
 * The selection itself. GitHub returns every release in one array — drafts,
 * prereleases, and tags that are not versions at all — so which one counts as
 * "latest" is a decision this code makes rather than one the API makes for it.
 */
describe("picking the latest release", () => {
    /**
     * The checker's selection, kept in step with server/check-version.js.
     * @param {Array<object>} releases what the API returned
     * @param {boolean} checkBeta whether prereleases count
     * @returns {string|undefined} the version to offer, if any
     */
    function pick(releases, checkBeta) {
        const versionOf = (r) => String(r?.tag_name ?? "").replace(/^v/, "");
        const usable = (r) => !r?.draft && compareVersions.validate(versionOf(r));
        const stable = releases.filter((r) => usable(r) && !r.prerelease).map(versionOf);
        const beta = releases.filter((r) => usable(r) && r.prerelease).map(versionOf);
        const newest = (list) => list.sort((a, b) => (compareVersions.compare(b, a, ">") ? 1 : -1))[0];

        const latestStable = newest(stable);
        const latestBeta = newest(beta);

        if (checkBeta && latestBeta && (!latestStable || compareVersions.compare(latestBeta, latestStable, ">"))) {
            return latestBeta;
        }
        return latestStable;
    }

    it("takes the newest stable release", () => {
        assert.strictEqual(pick([ { tag_name: "3.0.0" }, { tag_name: "2.9.0" } ], false), "3.0.0");
    });

    it("accepts a tag with or without a leading v", () => {
        assert.strictEqual(pick([ { tag_name: "v3.1.0" } ], false), "3.1.0");
    });

    it("ignores prereleases unless they were asked for", () => {
        const releases = [ { tag_name: "3.0.0" }, { tag_name: "3.1.0-beta.1", prerelease: true } ];

        assert.strictEqual(pick(releases, false), "3.0.0");
        assert.strictEqual(pick(releases, true), "3.1.0-beta.1");
    });

    it("ignores a draft, however high its number", () => {
        // A draft is not published; offering it would point people at a download
        // that does not exist.
        assert.strictEqual(pick([ { tag_name: "9.9.9", draft: true }, { tag_name: "3.0.0" } ], false), "3.0.0");
    });

    it("ignores a tag that is not a version", () => {
        assert.strictEqual(pick([ { tag_name: "nightly" }, { tag_name: "3.0.0" } ], false), "3.0.0");
    });

    it("offers nothing when there are no releases yet", () => {
        assert.strictEqual(pick([], false), undefined);
    });
});

describe("the published version", () => {
    const pkg = require("../../package.json");

    it("is a version the checker could compare", () => {
        assert.ok(compareVersions.validate(pkg.version), `${pkg.version} is not a comparable version`);
    });

    /*
     * The image tags the release script pushes have to match the major version,
     * or `docker pull uptime-gizmo:3` would fetch a 2.x image.
     */
    it("agrees with the major tag the release pushes", () => {
        const release = fs.readFileSync(path.join(__dirname, "..", "..", "extra", "release", "final.mjs"), "utf8");
        const major = pkg.version.split(".")[0];

        assert.match(
            release,
            new RegExp(`"next",\\s*"${major}",\\s*version`),
            `the release pushes a major tag that is not ${major}`
        );
    });
});
