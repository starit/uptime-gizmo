const { describe, it } = require("node:test");
const assert = require("node:assert");

const { internals } = require("../../server/routers/v1-router");
const { MONITOR_FIELDS, monitorToAPI, monitorFromAPI } = internals;

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
const SECRET_COLUMNS = [
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
];

describe("v1 monitor field table", () => {
    it("never exposes a credential column", () => {
        const leaked = Object.entries(MONITOR_FIELDS)
            .filter(([ , field ]) => SECRET_COLUMNS.includes(field.column) && !field.secret)
            .map(([ name, field ]) => `${name} -> ${field.column}`);

        assert.deepStrictEqual(leaked, [], "these would be returned in API responses");
    });

    it("gives every field a column", () => {
        const broken = Object.entries(MONITOR_FIELDS)
            .filter(([ , field ]) => typeof field.column !== "string" || field.column === "")
            .map(([ name ]) => name);

        assert.deepStrictEqual(broken, [], "a field with no column silently drops writes");
    });

    it("does not map two fields onto one column", () => {
        const seen = new Map();
        const clashes = [];
        for (const [ name, field ] of Object.entries(MONITOR_FIELDS)) {
            if (seen.has(field.column)) {
                clashes.push(`${seen.get(field.column)} and ${name} both write ${field.column}`);
            }
            seen.set(field.column, name);
        }
        assert.deepStrictEqual(clashes, []);
    });

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

    it("refuses a value it cannot coerce", () => {
        assert.throws(() => monitorFromAPI({ name: "x", type: "http", interval: "soon" }, false), /interval must be a number/);
        assert.throws(() => monitorFromAPI({ name: "x", type: "http", acceptedStatuscodes: "200" }, false), /must be an array/);
    });
});
