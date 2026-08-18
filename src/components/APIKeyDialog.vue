<template>
    <GizmoDialog
        :open="addOpen"
        size="md"
        :title="$t('Add API Key')"
        :close-label="$t('Close')"
        :close-disabled="processing"
        :close-on-backdrop="false"
        :close-on-escape="!processing"
        @update:open="setAddOpen"
    >
        <form id="api-key-create-form" class="gizmo-form-stack" @submit.prevent="submit">
            <div>
                <label for="api-key-name" class="form-label">{{ $t("Name") }}</label>
                <input id="api-key-name" v-model="key.name" type="text" class="form-control" required autofocus />
            </div>

            <div>
                <label class="form-label">{{ $t("Expiry date") }}</label>
                <div class="gizmo-dialog-field-row">
                    <Datepicker
                        v-model="key.expires"
                        class="gizmo-dialog-field-row__primary"
                        :dark="isDark"
                        :month-change-on-scroll="false"
                        :min-date="minDate"
                        format="yyyy-MM-dd HH:mm"
                        model-type="yyyy-MM-dd HH:mm:ss"
                        :required="!noExpire"
                        :disabled="noExpire"
                    />
                    <div class="form-check mb-0">
                        <input id="api-key-no-expire" v-model="noExpire" class="form-check-input" type="checkbox" />
                        <label class="form-check-label" for="api-key-no-expire">{{ $t("Don't expire") }}</label>
                    </div>
                </div>
            </div>
        </form>
        <template #footer>
            <GizmoButton
                id="api-key-submit-btn"
                form="api-key-create-form"
                type="submit"
                :loading="processing"
            >
                {{ $t("Generate") }}
            </GizmoButton>
        </template>
    </GizmoDialog>

    <GizmoDialog
        :open="keyOpen"
        size="md"
        :title="$t('Key Added')"
        :close-label="$t('Close')"
        :close-on-backdrop="false"
        @update:open="setKeyOpen"
    >
        <div class="gizmo-form-stack">
            <p class="gizmo-dialog-copy">
                {{ $t("apiKeyAddedMsg") }}
            </p>
            <CopyableInput v-model="clearKey" disabled="disabled" />
        </div>
        <template #footer>
            <GizmoButton autofocus @click="setKeyOpen(false)">
                {{ $t("Continue") }}
            </GizmoButton>
        </template>
    </GizmoDialog>
</template>

<script lang="ts">
import dayjs from "dayjs";
import Datepicker from "@vuepic/vue-datepicker";
import CopyableInput from "./CopyableInput.vue";
import GizmoButton from "./gizmo/GizmoButton.vue";
import GizmoDialog from "./gizmo/GizmoDialog.vue";

interface ApiKeyDraft {
    active: number;
    expires: string | null;
    name: string;
}

interface ApiKeyResult {
    key: string;
    msg: string;
    ok: boolean;
}

interface ApiKeyRoot {
    addAPIKey: (key: ApiKeyDraft, callback: (result: ApiKeyResult) => void) => void;
    date: (value: unknown) => string;
    isDark: boolean;
    toastError: (message: string) => void;
}

export default {
    components: {
        CopyableInput,
        Datepicker,
        GizmoButton,
        GizmoDialog,
    },
    data() {
        const root = this.$root as unknown as ApiKeyRoot;
        return {
            addOpen: false,
            keyOpen: false,
            processing: false,
            key: {} as ApiKeyDraft,
            minDate: root.date(dayjs()) + " 00:00",
            clearKey: "",
            noExpire: false,
        };
    },
    computed: {
        isDark() {
            return (this.$root as unknown as ApiKeyRoot).isDark;
        },
    },
    methods: {
        /**
         * Show the API key creation dialog.
         * @returns {void}
         */
        show() {
            if (this.processing) {
                return;
            }
            this.clearForm();
            this.addOpen = true;
        },

        /**
         * Synchronize the create dialog's controlled state.
         * @param {boolean} open Next open state
         * @returns {void}
         */
        setAddOpen(open: boolean) {
            this.addOpen = open;
        },

        /**
         * Synchronize the generated-key dialog's controlled state.
         * @param {boolean} open Next open state
         * @returns {void}
         */
        setKeyOpen(open: boolean) {
            this.keyOpen = open;
        },

        /**
         * Submit data to the server.
         * @returns {void}
         */
        submit() {
            if (this.processing) {
                return;
            }

            this.processing = true;
            if (this.noExpire) {
                this.key.expires = null;
            }

            const root = this.$root as unknown as ApiKeyRoot;
            root.addAPIKey(this.key, (res: ApiKeyResult) => {
                this.processing = false;
                if (res.ok) {
                    this.addOpen = false;
                    this.clearKey = res.key;
                    this.keyOpen = true;
                    this.clearForm();
                } else {
                    root.toastError(res.msg);
                }
            });
        },

        /**
         * Reset form inputs.
         * @returns {void}
         */
        clearForm() {
            this.key = {
                name: "",
                expires: this.minDate,
                active: 1,
            };
            this.noExpire = false;
        },
    },
};
</script>
