<template>
    <div>
        <form class="tw-my-4" autocomplete="off" @submit.prevent="saveGeneral">
            <!-- Client side Timezone -->
            <div class="tw-mb-4">
                <label for="timezone" class="gizmo-field-label">
                    {{ $t("Display Timezone") }}
                </label>
                <select id="timezone" v-model="$root.userTimezone" class="gizmo-native-control gizmo-native-select">
                    <option value="auto">{{ $t("Auto") }}: {{ guessTimezone }}</option>
                    <option v-for="(timezone, index) in timezoneList" :key="index" :value="timezone.value">
                        {{ timezone.name }}
                    </option>
                </select>
            </div>

            <!-- Server Timezone -->
            <div class="tw-mb-4">
                <label for="timezone" class="gizmo-field-label">
                    {{ $t("Server Timezone") }}
                </label>
                <select id="timezone" v-model="settings.serverTimezone" class="gizmo-native-control gizmo-native-select">
                    <option value="UTC">UTC</option>
                    <option v-for="(timezone, index) in timezoneList" :key="index" :value="timezone.value">
                        {{ timezone.name }}
                    </option>
                </select>
            </div>

            <!-- Search Engine -->
            <div class="tw-mb-4">
                <label class="gizmo-field-label">
                    {{ $t("Search Engine Visibility") }}
                </label>

                <div class="gizmo-native-check">
                    <input
                        id="searchEngineIndexYes"
                        v-model="settings.searchEngineIndex"
                        class="gizmo-native-check__input"
                        type="radio"
                        name="searchEngineIndex"
                        :value="true"
                        required
                    />
                    <label class="gizmo-native-check__label" for="searchEngineIndexYes">
                        {{ $t("Allow indexing") }}
                    </label>
                </div>
                <div class="gizmo-native-check">
                    <input
                        id="searchEngineIndexNo"
                        v-model="settings.searchEngineIndex"
                        class="gizmo-native-check__input"
                        type="radio"
                        name="searchEngineIndex"
                        :value="false"
                        required
                    />
                    <label class="gizmo-native-check__label" for="searchEngineIndexNo">
                        {{ $t("Discourage search engines from indexing site") }}
                    </label>
                </div>
            </div>

            <!-- Entry Page -->
            <div class="tw-mb-4">
                <label class="gizmo-field-label">{{ $t("Entry Page") }}</label>

                <div class="gizmo-native-check">
                    <input
                        id="entryPageDashboard"
                        v-model="settings.entryPage"
                        class="gizmo-native-check__input"
                        type="radio"
                        name="entryPage"
                        value="dashboard"
                        required
                    />
                    <label class="gizmo-native-check__label" for="entryPageDashboard">
                        {{ $t("Dashboard") }}
                    </label>
                </div>

                <div v-for="statusPage in $root.statusPageList" :key="statusPage.id" class="gizmo-native-check">
                    <input
                        :id="'status-page-' + statusPage.id"
                        v-model="settings.entryPage"
                        class="gizmo-native-check__input"
                        type="radio"
                        name="entryPage"
                        :value="'statusPage-' + statusPage.slug"
                        required
                    />
                    <label class="gizmo-native-check__label" :for="'status-page-' + statusPage.id">
                        {{ $t("Status Page") }} - {{ statusPage.title }}
                    </label>
                </div>
            </div>

            <!-- Primary Base URL -->
            <div class="tw-mb-4">
                <label class="gizmo-field-label" for="primaryBaseURL">
                    {{ $t("Primary Base URL") }}
                </label>

                <div class="gizmo-input-group tw-mb-3">
                    <input
                        id="primaryBaseURL"
                        v-model="settings.primaryBaseURL"
                        class="gizmo-native-control"
                        name="primaryBaseURL"
                        placeholder="https://"
                        pattern="https?://.+"
                        autocomplete="new-password"
                    />
                    <button class="gizmo-native-button gizmo-native-button--outline" type="button" @click="autoGetPrimaryBaseURL">
                        {{ $t("Auto Get") }}
                    </button>
                </div>

                <div class="gizmo-field-help"></div>
            </div>

            <!-- Steam API Key -->
            <div class="tw-mb-4">
                <label class="gizmo-field-label" for="steamAPIKey">
                    {{ $t("Steam API Key") }}
                </label>
                <HiddenInput id="steamAPIKey" v-model="settings.steamAPIKey" autocomplete="new-password" />
                <i18n-t tag="div" keypath="steamApiKeyDescriptionAt" class="gizmo-field-help">
                    <template #url>
                        <a href="https://steamcommunity.com/dev" target="_blank">https://steamcommunity.com/dev</a>
                    </template>
                </i18n-t>
            </div>

            <!-- Globalping API Token -->
            <div class="tw-mb-4">
                <label class="gizmo-field-label" for="globalpingApiToken">
                    {{ $t("Globalping API Token") }}
                </label>
                <HiddenInput
                    id="globalpingApiToken"
                    v-model="settings.globalpingApiToken"
                    autocomplete="new-password"
                />
                <i18n-t keypath="globalpingApiTokenDescription" tag="div" class="gizmo-field-help">
                    <a href="https://dash.globalping.io" target="_blank">https://dash.globalping.io</a>
                </i18n-t>
            </div>

            <!-- LLM Provider -->
            <div class="tw-mb-4">
                <label class="gizmo-field-label" for="llmProvider">
                    {{ $t("LLM Provider") }}
                </label>
                <select
                    id="llmProvider"
                    v-model="settings.llmProvider"
                    class="gizmo-native-control gizmo-native-select"
                >
                    <option :value="null">{{ $t("None") }}</option>
                    <option v-for="provider in llmProviders" :key="provider.value" :value="provider.value">
                        {{ provider.label }}
                    </option>
                </select>
                <div class="gizmo-field-help">{{ $t("llmProviderDescription") }}</div>
            </div>

            <template v-if="settings.llmProvider">
                <!-- LLM API Key -->
                <div class="tw-mb-4">
                    <label class="gizmo-field-label" for="llmApiKey">
                        {{ $t("LLM API Key") }}
                    </label>
                    <HiddenInput id="llmApiKey" v-model="settings.llmApiKey" autocomplete="new-password" />
                    <div class="gizmo-field-help">{{ $t("llmApiKeyDescription") }}</div>
                </div>

                <!-- LLM Model -->
                <div class="tw-mb-4">
                    <label class="gizmo-field-label" for="llmModel">
                        {{ $t("LLM Model") }}
                    </label>
                    <input
                        id="llmModel"
                        v-model="settings.llmModel"
                        type="text"
                        class="gizmo-native-control"
                        :placeholder="$t('llmModelPlaceholder')"
                    />
                    <div class="gizmo-field-help">{{ $t("llmModelDescription") }}</div>
                </div>

                <!-- LLM Base URL -->
                <div class="tw-mb-4">
                    <label class="gizmo-field-label" for="llmBaseUrl">
                        {{ $t("LLM Base URL") }}
                    </label>
                    <input
                        id="llmBaseUrl"
                        v-model="settings.llmBaseUrl"
                        type="url"
                        class="gizmo-native-control"
                        placeholder="https://"
                    />
                    <div class="gizmo-field-help">{{ $t("llmBaseUrlDescription") }}</div>
                </div>
            </template>

            <!-- DNS Cache (nscd) -->
            <div v-if="$root.info.isContainer" class="tw-mb-4">
                <label class="gizmo-field-label">
                    {{ $t("enableNSCD") }}
                </label>

                <div class="gizmo-native-check">
                    <input
                        id="nscdEnable"
                        v-model="settings.nscd"
                        class="gizmo-native-check__input"
                        type="radio"
                        name="nscd"
                        :value="true"
                        required
                    />
                    <label class="gizmo-native-check__label" for="nscdEnable">
                        {{ $t("Enable") }}
                    </label>
                </div>

                <div class="gizmo-native-check">
                    <input
                        id="nscdDisable"
                        v-model="settings.nscd"
                        class="gizmo-native-check__input"
                        type="radio"
                        name="nscd"
                        :value="false"
                        required
                    />
                    <label class="gizmo-native-check__label" for="nscdDisable">
                        {{ $t("Disable") }}
                    </label>
                </div>
            </div>

            <!-- Chrome Executable -->
            <div class="tw-mb-4">
                <label class="gizmo-field-label" for="primaryBaseURL">
                    {{ $t("chromeExecutable") }}
                </label>

                <div class="gizmo-input-group tw-mb-3">
                    <input
                        id="primaryBaseURL"
                        v-model="settings.chromeExecutable"
                        class="gizmo-native-control"
                        name="primaryBaseURL"
                        :placeholder="$t('chromeExecutableAutoDetect')"
                    />
                    <button class="gizmo-native-button gizmo-native-button--outline" type="button" @click="testChrome">
                        {{ $t("Test") }}
                    </button>
                </div>

                <div class="gizmo-field-help">
                    {{ $t("chromeExecutableDescription") }}
                </div>
            </div>

            <!-- Save Button -->
            <div>
                <button class="gizmo-native-button gizmo-native-button--primary" type="submit">
                    {{ $t("Save") }}
                </button>
            </div>
        </form>
    </div>
