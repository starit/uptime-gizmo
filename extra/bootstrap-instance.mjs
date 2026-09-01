/**
 * Bring a fresh instance to the point where Uptime Gizmo Cloud can register it.
 *
 * Registration needs an endpoint, a writable API key and the engine account id
 * that key belongs to. Creating the first admin and creating a key are both
 * socket.io calls with no HTTP equivalent, so a fleet cannot be stood up from
 * the shell without this script.
 *
 *   UPTIME_GIZMO_BOOTSTRAP_PASSWORD='a-strong-password' \
 *   node extra/bootstrap-instance.mjs --url http://127.0.0.1:3011
 *
 * The password comes from the environment because argv is visible in `ps`. The
 * key is printed once, as JSON on stdout, because the server only ever returns
 * it once — it stores a hash. Everything else goes to stderr so the output can
 * be piped into `jq` or a variable.
 *
 * Running it twice against the same instance is safe: setup is skipped when the
 * instance already has a user, and a second key is issued rather than the first
 * one being reused, because the first one cannot be read back.
 */
import process from "node:process";
import { parseArgs } from "node:util";
import { io } from "socket.io-client";

const CALL_TIMEOUT_MS = 15000;

const { values } = parseArgs({
    options: {
        "url": { type: "string" },
        "username": { type: "string", default: "admin" },
        "key-name": { type: "string", default: "cloud" },
    },
    strict: true,
});

/**
 * Write a progress line to stderr, keeping stdout clean for the JSON result.
 * @param {string} message What just happened
 * @returns {void}
 */
function note(message) {
    process.stderr.write(`${message}\n`);
}

/**
 * Call a socket.io event that answers through a callback.
 *
 * The server reports failure inside the callback rather than by throwing, so a
 * rejected promise here means the call itself did not complete.
 * @param {import("socket.io-client").Socket} socket Connected socket
 * @param {string} event Event name
 * @param {any[]} args Arguments before the callback
 * @returns {Promise<object>} The server's response object
 */
function call(socket, event, ...args) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${event} timed out`)), CALL_TIMEOUT_MS);
        socket.emit(event, ...args, (response) => {
            clearTimeout(timer);
            resolve(response ?? {});
        });
    });
}

/**
 * Connect, and report whether the instance still needs its first user.
 *
 * The server emits `setup` on connection when no user exists. Nothing is
 * emitted in the opposite case, so this waits a moment for the signal and
 * treats silence as "already initialised" rather than hanging.
 * @param {string} url Instance base URL
 * @returns {Promise<{socket: import("socket.io-client").Socket, needsSetup: boolean}>} Connection
 */
function connect(url) {
    return new Promise((resolve, reject) => {
        /*
         * Default transports: engine.io starts on polling and upgrades. Naming
         * websocket first makes a failed upgrade a connection error instead of
         * a fallback, which is the wrong trade for a one-shot script.
         */
        const socket = io(url, { reconnection: false });
        const timer = setTimeout(() => {
            socket.close();
            reject(new Error(`Could not connect to ${url}`));
        }, CALL_TIMEOUT_MS);

        let needsSetup = false;
        socket.on("setup", () => {
            needsSetup = true;
        });
        socket.on("connect_error", (error) => {
            clearTimeout(timer);
            socket.close();
            reject(new Error(`Could not connect to ${url}: ${error.message}`));
        });
        socket.on("connect", () => {
            /*
             * The `setup` emit follows the connection immediately, but on the
             * same tick as several other pushes. Settle before deciding.
             */
            setTimeout(() => {
                clearTimeout(timer);
                resolve({ socket, needsSetup });
            }, 500);
        });
    });
}

/**
 * Read back the account the key belongs to, over the API the key is for.
 *
 * This doubles as proof the key works: Cloud registration fails closed on a key
 * it cannot authenticate with, and finding that out here is cheaper.
 * @param {string} url Instance base URL
 * @param {string} apiKey The freshly issued key
 * @returns {Promise<number>} The engine account id
 */
async function engineAccountId(url, apiKey) {
    const authorization = "Basic " + Buffer.from(`api:${apiKey}`, "utf8").toString("base64");
    const response = await fetch(new URL("/api/v1/whoami", url), {
        headers: { authorization },
    });
    if (!response.ok) {
        throw new Error(`whoami returned ${response.status}; the key was issued but does not authenticate`);
    }
    const body = await response.json();
    const userID = body?.data?.userID;
    if (!Number.isInteger(userID)) {
        throw new Error("whoami did not report a userID");
    }
    return userID;
}

/**
 * @returns {Promise<void>}
 */
async function main() {
    const url = values.url;
    if (!url) {
        throw new Error("Missing required --url option");
    }
    const password = process.env.UPTIME_GIZMO_BOOTSTRAP_PASSWORD;
    if (!password) {
        throw new Error("Set UPTIME_GIZMO_BOOTSTRAP_PASSWORD; do not pass a password on the command line");
    }

    const { socket, needsSetup } = await connect(url);
    try {
        if (needsSetup) {
            const created = await call(socket, "setup", values.username, password);
            if (!created.ok) {
                throw new Error(`setup failed: ${created.msg}`);
            }
            note(`Created the first admin on ${url}`);
        } else {
            note(`${url} already has a user; skipping setup`);
        }

        const session = await call(socket, "login", { username: values.username, password });
        if (!session.ok) {
            throw new Error(`login failed: ${session.msg ?? "check the username and password"}`);
        }

        /*
         * Writable on purpose. New keys are read-only by default, and Cloud
         * cannot place, migrate or delete a monitor through a key that only
         * reads.
         */
        const issued = await call(socket, "addAPIKey", {
            name: values["key-name"],
            active: true,
            readOnly: false,
            expires: null,
        });
        if (!issued.ok || !issued.key) {
            throw new Error(`could not create an API key: ${issued.msg}`);
        }
        note(`Issued writable API key ${values["key-name"]} (id ${issued.keyID})`);

        const userID = await engineAccountId(url, issued.key);
        process.stdout.write(`${JSON.stringify({ url, userID, apiKey: issued.key })}\n`);
    } finally {
        socket.close();
    }
}

main().catch((error) => {
    note(`bootstrap failed: ${error.message}`);
    process.exit(1);
});
