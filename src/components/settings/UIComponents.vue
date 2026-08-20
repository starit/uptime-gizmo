<template>
    <!--
        A gallery of the Gizmo primitives under the theme that is actually
        active. Two jobs: give the component migration one place to compare
        against, and let someone who has just imported or generated a custom
        theme see every token it touched without walking the whole product.

        Labels here are token and component names, so they are deliberately not
        translated — they are identifiers, not copy.
    -->
    <div class="ui-preview">
        <p class="gizmo-field-help tw-mb-4">{{ $t("uiComponentsIntro") }}</p>

        <section class="ui-section">
            <h3 class="ui-section__title">Surfaces &amp; content</h3>
            <div class="swatch-grid">
                <div v-for="token in surfaceTokens" :key="token" class="swatch">
                    <span class="swatch__chip" :style="{ background: `var(${token})` }"></span>
                    <code class="swatch__name">{{ token }}</code>
                    <span class="swatch__value gizmo-compact-data">{{ resolved[token] }}</span>
                </div>
            </div>
        </section>

        <section class="ui-section">
            <h3 class="ui-section__title">Brand &amp; interaction</h3>
            <div class="swatch-grid">
                <div v-for="token in brandTokens" :key="token" class="swatch">
                    <span class="swatch__chip" :style="{ background: `var(${token})` }"></span>
                    <code class="swatch__name">{{ token }}</code>
                    <span class="swatch__value gizmo-compact-data">{{ resolved[token] }}</span>
                </div>
            </div>
        </section>

        <section class="ui-section">
            <h3 class="ui-section__title">Status ramps</h3>
            <p class="gizmo-field-help tw-mb-2">
                Each row is the trio a badge, banner or row is built from. If one of these is illegible
                against its own background, so is every incident surface in the product.
            </p>
            <div class="ramp-grid">
                <div v-for="state in statusStates" :key="state" class="ramp">
                    <div
                        class="ramp__sample"
                        :style="{
                            background: `var(--status-${state}-bg)`,
                            borderColor: `var(--status-${state}-border)`,
                            color: `var(--status-${state}-fg)`,
                        }"
                    >
                        <span class="ramp__dot" :style="{ background: `var(--status-${state})` }"></span>
                        {{ state }}
                    </div>
                    <code class="swatch__name">--status-{{ state }}-*</code>
                </div>
            </div>
        </section>

        <section class="ui-section">
            <h3 class="ui-section__title">Type scale</h3>
            <div class="gizmo-workspace-panel ui-demo">
                <h1>Heading 1 — 99.98% over 30 days</h1>
                <h2>Heading 2 — 99.98% over 30 days</h2>
                <h3>Heading 3 — 99.98% over 30 days</h3>
                <h4>Heading 4 — 99.98% over 30 days</h4>
                <h5>Heading 5 — 99.98% over 30 days</h5>
                <h6>Heading 6 — 99.98% over 30 days</h6>
                <p>Body copy at the base size, with a <a href="#">link</a> and some <code>inline code</code>.</p>
                <div class="gizmo-field-help">Help text, the quietest readable step.</div>
                <p class="gizmo-compact-data">Tabular figures: 1111 ms · 0000 ms · 99.98% · 12:00:00</p>
            </div>
        </section>

        <section class="ui-section">
            <h3 class="ui-section__title">Buttons</h3>
            <p class="gizmo-field-help tw-mb-2">
                Two systems still ship side by side: the <code>&lt;GizmoButton&gt;</code> component and the
                <code>.gizmo-native-button</code> recipe. They are stacked here so any drift between them is
                visible in one place.
            </p>

            <div class="gizmo-workspace-panel ui-demo">
                <div class="ui-demo__label">&lt;GizmoButton&gt;</div>
                <div class="ui-row">
                    <GizmoButton v-for="variant in buttonVariants" :key="variant" :variant="variant">
                        {{ variant }}
                    </GizmoButton>
                </div>
                <div class="ui-row">
                    <GizmoButton v-for="variant in buttonVariants" :key="variant" :variant="variant" size="sm">
                        {{ variant }} sm
                    </GizmoButton>
                </div>
                <div class="ui-row">
                    <GizmoButton disabled>disabled</GizmoButton>
                    <GizmoButton loading>loading</GizmoButton>
                    <GizmoIconButton label="Icon button">
                        <font-awesome-icon icon="cog" />
                    </GizmoIconButton>
                </div>

                <div class="ui-demo__label">.gizmo-native-button</div>
                <div class="ui-row">
                    <button
                        v-for="variant in nativeButtonVariants"
                        :key="variant"
                        type="button"
                        class="gizmo-native-button"
                        :class="`gizmo-native-button--${variant}`"
                    >
                        {{ variant }}
                    </button>
                </div>
                <div class="ui-row">
                    <button type="button" class="gizmo-native-button gizmo-native-button--secondary" disabled>
                        disabled
                    </button>
                </div>

                <div class="ui-demo__label">.gizmo-action-group (segmented)</div>
                <div class="gizmo-action-group" role="group" aria-label="Segmented control sample">
                    <template v-for="option in segmentOptions" :key="option">
                        <input
                            :id="`ui-segment-${option}`"
                            v-model="segment"
                            type="radio"
                            class="gizmo-choice-input"
                            name="ui-segment"
                            :value="option"
                        />
                        <label class="gizmo-native-button gizmo-native-button--light" :for="`ui-segment-${option}`">
                            {{ option }}
                        </label>
                    </template>
                </div>
            </div>
        </section>

        <section class="ui-section">
            <h3 class="ui-section__title">Form controls</h3>
            <div class="gizmo-workspace-panel ui-demo">
                <div class="ui-grid-2">
                    <GizmoField for-id="ui-input" label="Component field" help="GizmoField + GizmoInput.">
                        <GizmoInput id="ui-input" v-model="text" placeholder="https://example.com" />
                    </GizmoField>

                    <GizmoField for-id="ui-input-error" label="With an error" error="This host cannot be reached.">
                        <GizmoInput id="ui-input-error" v-model="text" />
                    </GizmoField>

                    <div>
                        <label class="gizmo-field-label" for="ui-native">.gizmo-native-control</label>
                        <input id="ui-native" v-model="text" type="text" class="gizmo-native-control" />
                        <div class="gizmo-field-help">The recipe the product still mostly uses.</div>
                    </div>

                    <div>
                        <label class="gizmo-field-label" for="ui-select">.gizmo-native-select</label>
                        <select id="ui-select" v-model="segment" class="gizmo-native-control gizmo-native-select">
                            <option v-for="option in segmentOptions" :key="option" :value="option">{{ option }}</option>
                        </select>
                    </div>
                </div>

                <GizmoTextarea v-model="longText" rows="3" placeholder="GizmoTextarea" />

                <div class="ui-row">
                    <GizmoCheckbox v-model="checked">GizmoCheckbox</GizmoCheckbox>
                    <GizmoSwitch v-model="switched">GizmoSwitch</GizmoSwitch>
                    <GizmoRadio v-model="segment" value="24h">GizmoRadio</GizmoRadio>
                </div>

                <div class="ui-row">
                    <div class="gizmo-native-check">
                        <input id="ui-native-check" v-model="checked" class="gizmo-native-check__input" type="checkbox" />
                        <label class="gizmo-native-check__label" for="ui-native-check">.gizmo-native-check</label>
                    </div>
                    <div class="gizmo-native-check gizmo-native-switch">
                        <input id="ui-native-switch" v-model="switched" class="gizmo-native-check__input" type="checkbox" />
                        <label class="gizmo-native-check__label" for="ui-native-switch">.gizmo-native-switch</label>
                    </div>
                </div>
            </div>
        </section>

        <section class="ui-section">
            <h3 class="ui-section__title">Status &amp; feedback</h3>
            <div class="gizmo-workspace-panel ui-demo">
                <div class="ui-row">
                    <GizmoStatusBadge v-for="state in statusStates" :key="state" :tone="state" :text="state" />
                </div>
                <div class="ui-row">
                    <GizmoTag label="production" color="#1E64E7" />
                    <GizmoTag label="edge" color="#2F9E68" size="sm" />
                    <span class="gizmo-inline-badge">inline badge</span>
                </div>

                <GizmoAlert v-for="tone in alertTones" :key="tone" :tone="tone" role="status">
                    <template #title>GizmoAlert — {{ tone }}</template>
                    The check failed three times in a row, so the monitor was marked down.
                </GizmoAlert>

                <div class="ui-row">
                    <GizmoLoadingIndicator>Loading</GizmoLoadingIndicator>
                </div>
            </div>
        </section>

        <section class="ui-section">
            <h3 class="ui-section__title">Surfaces &amp; lists</h3>
            <GizmoPanel class="tw-mb-3" density="compact">
                <template #header><h2 class="ui-panel-title">GizmoPanel</h2></template>
                <template #actions>
                    <GizmoButton variant="secondary" size="sm">Action</GizmoButton>
                </template>
                <GizmoTable>
                    <thead>
                        <tr><th>Monitor</th><th>Status</th><th>Response</th></tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in sampleRows" :key="row.name">
                            <td>{{ row.name }}</td>
                            <td><GizmoStatusBadge :tone="row.tone" :text="row.status" /></td>
                            <td class="gizmo-compact-data">{{ row.ping }}</td>
                        </tr>
                    </tbody>
                </GizmoTable>
            </GizmoPanel>

            <GizmoListRow class="tw-mb-3">
                <template #leading><GizmoStatusBadge tone="up" text="up" /></template>
                <div>GizmoListRow</div>
                <div class="gizmo-field-help">Leading slot, content, trailing slot.</div>
                <template #trailing>
                    <GizmoButton variant="ghost" size="sm">Open</GizmoButton>
                </template>
            </GizmoListRow>

            <GizmoEmptyState title="GizmoEmptyState" description="Shown where a list has nothing in it yet.">
                <template #icon><font-awesome-icon icon="heartbeat" /></template>
                <template #actions><GizmoButton>Primary action</GizmoButton></template>
            </GizmoEmptyState>
        </section>

        <section class="ui-section">
            <h3 class="ui-section__title">Radius, elevation, motion</h3>
            <div class="gizmo-workspace-panel ui-demo">
                <div class="ui-row">
                    <div
                        v-for="radius in radiusTokens"
                        :key="radius"
                        class="scale-chip"
                        :style="{ borderRadius: `var(${radius})` }"
                    >
                        {{ radius.replace("--radius-", "") }}
                    </div>
                </div>
                <div class="ui-row">
                    <div
                        v-for="shadow in shadowTokens"
                        :key="shadow"
                        class="scale-chip scale-chip--raised"
                        :style="{ boxShadow: `var(${shadow})` }"
                    >
                        {{ shadow.replace("--shadow-", "") }}
                    </div>
                </div>
                <div class="gizmo-field-help gizmo-compact-data">
                    {{ easingTokens.map((token) => `${token}: ${resolved[token]}`).join("  ·  ") }}
                </div>
            </div>
        </section>
    </div>
