#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

/*
 * MCP server for Uptime Gizmo.
 *
 * A separate process that reaches the product only through /api/v1. The
 * monitoring server never hosts this protocol: its job is to notice when
 * production breaks, and anything that could crash it or block its event loop
 * has no business sharing it. The consequence is also useful — anything an agent
 * can do here, a script with the same key could do, so there is one set of
 * authorization rules rather than two.
 *
 * See docs/plans/mcp-and-agent-api.md.
 */

const BASE_URL = (process.env.UPTIME_GIZMO_URL ?? "http://localhost:3001").replace(/\/+$/, "");
const API_KEY = process.env.UPTIME_GIZMO_API_KEY ?? "";

if (!API_KEY) {
    process.stderr.write(
        "UPTIME_GIZMO_API_KEY is required.\n" +
            "Create a key in Settings > API Keys. Leave it read-only unless this agent\n" +
            "genuinely needs to create or change monitors.\n"
    );
    process.exit(1);
}

/**
 * Call the Uptime Gizmo API.
 * @param {string} path path beginning with /api/v1
 * @param {object} options method and body
 * @returns {Promise<object>} parsed response body
 * @throws {Error} on a transport failure or a non-2xx response
 */
async function api(path, options = {}) {
    const response = await fetch(BASE_URL + path, {
        method: options.method ?? "GET",
        headers: {
            // Any username; the key is the password. The username is not used
            // for verification but sending a stable placeholder beats relying on
            // an empty one.
            Authorization: "Basic " + Buffer.from(`api:${API_KEY}`).toString("base64"),
            ...(options.body ? { "Content-Type": "application/json" } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    let payload;
    try {
        payload = JSON.parse(text);
    } catch (e) {
        throw new Error(`${response.status} from ${path}: ${text.slice(0, 200)}`);
    }

    if (!response.ok) {
        const message = payload?.error?.message ?? payload?.msg ?? `HTTP ${response.status}`;
        // Worth naming explicitly: this is the most likely failure for an agent
        // and the fix is a human decision, not a retry.
        if (response.status === 403) {
            throw new Error(`Refused: ${message} This key cannot make changes.`);
        }
        throw new Error(`${path}: ${message}`);
    }

    return payload;
}

/*
 * Tool definitions.
 *
 * `sideEffects` is part of the description a model reads, because deciding
 * whether to call something requires knowing whether it will page someone.
 */
const READ_TOOLS = [
    {
        name: "whoami",
        description:
            "Describe the credential this server is using: which user owns it and whether it is read-only. Side effects: none.",
        inputSchema: { type: "object", properties: {} },
        run: () => api("/api/v1/whoami"),
    },
    {
        name: "get_overview",
        description:
            "Current state of every monitor: status, when it entered that status, and 24-hour uptime. Start here for \"how is everything\". Side effects: none.",
        inputSchema: { type: "object", properties: {} },
        run: () => api("/api/v1/overview"),
    },
    {
        name: "get_active_incidents",
        description:
            "Only the monitors that are down or degraded right now. Each carries `since`, the time it entered that state — a timestamp, not a duration. Use this for \"is anything broken\". Side effects: none.",
        inputSchema: { type: "object", properties: {} },
        run: () => api("/api/v1/incidents/active"),
    },
    {
        name: "get_recent_changes",
        description:
            "State transitions in a window, newest first. Bounded by the server: 24 hours by default, 168 at most. The response says whether it was capped or truncated. Side effects: none.",
        inputSchema: {
            type: "object",
            properties: {
                hours: { type: "number", description: "Lookback in hours, up to 168" },
            },
        },
        run: (args) => api(`/api/v1/changes?hours=${encodeURIComponent(args?.hours ?? 24)}`),
    },
    {
        name: "list_monitors",
        description:
            "List monitors with their configuration. Paginated: pass the returned page.nextCursor to continue, or the list is partial. Side effects: none.",
        inputSchema: {
            type: "object",
            properties: {
                limit: { type: "integer", description: "Up to 500" },
                cursor: { type: "integer", description: "nextCursor from a previous call" },
            },
        },
        run: (args) => {
            const query = new URLSearchParams();
            if (args?.limit) {
                query.set("limit", String(args.limit));
            }
            if (args?.cursor) {
                query.set("cursor", String(args.cursor));
            }
            const suffix = query.toString() ? `?${query}` : "";
            return api(`/api/v1/monitors${suffix}`);
        },
    },
    {
        name: "get_monitor",
        description: "Read one monitor's configuration by id. Side effects: none.",
        inputSchema: {
            type: "object",
            properties: { id: { type: "integer" } },
            required: [ "id" ],
        },
        run: (args) => api(`/api/v1/monitors/${encodeURIComponent(args.id)}`),
    },
    {
        name: "list_tags",
        description: "List tags. Side effects: none.",
        inputSchema: { type: "object", properties: {} },
        run: () => api("/api/v1/tags"),
    },
    {
        name: "list_maintenances",
        description:
            "List maintenance windows. A monitor inside an active window may be intentionally quiet rather than broken. Side effects: none.",
        inputSchema: { type: "object", properties: {} },
        run: () => api("/api/v1/maintenances"),
    },
    {
        name: "list_notification_channels",
        description:
            "List notification channels by name and whether they are active. Use this to reason about whether an alert has anywhere to go. The channel configuration holds credentials and is never returned. Side effects: none.",
        inputSchema: { type: "object", properties: {} },
        run: () => api("/api/v1/notifications"),
    },
    {
        name: "list_proxies",
        description:
            "List proxies by protocol, host, port and username. Proxy passwords are never returned. Side effects: none.",
        inputSchema: { type: "object", properties: {} },
        run: () => api("/api/v1/proxies"),
    },
    {
        name: "list_docker_hosts",
        description:
            "List Docker hosts by name and connection type. The daemon address may embed credentials and is never returned. Side effects: none.",
        inputSchema: { type: "object", properties: {} },
        run: () => api("/api/v1/docker-hosts"),
    },
    {
        name: "list_remote_browsers",
        description:
            "List remote browsers by name. Their endpoint URLs commonly carry tokens and are never returned. Side effects: none.",
        inputSchema: { type: "object", properties: {} },
        run: () => api("/api/v1/remote-browsers"),
    },
];

/*
 * Writing tools. Create and update only.
 *
 * Deleting is deliberately absent: an agent that can delete a monitor can
 * silently stop monitoring production, and the failure is invisible precisely
 * because monitoring is what stopped. Creating and updating are recoverable.
 */
const WRITE_TOOLS = [
    {
        name: "create_monitor",
        description:
            "Create a monitor. Requires name and type; type is one of http, keyword, ping, port, dns. Side effects: begins checking the target, and its first result may trigger notifications.",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string" },
                type: { type: "string", description: "http, keyword, ping, port or dns" },
                url: { type: "string" },
                hostname: { type: "string" },
                port: { type: "integer" },
                interval: { type: "integer", description: "Seconds between checks" },
                keyword: { type: "string" },
                description: { type: "string" },
                active: { type: "boolean" },
            },
            required: [ "name", "type" ],
        },
        run: (args) => api("/api/v1/monitors", { method: "POST", body: args }),
    },
    {
        name: "update_monitor",
        description:
            "Change an existing monitor. Only the fields supplied are altered. Side effects: the monitor restarts, and a configuration change may alter whether it alerts.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "integer" },
                name: { type: "string" },
                url: { type: "string" },
                hostname: { type: "string" },
                port: { type: "integer" },
                interval: { type: "integer" },
                keyword: { type: "string" },
                description: { type: "string" },
                active: { type: "boolean" },
            },
            required: [ "id" ],
        },
        run: (args) => {
            const { id, ...body } = args;
            return api(`/api/v1/monitors/${encodeURIComponent(id)}`, { method: "PATCH", body });
        },
    },
];

