// Script to generate changelog
// Usage: node generate-changelog.mjs <previous-version-tag>
// GitHub CLI (gh command) is required

import * as childProcess from "child_process";

const ignoreList = [
    "louislam",
    "CommanderStorm",
    "UptimeGizmoBot",
    "weblate",
    "Copilot",
    "app/copilot-swe-agent",
    "app/github-actions",
    "github-actions[bot]",
];

const mergeList = ["chore: Translations Update from Weblate", "chore: Update dependencies"];

/** Reject option-like strings so git never treats a version as a flag. */
const VERSION_REVISION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

/**
 * Resolve a release previous_version input to an existing git commit.
 * Tries the given name, then a `v` prefix / unprefixed form.
 * @param {string} previousVersion Version tag or commit from the workflow input
 * @param {{ fetchTags?: boolean }} options Whether to `git fetch --tags` first
 * @returns {string} A git revision that `git log` can read
 * @throws {Error} If previousVersion is not an existing tag or commit
 */
export function resolvePreviousVersionRevision(previousVersion, { fetchTags = true } = {}) {
    if (!previousVersion || !VERSION_REVISION_PATTERN.test(previousVersion)) {
        throw new Error(
            `Previous version '${previousVersion}' is not a valid git tag or commit. Pass an existing tag from this repository.`
        );
    }

    if (fetchTags) {
        const fetchResult = childProcess.spawnSync("git", ["fetch", "--tags", "--force"], {
            encoding: "utf-8",
        });
        if (fetchResult.status !== 0 && fetchResult.stderr) {
            console.warn("git fetch --tags:", fetchResult.stderr.trim());
        }
    }

    const candidates = [previousVersion];
    if (previousVersion.startsWith("v")) {
        candidates.push(previousVersion.slice(1));
    } else {
        candidates.push(`v${previousVersion}`);
    }

    for (const ref of candidates) {
        const parsed = childProcess.spawnSync(
            "git",
            ["rev-parse", "--verify", "--quiet", "--end-of-options", `${ref}^{commit}`],
            { encoding: "utf-8" }
        );
        if (parsed.status === 0 && parsed.stdout.trim()) {
            if (ref !== previousVersion) {
                console.log(`Resolved previous version ${previousVersion} to git ref ${ref}`);
            }
            return ref;
        }
    }

    const tagsResult = childProcess.spawnSync("git", ["tag", "--list", "--sort=-creatordate"], {
        encoding: "utf-8",
    });
    const tags = (tagsResult.stdout || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const known = tags.length > 0 ? tags.slice(0, 20).join(", ") : "(none)";
    throw new Error(
        `Previous version '${previousVersion}' is not a git tag or commit in this repository. Changelog generation needs an existing revision. Known tags: ${known}. Create the missing tag first, or pass one of those tags as previous_version.`
    );
}

const outputFormat = JSON.stringify({
    improvements: [123, 456],
    newFeatures: [789],
    bugFixes: [101, 112],
    securityFixes: [131, 415],
    translationContributions: [161, 718],
    others: [192, 21],
});

const prompt = `Input Data: {{ input }}
LLM Task:
- Output a one-line JSON object in the following format:
{{ outputFormat }}
- Empty arrays included if there are no items for that category.
- Exclude reverted pull requests.
- "fix: " type pull requests should be categorized as "bugFixes".
- "chore: " type pull requests should be categorized as "others"
- "feat: " type pull requests should be categorized as "newFeatures" or "improvements" based on the content of the title, you should determine it.
- "refactor: " type pull requests should be categorized as "improvements".
`.replace("{{ outputFormat }}", outputFormat);

const categoryList = {
    // In case the LLM cannot categorize some items
    uncategorized: {
        title: "Uncategorized",
        items: [],
    },
    newFeatures: {
        title: "🆕 New Features",
        items: [],
    },
    improvements: {
        title: "💇‍♀️ Improvements",
        items: [],
    },
    bugFixes: {
        title: "🐞 Bug Fixes",
        items: [],
    },
    securityFixes: {
        title: "⬆️ Security Fixes",
        items: [],
    },
    translationContributions: {
        title: "🦎 Translation Contributions",
        items: [],
    },
    others: {
        title: "Others",
        items: [],
    },
};

if (import.meta.main) {
    await main();
}

/**
 * Main Function
 * @returns {Promise<void>}
 */
async function main() {
    const previousVersion = process.argv[2];
    const action = process.argv[3];
    const categorizedMap = process.argv[4] ? JSON.parse(process.argv[4]) : null;

    if (action === "generate") {
        console.log(`Generating changelog since version ${previousVersion}...`);
        console.log(await generateChangelog(previousVersion, categorizedMap));
    } else {
        if (!previousVersion) {
            console.error("Please provide the previous version as the first argument.");
            process.exit(1);
        }
        console.log(await getPrompt(previousVersion));
    }
}

/**
 * Get Prompt for LLM
 * @param {string} previousVersion Previous Version Tag
 * @returns {Promise<string>} Prompt for LLM
 */
export async function getPrompt(previousVersion) {
    const input = JSON.stringify(await getPullRequestList(previousVersion, true));
    return prompt.replace("{{ input }}", input);
}

/**
 * Generate Changelog
 * @param {string} previousVersion Previous Version Tag
 * @param {object} categorizedMap It should be generated by the LLM based on the prompt
 * @returns {Promise<string>} Changelog Content
 */
export async function generateChangelog(previousVersion, categorizedMap) {
    const prList = await getPullRequestList(previousVersion);
    const list = [];

    let i = 1;
    for (const pr of prList) {
        console.log(`Progress: ${i++}/${prList.length}`);
        let authorSet = await getAuthorList(pr.number);
        authorSet = await mainAuthorToFront(pr.author.login, authorSet);

        if (mergeList.includes(pr.title)) {
            // Check if it is already in the list
            const existingItem = list.find((item) => item.title === pr.title);
            if (existingItem) {
                existingItem.numbers.push(pr.number);
                for (const author of authorSet) {
                    existingItem.authors.add(author);
                    // Sort the authors
                    existingItem.authors = new Set([...existingItem.authors].sort((a, b) => a.localeCompare(b)));
                }
                continue;
            }
        }

        const item = {
            numbers: [pr.number],
            title: pr.title,
            authors: authorSet,
        };

        list.push(item);
    }

    for (const item of list) {
        // Concat pr numbers into a string like #123 #456
        const prPart = item.numbers.map((num) => `#${num}`).join(" ");

        // Concat authors into a string like @user1 @user2
        let authorPart = [...item.authors].map((author) => `@${author}`).join(" ");

        if (authorPart) {
            authorPart = `(Thanks ${authorPart})`;
        }

        const line = `- ${prPart} ${item.title} ${authorPart}`;

        // Determine the category of the item, based on the title and the categorizedMap
        let category = "uncategorized";
        let prNumber = item.numbers[0];

        for (const cat in categorizedMap) {
            if (categorizedMap[cat].includes(prNumber)) {
                category = cat;
                break;
            }
        }

        categoryList[category].items.push(line);
    }

    // Generate markdown
    let content = "";

    for (const cat in categoryList) {
        content += `### ${categoryList[cat].title}\n`;
        for (const item of categoryList[cat].items) {
            content += `${item}\n`;
        }
        content += `\n`;
    }

    return content;
}

/**
 * Generate Changelog using AI
 * @param {string} previousVersion Previous Version Tag
 * @returns {Promise<string>} Changelog Content
 */
export async function generateChangelogAI(previousVersion) {
    // 1. Generate changelog
    let categorizedMap = null;

    console.log("Running opencode to categorize PRs...");
    const llmPrompt = (await getPrompt(previousVersion)).replaceAll("\n", " ");

    console.log(llmPrompt);

    console.log("Running opencode with the above prompt...");

    try {
        const result = childProcess.spawnSync(
            "opencode",
            ["run", "-m", "opencode/big-pickle", "--format", "json", llmPrompt],
            {
                encoding: "utf-8",
                timeout: 120000,
                shell: true,
                cwd: process.cwd(),
                env: process.env,
            }
        );

        if (result.status === 0 && result.stdout) {
            // Parse NDJSON output: find "type":"text" line
            for (const line of result.stdout.trim().split("\n")) {
                try {
                    const obj = JSON.parse(line);
                    if (obj.type === "text" && obj.part?.text) {
                        const jsonMatch = obj.part.text.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            categorizedMap = JSON.parse(jsonMatch[0]);
                            console.log("LLM categorization applied.");
                            break;
                        }
                    }
                } catch {
                    // skip unparseable lines
                }
            }

            if (!categorizedMap) {
                console.warn("No JSON found in opencode response.");
                console.warn(result.stdout);
            }
        } else {
            console.warn("opencode failed or returned no output (status:", result.status, ")");
            if (result.stderr) {
                console.warn("stderr:", result.stderr.slice(0, 500));
            }
        }
    } catch (e) {
        console.warn("Failed to run opencode:", e.message);
    }

    if (!categorizedMap) {
        categorizedMap = {};
        console.log("OpenCode unavailable, using uncategorized fallback.");
    }

    return await generateChangelog(previousVersion, categorizedMap);
}