</template>

<script>
import HiddenInput from "../../components/HiddenInput.vue";
import dayjs from "dayjs";
import { timezoneList } from "../../util-frontend";

export default {
    components: {
        HiddenInput,
    },

    data() {
        return {
            timezoneList: timezoneList(),
            // Mirrors themed.js AIProviderType, minus the browser-extension and
            // custom transports, which need a different config shape.
            llmProviders: [
                { value: "openai", label: "OpenAI" },
                { value: "claude", label: "Claude" },
                { value: "gemini", label: "Gemini" },
                { value: "groq", label: "Groq" },
                { value: "deepseek", label: "DeepSeek" },
                { value: "moonshot", label: "Moonshot" },
            ],
        };
    },

    computed: {
        settings() {
            return this.$parent.$parent.$parent.settings;
        },
        saveSettings() {
            return this.$parent.$parent.$parent.saveSettings;
        },
        settingsLoaded() {
            return this.$parent.$parent.$parent.settingsLoaded;
        },
        guessTimezone() {
            return dayjs.tz.guess();
        },
    },

    methods: {
        /**
         * Save the settings
         * @returns {void}
         */
        saveGeneral() {
            localStorage.timezone = this.$root.userTimezone;
            this.saveSettings();
        },
        /**
         * Get the base URL of the application
         * @returns {void}
         */
        autoGetPrimaryBaseURL() {
            this.settings.primaryBaseURL = location.protocol + "//" + location.host;
        },
        /**
         * Test the chrome executable
         * @returns {void}
         */
        testChrome() {
            this.$root.getSocket().emit("testChrome", this.settings.chromeExecutable, (res) => {
                this.$root.toastRes(res);
            });
        },
    },
};
</script>
