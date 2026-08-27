const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { internals } = require("../../server/routers/v1-router");
const { VALUE_TYPES, VALUE_OPERATORS, BLOCK_TAGS, UNORDERED_TYPES } = require("../../server/modules/web3-rpc");

/*
 * Agent-facing copies of lists the server owns. Each copy exists because the
 * consumer cannot import the server module (a skill copied into someone else's
 * project, an MCP package, a Vue SFC). They are asserted here so a new value
 * added to the source of truth cannot ship with a stale copy still offering
 * the old set.
 */

const ROOT = path.join(__dirname, "..", "..");

/**
 * Backticks in a skill sentence that introduces an enum: `field` is a, b or c.
 * Stops at an em dash so a following "the enum on MonitorInput.x" is not eaten.
 * @param {string} skill skill markdown
 * @param {string} field API field name
 * @returns {string[]} values listed
 */
function skillEnum(skill, field) {
    const match = skill.match(new RegExp(`\\*\\*\`${field}\`\\*\\* is ([^—\\n]+)`));
    assert.ok(match, `${field} list is no longer in the skill`);
    return [ ...match[1].matchAll(/`([^`]+)`/g) ].map((entry) => entry[1]);
}

/**
 * A one-line `return [ "a", "b" ];` from a Vue computed.
 * @param {string} source component source
 * @param {string} methodName computed name
 * @returns {string[]} the array
 */
function vueReturnedArray(source, methodName) {
    const start = source.indexOf(`${methodName}() {`);
    assert.notStrictEqual(start, -1, `${methodName} is no longer in EditMonitor.vue`);
    const match = source.slice(start, start + 400).match(/return \[ ([^\]]+) \];/);
    assert.ok(match, `${methodName} no longer returns a one-line array`);
    return match[1].split(",").map((part) => part.trim().replace(/"/g, ""));
}

describe("agent copies agree with the server lists", () => {
    const skill = fs.readFileSync(path.join(ROOT, "skills", "uptime-gizmo-sync", "SKILL.md"), "utf8");
    const statusSkill = fs.readFileSync(path.join(ROOT, "skills", "uptime-gizmo-status", "SKILL.md"), "utf8");
    const wiki = fs.readFileSync(path.join(ROOT, "docs", "wiki", "web3-monitoring.md"), "utf8");
    const vue = fs.readFileSync(path.join(ROOT, "src", "pages", "EditMonitor.vue"), "utf8");
    const mcp = fs.readFileSync(path.join(ROOT, "mcp-server", "index.mjs"), "utf8");
    const spec = internals.buildOpenAPI();

    it("the sync skill writable-field list is exactly MONITOR_FIELDS.writable", () => {
        const section = skill.split("### Every writable field")[1]?.split("Anything else")[0];
        assert.ok(section, "the writable-field heading has moved");
        const listed = [ ...section.matchAll(/`([A-Za-z][A-Za-z0-9]*)`/g) ]
            .map((entry) => entry[1])
            .filter((name) => name !== "MonitorInput");
        const writable = Object.entries(internals.MONITOR_FIELDS)
            .filter(([ , field ]) => field.writable)
            .map(([ name ]) => name);

        assert.deepStrictEqual(listed, writable, "the sync skill writable list has drifted from the API");
    });

    it("the sync skill web3 enums match the check engine", () => {
        assert.deepStrictEqual(skillEnum(skill, "web3ValueType"), VALUE_TYPES);
        assert.deepStrictEqual(skillEnum(skill, "web3ValueOperator"), VALUE_OPERATORS);
        assert.deepStrictEqual(skillEnum(skill, "web3BlockTag"), BLOCK_TAGS);
    });

    it("the wiki value-type list matches the check engine", () => {
        const match = wiki.match(/\*\*Value type:\*\* ([^—\n]+)/);
        assert.ok(match, "the wiki value-type line has moved");
        const listed = [ ...match[1].matchAll(/`([^`]+)`/g) ].map((entry) => entry[1]);
        assert.deepStrictEqual(listed, VALUE_TYPES);
    });

    it("the edit form offers the same web3 enums the check engine enforces", () => {
        assert.deepStrictEqual(vueReturnedArray(vue, "web3ValueTypes"), VALUE_TYPES);
        assert.deepStrictEqual(vueReturnedArray(vue, "web3BlockTags"), BLOCK_TAGS);

        const start = vue.indexOf("web3ValueOperators() {");
        assert.notStrictEqual(start, -1, "web3ValueOperators is gone");
        const body = vue.slice(start, vue.indexOf("web3ValueIsNumeric() {", start));
        const offered = [ ...new Set([ ...body.matchAll(/id: "([^"]+)"/g) ].map((entry) => entry[1])) ];
        assert.deepStrictEqual(offered.sort(), [ ...VALUE_OPERATORS ].sort());

        const numeric = vue.match(/web3ValueIsNumeric\(\) \{\s*return ([^;]+);/);
        assert.ok(numeric, "web3ValueIsNumeric has moved");
        const numericTypes = [ ...numeric[1].matchAll(/"([^"]+)"/g) ].map((entry) => entry[1]);
        assert.deepStrictEqual(
            numericTypes.sort(),
            VALUE_TYPES.filter((type) => !UNORDERED_TYPES.includes(type)).sort()
        );
    });

    it("the status skill names every GET the OpenAPI document has", () => {
        const getPaths = Object.entries(spec.paths)
            .filter(([ , methods ]) => methods.get)
            .map(([ path ]) => path);

        for (const path of getPaths) {
            assert.ok(
                statusSkill.includes(path) || statusSkill.includes(path.replace(/\{[^}]+\}/g, "{id}")),
                `status skill does not mention GET ${path}`
            );
        }
    });

    it("each skill names its version and the GitHub URL that updates it", () => {
        const pkg = require(path.join(ROOT, "package.json"));
        const repo = pkg.repository.url.replace(/\.git$/, "");
        const skillsReadme = fs.readFileSync(path.join(ROOT, "skills", "README.md"), "utf8");
        const wiki = fs.readFileSync(path.join(ROOT, "docs", "wiki", "mcp-and-agents.md"), "utf8");

        for (const name of [ "uptime-gizmo-status", "uptime-gizmo-sync" ]) {
            const text = fs.readFileSync(path.join(ROOT, "skills", name, "SKILL.md"), "utf8");
            const version = text.match(/^version: (\S+)/m)?.[1];
            assert.ok(version, `${name} has no front-matter version`);
            assert.ok(text.includes(`This is version **${version}**`), `${name} body does not repeat ${version}`);

            const blob = `${repo}/blob/main/skills/${name}/SKILL.md`;
            const raw = `${repo.replace("https://github.com/", "https://raw.githubusercontent.com/")}/main/skills/${name}/SKILL.md`;
            assert.ok(text.includes(blob), `${name} does not point at ${blob}`);
            assert.ok(text.includes(raw), `${name} does not tell how to curl ${raw}`);

            const tableRow = new RegExp(`\\|[^|]*${name}[^|]*\\| ${version.replace(/\./g, "\\.")} \\|`);
            assert.ok(tableRow.test(skillsReadme), `skills/README.md table is not on ${name} ${version}`);
            assert.ok(tableRow.test(wiki), `docs/wiki/mcp-and-agents.md table is not on ${name} ${version}`);
        }
    });

    it("paths the skills and MCP mention exist on the OpenAPI document", () => {
        const specPaths = Object.keys(spec.paths);
        const combined = [ skill, statusSkill, mcp ].join("\n");
        const mentioned = [
            ...new Set(
                [ ...combined.matchAll(/\/api\/v1\/[a-zA-Z0-9/{}_.-]+/g) ].map((entry) =>
                    entry[0]
                        .replace(/\/$/, "")
                        .replace(/\/\d+(?=\/|$)/g, "/{id}")
                        .replace(/\{[a-zA-Z]+\}/g, "{id}")
                )
            ),
        ];

        assert.ok(mentioned.length > 0, "no /api/v1 paths were found; the matcher is stale");

        const specPlaceholders = specPaths.map((specPath) => specPath.replace(/\{[a-zA-Z]+\}/g, "{id}"));
        // The document does not list itself; agents are told to fetch it.
        const known = new Set([ ...specPlaceholders, "/api/v1/openapi.json" ]);

        for (const mentionedPath of mentioned) {
            const exists = [ ...known ].some(
                (specPath) => specPath === mentionedPath || specPath.startsWith(`${mentionedPath}/`)
            );
            assert.ok(exists, `${mentionedPath} is documented for agents but is not in the OpenAPI document`);
        }
    });
});
