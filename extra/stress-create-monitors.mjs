/**
 * Create a batch of mixed-type monitors over `/api/v1` so an operator can see
 * how the instance behaves with a large monitor list.
 *
 * The API key is HTTP Basic **password**. New keys are read-only; this script
 * needs a writable one. Pass the key in the environment, never on the argv
 * (argv is visible in `ps`).
 *
 *   UPTIME_GIZMO_URL=http://127.0.0.1:3001 \
 *   UPTIME_GIZMO_API_KEY=uk1_... \
 *   pnpm exec node extra/stress-create-monitors.mjs
 *
 * Each run creates one group (`stress-<timestamp>`) and `--count` children
 * (default 100), cycling through the types the API can write: http, keyword,
 * ping, port, dns. Pass `--web3` to mix in web3-rpc / web3-balance /
 * web3-contract when the instance has a network configured.
 *
 * Monitors are created **paused**. The scheduler would otherwise start a check
 * for every new row immediately, which is a different experiment from filling
 * the dashboard. Pass `--active` when you want that load.
 *
 * Authenticated API calls are limited to 60 per minute. The limiter answers
 * `401`, the same as a bad key, so this script spaces writes and retries 401
 * only after a successful `whoami`.
 *
 *   pnpm exec node extra/stress-create-monitors.mjs --count 100
 *   pnpm exec node extra/stress-create-monitors.mjs --active --interval 300
 *   pnpm exec node extra/stress-create-monitors.mjs --list
 *   pnpm exec node extra/stress-create-monitors.mjs --delete --yes
 */

const DEFAULT_COUNT = 100;
const DEFAULT_DELAY_MS = 1100;
const DEFAULT_INTERVAL = 60;
const DEFAULT_PREFIX = "stress";
const MAX_COUNT = 2000;
const RATE_LIMIT_WAIT_MS = 20_000;
const MAX_RETRIES = 8;

/** Targets that tolerate documentation-style traffic. */
const HTTP_URLS = [
    "https://example.com/",
    "https://example.org/",
    "https://example.net/",
];
const HOSTNAMES = [ "example.com", "example.org", "example.net", "one.one.one.one" ];
const PING_HOSTS = [ "1.1.1.1", "8.8.8.8", "example.com" ];

/**
 * Uniswap V2 factory `allPairsLength()` — only used when a configured network
 * is Ethereum mainnet, so a web3-contract row actually has something to call.
 */
const MAINNET_UNISWAP_V2 = {
    web3CallTo: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    web3CallData: "0x574f2ba3",
    web3ValueType: "uint256",
    web3ValueDecimals: 0,
    web3ValueOperator: "gte",
    web3ValueThreshold: "1",
};

/** A well-known address so web3-balance has a valid `web3Address`. */
const SAMPLE_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

/**
 * @param {number} ms Delay
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parse argv into options. Unknown flags are errors so a typo cannot silently
 * create 100 live monitors.
 * @param {string[]} argv Process arguments after the script path
 * @returns {object} Parsed options
 * @throws {Error} When a flag is unknown or a value is unusable
 */
