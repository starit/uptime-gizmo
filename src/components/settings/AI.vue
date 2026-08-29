<template>
    <!--
        A form, because these fields hold credentials. A password input outside
        a form makes the browser warn that it cannot offer to save or fill it,
        which is a fair complaint — and pressing Enter did nothing, since the
        only way to save was the button.
    -->
    <form @submit.prevent="saveSettings()">
        <p class="gizmo-field-help llm-intro">{{ $t("aiSettingsIntro") }}</p>
        <p v-if="!canEdit" class="gizmo-field-help llm-intro">{{ $t("aiSettingsAdminOnly") }}</p>

        <GizmoEmptyState
            v-if="credentials.length === 0"
            :title="$t('noLlmCredentials')"
            :description="$t('noLlmCredentialsDescription')"
        >
            <template #icon>
                <font-awesome-icon icon="robot" />
            </template>
            <template v-if="canEdit" #actions>
                <GizmoButton variant="secondary" @click="addCredential()">
                    <font-awesome-icon icon="plus" />
                    {{ $t("addLlmCredential") }}
                </GizmoButton>
            </template>
        </GizmoEmptyState>

        <div v-else class="llm-credentials">
            <GizmoPanel
                v-for="(credential, index) in credentials"
                :key="credential.id"
                class="llm-credential"
                :class="{ 'llm-credential--active': credential.id === activeId }"
            >
                <template #header>
                    <div class="llm-credential__heading">
                        <span class="llm-credential__name">
                            {{ credential.name || providerOf(credential)?.label }}
                        </span>
                        <span v-if="providerOf(credential)" class="gizmo-inline-badge">
                            {{ providerOf(credential).label }}
                        </span>
                    </div>
                </template>
                <template #actions>
                    <div class="llm-credential__actions">
                        <GizmoRadio
                            :model-value="activeId"
                            :value="credential.id"
                            :disabled="!canEdit"
                            @update:model-value="setActive"
                        >
                            {{ $t("llmCredentialActive") }}
                        </GizmoRadio>
                        <GizmoIconButton v-if="canEdit" :label="$t('Delete')" @click="removeCredential(index)">
                            <font-awesome-icon icon="trash" />
                        </GizmoIconButton>
                    </div>
                </template>

                <div class="gizmo-grid gizmo-grid--two">
                    <!-- Name -->
                    <div>
                        <label class="gizmo-field-label" :for="`llmName-${credential.id}`">
                            {{ $t("Name") }}
                        </label>
                        <input
                            :id="`llmName-${credential.id}`"
                            v-model="credential.name"
                            type="text"
                            class="gizmo-native-control"
                            maxlength="64"
                            :placeholder="providerOf(credential)?.label"
                            :disabled="!canEdit"
                        />
                    </div>

                    <!-- Provider -->
                    <div>
                        <label class="gizmo-field-label" :for="`llmProvider-${credential.id}`">
                            {{ $t("LLM Provider") }}
                        </label>
                        <select
                            :id="`llmProvider-${credential.id}`"
                            v-model="credential.provider"
                            class="gizmo-native-control gizmo-native-select"
                            :disabled="!canEdit"
                        >
                            <option v-for="provider in llmProviders" :key="provider.id" :value="provider.id">
                                {{ provider.label }}
                            </option>
                        </select>
                    </div>
                </div>

                <div class="gizmo-grid gizmo-grid--two">
                    <!-- API key -->
                    <div>
                        <label class="gizmo-field-label" :for="`llmApiKey-${credential.id}`">
                            {{ $t("LLM API Key") }}
                        </label>
                        <HiddenInput
                            :id="`llmApiKey-${credential.id}`"
                            v-model="credential.apiKey"
                            autocomplete="new-password"
                            :disabled="!canEdit"
                        />
                    </div>

                    <!-- Model -->
                    <div>
                        <label class="gizmo-field-label" :for="`llmModel-${credential.id}`">
                            {{ $t("LLM Model (optional)") }}
                        </label>
                        <input
                            :id="`llmModel-${credential.id}`"
                            v-model="credential.model"
                            type="text"
                            class="gizmo-native-control"
                            :list="`llmModelList-${credential.id}`"
                            :placeholder="modelPlaceholder(credential)"
                            :disabled="!canEdit"
                        />
                        <datalist :id="`llmModelList-${credential.id}`">
                            <option v-for="model in providerOf(credential)?.models ?? []" :key="model" :value="model" />
                        </datalist>
                        <div class="gizmo-field-help">{{ $t("llmModelListDescription") }}</div>
                    </div>
                </div>

                <!--
                    The endpoint is the whole address of a custom provider, so it
                    is asked for there. It is also shown for a credential that
                    already carries one, which is how a base URL saved before
                    this page kept a list stays visible instead of applying
                    unseen.
                -->
                <div v-if="showEndpoint(credential)">
                    <label class="gizmo-field-label" :for="`llmBaseUrl-${credential.id}`">
                        {{ isCustom(credential) ? $t("LLM Endpoint") : $t("LLM Base URL (optional)") }}
                    </label>
                    <input
                        :id="`llmBaseUrl-${credential.id}`"
                        v-model="credential.baseUrl"
                        type="url"
                        class="gizmo-native-control"
                        :placeholder="isCustom(credential) ? 'https://llm.example.com/v1/chat/completions' : 'https://'"
                        :disabled="!canEdit"
                    />
                    <div class="gizmo-field-help">
                        {{ isCustom(credential) ? $t("llmEndpointDescription") : $t("llmBaseUrlDescription") }}
                    </div>
                </div>
            </GizmoPanel>
        </div>

        <div v-if="canEdit" class="gizmo-action-bar llm-actions">
            <GizmoButton
                v-if="credentials.length > 0"
                variant="secondary"
                :disabled="credentials.length >= credentialLimit"
                @click="addCredential()"
            >
                <font-awesome-icon icon="plus" />
                {{ $t("addLlmCredential") }}
            </GizmoButton>
            <GizmoButton variant="primary" type="submit">
                {{ $t("Save") }}
            </GizmoButton>
        </div>

        <p class="gizmo-field-help llm-footnote">{{ $t("llmApiKeyDescription") }}</p>
    </form>
