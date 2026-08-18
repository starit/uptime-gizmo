<template>
    <div>
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
            </div>
        </div>
        <!-- Custom themes -->
        <div class="tw-my-4">
            <label class="gizmo-field-label">{{ $t("Custom Themes") }}</label>

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

            <div v-if="aiConfigured" class="tw-mb-3">
                <label class="gizmo-field-label" for="theme-prompt">{{ $t("Generate Theme") }}</label>
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
                <div v-if="generateError" class="gizmo-native-alert gizmo-native-alert--danger tw-mt-2">
                    {{ generateError }}
                </div>
                <div class="gizmo-field-help">{{ $t("generateThemeDescription") }}</div>
            </div>

            <details class="custom-theme-import">
                <summary class="gizmo-field-label">{{ $t("Import Theme") }}</summary>
                <textarea
                    v-model="importText"
                    class="gizmo-native-control tw-mt-2"
                    rows="5"
                    :placeholder="$t('importThemePlaceholder')"
                ></textarea>
                <div v-if="importError" class="gizmo-native-alert gizmo-native-alert--danger tw-mt-2">
                    {{ importError }}
                </div>
                <div class="gizmo-action-group tw-mt-2">
                    <button type="button" class="gizmo-native-button gizmo-native-button--primary" @click="importTheme">
                        {{ $t("Import") }}
                    </button>
                </div>
            </details>
        </div>

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
    </div>
</template>

<script>
import { findContrastFailures, baselineFor } from "../../theme/theme-bridge";

export default {
    data() {
        return {
            importText: "",
            importError: "",
            prompt: "",
            generating: false,
            generateError: "",
        };
    },

    computed: {
        customThemes() {
            return this.$root.info?.customThemes ?? [];
        },

        /** Generation is offered only once a provider is actually configured. */
        aiConfigured() {
            return Boolean(this.$root.info?.aiConfigured);
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
         * Accept a pasted theme, rejecting anything that fails the contrast
         * floors DESIGN.md sets. A theme that cannot be read is not worth
         * storing, and one that cannot be read *by a person* is worse.
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

            if (!theme?.id || !theme?.name || !theme?.tokens?.colors) {
                this.importError = this.$t("themeImportMissingFields");
                return;
            }

            const failures = findContrastFailures(theme);
            if (failures.length > 0) {
                this.importError = this.$t("themeImportContrastFailed", [
                    failures.map((f) => `${f.label} ${f.ratio.toFixed(2)}:${f.required}`).join(", "),
                ]);
                return;
            }

            this.saveThemes([ ...this.customThemes.filter((t) => t.id !== theme.id), theme ]);
            this.importText = "";
        },

        /**
         * Ask the server to generate a theme, then hold it to the same contrast
         * floor as an imported one. A model optimises for looking pleasant, not
         * for being legible, so the gate matters more here than on import.
         * @returns {void}
         */
        generateTheme() {
            this.generateError = "";
            this.generating = true;

            this.$root.getSocket().emit("generateTheme", this.prompt, (res) => {
                this.generating = false;

                if (!res.ok) {
                    this.generateError = res.msg;
                    return;
                }

                const theme = res.theme;
                if (!theme?.id || !theme?.name || !theme?.tokens?.colors) {
                    this.generateError = this.$t("themeImportMissingFields");
                    return;
                }

                const failures = findContrastFailures(theme);
                if (failures.length > 0) {
                    this.generateError = this.$t("themeImportContrastFailed", [
                        failures.map((f) => `${f.label} ${f.ratio.toFixed(2)}:${f.required}`).join(", "),
                    ]);
                    return;
                }

                this.saveThemes([ ...this.customThemes.filter((t) => t.id !== theme.id), theme ]);
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
    justify-content: space-between;
    gap: 1rem;
}

.custom-theme-import summary {
    cursor: pointer;
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