function parseArgs(argv) {
    const opts = {
        count: DEFAULT_COUNT,
        delayMs: DEFAULT_DELAY_MS,
        interval: DEFAULT_INTERVAL,
        prefix: DEFAULT_PREFIX,
        url: process.env.UPTIME_GIZMO_URL || "http://127.0.0.1:3001",
        active: false,
        web3: false,
        delete: false,
        list: false,
        dryRun: false,
        yes: false,
        help: false,
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const next = argv[i + 1];

        if (arg === "--help" || arg === "-h") {
            opts.help = true;
            return opts;
        }
        if (arg === "--active") {
            opts.active = true;
            continue;
        }
        if (arg === "--web3") {
            opts.web3 = true;
            continue;
        }
        if (arg === "--delete") {
            opts.delete = true;
            continue;
        }
        if (arg === "--list") {
            opts.list = true;
            continue;
        }
        if (arg === "--dry-run") {
            opts.dryRun = true;
            continue;
        }
        if (arg === "--yes" || arg === "-y") {
            opts.yes = true;
            continue;
        }
        if (arg === "--count") {
            opts.count = parsePositiveInt(next, "--count");
            i++;
            continue;
        }
        if (arg === "--delay-ms") {
            opts.delayMs = parseNonNegativeInt(next, "--delay-ms");
            i++;
            continue;
        }
        if (arg === "--interval") {
            opts.interval = parsePositiveInt(next, "--interval");
            i++;
            continue;
        }
        if (arg === "--prefix") {
            opts.prefix = requireValue(next, "--prefix");
            i++;
            continue;
        }
        if (arg === "--url") {
            opts.url = requireValue(next, "--url");
            i++;
            continue;
        }
        throw new Error(`Unknown argument: ${arg} (see --help)`);
    }

    if (opts.count > MAX_COUNT) {
        throw new Error(`--count cannot exceed ${MAX_COUNT}`);
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(opts.prefix)) {
        throw new Error("--prefix must be a short identifier (letters, digits, . _ -)");
    }
    if (opts.delete && opts.list) {
        throw new Error("Use either --list or --delete, not both");
    }

    return opts;
}

/**
 * @param {string|undefined} value Raw argv token
 * @param {string} flag Flag name
 * @returns {string} Non-empty value
 * @throws {Error} When missing
 */
function requireValue(value, flag) {
    if (!value || value.startsWith("--")) {
        throw new Error(`${flag} needs a value`);
    }
    return value;
}

/**
 * @param {string|undefined} value Raw argv token
 * @param {string} flag Flag name
 * @returns {number} Integer ≥ 1
 * @throws {Error} When unusable
 */
function parsePositiveInt(value, flag) {
    const n = Number.parseInt(requireValue(value, flag), 10);
    if (!Number.isInteger(n) || n < 1) {
        throw new Error(`${flag} must be a positive integer`);
    }
    return n;
}

/**
 * @param {string|undefined} value Raw argv token
 * @param {string} flag Flag name
 * @returns {number} Integer ≥ 0
 * @throws {Error} When unusable
 */
function parseNonNegativeInt(value, flag) {
    const n = Number.parseInt(requireValue(value, flag), 10);
    if (!Number.isInteger(n) || n < 0) {
        throw new Error(`${flag} must be an integer ≥ 0`);
    }
    return n;
}

/**
 * @returns {void}
 */
function printHelp() {
    console.log(`Create mixed-type monitors over /api/v1 for a high-count load check.

Environment:
  UPTIME_GIZMO_URL       Instance root (default http://127.0.0.1:3001)
  UPTIME_GIZMO_API_KEY   Writable API key (Basic auth password). Required.

Usage:
  pnpm exec node extra/stress-create-monitors.mjs [options]

Options:
  --count N        How many monitors to create (default ${DEFAULT_COUNT}, max ${MAX_COUNT})
  --active         Start checking immediately (default: paused)
  --interval N     Check interval in seconds (default ${DEFAULT_INTERVAL})
  --web3           Include web3 types when a network is configured
  --delay-ms N     Pause between API writes (default ${DEFAULT_DELAY_MS}; API limit is 60/min)
  --prefix NAME    Name prefix / group stem (default ${DEFAULT_PREFIX})
  --url URL        Override UPTIME_GIZMO_URL
  --list           Show existing monitors whose name starts with the prefix
  --delete         Remove those groups (and their children) and leftover rows
  --yes            Required with --delete
  --dry-run        Print the payloads, do not call the API
  --help           This text
`);
}

/**
 * Types the REST API can create. Exotic transports (mqtt, grpc, …) are UI-only.
 * @param {object[]} networks GET /api/v1/web3-networks data
 * @param {boolean} wantWeb3 Whether the operator asked for web3 types
 * @returns {{name: string, build: Function}[]} Type templates
 */