</template>

<script>
import GizmoAlert from "../gizmo/GizmoAlert.vue";
import GizmoButton from "../gizmo/GizmoButton.vue";
import GizmoCheckbox from "../gizmo/GizmoCheckbox.vue";
import GizmoEmptyState from "../gizmo/GizmoEmptyState.vue";
import GizmoField from "../gizmo/GizmoField.vue";
import GizmoIconButton from "../gizmo/GizmoIconButton.vue";
import GizmoInput from "../gizmo/GizmoInput.vue";
import GizmoListRow from "../gizmo/GizmoListRow.vue";
import GizmoLoadingIndicator from "../gizmo/GizmoLoadingIndicator.vue";
import GizmoPanel from "../gizmo/GizmoPanel.vue";
import GizmoRadio from "../gizmo/GizmoRadio.vue";
import GizmoStatusBadge from "../gizmo/GizmoStatusBadge.vue";
import GizmoSwitch from "../gizmo/GizmoSwitch.vue";
import GizmoTable from "../gizmo/GizmoTable.vue";
import GizmoTag from "../gizmo/GizmoTag.vue";
import GizmoTextarea from "../gizmo/GizmoTextarea.vue";

const SURFACE_TOKENS = [
    "--color-bg",
    "--color-surface",
    "--color-surface-subtle",
    "--color-surface-hover",
    "--color-border",
    "--color-border-strong",
    "--color-text",
    "--color-text-muted",
    "--color-text-subtle",
    "--color-text-inverse",
];