/**
 * @param {string} previousVersion Previous Version Tag
 * @param {boolean} removeAuthor Whether to strip the author field from the returned PR list
 * @returns {Promise<object>} List of Pull Requests merged since previousVersion
 */
export async function getPullRequestList(previousVersion, removeAuthor = false) {
    const revision = resolvePreviousVersionRevision(previousVersion);
    const log = childProcess.spawnSync(
        "git",
        ["log", "-1", "--format=%cd", "--date=iso8601-strict", revision],
        { encoding: "utf-8" }
    );
    const previousVersionDate = (log.stdout || "").trim();

    if (log.status !== 0 || !previousVersionDate) {
        throw new Error(
            `Unable to find the date of version ${previousVersion} (resolved to ${revision}). Please make sure the version tag exists.`
        );
    }

    const ghProcess = childProcess.spawnSync(
        "gh",
        [
            "pr",
            "list",
            "--state",
            "merged",
            "--base",
            "main",
            "--search",
            `merged:>=${previousVersionDate}`,
            "--json",
            "number,title,author",
            "--limit",
            "1000",
        ],
        {
            encoding: "utf-8",
        }
    );

    if (ghProcess.error) {
        throw ghProcess.error;
    }

    if (ghProcess.status !== 0) {
        throw new Error(`gh command failed with status ${ghProcess.status}: ${ghProcess.stderr}`);
    }

    const obj = JSON.parse(ghProcess.stdout);

    if (removeAuthor) {
        for (const pr of obj) {
            delete pr.author;
        }
    }

    return obj;
}

