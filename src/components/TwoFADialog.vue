<template>
    <GizmoDialog
        :open="open"
        size="md"
        :title="dialogTitle"
        :close-label="$t('Close')"
        :close-disabled="processing"
        :close-on-backdrop="false"
        :close-on-escape="!processing"
        @update:open="setOpen"
    >
        <form id="two-factor-form" class="gizmo-form-stack" @submit.prevent="confirmEnableTwoFA">
            <div v-if="uri && !twoFAStatus" class="gizmo-two-factor-setup">
                <vue-qrcode :key="uri" :value="uri" type="image/png" :quality="1" />
                <GizmoButton
                    v-if="!showURI"
                    variant="outline"
                    size="sm"
                    @click="showURI = true"
                >
                    {{ $t("Show URI") }}
                </GizmoButton>
            </div>

            <p v-if="showURI && !twoFAStatus" class="gizmo-dialog-break-text">{{ uri }}</p>

            <div v-if="!(uri && !twoFAStatus)">
                <label for="current-password" class="gizmo-field-label">{{ $t("Current Password") }}</label>
                <input
                    id="current-password"
                    v-model="currentPassword"
                    type="password"
                    class="gizmo-native-control"
                    autocomplete="current-password"
                    required
                    autofocus
                />
            </div>

            <div v-if="uri && !twoFAStatus">
                <label for="two-factor-token" class="gizmo-field-label">{{ $t("twoFAVerifyLabel") }}</label>
                <div class="gizmo-dialog-field-row">
                    <input
                        id="two-factor-token"
                        v-model.trim="token"
                        type="text"
                        inputmode="numeric"
                        maxlength="6"
                        class="gizmo-native-control gizmo-dialog-field-row__primary"
                        autocomplete="one-time-code"
                        required
                    />
                    <GizmoButton variant="outline" :disabled="processing || token.length !== 6" @click="verifyToken">
                        {{ $t("Verify Token") }}
                    </GizmoButton>
                </div>
                <p v-if="tokenValid" class="gizmo-dialog-success-copy">
                    {{ $t("tokenValidSettingsMsg") }}
                </p>
            </div>

            <div v-if="!uri && twoFAStatus === false">
                <GizmoButton :loading="processing" @click="prepare2FA">
                    {{ $t("Enable 2FA") }}
                </GizmoButton>
            </div>

            <div v-if="twoFAStatus === true">
                <GizmoButton variant="danger" :disabled="processing" @click="confirmDisableTwoFA">
                    {{ $t("Disable 2FA") }}
                </GizmoButton>
            </div>
        </form>

        <template v-if="uri && !twoFAStatus" #footer>
            <GizmoButton
                form="two-factor-form"
                type="submit"
                :loading="processing"
                :disabled="!tokenValid"
            >
                {{ $t("Save") }}
            </GizmoButton>
        </template>
    </GizmoDialog>

    <Confirm
        ref="confirmEnableTwoFA"
        btn-style="btn-danger"
        :yes-text="$t('Yes')"
        :no-text="$t('No')"
        @yes="save2FA"
    >
        {{ $t("confirmEnableTwoFAMsg") }}
    </Confirm>

    <Confirm
        ref="confirmDisableTwoFA"
        btn-style="btn-danger"
        :yes-text="$t('Yes')"
        :no-text="$t('No')"
        @yes="disable2FA"
    >
        {{ $t("confirmDisableTwoFAMsg") }}
    </Confirm>
</template>

<script lang="ts">
import Confirm from "./Confirm.vue";
import GizmoButton from "./gizmo/GizmoButton.vue";
import GizmoDialog from "./gizmo/GizmoDialog.vue";
import VueQrcode from "vue-qrcode";

interface SocketResult {
    msg: string;
    ok: boolean;
    status?: boolean;
    uri?: string;
    valid?: boolean;
}

interface TwoFARoot {
    getSocket: () => { emit: (event: string, ...args: unknown[]) => void };
    toastError: (message: string) => void;
    toastRes: (result: SocketResult) => void;
}

interface ConfirmDialogRef {
    show: () => void;
}

export default {
    components: {
        Confirm,
        GizmoButton,
        GizmoDialog,
        VueQrcode,
    },
    data() {
        return {
            open: false,
            currentPassword: "",
            processing: false,
            uri: null as string | null,
            tokenValid: false,
            twoFAStatus: null as boolean | null,
            token: "",
            showURI: false,
        };
    },
    computed: {
        dialogTitle() {
            const status = this.twoFAStatus === true ? this.$t("Active") : this.$t("Inactive");
            return `${this.$t("Setup 2FA")} · ${status}`;
        },
    },
    mounted() {
        this.getStatus();
    },
    methods: {
        setOpen(open: boolean) {
            this.open = open;
        },
        show() {
            this.currentPassword = "";
            this.uri = null;
            this.token = "";
            this.tokenValid = false;
            this.showURI = false;
            this.processing = false;
            this.getStatus();
            this.open = true;
        },
        confirmEnableTwoFA() {
            if (this.tokenValid && !this.processing) {
                (this.$refs.confirmEnableTwoFA as ConfirmDialogRef).show();
            }
        },
        confirmDisableTwoFA() {
            if (!this.processing) {
                (this.$refs.confirmDisableTwoFA as ConfirmDialogRef).show();
            }
        },
        prepare2FA() {
            if (this.processing) {
                return;
            }
            this.processing = true;
            const root = this.$root as unknown as TwoFARoot;
            root.getSocket().emit("prepare2FA", this.currentPassword, (res: SocketResult) => {
                this.processing = false;
                if (res.ok) {
                    this.uri = res.uri ?? null;
                    this.token = "";
                    this.tokenValid = false;
                } else {
                    root.toastError(res.msg);
                }
            });
        },
        save2FA() {
            if (this.processing) {
                return;
            }
            this.processing = true;
            const root = this.$root as unknown as TwoFARoot;
            root.getSocket().emit("save2FA", this.currentPassword, (res: SocketResult) => {
                this.processing = false;
                if (res.ok) {
                    root.toastRes(res);
                    this.currentPassword = "";
                    this.uri = null;
                    this.getStatus();
                    this.open = false;
                } else {
                    root.toastError(res.msg);
                }
            });
        },
        disable2FA() {
            if (this.processing) {
                return;
            }
            this.processing = true;
            const root = this.$root as unknown as TwoFARoot;
            root.getSocket().emit("disable2FA", this.currentPassword, (res: SocketResult) => {
                this.processing = false;
                if (res.ok) {
                    root.toastRes(res);
                    this.currentPassword = "";
                    this.uri = null;
                    this.getStatus();
                    this.open = false;
                } else {
                    root.toastError(res.msg);
                }
            });
        },
        verifyToken() {
            if (this.processing || this.token.length !== 6) {
                return;
            }
            this.processing = true;
            const root = this.$root as unknown as TwoFARoot;
            root.getSocket().emit("verifyToken", this.token, this.currentPassword, (res: SocketResult) => {
                this.processing = false;
                if (res.ok) {
                    this.tokenValid = Boolean(res.valid);
                } else {
                    root.toastError(res.msg);
                }
            });
        },
        getStatus() {
            const root = this.$root as unknown as TwoFARoot;
            root.getSocket().emit("twoFAStatus", (res: SocketResult) => {
                if (res.ok) {
                    this.twoFAStatus = Boolean(res.status);
                } else {
                    root.toastError(res.msg);
                }
            });
        },
    },
};
</script>
