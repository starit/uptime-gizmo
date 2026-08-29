<template>
    <div>
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
                <GizmoButton variant="secondary" @click="add()">
                    <font-awesome-icon icon="plus" />
                    {{ $t("addLlmCredential") }}
                </GizmoButton>
            </template>
        </GizmoEmptyState>

        <div v-else class="llm-credentials">
            <GizmoListRow
                v-for="credential in credentials"
                :key="credential.id"
                class="llm-credential"
                :class="{ 'llm-credential--active': credential.id === activeId }"
            >
                <!--
                    The mark travels with the row rather than sitting inside the
                    dialog: which credential is in use is a property of the list,
                    and moving it should not mean opening two dialogs.
                -->
                <template #leading>
                    <GizmoRadio
                        :model-value="activeId"
                        :value="credential.id"
                        :disabled="!canEdit"
                        :aria-label="$t('llmCredentialActive')"
                        @update:model-value="setActive"
                    />
                </template>

                <div class="llm-credential__title">
                    <span class="llm-credential__name">
                        {{ credential.name || providerOf(credential)?.label }}
                    </span>
                    <span v-if="providerOf(credential)" class="gizmo-inline-badge">
                        {{ providerOf(credential).label }}
                    </span>
                </div>
                <div class="gizmo-field-help llm-credential__meta">
                    <span>{{ effectiveModel(credential) }}</span>
                    <span v-if="credential.baseUrl" class="llm-credential__url">{{ credential.baseUrl }}</span>
                </div>

                <template v-if="canEdit" #trailing>
                    <GizmoButton variant="outline" size="sm" @click="edit(credential)">
                        {{ $t("Edit") }}
                    </GizmoButton>
                </template>
            </GizmoListRow>
        </div>

        <div v-if="canEdit && credentials.length > 0" class="gizmo-action-bar llm-actions">
            <GizmoButton variant="secondary" :disabled="atCredentialLimit" @click="add()">
                <font-awesome-icon icon="plus" />
                {{ $t("addLlmCredential") }}
            </GizmoButton>
        </div>

        <!-- A disabled button explains nothing, and cannot be hovered for a
             tooltip in every browser, so the reason is said in the open. -->
        <p v-if="canEdit && atCredentialLimit" class="gizmo-field-help llm-limit">
            {{ $t("llmCredentialLimitReached", [ credentialLimit ]) }}
        </p>

        <LlmCredentialDialog ref="dialog" @save="store" @delete="remove" />
    </div>
</template>

<script>
import GizmoButton from "../gizmo/GizmoButton.vue";
import GizmoEmptyState from "../gizmo/GizmoEmptyState.vue";
import GizmoListRow from "../gizmo/GizmoListRow.vue";
import GizmoRadio from "../gizmo/GizmoRadio.vue";
import LlmCredentialDialog from "../LlmCredentialDialog.vue";
import { getLLMProvider, llmProviders, LLM_CREDENTIAL_LIMIT } from "../../llm-providers.ts";
import { genSecret } from "../../util.ts";

export default {
    components: {
        GizmoButton,
        GizmoEmptyState,
        GizmoListRow,
        GizmoRadio,
        LlmCredentialDialog,
    },

    data() {
        return {
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
        atCredentialLimit() {
            return this.credentials.length >= this.credentialLimit;
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
         * The model this credential ends up sending, named or defaulted.
         * @param {object} credential one credential
         * @returns {string} a model name
         */
        effectiveModel(credential) {
            return credential.model || this.providerOf(credential)?.defaultModel || this.$t("llmModelPlaceholder");
        },

        /**
         * Open the dialog on a new credential.
         * @returns {void}
         */
        add() {
            this.$refs.dialog.show({
                id: genSecret(16),
                name: "",
                provider: llmProviders[0].id,
                apiKey: "",
                apiKeyHeader: "",
                model: "",
                baseUrl: "",
            });
        },

        /**
         * Open the dialog on an existing credential.
         * @param {object} credential the row that was clicked
         * @returns {void}
         */
        edit(credential) {
            this.$refs.dialog.show(credential, true);
        },

        /**
         * Mark a credential as the one AI features use.
         * @param {string} id credential id
         * @returns {void}
         */
        setActive(id) {
            this.settings.llmActiveCredentialId = id;
            this.saveSettings();
        },

        /*
         * Every change below is stored as it is made. The dialog is where a
         * credential is edited, so a page-level save button would leave the
         * question of what a closed dialog had already done.
         */

        /**
         * Add or replace a credential, then store the list.
         * @param {object} credential the credential the dialog returned
         * @returns {void}
         */
        store(credential) {
            if (!Array.isArray(this.settings.llmCredentials)) {
                this.settings.llmCredentials = [];
            }

            const index = this.settings.llmCredentials.findIndex((item) => item.id === credential.id);

            if (index === -1) {
                this.settings.llmCredentials.push(credential);
            } else {
                this.settings.llmCredentials[index] = credential;
            }

            // The first credential is the one in use; there is nothing else it
            // could be, and asking would be asking about a list of one.
            if (this.settings.llmCredentials.length === 1) {
                this.settings.llmActiveCredentialId = credential.id;
            }

            this.saveSettings();
        },

        /**
         * Remove a credential, moving the mark off it if it held one.
         * @param {string} id credential id
         * @returns {void}
         */
        remove(id) {
            this.settings.llmCredentials = this.credentials.filter((item) => item.id !== id);

            if (this.activeId === id) {
                this.settings.llmActiveCredentialId = this.settings.llmCredentials[0]?.id ?? "";
            }

            this.saveSettings();
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
    gap: 0.5rem;
}

.llm-credential {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
}

.llm-credential--active {
    border-color: var(--color-interactive);
}

.llm-credential__title {
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

.llm-credential__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.75rem;
}

.llm-credential__url {
    overflow-wrap: anywhere;
}

.llm-actions {
    margin-top: 0.75rem;
}

.llm-limit {
    margin-top: 0.5rem;
}
</style>
