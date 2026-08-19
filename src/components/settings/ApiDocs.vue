<template>
    <div class="api-docs">
        <p v-if="error" class="gizmo-native-alert gizmo-native-alert--danger">{{ error }}</p>
        <p v-else-if="!spec" class="gizmo-field-help">{{ $t("Loading") }}…</p>

        <template v-else>
            <section class="api-docs__intro">
                <p>{{ $t("apiDocsIntro") }}</p>

                <pre class="api-docs__code"><code>{{ authExample }}</code></pre>

                <ul class="api-docs__notes">
                    <li>{{ $t("apiDocsAuthNote") }}</li>
                    <li>{{ $t("apiDocsReadOnlyNote") }}</li>
                    <li>{{ $t("apiDocsNotFoundNote") }}</li>
                </ul>

                <p class="gizmo-field-help">
                    <i18n-t keypath="apiDocsSpecLink" tag="span">
                        <a :href="specUrl" target="_blank" rel="noopener"><code>/api/v1/openapi.json</code></a>
                    </i18n-t>
                </p>
            </section>

            <section v-for="group in groups" :key="group.name" class="api-docs__group">
                <h3 class="api-docs__group-title">{{ group.name }}</h3>

                <details v-for="op in group.operations" :key="op.key" class="api-docs__op">
                    <summary class="api-docs__summary">
                        <span class="api-docs__method" :class="`api-docs__method--${op.method}`">
                            {{ op.method.toUpperCase() }}
                        </span>
                        <code class="api-docs__path">{{ op.path }}</code>
                        <span class="api-docs__title">{{ op.summary }}</span>
                    </summary>

                    <div class="api-docs__body">
                        <p v-if="op.description" class="api-docs__description">{{ op.description }}</p>

                        <template v-if="op.parameters.length">
                            <h4 class="api-docs__heading">{{ $t("apiDocsParameters") }}</h4>
                            <dl class="api-docs__fields">
                                <template v-for="p in op.parameters" :key="p.name">
                                    <dt>
                                        <code>{{ p.name }}</code>
                                        <span class="api-docs__meta">{{ p.in }}{{ p.required ? " · " + $t("required") : "" }}</span>
                                    </dt>
                                    <dd>{{ describeSchema(p.schema) }}</dd>
                                </template>
                            </dl>
                        </template>

                        <template v-if="op.bodyFields.length">
                            <h4 class="api-docs__heading">{{ $t("apiDocsRequestBody") }}</h4>
                            <dl class="api-docs__fields">
                                <template v-for="f in op.bodyFields" :key="f.name">
                                    <dt>
                                        <code>{{ f.name }}</code>
                                        <span class="api-docs__meta">{{ f.required ? $t("required") : $t("optional") }}</span>
                                    </dt>
                                    <dd>{{ describeSchema(f.schema) }}</dd>
                                </template>
                            </dl>
                        </template>

                        <h4 class="api-docs__heading">{{ $t("apiDocsResponses") }}</h4>
                        <dl class="api-docs__fields">
                            <template v-for="r in op.responses" :key="r.status">
                                <dt><code>{{ r.status }}</code></dt>
                                <dd>{{ r.description }}</dd>
                            </template>
                        </dl>

                        <h4 class="api-docs__heading">{{ $t("apiDocsExample") }}</h4>
                        <div class="api-docs__example">
                            <pre class="api-docs__code"><code>{{ op.curl }}</code></pre>
                            <button type="button" class="gizmo-native-button gizmo-native-button--secondary" @click="copy(op.curl)">
                                {{ $t("Copy") }}
                            </button>
                        </div>
                    </div>
                </details>
            </section>
        </template>
    </div>
</template>

<script>
/*
 * The API reference, rendered from the document the server generates.
 *
 * Not written by hand: the OpenAPI document is built from the router's own field
 * tables, so it cannot describe a field the code lacks, and a test compares its
 * paths against the registered routes in both directions. A prose page beside
 * that would inherit none of it and would start lying within a release or two.
 *
 * Not a bundled viewer either. Swagger UI and its peers are each about the size
 * of this application's entire bundle, arrive with their own visual language, and
 * would have to be fought into the theme. The generated document uses a small,
 * closed set of OpenAPI constructs — and this project owns the generator, so both
 * ends stay in step. test-api-docs-coverage.js fails if the document grows a
 * construct this page does not render, which is what keeps that true.
 */
