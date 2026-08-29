<template>
    <GizmoDialog
        :open="open"
        size="md"
        :title="existing ? $t('editLlmCredential') : $t('addLlmCredential')"
        :close-label="$t('Close')"
        :close-disabled="testing"
        :close-on-backdrop="false"
        @update:open="setOpen"
    >
        <form id="llm-credential-form" class="gizmo-form-stack" @submit.prevent="submit">
            <div>
                <label for="llm-credential-name" class="gizmo-field-label">{{ $t("Name") }}</label>
                <input
                    id="llm-credential-name"
                    v-model="credential.name"
                    type="text"
                    class="gizmo-native-control"
                    maxlength="64"
                    :placeholder="provider?.label"
                    autofocus
                />
            </div>

            <div>
                <label for="llm-credential-provider" class="gizmo-field-label">{{ $t("LLM Provider") }}</label>
                <select
                    id="llm-credential-provider"
                    v-model="credential.provider"
                    class="gizmo-native-control gizmo-native-select"
                >
                    <option v-for="item in llmProviders" :key="item.id" :value="item.id">
                        {{ item.label }}
                    </option>
                </select>
            </div>

            <div>
                <label for="llm-credential-key" class="gizmo-field-label">{{ $t("LLM API Key") }}</label>
                <HiddenInput id="llm-credential-key" v-model="credential.apiKey" autocomplete="new-password" required />
                <div class="gizmo-field-help">{{ $t("llmApiKeyDescription") }}</div>
            </div>

            <!--
                Bearer is what an OpenAI-compatible endpoint expects. Azure
                OpenAI wants api-key, and some gateways x-api-key; against those
                a Bearer header is a 401 whatever the key is.
            -->
            <div v-if="isCustom">
                <label for="llm-credential-key-header" class="gizmo-field-label">
                    {{ $t("llmApiKeyHeaderLabel") }}
                </label>
                <input
                    id="llm-credential-key-header"
                    v-model="credential.apiKeyHeader"
                    type="text"
                    class="gizmo-native-control"
                    maxlength="64"
                    placeholder="Authorization: Bearer"
                />
                <div class="gizmo-field-help">{{ $t("llmApiKeyHeaderHelp") }}</div>
            </div>

            <div>
                <label for="llm-credential-model" class="gizmo-field-label">{{ $t("LLM Model (optional)") }}</label>
                <input
                    id="llm-credential-model"
                    v-model="credential.model"
                    type="text"
                    class="gizmo-native-control"
                    list="llm-credential-model-list"
                    :placeholder="modelPlaceholder"
                />
                <datalist id="llm-credential-model-list">
                    <option v-for="model in provider?.models ?? []" :key="model" :value="model" />
                </datalist>
                <div class="gizmo-field-help">{{ $t("llmModelListDescription") }}</div>
            </div>

            <!--
                The endpoint is the whole address of a custom provider, so it is
                asked for there. It is also shown for a credential that already
                carries one, which is how a base URL saved before this dialog
                existed stays visible instead of applying unseen.
            -->
            <div v-if="showEndpoint">
                <label for="llm-credential-url" class="gizmo-field-label">
                    {{ isCustom ? $t("LLM Endpoint") : $t("LLM Base URL (optional)") }}
                </label>
                <input
                    id="llm-credential-url"
                    v-model="credential.baseUrl"
                    type="url"
                    class="gizmo-native-control"
                    :placeholder="isCustom ? 'https://llm.example.com/v1/chat/completions' : 'https://'"
                    :required="isCustom"
                />
                <div class="gizmo-field-help">
                    {{ isCustom ? $t("llmEndpointDescription") : $t("llmBaseUrlDescription") }}
                </div>
            </div>

            <!-- What the provider said when Test was pressed, kept where the
                 fields that caused it are still on screen. -->
            <div v-if="testMessage" ref="testResult" class="gizmo-native-alert" :class="testAlertClass">
                {{ testMessage }}
            </div>
        </form>

        <template #footer>
            <GizmoButton
                v-if="existing"
                class="gizmo-dialog__leading-action"
                variant="danger"
                :disabled="testing"
                @click="deleteConfirm"
            >
                {{ $t("Delete") }}
            </GizmoButton>
            <GizmoButton variant="secondary" :loading="testing" @click="test">
                {{ $t("Test") }}
            </GizmoButton>
            <GizmoButton form="llm-credential-form" type="submit" :disabled="testing">
                {{ $t("Save") }}
            </GizmoButton>
        </template>
    </GizmoDialog>

    <Confirm ref="confirmDelete" btn-style="btn-danger" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="remove">
        {{ $t("deleteLlmCredentialMsg") }}
    </Confirm>
