import { createRequire } from "module";
const require = createRequire(import.meta.url);

const pkg = require("../../package.json");
const fs = require("fs");
const childProcess = require("child_process");
const util = require("../../src/util");

util.polyfill();

const version = process.env.RELEASE_BETA_VERSION;

console.log("Beta Version: " + version);

if (!version || !version.includes("-beta.")) {
    console.error("invalid version, beta version only");
    process.exit(1);
}

const exists = tagExists(version);

if (!exists) {
    // Process package.json
    pkg.version = version;
    fs.writeFileSync("package.json", JSON.stringify(pkg, null, 4) + "\n");

    // Also update pnpm-lock.yaml
    const pnpm = /^win/.test(process.platform) ? "pnpm.cmd" : "pnpm";
    const resultVersion = childProcess.spawnSync(pnpm, ["--no-git-tag-version", "version", version], { shell: true });
    if (resultVersion.error) {
        console.error(resultVersion.error);
        console.error("error pnpm version!");
        process.exit(1);
    }
    const resultInstall = childProcess.spawnSync(pnpm, ["install", "--lockfile-only"], { shell: true });
    if (resultInstall.error) {
        console.error(resultInstall.error);
        console.error("error update pnpm-lock.yaml!");
        process.exit(1);
    }
    commit(version);
} else {
    console.log("version tag exists, please delete the tag or use another tag");
    process.exit(1);
}

/**
 * Commit updated files
 * @param {string} version Version to update to
 * @returns {void}
 * @throws Error committing files
 */
function commit(version) {
    let msg = "Update to " + version;

    let res = childProcess.spawnSync("git", ["commit", "-m", msg, "-a"]);
    let stdout = res.stdout.toString().trim();
    console.log(stdout);

    if (res.status !== 0) {
        /*
         * Nothing was committed. The release owns the version bump, so the only
         * way to reach here is that the branch already carries the version being
         * released — a bump that landed with feature work, or a half-finished
         * release. Either way the operator has to decide, and guessing is worse
         * than stopping: an empty release commit would hide the mistake it was
         * made to paper over.
         *
         * The tree is read rather than git's message. Git's wording is English,
         * varies by version, and the string this used to look for — "no changes
         * added to commit" — is one `git commit -a` never prints. So the empty
         * case sailed through, an identical branch was pushed, and the run died
         * three steps later on a GraphQL error about a branch with no commits,
         * naming neither the version nor the cause.
         */
        const onDisk = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
        if (onDisk === version) {
            throw new Error(
                `package.json already says ${version}, so this release has nothing to commit. `
                + "The release sets the version; the branch it is cut from should still carry "
                + "the previous one. Take the premature bump off that branch and run this again."
            );
        }
        throw new Error(`Nothing was committed and package.json says ${onDisk}, not ${version}`);
    }

    // Get the current branch name
    res = childProcess.spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
    let branchName = res.stdout.toString().trim();
    console.log("Current branch:", branchName);

    // Git push the branch
    childProcess.spawnSync("git", ["push", "origin", branchName, "--force"], { stdio: "inherit" });
}

/**
 * Check if a tag exists for the specified version
 * @param {string} version Version to check
 * @returns {boolean} Does the tag already exist
 * @throws Version is not valid
 */
function tagExists(version) {
    if (!version) {
        throw new Error("invalid version");
    }

    let res = childProcess.spawnSync("git", ["tag", "-l", version]);

    return res.stdout.toString().trim() === version;
}