function typeTemplates(networks, wantWeb3) {
    const types = [
        {
            name: "http",
            build: (i, shared) => ({
                type: "http",
                url: HTTP_URLS[i % HTTP_URLS.length],
                method: "GET",
                acceptedStatuscodes: [ "200-299" ],
                ...shared,
            }),
        },
        {
            name: "keyword",
            build: (i, shared) => ({
                type: "keyword",
                url: HTTP_URLS[i % HTTP_URLS.length],
                keyword: "Example",
                ...shared,
            }),
        },
        {
            name: "ping",
            build: (i, shared) => ({
                type: "ping",
                hostname: PING_HOSTS[i % PING_HOSTS.length],
                ...shared,
            }),
        },
        {
            name: "port",
            build: (i, shared) => ({
                type: "port",
                hostname: HOSTNAMES[i % HOSTNAMES.length],
                port: 443,
                ...shared,
            }),
        },
        {
            name: "dns",
            build: (i, shared) => ({
                type: "dns",
                hostname: HOSTNAMES[i % HOSTNAMES.length],
                dnsResolveType: "A",
                dnsResolveServer: "1.1.1.1",
                ...shared,
            }),
        },
    ];

    if (!wantWeb3) {
        return types;
    }

    const network = (networks || []).find((row) => row.active !== false) || networks?.[0];
    if (!network) {
        console.warn("No Web3 network configured; skipping --web3 types. Add one in Settings.");
        return types;
    }

    types.push({
        name: "web3-rpc",
        build: (_i, shared) => ({
            type: "web3-rpc",
            web3NetworkId: network.id,
            web3MaxBlockAge: 120,
            ...shared,
        }),
    });
    types.push({
        name: "web3-balance",
        build: (_i, shared) => ({
            type: "web3-balance",
            web3NetworkId: network.id,
            web3Address: SAMPLE_ADDRESS,
            web3MinBalance: "0",
            ...shared,
        }),
    });

    if (String(network.chainId) === "1") {
        types.push({
            name: "web3-contract",
            build: (_i, shared) => ({
                type: "web3-contract",
                web3NetworkId: network.id,
                ...MAINNET_UNISWAP_V2,
                ...shared,
            }),
        });
    } else {
        console.warn(
            `Web3 network "${network.name}" is chain ${network.chainId}; web3-contract is only mixed in on Ethereum mainnet (chain 1).`
        );
    }

    return types;
}

/**
 * @param {object} opts Parsed options
 * @param {{name: string, build: Function}[]} templates Type templates
 * @param {number|null} parent Group id, or null when dry-run has no id yet
 * @param {string} runId Timestamp stem shared by the group and its children
 * @returns {object[]} POST /api/v1/monitors bodies
 */
function buildMonitorBodies(opts, templates, parent, runId) {
    const shared = {
        active: opts.active,
        interval: opts.interval,
        retryInterval: opts.interval,
        description: `Created by extra/stress-create-monitors.mjs (${runId})`,
    };
    if (parent != null) {
        shared.parent = parent;
    }

    const bodies = [];
    for (let i = 0; i < opts.count; i++) {
        const template = templates[i % templates.length];
        const index = String(i + 1).padStart(3, "0");
        bodies.push({
            name: `${opts.prefix}-${runId}-${index}-${template.name}`,
            ...template.build(i, shared),
        });
    }
    return bodies;
}

/**
 * @param {string} base Instance root
 * @param {string} apiKey Writable API key
 * @param {number} delayMs Pause after a successful mutating call
 * @returns {(method: string, path: string, body?: object|null, options?: object) => Promise<object>} JSON client
 */
