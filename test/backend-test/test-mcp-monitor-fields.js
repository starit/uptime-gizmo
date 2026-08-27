const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { internals } = require("../../server/routers/v1-router");

/*
 * The MCP server names monitor fields and types, and the REST API decides
 * which names exist.
 *
 * Those are two artifacts in two packages, and the failure mode when they
 * disagree is silent in the worst way: `parseWith` takes an allow-list, so a
 * field the API does not know is **dropped rather than refused**. An MCP tool
 * offering `web3Threshold` where the API expects `web3ValueThreshold` would
 * report a monitor created successfully, with no threshold on it, and the monitor
 * would sit there testing nothing. A type missing from CREATE_MONITOR_TYPES is
 * a capability the model will not use; a type extra to API_MONITOR_TYPES is
 * refused with 400.
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
        const offered = [
            ...propertyNames(source, "const WEB3_PROPERTIES = {"),
            ...propertyNames(source, "const DNS_PROPERTIES = {"),
        ];

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

    it("offers every dns field the API accepts", () => {
        const offered = propertyNames(source, "const DNS_PROPERTIES = {");
        const dnsWritable = writable.filter((name) => name.startsWith("dns"));

        assert.deepStrictEqual(
            dnsWritable.filter((name) => !offered.includes(name)),
            [],
            "the REST API accepts dns fields the MCP server does not offer"
        );
    });

    it("create_monitor types are exactly the types the API accepts", () => {
        const start = source.indexOf("const CREATE_MONITOR_TYPES = [");
        assert.notStrictEqual(start, -1, "CREATE_MONITOR_TYPES is no longer in the MCP server");
        const body = source.slice(start).split("];")[0];
        const offered = [ ...body.matchAll(/"([^"]+)"/g) ].map((match) => match[1]);

        assert.deepStrictEqual(
            offered,
            internals.API_MONITOR_TYPES,
            "MCP and the REST API have drifted on which types can be created"
        );
    });

    it("web3 enums are exactly the lists the check engine enforces", () => {
        const { VALUE_TYPES, VALUE_OPERATORS, BLOCK_TAGS } = require("../../server/modules/web3-rpc");

        const listed = (name) => {
            const start = source.indexOf(`const ${name} = [`);
            assert.notStrictEqual(start, -1, `${name} is no longer in the MCP server`);
            return [ ...source.slice(start).split("];")[0].matchAll(/"([^"]+)"/g) ].map((match) => match[1]);
        };

        assert.deepStrictEqual(listed("WEB3_VALUE_TYPES"), VALUE_TYPES);
        assert.deepStrictEqual(listed("WEB3_VALUE_OPERATORS"), VALUE_OPERATORS);
        assert.deepStrictEqual(listed("WEB3_BLOCK_TAGS"), BLOCK_TAGS);
    });

    it("dns resolve types are exactly the list the check engine can read", () => {
        const { DNS_RESOLVE_TYPES } = require("../../server/monitor-types/dns");
        const start = source.indexOf("const DNS_RESOLVE_TYPES = [");
        assert.notStrictEqual(start, -1, "DNS_RESOLVE_TYPES is no longer in the MCP server");
        const offered = [ ...source.slice(start).split("];")[0].matchAll(/"([^"]+)"/g) ].map((match) => match[1]);

        assert.deepStrictEqual(offered, DNS_RESOLVE_TYPES);
    });
});