</template>

<script>
import GizmoButton from "../gizmo/GizmoButton.vue";
import GizmoEmptyState from "../gizmo/GizmoEmptyState.vue";
import GizmoIconButton from "../gizmo/GizmoIconButton.vue";
import GizmoPanel from "../gizmo/GizmoPanel.vue";
import GizmoRadio from "../gizmo/GizmoRadio.vue";
import HiddenInput from "../HiddenInput.vue";
import { llmProviders, getLLMProvider, LLM_CREDENTIAL_LIMIT } from "../../llm-providers.ts";
import { genSecret } from "../../util.ts";

export default {
    components: {
        GizmoButton,
        GizmoEmptyState,
        GizmoIconButton,
        GizmoPanel,
        GizmoRadio,
        HiddenInput,
    },

    data() {
        return {
            llmProviders,
            credentialLimit: LLM_CREDENTIAL_LIMIT,
        };
    },

    computed: {
        settings() {
            return this.$parent.$parent.$parent.settings;
        },
        saveSettings() {
            return this.$parent.$parent.$parent.saveSettings;
        },
        credentials() {
            if (!Array.isArray(this.settings.llmCredentials)) {
                return [];
            }
            return this.settings.llmCredentials;
        },
        activeId() {
            return this.settings.llmActiveCredentialId ?? "";
        },
        canEdit() {
            return Boolean(this.$root.info?.isAdmin);
        },
    },

    methods: {
        /**
         * The catalogue entry a credential points at.
         * @param {object} credential one credential
         * @returns {object|null} its provider, or null when it names none
         */
        providerOf(credential) {
            return getLLMProvider(credential.provider);
        },

        /**
         * Whether this credential is reached at a URL of its own.
         * @param {object} credential one credential
         * @returns {boolean} true for a custom provider
         */
        isCustom(credential) {
            return Boolean(this.providerOf(credential)?.requiresEndpoint);
        },

        /**
         * Whether to offer the URL field for this credential.
         * @param {object} credential one credential
         * @returns {boolean} true when the field applies
         */
        showEndpoint(credential) {
            return this.isCustom(credential) || Boolean(credential.baseUrl);
        },

        /**
         * What the model field shows while it is empty, which is the model a
         * blank field ends up sending.
         * @param {object} credential one credential
         * @returns {string} placeholder text
         */
        modelPlaceholder(credential) {
            if (this.isCustom(credential)) {
                return this.$t("llmModelCustomPlaceholder");
            }
            return this.providerOf(credential)?.defaultModel || this.$t("llmModelPlaceholder");
        },

        /**
         * Mark a credential as the one AI features use.
         * @param {string} id credential id
         * @returns {void}
         */
        setActive(id) {
            this.settings.llmActiveCredentialId = id;
        },

        /**
         * Append an empty credential, and make it the active one when it is
         * the only one there is.
         * @returns {void}
         */
        addCredential() {
            if (!Array.isArray(this.settings.llmCredentials)) {
                this.settings.llmCredentials = [];
            }

            const credential = {
                id: genSecret(16),
                name: "",
                provider: llmProviders[0].id,
                apiKey: "",
                model: "",
                baseUrl: "",
            };

            this.settings.llmCredentials.push(credential);

            if (this.settings.llmCredentials.length === 1) {
                this.setActive(credential.id);
            }
        },

        /**
         * Remove a credential, moving the active mark off it if it held one.
         * @param {number} index position in the list
         * @returns {void}
         */
        removeCredential(index) {
            const [ removed ] = this.settings.llmCredentials.splice(index, 1);

            if (removed && removed.id === this.activeId) {
                this.setActive(this.settings.llmCredentials[0]?.id ?? "");
            }
        },
    },
};
</script>

<style lang="scss" scoped>
.llm-intro {
    margin-bottom: 1rem;
}

.llm-credentials {
    display: grid;
    gap: 0.75rem;
}

.llm-credential--active {
    border-color: var(--color-interactive);
}

/* The header holds a title on one side and two controls on the other, which
   is more than fits a phone in one line. */
.llm-credential :deep(.gizmo-panel__header) {
    flex-wrap: wrap;
}

.llm-credential__heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
}

.llm-credential__name {
    color: var(--color-text);
    font-size: 0.9375rem;
    font-weight: var(--weight-semibold);
    overflow-wrap: anywhere;
}

.llm-credential__actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.llm-actions {
    margin-top: 1rem;
}

.llm-footnote {
    margin-top: 0.75rem;
}
</style>
