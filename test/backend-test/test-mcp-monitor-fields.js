const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { internals } = require("../../server/routers/v1-router");

/*
 * The MCP server names monitor fields, and the REST API decides which names
 * exist.
 *
 * Those are two artifacts in two packages, and the failure mode when they
 * disagree is silent in the worst way: `parseWith` takes an allow-list, so a
 * field the API does not know is **dropped rather than refused**. An MCP tool
 * offering `web3Threshold` where the API expects `web3ValueThreshold` would
 * report a monitor created successfully, with no threshold on it, and the monitor
 * would sit there testing nothing.
 *
 * The MCP server is a separate package with its own dependencies and a top-level
 * await, so it is read as text rather than imported. That is enough: what is
 * being checked is a set of property names.
 */

const MCP_SOURCE = path.join(__dirname, "..", "..", "mcp-server", "index.mjs");

/**
 * Property names declared in one object literal in the MCP server's source.
 * @param {string} source the file's contents
 * @param {string} declaration the literal's opening line
 * @returns {string[]} the keys at the literal's top level
 */
function propertyNames(source, declaration) {
    const start = source.indexOf(declaration);
    assert.notStrictEqual(start, -1, `${declaration} is no longer in the MCP server`);

    const body = source.slice(start + declaration.length).split("\n};")[0];
    // Top-level keys only: the nested descriptions are indented further.
    return [ ...body.matchAll(/^ {4}(\w+):/gm) ].map((match) => match[1]);
}

describe("MCP monitor fields agree with the REST allow-list", () => {
    const source = fs.readFileSync(MCP_SOURCE, "utf8");
    const writable = Object.entries(internals.MONITOR_FIELDS)
        .filter(([ , field ]) => field.writable)
        .map(([ name ]) => name);

    it("offers only fields the API will actually write", () => {
        const offered = propertyNames(source, "const WEB3_PROPERTIES = {");

        assert.ok(offered.length > 0, "no properties were found; the declaration has moved");

        for (const name of offered) {
            assert.ok(writable.includes(name), `MCP offers ${name}, which the REST API does not accept`);
        }
    });

    /*
     * The other direction, which is not a failure but is worth noticing: a web3
     * field the API accepts and MCP does not offer is a monitor an agent cannot
     * fully configure over MCP. It is listed so adding one to the API prompts a
     * decision rather than being forgotten.
     */
    it("offers every web3 field the API accepts", () => {
        const offered = propertyNames(source, "const WEB3_PROPERTIES = {");
        const web3Writable = writable.filter((name) => name.startsWith("web3"));

        assert.deepStrictEqual(
            web3Writable.filter((name) => !offered.includes(name)),
            [],
            "the REST API accepts web3 fields the MCP server does not offer"
        );
    });

    it("names the web3 monitor types the API can create", () => {
        // The description is what a model reads to decide whether the tool can do
        // what it was asked. A type missing from it is a capability nobody uses.
        for (const type of [ "web3-balance", "web3-rpc", "web3-contract" ]) {
            assert.ok(source.includes(type), `create_monitor does not mention ${type}`);
        }
    });
});
