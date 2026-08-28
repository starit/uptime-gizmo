/**
 * Fill an instance with a small, realistic monitor set so the dashboard, the
 * public status page and the dark theme can be photographed with something
 * other than three green rows.
 *
 * This is a screenshot fixture, not a load test. `stress-create-monitors.mjs`
 * is the load test — hundreds of generically named monitors. This creates about
 * a dozen with names a real instance would have, in three groups, plus one that
 * is genuinely down and one paused, so the stat row and the event table are not
 * all zeros.
 *
 * Most targets are the instance itself. Full heartbeat bars need roughly fifty
 * beats, which at a 20-second interval is about seventeen minutes; pointing
 * that at someone else's site to stage a marketing shot is not acceptable, and
 * the URL is not visible in the list view anyway. The exceptions are a ping and
 * a DNS query against 1.1.1.1, which exists to answer query volume.
 *
 * The API key is the HTTP Basic **password**, and new keys are read-only, so
 * this needs a writable one. Pass it in the environment, never on argv (argv is
 * visible in `ps`).
 *
 *   UPTIME_GIZMO_URL=http://127.0.0.1:3001 \
 *   UPTIME_GIZMO_API_KEY=uk1_... \
 *   pnpm run seed-demo-instance
 *
 * Then wait for the bars to fill and shoot the screens. `--reset` removes
 * everything this created, matched on the description it writes.
 *
 *   pnpm run seed-demo-instance -- --interval 20
 *   pnpm run seed-demo-instance -- --web3
 *   pnpm run seed-demo-instance -- --reset --yes
 */

/** Written to `description` so `--reset` can find these rows and nothing else. */
const DEMO_MARKER = "Created by extra/seed-demo-instance.mjs";

const DEFAULT_INTERVAL = 20;
const WRITE_DELAY_MS = 1100;
const RATE_LIMIT_WAIT_MS = 20_000;
const MAX_RETRIES = 6;

/**
 * A closed port on the loopback interface. The demo needs one monitor that is
 * really down — a fabricated red row is not available through the API, and a
 * failing external target would be someone else's server.
 */
const CLOSED_PORT = 9;

/**
 * @param {number} ms Delay
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {string[]} argv Arguments after the script path
 * @returns {object} Parsed options
 * @throws {Error} On an unknown flag or a bad value
 */
function parseArgs(argv) {
    const opts = {
        url: process.env.UPTIME_GIZMO_URL || "http://127.0.0.1:3001",
        interval: DEFAULT_INTERVAL,
        web3: false,
        reset: false,
        yes: false,
        help: false,
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        switch (arg) {
            case "--help":
            case "-h":
                opts.help = true;
                break;
            case "--web3":
                opts.web3 = true;
                break;
            case "--reset":
                opts.reset = true;
                break;
            case "--yes":
                opts.yes = true;
                break;
            case "--url":
                opts.url = requireValue(argv[++i], arg);
                break;
            case "--interval": {
                const value = Number.parseInt(requireValue(argv[++i], arg), 10);
                if (!Number.isFinite(value) || value < 1) {
                    throw new Error("--interval must be a positive number of seconds");
                }
                opts.interval = value;
                break;
            }
            default:
                throw new Error(`Unknown argument: ${arg}`);
        }
    }

    return opts;
}

/**
 * @param {string|undefined} value Value that followed a flag
 * @param {string} flag The flag, for the message
 * @returns {string} The value
 * @throws {Error} When the flag had no value
 */
function requireValue(value, flag) {
    if (value === undefined || value.startsWith("-")) {
        throw new Error(`${flag} needs a value`);
    }
    return value;
}

/**
 * Print usage.
 * @returns {void}
 */
function printHelp() {
    console.log(`Seed a demo instance for screenshots.

  UPTIME_GIZMO_URL       instance root (default http://127.0.0.1:3001)
  UPTIME_GIZMO_API_KEY   writable API key, required

  --url <root>       override UPTIME_GIZMO_URL
  --interval <sec>   check interval, default ${DEFAULT_INTERVAL}
  --web3             add balance and RPC monitors when a network is configured
  --reset --yes      delete every monitor this script created
  --help
`);
}

