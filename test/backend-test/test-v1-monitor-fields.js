const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const { internals } = require("../../server/routers/v1-router");
const { API_MONITOR_TYPES, MONITOR_FIELDS, monitorToAPI, monitorFromAPI, projectWith, buildOpenAPI } = internals;

/*
 * The field table is what stops a request writing columns it should not, and
 * what stops a response carrying a secret. Both are silent failures: a leaked
 * column looks like a normal field, and a writable one accepts input without
 * complaint. So they are asserted here rather than trusted.
 */

/*
 * Monitor columns that hold credentials. Adding one of these to MONITOR_FIELDS
 * would publish it, so the list is kept here deliberately rather than derived —
 * a new secret column should fail this test until someone decides otherwise.
 */
const FIELD_TABLES = {
    monitor: internals.MONITOR_FIELDS,
    tag: internals.TAG_FIELDS,
    statusPage: internals.STATUS_PAGE_FIELDS,
    notification: internals.NOTIFICATION_FIELDS,
    proxy: internals.PROXY_FIELDS,
    dockerHost: internals.DOCKER_HOST_FIELDS,
    remoteBrowser: internals.REMOTE_BROWSER_FIELDS,
};

/*
 * Columns that must never be projected, per table.
 *
 * Per table rather than a flat list, because a column name does not carry its
 * own meaning: `url` on a monitor is the target being watched, and is already
 * published on status pages, while `url` on a remote browser is an endpoint
 * commonly carrying a token. A blind list conflated the two and failed the
 * monitor table for having a url at all.
 */
const SECRET_COLUMNS = {
    monitor: [
        "basic_auth_pass",
        "bearer_token",
        "database_connection_string",
        "gamedig_token",
        "mqtt_password",
        "oauth_client_secret",
        "push_token",
        "rabbitmq_password",
        "radius_password",
        "radius_secret",
        "snmp_v3_username",
        "tls_key",
    ],
    tag: [],
    statusPage: [ "password" ],
    /*
     * Below: columns whose value may or may not hold a credential depending on
     * what the operator entered. notification.config is a JSON blob carrying the
     * whole channel configuration; docker_daemon may be tcp://user:pass@host; a
     * remote browser url commonly carries a token. A column table cannot express
     * "sensitive sometimes", so they are treated as always sensitive.
     */
    notification: [ "config" ],
    proxy: [ "password" ],
    dockerHost: [ "docker_daemon" ],
    remoteBrowser: [ "url" ],
};


/*
 * Applied to every table rather than only to monitors. A resource added later
 * inherits these guarantees without anyone remembering to extend the test,
 * which is the failure mode that matters.
 */
/*
 * Derived fields, per table. Each one reads a column the projection never
 * returns whole, so each is a deliberate decision recorded here.
 * notification.type lifts a single named key out of the config blob; the blob
 * is the credential for most providers and is never returned.
 */
const DERIVED_FIELDS = {
    notification: [ "type" ],
};

describe("v1 field tables", () => {
    for (const [ resource, fields ] of Object.entries(FIELD_TABLES)) {
        /*
         * Derived fields read a column directly, so the check below — which
         * walks field.column — cannot see what they touch. Naming them here
         * means adding one is a deliberate edit to this file rather than
         * something that lands unreviewed.
         */
        it(`${resource}: declares every derived field`, () => {
            const derived = Object.entries(fields)
                .filter(([ , field ]) => field.derive)
                .map(([ name ]) => name);

            assert.deepStrictEqual(
                derived,
                DERIVED_FIELDS[resource] ?? [],
                "a derived field was added or removed without review"
            );
        });

        it(`${resource}: never exposes a credential column`, () => {
            const sensitive = SECRET_COLUMNS[resource] ?? [];
            const leaked = Object.entries(fields)
                .filter(([ , field ]) => sensitive.includes(field.column) && !field.secret)
                .map(([ name, field ]) => `${name} -> ${field.column}`);

            assert.deepStrictEqual(leaked, [], "these would be returned in API responses");
        });

        it(`${resource}: gives every stored field a column`, () => {
            const broken = Object.entries(fields)
                .filter(([ , field ]) => !field.derive)
                .filter(([ , field ]) => typeof field.column !== "string" || field.column === "")
                .map(([ name ]) => name);

            assert.deepStrictEqual(broken, [], "a field with no column silently drops writes");
        });

        // Which is why a derived field must never be writable: there is no
        // column to write it back to, so accepting one would drop it in silence.
        it(`${resource}: keeps derived fields read-only`, () => {
            const writable = Object.entries(fields)
                .filter(([ , field ]) => field.derive && field.writable)
                .map(([ name ]) => name);

            assert.deepStrictEqual(writable, [], "a write to these would be accepted and discarded");
        });

        it(`${resource}: does not map two fields onto one column`, () => {
            const seen = new Map();
            const clashes = [];
            for (const [ name, field ] of Object.entries(fields)) {
                if (field.derive) {
                    continue;
                }
                if (seen.has(field.column)) {
                    clashes.push(`${seen.get(field.column)} and ${name} both write ${field.column}`);
                }
                seen.set(field.column, name);
            }
            assert.deepStrictEqual(clashes, []);
        });

        it(`${resource}: never projects a secret`, () => {
            const bean = {};
            for (const field of Object.values(fields)) {
                bean[field.column] = "value";
            }
            const out = projectWith(fields, bean);
            const leaked = Object.entries(fields)
                .filter(([ name, field ]) => field.secret && name in out)
                .map(([ name ]) => name);

            assert.deepStrictEqual(leaked, [], "a field marked secret reached the response");
        });
    }
});