</template>

<script lang="ts">
import Confirm from "./Confirm.vue";
import GizmoButton from "./gizmo/GizmoButton.vue";
import GizmoDialog from "./gizmo/GizmoDialog.vue";
import HiddenInput from "./HiddenInput.vue";
import { getLLMProvider, llmProviders, type LLMProvider } from "../llm-providers.ts";

interface LlmCredential {
    id: string;
    name: string;
    provider: string;
    apiKey: string;
    apiKeyHeader: string;
    model: string;
    baseUrl: string;
}

interface TestResult {
    answer?: string;
    msg?: string;
    ok: boolean;
}

interface DialogRoot {
    getSocket: () => {
        emit: (event: string, ...args: unknown[]) => void;
    };
}

interface ConfirmDialogRef {
    show: () => void;
}

export default {
    components: {
        Confirm,
        GizmoButton,
        GizmoDialog,
        HiddenInput,
    },
    emits: ["save", "delete"],
    data() {
        return {
            open: false,
            testing: false,
            existing: false,
            testOk: false,
            testMessage: "",
            llmProviders,
            credential: {
                id: "",
                name: "",
                provider: llmProviders[0].id,
                apiKey: "",
                apiKeyHeader: "",
                model: "",
                baseUrl: "",
            } as LlmCredential,
        };
    },
    computed: {
        provider(): LLMProvider | null {
            return getLLMProvider(this.credential.provider);
        },
        isCustom(): boolean {
            return Boolean(this.provider?.requiresEndpoint);
        },
        showEndpoint(): boolean {
            return this.isCustom || Boolean(this.credential.baseUrl);
        },
        // The model a blank field ends up sending.
        modelPlaceholder(): string {
            if (this.isCustom) {
                return this.$t("llmModelCustomPlaceholder");
            }
            return this.provider?.defaultModel || this.$t("llmModelPlaceholder");
        },
        testAlertClass(): string {
            return this.testOk ? "gizmo-native-alert--success" : "gizmo-native-alert--danger";
        },
    },
    watch: {
        /*
         * A result describes the values that were tested. Once any of them
         * changes it is no longer about what is on screen, so it goes.
         */
        credential: {
            deep: true,
            handler() {
                this.testMessage = "";
            },
        },
    },
    methods: {
        setOpen(open: boolean) {
            this.open = open;
        },

        /**
         * Open the dialog on a copy of a credential. The list owns the
         * credential's identity, so it hands one in either case.
         * @param {LlmCredential} credential the credential to edit
         * @param {boolean} existing whether the list already holds it
         * @returns {void}
         */
        show(credential: LlmCredential, existing = false) {
            this.existing = existing;
            // A credential stored before this field existed arrives without it.
            this.credential = { ...credential, apiKeyHeader: credential.apiKeyHeader ?? "" };
            this.testMessage = "";
            this.testing = false;
            this.open = true;
        },

        /**
         * Hand the edited credential back to the list, which stores it.
         * @returns {void}
         */
        submit() {
            this.$emit("save", { ...this.credential });
            this.open = false;
        },

        deleteConfirm() {
            (this.$refs.confirmDelete as ConfirmDialogRef).show();
        },

        remove() {
            this.$emit("delete", this.credential.id);
            this.open = false;
        },

        /**
         * Ask the server to reach the provider with what is on screen, saved or
         * not, so a key can be corrected before it is stored.
         * @returns {void}
         */
        test() {
            if (this.testing) {
                return;
            }

            this.testing = true;
            this.testMessage = "";

            const root = this.$root as unknown as DialogRoot;
            root.getSocket().emit("testLlmCredential", { ...this.credential }, (res: TestResult) => {
                this.testing = false;
                this.testOk = res.ok;
                this.testMessage = res.ok
                    ? this.$t("llmCredentialTestPassed")
                    : this.$t("llmCredentialTestFailed", [ res.msg ]);

                // The answer lands at the end of a body that scrolls, while the
                // button that asked for it is in the footer. Without this it can
                // arrive off screen, which reads as nothing having happened.
                this.$nextTick(() => {
                    (this.$refs.testResult as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" });
                });
            });
        },
    },
};
</script>
