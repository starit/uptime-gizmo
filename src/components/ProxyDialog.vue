<template>
    <GizmoDialog
        :open="open"
        size="md"
        :title="$t('Setup Proxy')"
        :close-label="$t('Close')"
        :close-disabled="processing"
        :close-on-backdrop="false"
        :close-on-escape="!processing"
        @update:open="setOpen"
    >
        <form id="proxy-settings-form" class="gizmo-form-stack" @submit.prevent="submit">
            <div>
                <label for="proxy-protocol" class="form-label">{{ $t("Proxy Protocol") }}</label>
                <select id="proxy-protocol" v-model="proxy.protocol" class="form-select" autofocus>
                    <option value="https">HTTPS</option>
                    <option value="http">HTTP</option>
                    <option value="socks">SOCKS</option>
                    <option value="socks5">SOCKS v5</option>
                    <option value="socks5h">SOCKS v5 (+DNS)</option>
                    <option value="socks4">SOCKS v4</option>
                </select>
            </div>

            <div>
                <label for="proxy-host" class="form-label">{{ $t("Proxy Server") }}</label>
                <div class="gizmo-dialog-address-row">
                    <input
                        id="proxy-host"
                        v-model="proxy.host"
                        type="text"
                        class="form-control"
                        required
                        :placeholder="$t('Server Address')"
                    />
                    <input
                        id="proxy-port"
                        v-model="proxy.port"
                        type="number"
                        class="form-control"
                        required
                        min="1"
                        max="65535"
                        :aria-label="$t('Port')"
                        :placeholder="$t('Port')"
                    />
                </div>
            </div>

            <div class="form-check form-switch">
                <input id="mark-auth" v-model="proxy.auth" class="form-check-input" type="checkbox" />
                <label for="mark-auth" class="form-check-label">
                    {{ $t("Proxy server has authentication") }}
                </label>
            </div>

            <div v-if="proxy.auth">
                <label for="proxy-username" class="form-label">{{ $t("User") }}</label>
                <input id="proxy-username" v-model="proxy.username" type="text" class="form-control" required />
            </div>

            <div v-if="proxy.auth">
                <label for="proxy-password" class="form-label">{{ $t("Password") }}</label>
                <input
                    id="proxy-password"
                    v-model="proxy.password"
                    type="password"
                    class="form-control"
                    required
                />
            </div>

            <div class="gizmo-form-stack gizmo-dialog-section">
                <div>
                    <div class="form-check form-switch">
                        <input id="mark-active" v-model="proxy.active" class="form-check-input" type="checkbox" />
                        <label for="mark-active" class="form-check-label">{{ $t("enabled") }}</label>
                    </div>
                    <div class="form-text">{{ $t("enableProxyDescription") }}</div>
                </div>

                <div>
                    <div class="form-check form-switch">
                        <input id="mark-default" v-model="proxy.default" class="form-check-input" type="checkbox" />
                        <label for="mark-default" class="form-check-label">{{ $t("setAsDefault") }}</label>
                    </div>
                    <div class="form-text">{{ $t("setAsDefaultProxyDescription") }}</div>
                </div>

                <div class="form-check form-switch">
                    <input
                        id="apply-existing"
                        v-model="proxy.applyExisting"
                        class="form-check-input"
                        type="checkbox"
                    />
                    <label class="form-check-label" for="apply-existing">
                        {{ $t("Apply on all existing monitors") }}
                    </label>
                </div>
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
            <GizmoButton form="proxy-settings-form" type="submit" :loading="processing">
                {{ $t("Save") }}
            </GizmoButton>
        </template>
    </GizmoDialog>

    <Confirm ref="confirmDelete" btn-style="btn-danger" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="deleteProxy">
        {{ $t("deleteProxyMsg") }}
    </Confirm>
</template>

<script lang="ts">
import Confirm from "./Confirm.vue";
import GizmoButton from "./gizmo/GizmoButton.vue";
import GizmoDialog from "./gizmo/GizmoDialog.vue";

interface ProxyDraft {
    active: boolean;
    applyExisting: boolean;
    auth: boolean;
    default: boolean;
    host: string | null;
    id?: number;
    password: string | null;
    port: number | null;
    protocol: string;
    username: string | null;
}

interface SocketResult {
    id?: number;
    msg: string;
    ok: boolean;
}

interface ProxyRoot {
    getSocket: () => { emit: (event: string, ...args: unknown[]) => void };
    proxyList: ProxyDraft[];
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
    },
    emits: ["added"],
    data() {
        return {
            open: false,
            processing: false,
            id: null as number | null,
            proxy: {
                protocol: "https",
                host: null,
                port: null,
                auth: false,
                username: null,
                password: null,
                active: true,
                default: false,
                applyExisting: false,
            } as ProxyDraft,
        };
    },
    methods: {
        setOpen(open: boolean) {
            this.open = open;
        },
        deleteConfirm() {
            (this.$refs.confirmDelete as ConfirmDialogRef).show();
        },
        show(proxyID?: number) {
            if (this.processing) {
                return;
            }
            if (proxyID) {
                const root = this.$root as unknown as ProxyRoot;
                const proxy = root.proxyList.find((item) => item.id === proxyID);
                if (!proxy) {
                    return;
                }
                this.id = proxyID;
                this.proxy = { ...proxy };
            } else {
                this.id = null;
                this.proxy = this.createProxyDraft();
            }
            this.open = true;
        },
        showClone(proxyID: number) {
            if (this.processing) {
                return;
            }
            const root = this.$root as unknown as ProxyRoot;
            const proxy = root.proxyList.find((item) => item.id === proxyID);
            if (!proxy) {
                return;
            }
            this.id = null;
            this.proxy = {
                protocol: proxy.protocol,
                host: proxy.host,
                port: proxy.port,
                auth: proxy.auth,
                username: proxy.username,
                password: proxy.password,
                active: proxy.active,
                default: false,
                applyExisting: false,
            };
            this.open = true;
        },
        createProxyDraft(): ProxyDraft {
            return {
                protocol: "https",
                host: null,
                port: null,
                auth: false,
                username: null,
                password: null,
                active: true,
                default: false,
                applyExisting: false,
            };
        },
        submit() {
            if (this.processing) {
                return;
            }
            this.processing = true;
            const root = this.$root as unknown as ProxyRoot;
            root.getSocket().emit("addProxy", this.proxy, this.id, (res: SocketResult) => {
                root.toastRes(res);
                this.processing = false;
                if (res.ok) {
                    this.open = false;
                    if (!this.id) {
                        this.$emit("added", res.id);
                    }
                }
            });
        },
        deleteProxy() {
            if (this.processing) {
                return;
            }
            this.processing = true;
            const root = this.$root as unknown as ProxyRoot;
            root.getSocket().emit("deleteProxy", this.id, (res: SocketResult) => {
                root.toastRes(res);
                this.processing = false;
                if (res.ok) {
                    this.open = false;
                }
            });
        },
    },
};
</script>
