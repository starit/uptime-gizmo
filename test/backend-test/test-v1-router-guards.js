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

    // router.get( "path", middleware, middleware, route(...) )
    const pattern = /router\.(get|post|patch|put|delete)\(\s*\n?\s*"([^"]+)"([\s\S]*?)\n\);/g;

    for (const match of source.matchAll(pattern)) {
        routes.push({
            method: match[1],
            path: match[2],
            body: match[3],
        });
    }

    return routes;
}

describe("v1 router guards", () => {
    const routes = collectRoutes();

    it("registers at least one route", () => {
        assert.ok(routes.length > 0, "no routes parsed; the matcher is probably stale");
    });

    it("puts every route behind apiAuth", () => {
        const unguarded = routes
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

    it("wraps every handler so a rejection cannot escape", () => {
        const unwrapped = routes
            .filter((route) => !route.body.includes("route(async"))
            .map((route) => `${route.method.toUpperCase()} ${route.path}`);

        assert.deepStrictEqual(unwrapped, [], "an unhandled rejection here would take the process down");
    });
});
