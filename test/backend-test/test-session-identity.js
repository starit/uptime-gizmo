const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

/*
 * The two identities a session carries, checked by reading the source.
 *
 * socket.userID is the estate — every session adopts the same account so that
 * one instance is visible to everyone, which is what lets ninety existing query
 * and broadcast sites stay as they are. socket.loginUserID is the person, and
 * only their password, their two-factor settings and their API keys use it.
 *
 * Getting this backwards fails in two very different directions. A personal
 * thing addressed to the shared identity is a leak: every signed-in session
 * would receive somebody's API keys, or be asked for somebody else's password.
 * A shared thing addressed to the personal identity only stops a screen
 * updating. Only one of those announces itself, so the dangerous direction is
 * the one written down here.
 *
 * See docs/plans/multi-user.md.
 */

const SERVER = path.join(__dirname, "..", "..", "server");

/**
 * Every .js file under server/.
 * @param {string} dir where to look
 * @returns {Array<string>} absolute paths
 */
function sourceFiles(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...sourceFiles(full));
        } else if (entry.name.endsWith(".js")) {
            out.push(full);
        }
    }
    return out;
}

/**
 * Lines of a file, with their numbers, as they would be read.
 * @param {string} file path to read
 * @returns {Array<object>} line number and text
 */
function lines(file) {
    return fs
        .readFileSync(file, "utf8")
        .split("\n")
        .map((text, index) => ({ line: index + 1, text }));
}

/** Anything touching these belongs to the person, not to the instance. */
const PERSONAL = /\bapi_key\b|APIKey\.|twofa|TwoFA|"user"|`user`/;

describe("a session's two identities stay separate", () => {
    const files = sourceFiles(SERVER);

    it("never reaches personal data through the shared identity", () => {
        const wrong = [];

        for (const file of files) {
            for (const { line, text } of lines(file)) {
                if (!text.includes("socket.userID")) {
                    continue;
                }
                if (PERSONAL.test(text)) {
                    wrong.push(`${path.relative(SERVER, file)}:${line}`);
                }
            }
        }

        assert.deepStrictEqual(
            wrong,
            [],
            "these read or write one person's data using the identity every session shares"
        );
    });

    /*
     * Naming the right identity is not enough, and an earlier version of this
     * test passed while the keys leaked anyway.
     *
     * Rooms are keyed by account id and the estate is keyed by the id of the
     * account that owns it, so `io.to(socket.loginUserID)` for the owner is the
     * estate's own room — which every session joins in order to see the
     * instance. Alice's API keys reached Bob through it. What has to be asserted
     * is the namespaced room, which cannot collide with a numeric id.
     */
    it("sends the API key list to a room no other session can be in", () => {
        const client = fs.readFileSync(path.join(SERVER, "client.js"), "utf8");
        const emit = client.match(/io\.to\((.+?)\)\s*\.emit\("apiKeyList"|io\.to\((.+)\)\.emit\("apiKeyList"/);

        assert.ok(emit, "the API key list is no longer broadcast the way this test expects");
        assert.match(
            emit[0],
            /personalRoom\(/,
            "an unnamespaced room is the estate's own room when the sender owns the instance"
        );
    });

    it("keeps personal rooms out of the number space account ids live in", () => {
        const { personalRoom } = require("../../server/util-server");

        assert.strictEqual(personalRoom(1), "user:1");
        assert.notStrictEqual(personalRoom(1), 1, "a personal room must not equal an account id");
        assert.notStrictEqual(String(personalRoom(1)), "1", "nor its string form, which is how rooms compare");
    });

    it("confirms a password against the person typing it", () => {
        const util = fs.readFileSync(path.join(SERVER, "util-server.js"), "utf8");
        const block = util.slice(util.indexOf("exports.doubleCheckPassword"));

        assert.match(
            block.slice(0, 800),
            /socket\.loginUserID/,
            "confirming a password against the shared identity asks everyone for the owner's password"
        );
    });

    it("assigns both identities at login and joins both rooms", () => {
        const server = fs.readFileSync(path.join(SERVER, "server.js"), "utf8");
        const block = server.slice(server.indexOf("async function afterLogin"));
        const body = block.slice(0, block.indexOf("sendMonitorList"));

        assert.match(body, /socket\.loginUserID\s*=\s*user\.id/, "the person's own account is not recorded");
        assert.match(body, /socket\.userID\s*=\s*await instanceOwnerId/, "the session does not adopt the estate");
        assert.match(body, /socket\.join\(socket\.userID\)/, "the session would not receive shared broadcasts");
        assert.match(
            body,
            /socket\.join\(personalRoom\(socket\.loginUserID\)\)/,
            "the session would not receive its own, or would join a room that is also the estate's"
        );
    });
});

/*
 * Managing accounts is the only thing the administrator flag governs, so the
 * events that do it are the only ones that check it — and all of them must.
 * A new one added without the check would be reachable by anyone signed in, and
 * nothing would report it.
 */
describe("account management is the only thing gated on the administrator flag", () => {
    const handler = fs.readFileSync(path.join(SERVER, "socket-handlers", "user-socket-handler.js"), "utf8");

    it("checks the flag on every account event", () => {
        const events = [ ...handler.matchAll(/socket\.on\("(\w+)",[\s\S]*?\n {4}\}\);/g) ];

        assert.ok(events.length >= 6, `only ${events.length} account events found; the matcher is probably stale`);

        const unguarded = events.filter((match) => !match[0].includes("checkAdmin(socket)")).map((match) => match[1]);

        assert.deepStrictEqual(unguarded, [], "these let anyone signed in manage accounts");
    });

    it("refuses to remove the last way in", () => {
        for (const event of [ "setUserAdmin", "setUserActive", "deleteUser" ]) {
            const start = handler.indexOf(`socket.on("${event}"`);
            const body = handler.slice(start, handler.indexOf("socket.on(", start + 10));
            assert.match(body, /assertNotLastAdmin/, `${event} could leave the instance with no administrator`);
        }
    });

    it("withdraws API keys when an account is disabled", () => {
        const start = handler.indexOf('socket.on("setUserActive"');
        const body = handler.slice(start, handler.indexOf("socket.on(", start + 10));

        assert.match(
            body,
            /UPDATE api_key SET active = 0/,
            "a disabled account would keep working through its API keys"
        );
    });
});
