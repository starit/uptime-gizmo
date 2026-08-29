<template>
    <div>
        <!--
            What this page does was only discoverable by changing something and
            watching what happened. Two things in particular were invisible: most
            of these settings live in this browser, while custom themes live on
            the instance, and a custom theme quietly overrides the Light/Dark
            choice above it.
        -->
        <p class="gizmo-field-help tw-mb-4">{{ $t("appearanceIntro") }}</p>

        <div class="tw-my-4">
            <label for="language" class="gizmo-field-label">
                {{ $t("Language") }}
            </label>
            <select id="language" v-model="$root.language" class="gizmo-native-control gizmo-native-select">
                <option v-for="(lang, i) in $i18n.availableLocales" :key="`Lang${i}`" :value="lang">
                    {{ $i18n.messages[lang].languageName }}
                </option>
            </select>
        </div>
        <div class="tw-my-4">
            <label for="timezone" class="gizmo-field-label">{{ $t("Theme") }}</label>
            <div>
                <div class="gizmo-action-group" role="group" :aria-label="$t('Basic checkbox toggle button group')">
                    <input
                        id="btncheck1"
                        v-model="$root.userTheme"
                        type="radio"
                        class="gizmo-choice-input"
                        name="theme"
                        autocomplete="off"
                        value="light"
                    />
                    <label class="gizmo-native-button gizmo-native-button--outline" for="btncheck1">
                        {{ $t("Light") }}
                    </label>

                    <input
                        id="btncheck2"
                        v-model="$root.userTheme"
                        type="radio"
                        class="gizmo-choice-input"
                        name="theme"
                        autocomplete="off"
                        value="dark"
                    />
                    <label class="gizmo-native-button gizmo-native-button--outline" for="btncheck2">
                        {{ $t("Dark") }}
                    </label>

                    <input
                        id="btncheck3"
                        v-model="$root.userTheme"
                        type="radio"
                        class="gizmo-choice-input"
                        name="theme"
                        autocomplete="off"
                        value="auto"
                    />
                    <label class="gizmo-native-button gizmo-native-button--outline" for="btncheck3">
                        {{ $t("Auto") }}
                    </label>
                </div>
                <div class="gizmo-field-help">{{ $t("themeChoiceHelp") }}</div>
            </div>
        </div>
        <!-- Custom themes -->
        <div class="tw-my-4">
            <label class="gizmo-field-label">{{ $t("Custom Themes") }}</label>
            <p class="gizmo-field-help tw-mb-3">{{ $t("customThemesHelp") }}</p>

            <ul v-if="customThemes.length" class="gizmo-list-group tw-mb-3">
                <li v-for="theme in customThemes" :key="theme.id" class="gizmo-list-group__item custom-theme-row">
                    <div class="gizmo-native-check">
                        <input
                            :id="`theme-${theme.id}`"
                            v-model="$root.userTheme"
                            type="radio"
                            class="gizmo-native-check__input"
                            name="theme"
                            :value="theme.id"
                        />
                        <label class="gizmo-native-check__label" :for="`theme-${theme.id}`">
                            {{ theme.name }}
                            <span class="tw-text-content-subtle tw-text-sm">{{ baselineOf(theme) }}</span>
                        </label>
                    </div>

                    <!--
                        A name and the word "Dark" say almost nothing about a
                        palette. This is the theme drawn in miniature — its page,
                        a card on it, two weights of text, and the five hues that
                        carry meaning — so the row can be recognised at a glance.
                        Decorative: the label beside it already names the theme.
                    -->
                    <span
                        v-if="previews[theme.id]"
                        class="theme-preview"
                        :style="{
                            background: previews[theme.id]['--color-bg'],
                            borderColor: previews[theme.id]['--color-border'],
                        }"
                        aria-hidden="true"
                    >
                        <span
                            class="theme-preview__card"
                            :style="{
                                background: previews[theme.id]['--color-surface'],
                                borderColor: previews[theme.id]['--color-border'],
                            }"
                        >
                            <span
                                class="theme-preview__line theme-preview__line--strong"
                                :style="{ background: previews[theme.id]['--color-text'] }"
                            ></span>
                            <span
                                class="theme-preview__line"
                                :style="{ background: previews[theme.id]['--color-text-muted'] }"
                            ></span>
                        </span>
                        <span
                            v-for="token in previewHues"
                            :key="token"
                            class="theme-preview__dot"
                            :style="{ background: previews[theme.id][token] }"
                        ></span>
                    </span>

                    <button
                        type="button"
                        class="gizmo-native-button gizmo-native-button--sm gizmo-native-button--danger-outline"
                        @click="removeTheme(theme.id)"
                    >
                        {{ $t("Delete") }}
                    </button>
                </li>
            </ul>

            <div v-else class="gizmo-field-help tw-mb-3">{{ $t("noCustomThemes") }}</div>

            <!--
                Generation is an AI feature and says so before it asks for a
                description. The whole block used to be hidden when no provider
                was configured, which left the one thing standing between the user
                and a generated theme entirely invisible.
            -->
            <div class="theme-tool">
                <div class="theme-tool__head">
                    <label class="gizmo-field-label tw-mb-0" for="theme-prompt">{{ $t("Generate Theme") }}</label>
                    <span class="gizmo-inline-badge theme-tool__badge">
                        <font-awesome-icon icon="robot" aria-hidden="true" />
                        {{ $t("generateThemeRequiresAI") }}
                    </span>
                </div>

                <div v-if="!aiConfigured" class="gizmo-native-alert gizmo-native-alert--info">
                    {{ $t("generateThemeNoProvider") }}
                    <router-link to="/settings/ai">{{ $t("generateThemeOpenAISettings") }}</router-link>
                </div>

                <template v-else>
                    <!--
                        With several credentials saved, "check the provider, key
                        and model in AI settings" is not enough to act on: it
                        does not say which of them was tried.
                    -->
                    <div v-if="activeAiCredentialName" class="gizmo-field-help theme-tool__credential">
                        {{ $t("generateThemeCredential", [ activeAiCredentialName ]) }}
                        <router-link to="/settings/ai">{{ $t("aiSettingsLink") }}</router-link>
                    </div>

                    <div class="gizmo-inline-action">
                        <input
                            id="theme-prompt"
                            v-model="prompt"
                            type="text"
                            class="gizmo-native-control"
                            :placeholder="$t('generateThemePlaceholder')"
                            :disabled="generating"
                            @keyup.enter="generateTheme"
                        />
                        <button
                            type="button"
                            class="gizmo-native-button gizmo-native-button--primary"
                            :disabled="generating || !prompt.trim()"
                            @click="generateTheme"
                        >
                            {{ generating ? $t("Generating...") : $t("Generate") }}
                        </button>
                    </div>

                    <!-- Silence during a retry reads as a hang, so say which attempt this is. -->
                    <div v-if="generating && generateAttempt > 1" class="gizmo-field-help" role="status">
                        {{ $t("generateThemeAttempt", [generateAttempt, maxGenerateAttempts]) }}
                    </div>

                    <div v-if="generateError" class="gizmo-native-alert gizmo-native-alert--danger tw-mt-2">
                        <div>{{ generateError }}</div>
                        <button
                            type="button"
                            class="gizmo-native-button gizmo-native-button--sm gizmo-native-button--secondary tw-mt-2"
                            :disabled="generating || !prompt.trim()"
                            @click="generateTheme"
                        >
                            <font-awesome-icon icon="undo" />
                            {{ $t("Retry") }}
                        </button>
                    </div>
                </template>

                <div class="gizmo-field-help">{{ $t("generateThemeDescription") }}</div>
            </div>

            <!--
                A button rather than a <details> summary: importing is an action,
                and the disclosure triangle made it read as a section heading that
                happened to be collapsed.
            -->
            <div class="theme-tool">
                <div class="gizmo-field-label tw-mb-0">{{ $t("Import Theme") }}</div>
                <div class="gizmo-field-help tw-mb-2">{{ $t("importThemeDescription") }}</div>
                <button
                    type="button"
                    class="gizmo-native-button gizmo-native-button--secondary"
                    @click="openImport"
                >
                    <font-awesome-icon icon="upload" />
                    {{ $t("importThemeAction") }}
                </button>
            </div>

            <i18n-t keypath="poweredByThemedJs" tag="div" class="gizmo-field-help theme-credit">
                <a href="https://github.com/starit/themed.js" target="_blank" rel="noopener noreferrer">themed.js</a>
            </i18n-t>
        </div>

        <GizmoDialog
            :open="importOpen"
            size="md"
            :title="$t('Import Theme')"
            :description="$t('importThemeDescription')"
            :close-label="$t('Close')"
            @update:open="setImportOpen"
        >
            <div>
                <label class="gizmo-field-label" for="theme-import-json">{{ $t("themeImportJSONLabel") }}</label>
                <textarea
                    id="theme-import-json"
                    v-model="importText"
                    class="gizmo-native-control"
                    rows="8"
                    autofocus
                    :placeholder="$t('importThemePlaceholder')"
                ></textarea>
                <div v-if="importError" class="gizmo-native-alert gizmo-native-alert--danger tw-mt-2">
                    {{ importError }}
                </div>
            </div>
            <template #footer="{ close }">
                <GizmoButton variant="secondary" @click="close()">
                    {{ $t("Cancel") }}
                </GizmoButton>
                <GizmoButton variant="primary" :disabled="!importText.trim()" @click="importTheme">
                    {{ $t("Import") }}
                </GizmoButton>
            </template>
        </GizmoDialog>

        <div class="tw-my-4">
            <label class="gizmo-field-label">{{ $t("Theme - Heartbeat Bar") }}</label>
            <div>
                <div class="gizmo-action-group" role="group" :aria-label="$t('Basic checkbox toggle button group')">
                    <input
                        id="btncheck4"
                        v-model="$root.userHeartbeatBar"
                        type="radio"
                        class="gizmo-choice-input"
                        name="heartbeatBarTheme"
                        autocomplete="off"
                        value="normal"
                    />
                    <label class="gizmo-native-button gizmo-native-button--outline" for="btncheck4">
                        {{ $t("Normal") }}
                    </label>

                    <input
                        id="btncheck5"
                        v-model="$root.userHeartbeatBar"
                        type="radio"
                        class="gizmo-choice-input"
                        name="heartbeatBarTheme"
                        autocomplete="off"
                        value="bottom"
                    />
                    <label class="gizmo-native-button gizmo-native-button--outline" for="btncheck5">
                        {{ $t("Bottom") }}
                    </label>

                    <input
                        id="btncheck6"
                        v-model="$root.userHeartbeatBar"
                        type="radio"
                        class="gizmo-choice-input"
                        name="heartbeatBarTheme"
                        autocomplete="off"
                        value="none"
                    />
                    <label class="gizmo-native-button gizmo-native-button--outline" for="btncheck6">
                        {{ $t("None") }}
                    </label>
                </div>
            </div>
        </div>

        <!-- Timeline -->
        <div class="tw-my-4">
            <label class="gizmo-field-label">{{ $t("styleElapsedTime") }}</label>
            <div>
                <div class="gizmo-action-group" role="group">
                    <input
                        id="styleElapsedTimeShowNoLine"
                        v-model="$root.styleElapsedTime"
                        type="radio"
                        class="gizmo-choice-input"
                        name="styleElapsedTime"
                        autocomplete="off"
                        value="no-line"
                    />
                    <label class="gizmo-native-button gizmo-native-button--outline" for="styleElapsedTimeShowNoLine">
                        {{ $t("styleElapsedTimeShowNoLine") }}
                    </label>

                    <input
                        id="styleElapsedTimeShowWithLine"
                        v-model="$root.styleElapsedTime"
                        type="radio"
                        class="gizmo-choice-input"
                        name="styleElapsedTime"
                        autocomplete="off"
                        value="with-line"
                    />
                    <label class="gizmo-native-button gizmo-native-button--outline" for="styleElapsedTimeShowWithLine">
                        {{ $t("styleElapsedTimeShowWithLine") }}
                    </label>

                    <input
                        id="styleElapsedTimeNone"
                        v-model="$root.styleElapsedTime"
                        type="radio"
                        class="gizmo-choice-input"
                        name="styleElapsedTime"
                        autocomplete="off"
                        value="none"
                    />
                    <label class="gizmo-native-button gizmo-native-button--outline" for="styleElapsedTimeNone">
                        {{ $t("None") }}
                    </label>
                </div>
            </div>
        </div>

        <!--
            The gallery lives here rather than on its own settings page: the
            question it answers — what did that theme actually do to the product —
            is asked immediately after generating or importing one, and a separate
            page meant leaving the controls to find out. Collapsed by default and
            loaded only when opened, so it costs nothing until it is wanted.
        -->
        <ToggleSection :heading="$t('UI Components')">
            <UIComponents />
        </ToggleSection>
    </div>