/**
 * @param {string} base Instance root
 * @param {string} apiKey Writable API key
 * @returns {(method: string, path: string, body?: object|null) => Promise<object>} JSON client
 */
function makeClient(base, apiKey) {
    const root = base.replace(/\/+$/, "");
    const authorization = "Basic " + Buffer.from(`api:${apiKey}`, "utf8").toString("base64");
    let sawSuccess = false;
    let lastCallAt = 0;

    /**
     * @param {string} method HTTP method
     * @param {string} path Path beginning with /
     * @param {object|null} body JSON body, or null
     * @returns {Promise<object>} Parsed JSON
     * @throws {Error} On a non-retryable failure
     */
    return async function request(method, path, body = null) {
        if (lastCallAt) {
            const wait = WRITE_DELAY_MS - (Date.now() - lastCallAt);
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

            /*
             * The limiter answers 401, the same as a bad key. Only a 401 after a
             * call that already worked can be the limiter, so retry that one and
             * let a genuinely rejected key fail on the first call.
             */
            if (res.status === 401 && sawSuccess && attempt < MAX_RETRIES) {
                attempt++;
                console.warn(`Rate limited. Waiting ${RATE_LIMIT_WAIT_MS / 1000}s, retry ${attempt}/${MAX_RETRIES}.`);
                await sleep(RATE_LIMIT_WAIT_MS);
                continue;
            }

            if (!res.ok) {
                const message = json?.error?.message || json?.msg || text || res.statusText;
                throw new Error(`${method} ${path} -> ${res.status}: ${message}`);
            }

            sawSuccess = true;
            lastCallAt = Date.now();
            return json;
        }
    };
}

/**
 * The monitor set, as three groups of children.
 * @param {string} root Instance root, used as the target for most monitors
 * @returns {{name: string, monitors: object[]}[]} Groups and their children
 */
function demoPlan(root) {
    const url = new URL(root);
    const host = url.hostname;
    const port = Number(url.port) || (url.protocol === "https:" ? 443 : 80);
    const self = `${url.protocol}//${url.host}/`;
    const web = { method: "GET", acceptedStatuscodes: [ "200-299" ] };

    return [
        {
            name: "Public web",
            monitors: [
                { name: "Marketing site", type: "http", url: self, ...web },
                { name: "Documentation", type: "keyword", url: self, keyword: "Uptime" },
                { name: "Checkout", type: "http", url: self, ...web },
            ],
        },
        {
            name: "Platform",
            monitors: [
                { name: "API gateway", type: "http", url: self, ...web },
                { name: "Auth service", type: "port", hostname: host, port },
                // The one red row. Nothing listens on discard/9.
                { name: "Legacy webhook relay", type: "port", hostname: host, port: CLOSED_PORT },
                // Paused, so the Pause stat is not zero either.
                { name: "Nightly batch worker", type: "http", url: self, ...web, active: false },
            ],
        },
        {
            name: "Infrastructure",
            monitors: [
                { name: "Edge DNS", type: "dns", hostname: "example.com", dnsResolveType: "A", dnsResolveServer: "1.1.1.1" },
                { name: "Edge reachability", type: "ping", hostname: "1.1.1.1" },
                { name: "Cache node", type: "port", hostname: host, port },
            ],
        },
    ];
}

/**
 * Balance and RPC monitors for the first configured network.
 * @param {object[]} networks `GET /api/v1/web3-networks`
 * @returns {object[]} Children for the Infrastructure group, possibly empty
 */
function web3Monitors(networks) {
    const network = (networks || []).find((row) => row.active !== false) || networks?.[0];
    if (!network) {
        console.warn("No Web3 network configured; skipping --web3. Add one under Settings -> Web3 Networks.");
        return [];
    }

    console.log(`Web3 network: ${network.name} (chain ${network.chainId})`);
    return [
        {
            name: "Relayer balance",
            type: "web3-balance",
            web3NetworkId: network.id,
            // vitalik.eth. A funded, well-known address, so the row is green.
            web3Address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            web3MinBalance: "0",
        },
        {
            name: "RPC freshness",
            type: "web3-rpc",
            web3NetworkId: network.id,
            web3MaxBlockAge: 120,
        },
    ];
}