describe("v1 monitor field table", () => {

    it("projects only declared fields", () => {
        const bean = { id: 1, name: "x", basic_auth_pass: "secret", user_id: 9 };
        const out = monitorToAPI(bean);

        assert.ok(!("basic_auth_pass" in out), "a secret reached the response");
        assert.ok(!("user_id" in out), "ownership is not part of the contract");
        assert.deepStrictEqual(
            Object.keys(out).filter((key) => !(key in MONITOR_FIELDS)),
            [],
            "the projection invented a field"
        );
    });

    it("drops anything not declared writable", () => {
        const columns = monitorFromAPI(
            {
                name: "x",
                type: "http",
                user_id: 9999,
                basic_auth_pass: "leak",
                id: 42,
                createdDate: "2000-01-01",
                somethingInvented: true,
            },
            false
        );

        assert.deepStrictEqual(Object.keys(columns).sort(), [ "name", "type" ]);
    });

    it("requires the fields marked required", () => {
        assert.throws(() => monitorFromAPI({ url: "https://example.com" }, false), /name is required/);
    });

    it("allows a partial body only when patching", () => {
        assert.doesNotThrow(() => monitorFromAPI({ name: "renamed" }, true));
        assert.throws(() => monitorFromAPI({}, true), /No writable fields/);
    });

    it("accepts a bounded externalRef only when creating", () => {
        assert.deepStrictEqual(
            monitorFromAPI({ name: "x", type: "http", externalRef: "gizmo-cloud:00000000-0000-4000-8000-000000000000" }, false).external_ref,
            "gizmo-cloud:00000000-0000-4000-8000-000000000000"
        );
        assert.throws(
            () => monitorFromAPI({ externalRef: "changed" }, true),
            /cannot be changed/
        );
        assert.throws(
            () => monitorFromAPI({ name: "x", type: "http", externalRef: "" }, false),
            /between 1 and 128/
        );
        assert.throws(
            () => monitorFromAPI({ name: "x", type: "http", externalRef: "contains spaces" }, false),
            /unsupported characters/
        );
    });

    it("documents externalRef on create and lookup but not update", () => {
        const spec = buildOpenAPI();
        const create = spec.components.schemas.MonitorInput.properties;
        const update = spec.paths["/api/v1/monitors/{id}"].patch.requestBody.content["application/json"].schema.properties;
        const lookup = spec.paths["/api/v1/monitors"].get.parameters.find(parameter => parameter.name === "externalRef");

        assert.ok(create.externalRef);
        assert.ok(!update.externalRef);
        assert.ok(lookup);
    });

    it("refuses a value it cannot coerce", () => {
        assert.throws(() => monitorFromAPI({ name: "x", type: "http", interval: "soon" }, false), /interval must be a number/);
        assert.throws(() => monitorFromAPI({ name: "x", type: "http", acceptedStatuscodes: "200" }, false), /must be an array/);
    });

    it("accepts every type this API can create", () => {
        for (const type of API_MONITOR_TYPES) {
            assert.doesNotThrow(() => monitorFromAPI({ name: "x", type }, false));
        }
    });

    it("refuses a type this API cannot create", () => {
        assert.throws(() => monitorFromAPI({ name: "x", type: "not-a-type" }, false), /type must be one of/);
        // Exists in the UI; its fields are not in the table, so creating it here
        // would store a hollow monitor.
        assert.throws(() => monitorFromAPI({ name: "x", type: "mqtt" }, false), /type must be one of/);
        assert.throws(() => monitorFromAPI({ type: "json-query" }, true), /type must be one of/);
    });

    it("does not require type on a patch that leaves it alone", () => {
        assert.doesNotThrow(() => monitorFromAPI({ name: "renamed" }, true));
    });

    it("publishes the type allow-list on the OpenAPI schema", () => {
        const spec = buildOpenAPI();
        assert.deepStrictEqual(spec.components.schemas.MonitorInput.properties.type.enum, API_MONITOR_TYPES);
        assert.deepStrictEqual(MONITOR_FIELDS.type.enum, API_MONITOR_TYPES);
    });

    it("refuses web3 enums that the check engine would not accept", () => {
        assert.throws(
            () => monitorFromAPI({ web3ValueType: "bytes" }, true),
            /web3ValueType must be one of/
        );
        assert.throws(
            () => monitorFromAPI({ web3ValueOperator: "greater" }, true),
            /web3ValueOperator must be one of/
        );
        assert.throws(
            () => monitorFromAPI({ web3BlockTag: "pending" }, true),
            /web3BlockTag must be one of/
        );
    });

    it("publishes the web3 enums on the OpenAPI schema", () => {
        const { VALUE_TYPES, VALUE_OPERATORS, BLOCK_TAGS } = require("../../server/modules/web3-rpc");
        const spec = buildOpenAPI();
        const properties = spec.components.schemas.MonitorInput.properties;

        assert.deepStrictEqual(properties.web3ValueType.enum, VALUE_TYPES);
        assert.deepStrictEqual(properties.web3ValueOperator.enum, VALUE_OPERATORS);
        assert.deepStrictEqual(properties.web3BlockTag.enum, BLOCK_TAGS);
        assert.strictEqual(MONITOR_FIELDS.web3ValueType.enum, VALUE_TYPES);
        assert.strictEqual(MONITOR_FIELDS.web3ValueOperator.enum, VALUE_OPERATORS);
        assert.strictEqual(MONITOR_FIELDS.web3BlockTag.enum, BLOCK_TAGS);
    });

    it("refuses dnsResolveType the check engine cannot read", () => {
        assert.throws(
            () => monitorFromAPI({ dnsResolveType: "ANY" }, true),
            /dnsResolveType must be one of/
        );
        assert.throws(
            () => monitorFromAPI({ dnsResolveType: "NAPTR" }, true),
            /dnsResolveType must be one of/
        );
        assert.throws(
            () => monitorFromAPI({ dnsResolveType: "TLSA" }, true),
            /dnsResolveType must be one of/
        );
    });

    it("publishes the dnsResolveType enum on the OpenAPI schema", () => {
        const { DNS_RESOLVE_TYPES } = require("../../server/monitor-types/dns");
        const spec = buildOpenAPI();

        assert.deepStrictEqual(
            spec.components.schemas.MonitorInput.properties.dnsResolveType.enum,
            DNS_RESOLVE_TYPES
        );
        assert.strictEqual(MONITOR_FIELDS.dnsResolveType.enum, DNS_RESOLVE_TYPES);
    });

    it("the sync skill documents exactly these types", () => {
        const skill = fs.readFileSync(
            path.join(__dirname, "..", "..", "skills", "uptime-gizmo-sync", "SKILL.md"),
            "utf8"
        );
        const section = skill.split("### Types and their fields")[1]?.split("### ")[0];
        assert.ok(section, "the types table heading has moved");
        // The heading row is `| `type` | Needs | Notes |`; skip that label.
        const types = [ ...section.matchAll(/^\| `([^`]+)` /gm) ]
            .map((match) => match[1])
            .filter((name) => name !== "type");

        assert.deepStrictEqual(
            types,
            API_MONITOR_TYPES,
            "the sync skill type table has drifted from the API"
        );
    });
});