const BRAND_TOKENS = [
    "--color-brand",
    "--color-brand-hover",
    "--color-brand-contrast",
    "--color-interactive",
    "--color-interactive-hover",
    "--color-interactive-subtle",
    "--color-focus-ring",
];

const RADIUS_TOKENS = [ "--radius-xs", "--radius-sm", "--radius-md", "--radius-lg", "--radius-pill" ];
const SHADOW_TOKENS = [ "--shadow-raised", "--shadow-panel", "--shadow-float", "--shadow-overlay" ];
const EASING_TOKENS = [ "--easing-in", "--easing-out", "--easing-in-out" ];

export default {
    components: {
        GizmoAlert,
        GizmoButton,
        GizmoCheckbox,
        GizmoEmptyState,
        GizmoField,
        GizmoIconButton,
        GizmoInput,
        GizmoListRow,
        GizmoLoadingIndicator,
        GizmoPanel,
        GizmoRadio,
        GizmoStatusBadge,
        GizmoSwitch,
        GizmoTable,
        GizmoTag,
        GizmoTextarea,
    },

    data() {
        return {
            surfaceTokens: SURFACE_TOKENS,
            brandTokens: BRAND_TOKENS,
            radiusTokens: RADIUS_TOKENS,
            shadowTokens: SHADOW_TOKENS,
            easingTokens: EASING_TOKENS,
            statusStates: [ "up", "degraded", "down", "maintenance", "unknown" ],
            buttonVariants: [ "primary", "secondary", "outline", "ghost", "danger" ],
            nativeButtonVariants: [
                "primary",
                "secondary",
                "outline",
                "light",
                "success",
                "danger",
                "danger-outline",
            ],
            alertTones: [ "info", "success", "warning", "danger", "maintenance" ],
            segmentOptions: [ "1h", "24h", "7d" ],
            sampleRows: [
                { name: "api.example.com", status: "up", tone: "up", ping: "84 ms" },
                { name: "checkout", status: "down", tone: "down", ping: "—" },
                { name: "cdn edge", status: "maintenance", tone: "maintenance", ping: "12 ms" },
            ],
            segment: "24h",
            text: "https://example.com/health",
            longText: "",
            checked: true,
            switched: true,
            resolved: {},
        };
    },

    watch: {
        // Re-read on any theme change, including a custom themed.js one, so the
        // printed values never disagree with the swatch beside them.
        "$root.theme"() {
            this.readTokens();
        },
        "$root.userTheme"() {
            this.$nextTick(this.readTokens);
        },
    },

    mounted() {
        this.readTokens();
    },

    methods: {
        /**
         * Read every listed token's live computed value off the document.
         * @returns {void}
         */
        readTokens() {
            const style = getComputedStyle(document.body);
            const resolved = {};

            for (const token of [ ...SURFACE_TOKENS, ...BRAND_TOKENS, ...EASING_TOKENS ]) {
                resolved[token] = style.getPropertyValue(token).trim();
            }

            this.resolved = resolved;
        },
    },
};
</script>