</template>

<script>
import { defineAsyncComponent } from "vue";
import { findContrastFailures, findInvalidColours, baselineFor, themeToGizmoVars } from "../../theme/theme-bridge";
import GizmoButton from "../gizmo/GizmoButton.vue";
import GizmoDialog from "../gizmo/GizmoDialog.vue";
import ToggleSection from "../ToggleSection.vue";
import { getLLMProvider } from "../../llm-providers.ts";

/*
 * A model asked for "warm dusk" will sometimes hand back a palette that reads
 * beautifully and fails the contrast floor, and asking again usually fixes it.
 * Three is enough to absorb that without turning a single click into a long,
 * silent, billable loop.
 */
const MAX_GENERATE_ATTEMPTS = 3;

export default {
    components: {
        GizmoButton,
        GizmoDialog,
        ToggleSection,
        // Its own chunk, fetched the first time the section is expanded.
        UIComponents: defineAsyncComponent(() => import("./UIComponents.vue")),
    },

    data() {
        return {
            importOpen: false,
            importText: "",
            importError: "",
            prompt: "",
            generating: false,
            generateError: "",
            generateAttempt: 0,
            // The hues a preview shows, in the order they appear.
            previewHues: [
                "--color-brand",
                "--color-interactive",
                "--status-up",
                "--status-degraded",
                "--status-down",
            ],
        };
    },

    computed: {
        customThemes() {
            return this.$root.info?.customThemes ?? [];
        },

        /**
         * Whether an AI provider and key are set. Generation still shows without
         * one, so the field can explain itself rather than silently vanish.
         * @returns {boolean} true when generation can be attempted
         */
        aiConfigured() {
            return Boolean(this.$root.info?.aiConfigured);
        },

        /**
         * The credential generation will use, named the way the AI settings
         * name it, with the model it ends up sending.
         * @returns {string} the description, or "" when there is nothing to say
         */
        activeAiCredentialName() {
            const credentials = this.$root.info?.aiCredentials ?? [];
            const active = credentials.find((item) => item.id === this.$root.info?.aiActiveCredentialId);
            if (!active) {
                return "";
            }

            const model = active.model || getLLMProvider(active.provider)?.defaultModel;
            return model ? `${active.name} · ${model}` : active.name;
        },

        maxGenerateAttempts() {
            return MAX_GENERATE_ATTEMPTS;
        },

        /**
         * The bridged variables for each stored theme, keyed by id, so a preview
         * shows the colours that would actually be written rather than the raw
         * sixteen themed.js carries. A theme that cannot be bridged gets no
         * preview instead of taking the page down with it.
         * @returns {object} theme id to CSS variable map
         */
        previews() {
            const previews = {};

            for (const theme of this.customThemes) {
                try {
                    previews[theme.id] = themeToGizmoVars(theme);
                } catch (e) {
                    previews[theme.id] = null;
                }
            }

            return previews;
        },
    },

    methods: {
        /**
         * Describe which baseline a theme layers over.
         * @param {object} theme themed.js theme
         * @returns {string} translated baseline name
         */
        baselineOf(theme) {
            return this.$t(baselineFor(theme) === "dark" ? "Dark" : "Light");
        },

        /**
         * Persist the instance's theme list.
         * @param {Array<object>} themes themes to store
         * @returns {void}
         */
        saveThemes(themes) {
            this.$root.getSocket().emit("saveCustomThemes", themes, (res) => {
                this.$root.toastRes(res);
            });
        },

        /**
         * Say why a theme cannot be stored, applying the contrast floors
         * DESIGN.md sets. A theme that cannot be read is not worth storing, and
         * one that cannot be read *by a person* is worse.
         * @param {object} theme themed.js theme to check
         * @returns {?string} translated reason, or null when the theme is usable
         */
        themeRejection(theme) {
            if (!theme?.id || !theme?.name || !theme?.tokens?.colors) {
                return this.$t("themeImportMissingFields");
            }

            /*
             * Before contrast, because a value that is not a colour scores 21
             * against anything and would sail through the check below. Every
             * one of these ends up in a stylesheet.
             */
            const invalid = findInvalidColours(theme);
            if (invalid.length > 0) {
                return this.$t("themeImportInvalidColours", [ invalid.join(", ") ]);
            }

            const failures = findContrastFailures(theme);
            if (failures.length > 0) {
                return this.$t("themeImportContrastFailed", [
                    failures.map((f) => `${f.label} ${f.ratio.toFixed(2)}:${f.required}`).join(", "),
                ]);
            }

            return null;
        },

        /**
         * Flatten a provider error onto one line. These arrive as pretty-printed
         * JSON straight from the upstream API, which turns a one-sentence alert
         * into a wall of braces.
         * @param {string} message raw error message
         * @returns {string} single-line, length-capped message
         */
        tidyError(message) {
            const flat = String(message ?? "").replace(/\s+/g, " ").trim();
            return flat.length > 240 ? `${flat.slice(0, 240)}\u2026` : flat;
        },

        /**
         * Open the import dialog on a clean slate.
         * @returns {void}
         */
        openImport() {
            this.importError = "";
            this.importOpen = true;
        },

        /**
         * Track the import dialog's open state.
         * @param {boolean} open next open state
         * @returns {void}
         */
        setImportOpen(open) {
            this.importOpen = open;
        },

        /**
         * Accept a pasted theme, holding it to the same bar as a generated one.
         * @returns {void}
         */
        importTheme() {
            this.importError = "";

            let theme;
            try {
                theme = JSON.parse(this.importText);
            } catch (e) {
                this.importError = this.$t("themeImportInvalidJSON");
                return;
            }

            const rejection = this.themeRejection(theme);
            if (rejection) {
                this.importError = rejection;
                return;
            }

            this.saveThemes([ ...this.customThemes.filter((t) => t.id !== theme.id), theme ]);
            this.importText = "";
            this.importOpen = false;
        },

        /**
         * Start a generation run. The prompt is kept on failure so the button
         * beside the error can retry it as-is.
         * @returns {void}
         */
        generateTheme() {
            if (this.generating || !this.prompt.trim()) {
                return;
            }

            this.generateError = "";
            this.generateAttempt = 0;
            this.runGenerateAttempt();
        },

        /**
         * Ask the server for one theme and decide whether to accept it, ask
         * again, or give up.
         * @returns {void}
         */
        runGenerateAttempt() {
            this.generating = true;
            this.generateAttempt += 1;

            this.$root.getSocket().emit("generateTheme", this.prompt, (res) => {
                /*
                 * A provider-level failure is not worth repeating: a rejected key
                 * or a wrong base URL fails the same way every time and bills for
                 * each one. Only an unusable *result* earns another attempt.
                 */
                if (!res.ok) {
                    this.generating = false;
                    this.generateError = this.$t("generateThemeProviderFailed", [ this.tidyError(res.msg) ]);
                    return;
                }

                const rejection = this.themeRejection(res.theme);
                if (rejection) {
                    if (this.generateAttempt < MAX_GENERATE_ATTEMPTS) {
                        this.runGenerateAttempt();
                        return;
                    }

                    this.generating = false;
                    this.generateError = this.$t("generateThemeExhausted", [ this.generateAttempt, rejection ]);
                    return;
                }

                this.generating = false;
                this.generateAttempt = 0;
                this.saveThemes([ ...this.customThemes.filter((t) => t.id !== res.theme.id), res.theme ]);
                this.prompt = "";
            });
        },

        /**
         * Drop a theme, falling back to the built-ins if it was in use.
         * @param {string} id theme id
         * @returns {void}
         */
        removeTheme(id) {
            if (this.$root.userTheme === id) {
                this.$root.userTheme = "auto";
            }
            this.saveThemes(this.customThemes.filter((theme) => theme.id !== id));
        },
    },
};
</script>

