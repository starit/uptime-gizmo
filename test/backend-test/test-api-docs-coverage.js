const { describe, it } = require("node:test");
const assert = require("node:assert");
const { internals } = require("../../server/routers/v1-router");

/*
 * The reference page renders the generated OpenAPI document itself, which is
 * what stops the documentation drifting away from the code. The cost of that
 * choice is a second place that has to understand the document: if the generator
 * starts emitting a construct the page does not handle, the page will not fail —
 * it will quietly render nothing where that construct was, and a parameter or a
 * whole request body will go missing from the docs without anyone noticing.
 *
 * So the set of constructs the page handles is written down here, and any
 * addition to the generator has to be a deliberate edit to this list.
 *
 * The page is src/components/settings/ApiDocs.vue.
 */

/** Keys the page reads from an operation. */
const OPERATION_KEYS = new Set([ "summary", "description", "security", "parameters", "requestBody", "responses" ]);

/** Keys the page reads from a parameter. */
const PARAMETER_KEYS = new Set([ "name", "in", "required", "schema", "description" ]);

/** Keys the page reads from a schema. */
const SCHEMA_KEYS = new Set([
    "$ref",
    "type",
    "properties",
    "required",
    "items",
    "enum",
    "nullable",
    "default",
    "maximum",
    "minimum",
    "description",
    "format",
    "example",
]);

/**
 * Walk every schema reachable from a starting point.
 * @param {object} schema where to start
 * @param {Function} visit called with each schema found
 * @returns {void}
 */
function walkSchemas(schema, visit) {
    if (!schema || typeof schema !== "object") {
        return;
    }

    visit(schema);

    for (const child of Object.values(schema.properties ?? {})) {
        walkSchemas(child, visit);
    }
    if (schema.items) {
        walkSchemas(schema.items, visit);
    }
}

describe("the API reference page can render everything the document contains", () => {
    const spec = internals.buildOpenAPI();

    it("uses only operation keys the page reads", () => {
        const unknown = new Set();

        for (const methods of Object.values(spec.paths)) {
            for (const operation of Object.values(methods)) {
                for (const key of Object.keys(operation)) {
                    if (!OPERATION_KEYS.has(key)) {
                        unknown.add(key);
                    }
                }
            }
        }

        assert.deepStrictEqual(
            [ ...unknown ],
            [],
            "the document describes operations with keys the reference page ignores"
        );
    });

    it("uses only parameter keys the page reads", () => {
        const unknown = new Set();

        for (const methods of Object.values(spec.paths)) {
            for (const operation of Object.values(methods)) {
                for (const parameter of operation.parameters ?? []) {
                    for (const key of Object.keys(parameter)) {
                        if (!PARAMETER_KEYS.has(key)) {
                            unknown.add(key);
                        }
                    }
                }
            }
        }

        assert.deepStrictEqual([ ...unknown ], [], "parameters carry keys the reference page ignores");
    });

    it("uses only schema keywords the page understands", () => {
        const unknown = new Set();
        const note = (schema) => {
            for (const key of Object.keys(schema)) {
                if (!SCHEMA_KEYS.has(key)) {
                    unknown.add(key);
                }
            }
        };

        for (const schema of Object.values(spec.components?.schemas ?? {})) {
            walkSchemas(schema, note);
        }
        for (const methods of Object.values(spec.paths)) {
            for (const operation of Object.values(methods)) {
                walkSchemas(operation.requestBody?.content?.["application/json"]?.schema, note);
                for (const parameter of operation.parameters ?? []) {
                    walkSchemas(parameter.schema, note);
                }
                for (const response of Object.values(operation.responses ?? {})) {
                    walkSchemas(response.content?.["application/json"]?.schema, note);
                }
            }
        }

        /*
         * oneOf, allOf, anyOf and additionalProperties would each land here.
         * They are not hard to support — they are just not supported yet, and a
         * page that silently drops them is worse than a test that says so.
         */
        assert.deepStrictEqual([ ...unknown ], [], "schemas use keywords the reference page would drop");
    });

    it("sends every request body as JSON", () => {
        const other = new Set();

        for (const methods of Object.values(spec.paths)) {
            for (const operation of Object.values(methods)) {
                for (const type of Object.keys(operation.requestBody?.content ?? {})) {
                    if (type !== "application/json") {
                        other.add(type);
                    }
                }
            }
        }

        assert.deepStrictEqual([ ...other ], [], "the page only renders JSON request bodies");
    });

    it("resolves every reference the document makes", () => {
        const missing = [];
        const check = (schema) => {
            if (schema.$ref) {
                const name = schema.$ref.split("/").pop();
                if (!spec.components?.schemas?.[name]) {
                    missing.push(schema.$ref);
                }
            }
        };

        for (const schema of Object.values(spec.components?.schemas ?? {})) {
            walkSchemas(schema, check);
        }
        for (const methods of Object.values(spec.paths)) {
            for (const operation of Object.values(methods)) {
                walkSchemas(operation.requestBody?.content?.["application/json"]?.schema, check);
                for (const response of Object.values(operation.responses ?? {})) {
                    walkSchemas(response.content?.["application/json"]?.schema, check);
                }
            }
        }

        assert.deepStrictEqual(missing, [], "these references point at schemas the document does not define");
    });

    it("gives every operation something to show", () => {
        const bare = [];

        for (const [ path, methods ] of Object.entries(spec.paths)) {
            for (const [ method, operation ] of Object.entries(methods)) {
                if (!operation.summary) {
                    bare.push(`${method.toUpperCase()} ${path}`);
                }
            }
        }

        assert.deepStrictEqual(bare, [], "these operations would render with no title");
    });
});
