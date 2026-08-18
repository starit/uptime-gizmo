const { describe, it } = require("node:test");
const assert = require("node:assert");
const path = require("path");

/*
 * Structural check on the /api/v1 router.
 *
 * The permission model only holds if every mutating route carries requireWrite.
 * Checking that by reading the file is unusual, but the alternative — a test per
 * route — is exactly the thing that gets forgotten when a route is added, which
 * is the failure this is meant to catch. A missing guard produces no error and
 * no warning; it just silently lets a read-only key write.
 *
 * This runs without a database or a server, so it cannot be skipped by a broken
 * environment the way the container-backed tests are.
 */

const routerPath = path.join(__dirname, "..", "..", "server", "routers", "v1-router.js");

/**
 * Collect every route registration in the v1 router.
 * @returns {Array<object>} one entry per router.<method>(...) call
 */
function collectRoutes() {
    const source = require("fs").readFileSync(routerPath, "utf8");
    const routes = [];

    /*
     * Find every registration, whatever style it is written in, by locating the
     * call and then walking to its closing bracket. An earlier version matched
     * only the multi-line form and a compact route slipped past all four
     * assertions — a matcher that silently skips routes is worse than none.
     */
    const start = /router\.(get|post|patch|put|delete)\(\s*"([^"]+)"/g;

    for (const match of source.matchAll(start)) {
        let depth = 0;
        let end = match.index;
        for (let i = match.index; i < source.length; i++) {
            if (source[i] === "(") {
                depth++;
            } else if (source[i] === ")") {
                depth--;
                if (depth === 0) {
                    end = i;
                    break;
                }
            }
        }

        routes.push({
            method: match[1],
            path: match[2],
            body: source.slice(match.index, end),
        });
    }

    return routes;
}

/*
 * Routes that are public on purpose. A caller has to be able to discover what
 * credentials are for before it holds any, so the description of the API is
 * readable without one. It describes shapes, never data.
 */
const INTENTIONALLY_PUBLIC = [ "/api/v1/openapi.json" ];

describe("v1 router guards", () => {
    const routes = collectRoutes();

    it("registers at least one route", () => {
        assert.ok(routes.length > 0, "no routes parsed; the matcher is probably stale");
    });

    it("puts every route behind apiAuth", () => {
        const unguarded = routes
            .filter((route) => !INTENTIONALLY_PUBLIC.includes(route.path))
            .filter((route) => !route.body.includes("apiAuth"))
            .map((route) => `${route.method.toUpperCase()} ${route.path}`);

        assert.deepStrictEqual(unguarded, [], "these routes are reachable without authentication");
    });

    it("puts every mutating route behind requireWrite", () => {
        const mutating = routes.filter((route) => route.method !== "get");
        const unguarded = mutating
            .filter((route) => !route.body.includes("requireWrite"))
            .map((route) => `${route.method.toUpperCase()} ${route.path}`);

        assert.deepStrictEqual(unguarded, [], "a read-only key could call these");
    });

    it("keeps every route under the versioned prefix", () => {
        const stray = routes
            .filter((route) => !route.path.startsWith("/api/v1/"))
            .map((route) => `${route.method.toUpperCase()} ${route.path}`);

        assert.deepStrictEqual(stray, [], "these escape the versioned contract");
    });

    it("wraps every async handler so a rejection cannot escape", () => {
        const unwrapped = routes
            .filter((route) => route.body.includes("async"))
            .filter((route) => !route.body.includes("route(async"))
            .map((route) => `${route.method.toUpperCase()} ${route.path}`);

        assert.deepStrictEqual(unwrapped, [], "an unhandled rejection here would take the process down");
    });
});