export default {
    data() {
        return {
            spec: null,
            error: "",
        };
    },
    computed: {
        /**
         * Where the document lives, for the link and the examples.
         * @returns {string} absolute URL of the generated description
         */
        specUrl() {
            return `${location.origin}/api/v1/openapi.json`;
        },

        /**
         * The smallest request that proves a key works.
         * @returns {string} a curl command
         */
        authExample() {
            return `curl -u "api:$UPTIME_GIZMO_API_KEY" \\\n  "${location.origin}/api/v1/whoami"`;
        },

        /**
         * Operations grouped by the resource in their path.
         * @returns {Array<object>} groups in the order the document lists them
         */
        groups() {
            const groups = new Map();

            for (const [ path, methods ] of Object.entries(this.spec.paths ?? {})) {
                for (const [ method, operation ] of Object.entries(methods)) {
                    // "/api/v1/monitors/{id}/pause" groups under "monitors".
                    const name = path.split("/")[3] ?? "other";
                    if (!groups.has(name)) {
                        groups.set(name, []);
                    }
                    groups.get(name).push(this.describeOperation(path, method, operation));
                }
            }

            return [ ...groups.entries() ].map(([ name, operations ]) => ({ name, operations }));
        },
    },
    mounted() {
        this.load();
    },
    methods: {
        /**
         * Fetch the generated document.
         * @returns {Promise<void>} resolves once loaded or failed
         */
        async load() {
            try {
                const response = await fetch("/api/v1/openapi.json");
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                this.spec = await response.json();
            } catch (e) {
                this.error = this.$t("apiDocsLoadFailed", [ e.message ]);
            }
        },

        /**
         * Follow a $ref into components, since the document uses them for the
         * shared resource schemas.
         * @param {object} schema schema that may be a reference
         * @returns {object} the schema it points at, or itself
         */
        resolve(schema) {
            if (!schema?.$ref) {
                return schema ?? {};
            }
            const name = schema.$ref.split("/").pop();
            return this.spec.components?.schemas?.[name] ?? {};
        },

        /**
         * A one-line description of a schema, for the field tables.
         * @param {object} schema schema to describe
         * @returns {string} human-readable type
         */
        describeSchema(schema) {
            const resolved = this.resolve(schema);
            const parts = [];

            if (resolved.type === "array") {
                parts.push(`array of ${this.resolve(resolved.items).type ?? "value"}`);
            } else if (resolved.type) {
                parts.push(resolved.type);
            } else {
                parts.push("object");
            }

            if (resolved.enum) {
                parts.push(`one of ${resolved.enum.join(", ")}`);
            }
            if (resolved.maximum !== undefined) {
                parts.push(`max ${resolved.maximum}`);
            }
            if (resolved.default !== undefined) {
                parts.push(`default ${resolved.default}`);
            }
            if (resolved.nullable) {
                parts.push("nullable");
            }

            return parts.join(" · ");
        },

        /**
         * Flatten one operation into what the template needs.
         * @param {string} path templated path
         * @param {string} method HTTP method
         * @param {object} operation the OpenAPI operation
         * @returns {object} a shape the template can render directly
         */
        describeOperation(path, method, operation) {
            const bodySchema = this.resolve(
                operation.requestBody?.content?.["application/json"]?.schema
            );
            const required = new Set(bodySchema.required ?? []);
            const bodyFields = Object.entries(bodySchema.properties ?? {}).map(([ name, schema ]) => ({
                name,
                schema,
                required: required.has(name),
            }));

            return {
                key: `${method} ${path}`,
                path,
                method,
                summary: operation.summary ?? "",
                description: operation.description ?? "",
                parameters: (operation.parameters ?? []).map((p) => ({
                    name: p.name,
                    in: p.in,
                    required: Boolean(p.required),
                    schema: p.schema,
                })),
                bodyFields,
                responses: Object.entries(operation.responses ?? {}).map(([ status, r ]) => ({
                    status,
                    description: r.description ?? "",
                })),
                curl: this.buildCurl(path, method, bodyFields),
            };
        },

        /**
         * A command the reader can paste.
         *
         * Built against this instance's own origin, so what is copied works
         * where it was copied from. The key stays a shell variable: a reference
         * page is the wrong place to put a credential, and anyone running the
         * command has it to hand anyway.
         * @param {string} path templated path
         * @param {string} method HTTP method
         * @param {Array<object>} bodyFields fields the body may carry
         * @returns {string} the command
         */
        buildCurl(path, method, bodyFields) {
            const url = `${location.origin}${path}`;
            const lines = [ `curl -u "api:$UPTIME_GIZMO_API_KEY" \\` ];

            if (method !== "get") {
                lines.push(`  -X ${method.toUpperCase()} \\`);
            }

            const required = bodyFields.filter((f) => f.required);
            if (required.length) {
                const body = Object.fromEntries(
                    required.map((f) => [ f.name, this.sampleValue(f.schema) ])
                );
                lines.push(`  -H 'Content-Type: application/json' \\`);
                lines.push(`  -d '${JSON.stringify(body)}' \\`);
            }

            lines.push(`  "${url}"`);
            return lines.join("\n");
        },

        /**
         * A plausible value for an example body.
         * @param {object} schema the field's schema
         * @returns {any} something of the right type
         */
        sampleValue(schema) {
            const resolved = this.resolve(schema);
            if (resolved.enum?.length) {
                return resolved.enum[0];
            }
            if (resolved.type === "integer" || resolved.type === "number") {
                return 60;
            }
            if (resolved.type === "boolean") {
                return true;
            }
            if (resolved.type === "array") {
                return [];
            }
            return "…";
        },

        /**
         * Put a command on the clipboard.
         * @param {string} text what to copy
         * @returns {Promise<void>} resolves once copied
         */
        async copy(text) {
            try {
                await navigator.clipboard.writeText(text);
                this.$root.toastSuccess("Copied");
            } catch (e) {
                this.$root.toastError(e.message);
            }
        },
    },
};
</script>

