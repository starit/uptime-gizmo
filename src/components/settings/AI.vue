<template>
    <!--
        A form, because one of these fields holds a credential. A password input
        outside a form makes the browser warn that it cannot offer to save or fill
        it, which is a fair complaint — and pressing Enter did nothing, since the
        only way to save was the button.
    -->
    <form @submit.prevent="saveSettings()">
        <p class="gizmo-field-help tw-mb-4">{{ $t("aiSettingsIntro") }}</p>
        <p v-if="!canEdit" class="gizmo-field-help tw-mb-4">{{ $t("aiSettingsAdminOnly") }}</p>

            <!-- LLM Provider -->
            <div class="tw-mb-4">
                <label class="gizmo-field-label" for="llmProvider">
                    {{ $t("LLM Provider") }}
                </label>
                <select
                    id="llmProvider"
                    v-model="settings.llmProvider"
                    class="gizmo-native-control gizmo-native-select"
                    :disabled="!canEdit"
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
                    <HiddenInput id="llmApiKey" v-model="settings.llmApiKey" autocomplete="new-password" :disabled="!canEdit" />
                    <div class="gizmo-field-help">{{ $t("llmApiKeyDescription") }}</div>
                </div>

                <!-- LLM Model -->
                <div class="tw-mb-4">
                    <label class="gizmo-field-label" for="llmModel">
                        {{ $t("LLM Model (optional)") }}
                    </label>
                    <input
                        id="llmModel"
                        v-model="settings.llmModel"
                        type="text"
                        class="gizmo-native-control"
                        :placeholder="selectedProvider?.defaultModel ?? $t('llmModelPlaceholder')"
                        :disabled="!canEdit"
                    />
                    <div class="gizmo-field-help">{{ $t("llmModelDescription") }}</div>
                </div>

                <!-- LLM Base URL -->
                <div class="tw-mb-4">
                    <label class="gizmo-field-label" for="llmBaseUrl">
                        {{ $t("LLM Base URL (optional)") }}
                    </label>
                    <input
                        id="llmBaseUrl"
                        v-model="settings.llmBaseUrl"
                        type="url"
                        class="gizmo-native-control"
                        placeholder="https://"
                        :disabled="!canEdit"
                    />
                    <div class="gizmo-field-help">{{ $t("llmBaseUrlDescription") }}</div>
                </div>
            </template>

        <div v-if="canEdit" class="gizmo-action-bar tw-mt-4">
            <GizmoButton variant="primary" type="submit">
                {{ $t("Save") }}
            </GizmoButton>
        </div>
    </form>
</template>

<script>
import GizmoButton from "../gizmo/GizmoButton.vue";
import HiddenInput from "../HiddenInput.vue";

export default {
    components: {
        GizmoButton,
        HiddenInput,
    },

    data() {
        return {
            // Mirrors themed.js AIProviderType, minus the browser-extension and
            // custom transports, which need a different config shape.
            // defaultModel mirrors what themed.js 0.2.0 falls back to when the
            // model field is left blank, read from its provider classes.
            llmProviders: [
                { value: "openai", label: "OpenAI", defaultModel: "gpt-5-mini" },
                { value: "claude", label: "Claude", defaultModel: "claude-sonnet-4-6" },
                { value: "gemini", label: "Gemini", defaultModel: "gemini-2.5-flash" },
                { value: "groq", label: "Groq", defaultModel: "llama-3.3-70b-versatile" },
                { value: "deepseek", label: "DeepSeek", defaultModel: "deepseek-chat" },
                { value: "moonshot", label: "Moonshot", defaultModel: "kimi-k2-turbo-preview" },
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
        selectedProvider() {
            return this.llmProviders.find((p) => p.value === this.settings.llmProvider) ?? null;
        },
        canEdit() {
            return Boolean(this.$root.info?.isAdmin);
        },
    },
};
</script>