function makeClient(base, apiKey, delayMs) {
    const root = base.replace(/\/+$/, "");
    const authorization = "Basic " + Buffer.from(`api:${apiKey}`, "utf8").toString("base64");
    let sawSuccess = false;
    let lastCallAt = 0;

    /**
     * @param {string} method HTTP method
     * @param {string} path Path beginning with /
     * @param {object|null} body JSON body, or null
     * @param {{space: boolean|undefined}} options Whether to apply the write delay
     * @returns {Promise<object>} Parsed JSON
     * @throws {Error} On a non-retryable failure
     */
    return async function request(method, path, body = null, options = {}) {
        const space = options.space !== false;
        if (space && lastCallAt && delayMs > 0) {
            const wait = delayMs - (Date.now() - lastCallAt);
            if (wait > 0) {
                await sleep(wait);
            }
        }

        let attempt = 0;
        while (true) {
            const res = await fetch(root + path, {
                method,
                headers: {
                    Authorization: authorization,
                    Accept: "application/json",
                    ...(body ? { "Content-Type": "application/json" } : {}),
                },
                body: body ? JSON.stringify(body) : undefined,
            });

            const text = await res.text();
            let json = null;
            if (text) {
                try {
                    json = JSON.parse(text);
                } catch {
                    json = null;
                }
            }

            if (res.status === 401 && sawSuccess && attempt < MAX_RETRIES) {
                attempt++;
                console.warn(`API rate limit (401 after a good key). Waiting ${RATE_LIMIT_WAIT_MS / 1000}s, retry ${attempt}/${MAX_RETRIES}.`);
                await sleep(RATE_LIMIT_WAIT_MS);
                continue;
            }

            if (res.status >= 500 && attempt < MAX_RETRIES) {
                attempt++;
                console.warn(`${res.status} from ${method} ${path}. Retry ${attempt}/${MAX_RETRIES}.`);
                await sleep(2000 * attempt);
                continue;
            }

            if (!res.ok) {
                const message = json?.error?.message || json?.msg || text || res.statusText;
                throw new Error(`${method} ${path} → ${res.status}: ${message}`);
            }

            sawSuccess = true;
            lastCallAt = Date.now();
            return json;
        }
    };
}

/**
 * @param {Function} request JSON client
 * @returns {Promise<object[]>} Every monitor, following pagination
 */
async function listAllMonitors(request) {
    const rows = [];
    let cursor = null;
    do {
        const qs = new URLSearchParams({ limit: "500" });
        if (cursor != null) {
            qs.set("cursor", String(cursor));
        }
        const page = await request("GET", `/api/v1/monitors?${qs}`, null, { space: false });
        const data = page.data || [];
        rows.push(...data);
        cursor = page.page?.hasMore ? page.page.nextCursor : null;
    } while (cursor != null);
    return rows;
}

/**
 * @param {object} monitor API monitor
 * @param {string} prefix Name prefix
 * @returns {boolean} Whether this row belongs to a stress run
 */
function matchesPrefix(monitor, prefix) {
    const name = monitor.name || "";
    return name === prefix || name.startsWith(`${prefix}-`);
}

/**
 * @param {object} opts Parsed options
 * @returns {Promise<void>}
 */