<style lang="scss" scoped>
.custom-theme-row {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.custom-theme-row > .gizmo-native-check {
    flex: 1;
    min-width: 0;
}

/* The theme drawn small: a page, a card on it, and the meaning-carrying hues. */
.theme-preview {
    display: flex;
    flex: none;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.375rem;
    border: 1px solid;
    border-radius: var(--radius-sm);
}

.theme-preview__card {
    display: grid;
    gap: 0.1875rem;
    width: 2.25rem;
    padding: 0.25rem;
    border: 1px solid;
    border-radius: var(--radius-xs);
}

.theme-preview__line {
    height: 0.125rem;
    border-radius: var(--radius-pill);
}

.theme-preview__line--strong {
    height: 0.1875rem;
    width: 80%;
}

.theme-preview__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: var(--radius-pill);
}

/* Generation and import are two tools over the same list, so they read as a
   pair rather than as two more fields in the settings stack. */
.theme-tool {
    margin-bottom: 1rem;
    padding: 0.875rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface-subtle);
}

.theme-tool__head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

/* The shared badge recipe sets no gap, so the icon sat against the word. */
.theme-tool__credential {
    margin-top: -0.25rem;
}

.theme-tool__badge {
    gap: 0.3rem;
}

/* The info alert paints its whole message in the interaction blue, which left
   the one link in it indistinguishable from the sentence around it. */
.theme-tool .gizmo-native-alert--info a {
    color: inherit;
    font-weight: var(--weight-semibold);
    text-decoration: underline;
}

.theme-credit {
    margin-top: -0.25rem;
}

/* DESIGN.md reserves Gold for selected primary actions, so this overrides the
   shared .gizmo-choice-input recipe, which fills with the interaction blue. */
.gizmo-choice-input:active + .gizmo-native-button,
.gizmo-choice-input:checked + .gizmo-native-button,
.gizmo-choice-input:hover + .gizmo-native-button {
    color: var(--color-brand-contrast);
    background: var(--color-brand);
    border-color: var(--color-brand);
}
</style>