/**
 * @param {number} prID Pull Request ID
 * @returns {Promise<Set<string>>} Set of Authors' GitHub Usernames
 */
async function getAuthorList(prID) {
    const ghProcess = childProcess.spawnSync("gh", ["pr", "view", prID, "--json", "commits"], {
        encoding: "utf-8",
    });

    if (ghProcess.error) {
        throw ghProcess.error;
    }

    if (ghProcess.status !== 0) {
        throw new Error(`gh command failed with status ${ghProcess.status}: ${ghProcess.stderr}`);
    }

    const prInfo = JSON.parse(ghProcess.stdout);
    const commits = prInfo.commits;

    const set = new Set();

    for (const commit of commits) {
        for (const author of commit.authors) {
            if (author.login && !ignoreList.includes(author.login)) {
                set.add(author.login);
            }
        }
    }

    // Sort the set
    return new Set([...set].sort((a, b) => a.localeCompare(b)));
}

/**
 * @param {string} mainAuthor Main Author
 * @param {Set<string>} authorSet Set of Authors
 * @returns {Set<string>} New Set with mainAuthor at the front
 */
export async function mainAuthorToFront(mainAuthor, authorSet) {
    if (ignoreList.includes(mainAuthor)) {
        return authorSet;
    }
    return new Set([mainAuthor, ...authorSet]);
}
