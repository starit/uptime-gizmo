const { describe, test, afterEach } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { R } = require("redbean-node");
const { notificationRecipients } = require("../../server/notification-recipients");

describe("notificationRecipients()", () => {
    let restore = null;

    afterEach(() => {
        if (restore) {
            R.getAll = restore;
            restore = null;
        }
    });

    test("asks only for the monitor's channels that are switched on", async () => {
        restore = R.getAll;
        let asked = null;
        R.getAll = async (sql, bindings) => {
            asked = { sql, bindings };
            return [];
        };

        await notificationRecipients(42);

        assert.match(asked.sql, /notification\.active = 1/);
        assert.match(asked.sql, /monitor_notification\.monitor_id = \?/);
        assert.deepEqual(asked.bindings, [ 42 ]);
    });
});

/*
 * The reason this selection lives in one module is that it used to live in two,
 * and when the active flag was made to mean something only one of them learned
 * about it: a disabled channel stopped receiving outage alerts and kept
 * receiving certificate warnings. That is worse than the flag never having
 * worked, because the operator has evidence it is off.
 *
 * A third copy would fail the same way, so the files allowed to write this join
 * are listed rather than left to review. Adding one means saying why here.
 */
const JOINS_ALLOWED = new Map([
    [ "notification-recipients.js", "the single delivery query" ],
    [
        "routers/v1-router.js",
        "lists a monitor's attachments for management, where a disabled channel"
        + " must stay visible or it could never be re-enabled or detached",
    ],
]);

describe("delivery paths", () => {
    const serverDirectory = path.join(__dirname, "..", "..", "server");

    /**
     * Every .js file under server/, recursively.
     * @param {string} directory Where to look
     * @returns {string[]} Absolute paths
     */
    function sourceFiles(directory) {
        return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
            const full = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                return sourceFiles(full);
            }
            return entry.name.endsWith(".js") ? [ full ] : [];
        });
    }

    test("select their recipients through one query", () => {
        const joiners = sourceFiles(serverDirectory)
            .filter((file) => {
                const contents = fs.readFileSync(file, "utf8");
                return /monitor_notification[\s\S]{0,200}?FROM notification|FROM notification[\s\S]{0,200}?monitor_notification/
                    .test(contents);
            })
            // path.relative yields backslashes on Windows; the allowlist below
            // is written with forward slashes, so normalise before comparing.
            .map(file => path.relative(serverDirectory, file).split(path.sep).join("/"))
            .sort();

        assert.deepEqual(
            joiners,
            [ ...JOINS_ALLOWED.keys() ].sort(),
            "a file joins notification to monitor_notification itself; route delivery through"
            + " notificationRecipients(), or record here why this one is not a delivery path"
        );
    });
});