<style lang="scss" scoped>
.ui-section {
    margin-bottom: 2rem;
}

.ui-section__title {
    margin-bottom: 0.75rem;
    padding-bottom: 0.375rem;
    border-bottom: 1px solid var(--color-border);
}

.ui-demo {
    display: grid;
    gap: 0.875rem;
    padding: 1rem;
}

.ui-demo__label {
    color: var(--color-text-subtle);
    font-family: monospace;
    font-size: 0.75rem;
}

.ui-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
}

.ui-grid-2 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 1rem;
}

.ui-panel-title {
    margin: 0;
    font-size: 1rem;
}

.swatch-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
    gap: 0.5rem;
}

.swatch {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    min-width: 0;
}

.swatch__chip {
    flex: none;
    width: 1.75rem;
    height: 1.75rem;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-xs);
}

.swatch__name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    background: none;
    padding: 0;
    color: var(--color-text);
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.swatch__value {
    flex: none;
    color: var(--color-text-subtle);
    font-size: 0.7rem;
}

.ramp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 0.5rem;
}

.ramp__sample {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
    padding: 0.625rem 0.75rem;
    border: 1px solid;
    border-radius: var(--radius-sm);
    font-weight: var(--weight-semibold);
}

.ramp__dot {
    width: 0.625rem;
    height: 0.625rem;
    border-radius: var(--radius-pill);
}

.scale-chip {
    display: grid;
    place-items: center;
    width: 5rem;
    height: 3rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-muted);
    font-size: 0.75rem;
}

.scale-chip--raised {
    border-color: transparent;
    border-radius: var(--radius-md);
}
</style>
