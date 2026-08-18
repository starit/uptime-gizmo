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
export default {};
</script>

<style lang="scss" scoped>
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
