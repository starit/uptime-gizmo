<template>
    <GizmoDialog
        :open="open"
        size="md"
        :title="$t('Setup Web3 Network')"
        :close-label="$t('Close')"
        :close-disabled="processing"
        :close-on-backdrop="false"
        :close-on-escape="!processing"
        @update:open="setOpen"
    >
        <form id="web3-network-form" class="gizmo-form-stack" @submit.prevent="submit">
            <div>
                <label for="web3-name" class="gizmo-field-label">{{ $t("Friendly Name") }}</label>
                <input id="web3-name" v-model="network.name" type="text" class="gizmo-native-control" required autofocus />
            </div>

            <div>
                <label for="web3-rpc-url" class="gizmo-field-label">{{ $t("RPC URL") }}</label>
                <HiddenInput id="web3-rpc-url" v-model="network.rpcUrl" autocomplete="off" required />
                <div class="gizmo-field-help">{{ $t("web3RpcUrlHelp") }}</div>
            </div>

            <div v-if="network.chainId">
                <span class="gizmo-field-label">{{ $t("Chain ID") }}</span>
                <div class="gizmo-field-help">{{ $t("web3ChainIdHelp", [ network.chainId ]) }}</div>
            </div>

            <div class="gizmo-native-check">
                <input id="web3-active" v-model="network.active" class="gizmo-native-check__input" type="checkbox" />
                <label class="gizmo-native-check__label" for="web3-active">{{ $t("Active") }}</label>
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
            <GizmoButton variant="secondary" :disabled="processing" @click="setOpen(false)">
                {{ $t("Cancel") }}
            </GizmoButton>
            <GizmoButton variant="primary" type="submit" form="web3-network-form" :disabled="processing">
                {{ processing ? $t("Saving...") : $t("Save") }}
            </GizmoButton>
        </template>
    </GizmoDialog>

    <Confirm ref="confirmDelete" btn-style="btn-danger" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="deleteNetwork">
        {{ $t("deleteWeb3NetworkMsg") }}
    </Confirm>
</template>

<script>
import Confirm from "./Confirm.vue";
import GizmoButton from "./gizmo/GizmoButton.vue";
import GizmoDialog from "./gizmo/GizmoDialog.vue";
import HiddenInput from "./HiddenInput.vue";

export default {
    components: {
        Confirm,
        GizmoButton,
        GizmoDialog,
        HiddenInput,
    },
    emits: [ "saved" ],
    data() {
        return {
            open: false,
            processing: false,
            id: null,
            network: this.blank(),
        };
    },
    methods: {
        /**
         * An unsaved network.
         * @returns {object} default values for the form
         */
        blank() {
            return { name: "", rpcUrl: "", chainId: "", active: true };
        },

        /**
         * Open the dialog, loading an existing network when given one.
         * @param {number} id network to edit, or undefined to create
         * @returns {void}
         */
        show(id) {
            this.id = id ?? null;
            this.network = this.blank();

            if (this.id) {
                /*
                 * Fetched rather than taken from the list in memory: the list
                 * deliberately carries no RPC URL, because the URL is the
                 * credential. The form is the one place it is needed.
                 */
                this.$root.getSocket().emit("getWeb3Network", this.id, (res) => {
                    if (res.ok) {
                        this.network = res.network;
                    } else {
                        this.$root.toastError(res.msg);
                    }
                });
            }

            this.open = true;
        },

        /**
         * Track the dialog's controlled open state.
         * @param {boolean} open next state
         * @returns {void}
         */
        setOpen(open) {
            this.open = open;
            if (!open) {
                this.processing = false;
            }
        },

        /**
         * Save the network.
         * @returns {void}
         */
        submit() {
            this.processing = true;
            this.$root.getSocket().emit("addWeb3Network", this.network, this.id, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
                if (res.ok) {
                    this.$emit("saved", res.id);
                    this.setOpen(false);
                }
            });
        },

        /**
         * Ask before deleting.
         * @returns {void}
         */
        deleteConfirm() {
            this.$refs.confirmDelete.show();
        },

        /**
         * Delete the network.
         * @returns {void}
         */
        deleteNetwork() {
            this.processing = true;
            this.$root.getSocket().emit("deleteWeb3Network", this.id, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
                if (res.ok) {
                    // Monitors keep existing but lose their network, so say so
                    // rather than let them start failing unexplained.
                    if (res.affectedMonitors > 0) {
                        this.$root.toastError(this.$t("web3NetworkInUse", [ res.affectedMonitors ]));
                    }
                    this.setOpen(false);
                }
            });
        },
    },
};
</script>
