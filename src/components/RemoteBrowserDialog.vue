<template>
    <GizmoDialog
        :open="open"
        size="md"
        :title="$t('Add a Remote Browser')"
        :close-label="$t('Close')"
        :close-disabled="processing"
        :close-on-backdrop="false"
        :close-on-escape="!processing"
        @update:open="setOpen"
    >
        <form id="remote-browser-form" class="gizmo-form-stack" @submit.prevent="submit">
            <div>
                <label for="remote-browser-name" class="gizmo-field-label">{{ $t("Friendly Name") }}</label>
                <input
                    id="remote-browser-name"
                    v-model="remoteBrowser.name"
                    type="text"
                    class="gizmo-native-control"
                    required
                    autofocus
                />
            </div>

            <div>
                <label for="remote-browser-url" class="gizmo-field-label">{{ $t("URL") }}</label>
                <input
                    id="remote-browser-url"
                    v-model="remoteBrowser.url"
                    type="text"
                    class="gizmo-native-control"
                    required
                />
                <i18n-t tag="div" keypath="Example:" class="gizmo-field-help tw-mt-3">
                    <code>ws://chrome.browserless.io/playwright?token=YOUR-API-TOKEN</code>
                </i18n-t>
            </div>
        </form>

        <template #footer>
            <GizmoButton
                v-if="id"
                class="gizmo-dialog__leading-action"
                variant="danger"
                :disabled="processing"
                @click="deleteConfirm"
            >
                {{ $t("Delete") }}
            </GizmoButton>
            <GizmoButton variant="secondary" :disabled="processing" @click="test">
                {{ $t("Test") }}
            </GizmoButton>
            <GizmoButton form="remote-browser-form" type="submit" :loading="processing">
                {{ $t("Save") }}
            </GizmoButton>
        </template>
    </GizmoDialog>

    <Confirm
        ref="confirmDelete"
        btn-style="btn-danger"
        :yes-text="$t('Yes')"
        :no-text="$t('No')"
        @yes="deleteRemoteBrowser"
    >
        {{ $t("deleteRemoteBrowserMessage") }}
    </Confirm>
</template>

<script>
import Confirm from "./Confirm.vue";
import GizmoButton from "./gizmo/GizmoButton.vue";
import GizmoDialog from "./gizmo/GizmoDialog.vue";

export default {
    components: {
        Confirm,
        GizmoButton,
        GizmoDialog,
    },
    emits: ["added"],
    data() {
        return {
            open: false,
            processing: false,
            id: null,
            remoteBrowser: {
                name: "",
                url: "",
            },
        };
    },
    methods: {
        setOpen(open) {
            this.open = open;
        },
        deleteConfirm() {
            this.$refs.confirmDelete.show();
        },
        show(remoteBrowserID) {
            if (this.processing) {
                return;
            }
            if (remoteBrowserID) {
                const remoteBrowser = this.$root.remoteBrowserList.find((item) => item.id === remoteBrowserID);
                if (!remoteBrowser) {
                    this.$root.toastError(this.$t("Remote Browser not found!"));
                    return;
                }
                this.id = remoteBrowserID;
                this.remoteBrowser = { ...remoteBrowser };
            } else {
                this.id = null;
                this.remoteBrowser = { name: "", url: "" };
            }
            this.open = true;
        },
        submit() {
            if (this.processing) {
                return;
            }
            this.processing = true;
            this.$root.getSocket().emit("addRemoteBrowser", this.remoteBrowser, this.id, (res) => {
                this.$root.toastRes(res);
                this.processing = false;
                if (res.ok) {
                    this.open = false;
                    if (!this.id) {
                        this.$emit("added", res.id);
                    }
                }
            });
        },
        test() {
            if (this.processing) {
                return;
            }
            this.processing = true;
            this.$root.getSocket().emit("testRemoteBrowser", this.remoteBrowser, (res) => {
                this.$root.toastRes(res);
                this.processing = false;
            });
        },
        deleteRemoteBrowser() {
            if (this.processing) {
                return;
            }
            this.processing = true;
            this.$root.getSocket().emit("deleteRemoteBrowser", this.id, (res) => {
                this.$root.toastRes(res);
                this.processing = false;
                if (res.ok) {
                    this.open = false;
                }
            });
        },
    },
};
</script>
