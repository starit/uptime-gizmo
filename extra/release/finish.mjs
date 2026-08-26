import "dotenv/config";
import * as childProcess from "child_process";
import fs from "fs";
import { generateChangelogAI } from "../generate-changelog.mjs";
import { createRelease } from "./lib.mjs";

const version = process.env.RELEASE_VERSION || process.env.RELEASE_BETA_VERSION;
const previousVersion = process.env.RELEASE_PREVIOUS_VERSION;
const dryRun = process.env.DRY_RUN === "true";
const isBeta = !!process.env.RELEASE_BETA_VERSION;
const prNumberFile = "./tmp/pr-number.txt";
const distTarGz = "./tmp/dist.tar.gz";

if (!version) {
    console.error("RELEASE_VERSION is required");
    process.exit(1);
}

if (!previousVersion) {
    console.error("RELEASE_PREVIOUS_VERSION is required");
    process.exit(1);
}

console.log(`Finishing release ${version}...`);

/**
 * @param cmd
 */
function execSync(cmd) {
    if (dryRun) {
        console.log(`[DRY RUN] ${cmd}`);
    } else {
        childProcess.execSync(cmd, { stdio: "inherit" });
    }
}

// Read PR number
if (!fs.existsSync(prNumberFile)) {
    console.error(`PR number file not found: ${prNumberFile}`);
    console.error("The PR must be created by the release script first.");
    process.exit(1);
}
const prNumber = fs.readFileSync(prNumberFile, "utf-8").trim();

console.log("Generating changelog...");
const changelog = await generateChangelogAI(previousVersion);
console.log("Changelog generated.");

/*
 * Take the PR out of draft before merging it.
 *
 * The release PR is created as a draft deliberately: it exists while the images
 * build, which takes minutes, and a draft cannot be merged out from under the
 * run. But a draft cannot be merged by this script either — GitHub's
 * mergePullRequest refuses one outright, and `--admin` does not change that. That
 * flag waives branch protection, not readiness. Without this step the run got all
 * the way through pushing images and then died on "Pull Request is still a draft".
 *
 * A failure here is not fatal. A PR that is already out of draft says so and
 * nothing needs doing, and a PR that genuinely cannot be readied produces a
 * clearer error from the merge below than it would from here.
 */
console.log(`Marking PR #${prNumber} ready for review...`);
if (dryRun) {
    console.log(`[DRY RUN] gh pr ready ${prNumber}`);
} else {
    const ready = childProcess.spawnSync("gh", [ "pr", "ready", String(prNumber) ], { encoding: "utf-8" });
    if (ready.status !== 0) {
        console.warn(`Could not mark PR #${prNumber} ready: ${(ready.stderr || "").trim()}`);
    }
}

// 2. Squash merge the PR
console.log(`Squash merging PR #${prNumber}...`);
execSync(`gh pr merge ${prNumber} --squash --delete-branch --subject "Update to ${version}" --admin`);

await createRelease(version, changelog, isBeta, distTarGz);