async function main(opts) {
    if (opts.help) {
        printHelp();
        return;
    }

    const apiKey = process.env.UPTIME_GIZMO_API_KEY || "";
    if (!opts.dryRun && !apiKey) {
        throw new Error("Set UPTIME_GIZMO_API_KEY (writable key from Settings → API Keys). Do not pass it on the command line.");
    }

    if (opts.dryRun && (opts.list || opts.delete)) {
        throw new Error("--dry-run is for create; --list and --delete talk to the instance");
    }

    if (opts.dryRun) {
        const runId = formatRunId(new Date());
        const templates = typeTemplates([], opts.web3);
        const bodies = buildMonitorBodies(opts, templates, null, runId);
        console.log(JSON.stringify({
            group: { name: `${opts.prefix}-${runId}`, type: "group", active: true },
            monitors: bodies,
        }, null, 2));
        return;
    }

    const request = makeClient(opts.url, apiKey, opts.delayMs);
    const whoami = await request("GET", "/api/v1/whoami", null, { space: false });
    const me = whoami.data || {};
    if (me.readOnly) {
        throw new Error("This API key is read-only. Create a writable key in Settings → API Keys (turn off read-only).");
    }
    console.log(`Connected to ${opts.url} (userID ${me.userID}).`);

    if (opts.list) {
        const monitors = (await listAllMonitors(request)).filter((row) => matchesPrefix(row, opts.prefix));
        if (monitors.length === 0) {
            console.log(`No monitors whose name starts with "${opts.prefix}".`);
            return;
        }
        for (const row of monitors) {
            const state = row.active ? "active" : "paused";
            console.log(`${row.id}\t${row.type}\t${state}\t${row.name}`);
        }
        console.log(`${monitors.length} row(s).`);
        return;
    }

    if (opts.delete) {
        await deleteStressMonitors(request, opts);
        return;
    }

    let networks = [];
    if (opts.web3) {
        const listed = await request("GET", "/api/v1/web3-networks", null, { space: false });
        networks = listed.data || [];
    }

    const templates = typeTemplates(networks, opts.web3);
    const runId = formatRunId(new Date());
    const groupName = `${opts.prefix}-${runId}`;

    console.log(
        `Creating group "${groupName}" and ${opts.count} monitors ` +
        `(types: ${templates.map((t) => t.name).join(", ")}; ` +
        `${opts.active ? "ACTIVE — checks start immediately" : "paused"}; interval ${opts.interval}s).`
    );

    const groupRes = await request("POST", "/api/v1/monitors", {
        name: groupName,
        type: "group",
        active: true,
        description: "Stress-test batch from extra/stress-create-monitors.mjs",
    });
    const groupId = groupRes.data?.id;
    if (!groupId) {
        throw new Error("Create group did not return an id");
    }
    console.log(`Group id ${groupId}.`);

    const bodies = buildMonitorBodies(opts, templates, groupId, runId);
    let created = 0;
    const ids = [];
    for (const body of bodies) {
        const res = await request("POST", "/api/v1/monitors", body);
        const id = res.data?.id;
        created++;
        ids.push(id);
        console.log(`${created}/${bodies.length}  ${body.type.padEnd(14)}  id=${id}  ${body.name}`);
    }

    console.log(`Done. Created ${created} monitors under group ${groupId} (${groupName}).`);
    if (!opts.active) {
        console.log("They are paused. Resume in the UI, or re-run with --active next time.");
    }
    console.log(`Remove this batch: pnpm exec node extra/stress-create-monitors.mjs --delete --yes --prefix ${opts.prefix}`);
}

/**
 * @param {Date} date When the run started
 * @returns {string} Compact UTC stamp used in names
 */
function formatRunId(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
        `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-` +
        `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
    );
}

/**
 * Delete stress-test groups (with children) then any leftover prefixed rows.
 * @param {Function} request JSON client
 * @param {object} opts Parsed options
 * @returns {Promise<void>}
 */
async function deleteStressMonitors(request, opts) {
    const monitors = await listAllMonitors(request);
    const matches = monitors.filter((row) => matchesPrefix(row, opts.prefix));
    const groups = matches.filter((row) => row.type === "group");
    const leftovers = matches.filter((row) => row.type !== "group");

    if (matches.length === 0) {
        console.log(`Nothing to delete for prefix "${opts.prefix}".`);
        return;
    }

    console.log(`Would delete ${groups.length} group(s) (with children) and ${leftovers.length} other prefixed row(s):`);
    for (const row of matches) {
        console.log(`  ${row.id}\t${row.type}\t${row.name}`);
    }

    if (!opts.yes) {
        throw new Error("Refusing to delete without --yes");
    }

    for (const group of groups) {
        await request("DELETE", `/api/v1/monitors/${group.id}?children=delete`);
        console.log(`Deleted group ${group.id} (${group.name}) and its children.`);
    }

    const remaining = (await listAllMonitors(request)).filter((row) => matchesPrefix(row, opts.prefix));
    for (const row of remaining) {
        await request("DELETE", `/api/v1/monitors/${row.id}`);
        console.log(`Deleted leftover ${row.id} (${row.name}).`);
    }

    console.log("Delete finished.");
}

try {
    const opts = parseArgs(process.argv.slice(2));
    await main(opts);
} catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
}