/**
 * @param {Function} request JSON client
 * @param {object} opts Parsed options
 * @returns {Promise<void>}
 */
async function seed(request, opts) {
    const groups = demoPlan(opts.url);

    if (opts.web3) {
        const networks = await request("GET", "/api/v1/web3-networks");
        groups[2].monitors.push(...web3Monitors(networks?.data));
    }

    const total = groups.reduce((n, group) => n + group.monitors.length + 1, 0);
    console.log(`Creating ${total} monitors at a ${opts.interval}s interval.\n`);

    let created = 0;
    for (const group of groups) {
        const parent = await request("POST", "/api/v1/monitors", {
            name: group.name,
            type: "group",
            description: DEMO_MARKER,
        });
        const parentId = parent?.data?.id;
        created++;
        console.log(`  ${group.name}`);

        for (const monitor of group.monitors) {
            await request("POST", "/api/v1/monitors", {
                interval: opts.interval,
                retryInterval: opts.interval,
                ...monitor,
                parent: parentId,
                description: DEMO_MARKER,
            });
            created++;
            console.log(`    ${monitor.name}${monitor.active === false ? " (paused)" : ""}`);
        }
    }

    const minutes = Math.ceil((opts.interval * 50) / 60);
    console.log(`
Created ${created} monitors.

Heartbeat bars fill after about fifty beats, so give it ~${minutes} minutes
before shooting. "Legacy webhook relay" goes down on its first check and stays
there, which is what puts a red row, an incident and real event rows on screen.

Maintenance windows are not writable over this API. Add one in the UI if you
want the Maintenance stat to be non-zero in the shot.

To undo:  pnpm run seed-demo-instance -- --reset --yes`);
}

/**
 * @param {Function} request JSON client
 * @param {object} opts Parsed options
 * @returns {Promise<void>}
 */
async function reset(request, opts) {
    const rows = [];
    let cursor = null;
    do {
        const qs = new URLSearchParams({ limit: "500" });
        if (cursor != null) {
            qs.set("cursor", String(cursor));
        }
        const page = await request("GET", `/api/v1/monitors?${qs}`);
        rows.push(...(page?.data ?? []));
        cursor = page?.page?.hasMore ? page.page.nextCursor : null;
    } while (cursor != null);

    const mine = rows.filter((row) => typeof row.description === "string" && row.description.startsWith(DEMO_MARKER));
    if (mine.length === 0) {
        console.log("Nothing to remove.");
        return;
    }

    if (!opts.yes) {
        console.log(`${mine.length} monitors would be deleted. Re-run with --yes.`);
        for (const row of mine) {
            console.log(`  ${row.id}  ${row.name}`);
        }
        return;
    }

    // Children before groups, so a group delete never races a child that the
    // same pass already removed.
    const ordered = [ ...mine.filter((row) => row.type !== "group"), ...mine.filter((row) => row.type === "group") ];
    for (const row of ordered) {
        await request("DELETE", `/api/v1/monitors/${row.id}?children=unlink`);
        console.log(`  deleted ${row.name}`);
    }
    console.log(`\nRemoved ${ordered.length} monitors.`);
}

/**
 * @returns {Promise<void>}
 */
async function main() {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.help) {
        printHelp();
        return;
    }

    const apiKey = process.env.UPTIME_GIZMO_API_KEY;
    if (!apiKey) {
        throw new Error("UPTIME_GIZMO_API_KEY is required, and must be a writable key");
    }

    const request = makeClient(opts.url, apiKey);

    const who = await request("GET", "/api/v1/whoami");
    if (who?.data?.readOnly) {
        throw new Error("That key is read-only. Create a writable key under Settings -> API Keys.");
    }
    console.log(`Connected to ${opts.url}\n`);

    if (opts.reset) {
        await reset(request, opts);
        return;
    }

    await seed(request, opts);
}

main().catch((error) => {
    console.error(`\n${error.message}`);
    process.exitCode = 1;
});