<style lang="scss" scoped>
.api-docs__intro {
    margin-bottom: 1.5rem;
}

.api-docs__notes {
    margin: 0.75rem 0;
    padding-left: 1.1rem;
    list-style: disc;
    color: var(--color-text-muted);
    font-size: 0.875rem;

    li {
        margin-bottom: 0.35rem;
    }
}

.api-docs__code {
    margin: 0;
    padding: 0.75rem 0.9rem;
    overflow-x: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-subtle);
    color: var(--color-text);
    font-family: "IBM Plex Mono", "Noto Sans Mono", monospace;
    font-size: 0.8125rem;
    line-height: 1.5;
    white-space: pre;
}

.api-docs__group {
    margin-bottom: 1.75rem;
}

.api-docs__group-title {
    margin: 0 0 0.6rem;
    color: var(--color-text-muted);
    font-size: 0.78rem;
    font-weight: var(--weight-bold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.api-docs__op {
    margin-bottom: 0.4rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    overflow: hidden;
}

.api-docs__summary {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 0.75rem;
    cursor: pointer;
    list-style: none;

    &::-webkit-details-marker {
        display: none;
    }

    &:hover {
        background: var(--color-surface-hover);
    }
}

.api-docs__method {
    flex: none;
    min-width: 3.9rem;
    padding: 0.15rem 0.4rem;
    border-radius: var(--radius-sm);
    background: var(--color-surface-hover);
    color: var(--color-text-muted);
    font-family: "IBM Plex Mono", "Noto Sans Mono", monospace;
    font-size: 0.7rem;
    font-weight: var(--weight-bold);
    text-align: center;
}

/* Reading order at a glance: what it reads, what it changes, what it removes. */
.api-docs__method--get {
    background: var(--color-interactive-subtle);
    color: var(--color-interactive);
}

.api-docs__method--post {
    background: var(--status-up-bg);
    color: var(--status-up-fg);
}

.api-docs__method--patch {
    background: var(--status-degraded-bg);
    color: var(--status-degraded-fg);
}

.api-docs__method--delete {
    background: var(--status-down-bg);
    color: var(--status-down-fg);
}

.api-docs__path {
    font-family: "IBM Plex Mono", "Noto Sans Mono", monospace;
    font-size: 0.8125rem;
    overflow-wrap: anywhere;
}

.api-docs__title {
    color: var(--color-text-muted);
    font-size: 0.8125rem;
}

.api-docs__body {
    padding: 0.25rem 0.75rem 0.9rem;
    border-top: 1px solid var(--color-border);
}

.api-docs__description {
    margin: 0.75rem 0;
    font-size: 0.875rem;
}

.api-docs__heading {
    margin: 1rem 0 0.4rem;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    font-weight: var(--weight-bold);
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.api-docs__fields {
    display: grid;
    grid-template-columns: minmax(0, auto) minmax(0, 1fr);
    gap: 0.3rem 1rem;
    margin: 0;
    font-size: 0.8125rem;

    dt {
        font-weight: var(--weight-normal);
    }

    dd {
        margin: 0;
        color: var(--color-text-muted);
    }
}

.api-docs__meta {
    margin-left: 0.4rem;
    color: var(--color-text-subtle);
    font-size: 0.75rem;
}

.api-docs__example {
    display: grid;
    gap: 0.5rem;
    justify-items: start;
}

@media (max-width: 640px) {
    .api-docs__summary {
        flex-wrap: wrap;
    }

    .api-docs__fields {
        grid-template-columns: minmax(0, 1fr);
        gap: 0.1rem;

        dd {
            margin-bottom: 0.5rem;
        }
    }
}
</style>