/**
 * Ask the instance what this key may do.
 *
 * The server decides; this is only used to avoid advertising tools that would be
 * refused. A read-only key that somehow reached a write tool would still be
 * refused by the API, which is where the decision belongs.
 * @returns {Promise<boolean>} true when the key may write
 */
async function keyCanWrite() {
    try {
        const result = await api("/api/v1/whoami");
        return !result?.data?.readOnly;
    } catch (e) {
        process.stderr.write(`Could not reach ${BASE_URL}: ${e.message}\n`);
        return false;
    }
}

const canWrite = await keyCanWrite();
const tools = canWrite ? [ ...READ_TOOLS, ...WRITE_TOOLS ] : READ_TOOLS;

process.stderr.write(
    `uptime-gizmo-mcp: ${tools.length} tools against ${BASE_URL}` +
        (canWrite ? " (key may write)\n" : " (read-only key; write tools not offered)\n")
);

const server = new Server(
    { name: "uptime-gizmo", version: "0.1.0" },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((candidate) => candidate.name === request.params.name);

    if (!tool) {
        return {
            isError: true,
            content: [ { type: "text", text: `Unknown tool: ${request.params.name}` } ],
        };
    }

    try {
        const result = await tool.run(request.params.arguments ?? {});
        return { content: [ { type: "text", text: JSON.stringify(result, null, 2) } ] };
    } catch (e) {
        // Reported as a tool error rather than thrown, so the model sees why and
        // can decide, instead of the transport dropping.
        return { isError: true, content: [ { type: "text", text: e.message } ] };
    }
});

await server.connect(new StdioServerTransport());
