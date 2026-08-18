<template>
    <GizmoDialog
        :open="open"
        size="md"
        :title="$t('Setup Docker Host')"
        :close-label="$t('Close')"
        :close-disabled="processing"
        :close-on-backdrop="false"
        :close-on-escape="!processing"
        @update:open="setOpen"
    >
        <form id="docker-host-form" class="gizmo-form-stack" @submit.prevent="submit">
            <div>
                <label for="docker-name" class="form-label">{{ $t("Friendly Name") }}</label>
                <input
                    id="docker-name"
                    v-model="dockerHost.name"
                    type="text"
                    class="form-control"
                    required
                    autofocus
                />
            </div>

            <div>
                <label for="docker-type" class="form-label">{{ $t("Connection Type") }}</label>
                <select id="docker-type" v-model="dockerHost.dockerType" class="form-select">
                    <option v-for="type in connectionTypes" :key="type" :value="type">
                        {{ $t(type) }}
                    </option>
                </select>
            </div>

            <div>
                <label for="docker-daemon" class="form-label">{{ $t("Docker Daemon") }}</label>
                <input
                    id="docker-daemon"
                    v-model="dockerHost.dockerDaemon"
                    type="text"
                    class="form-control"
                    required
                />
                <i18n-t tag="div" keypath="Examples:" class="form-text">
                    <ul>
                        <li><code>/var/run/docker.sock</code></li>
                        <li><code>http://localhost:2375</code></li>
                        <li><code>https://localhost:2376 (TLS)</code></li>
                    </ul>
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
            <GizmoButton form="docker-host-form" type="submit" :loading="processing">
                {{ $t("Save") }}
            </GizmoButton>
        </template>
    </GizmoDialog>

    <Confirm
        ref="confirmDelete"
        btn-style="btn-danger"
        :yes-text="$t('Yes')"
        :no-text="$t('No')"
        @yes="deleteDockerHost"
    >
        {{ $t("deleteDockerHostMsg") }}
    </Confirm>
</template>

<script lang="ts">
import Confirm from "./Confirm.vue";
import GizmoButton from "./gizmo/GizmoButton.vue";
import GizmoDialog from "./gizmo/GizmoDialog.vue";

interface DockerHostDraft {
    dockerDaemon: string;
    dockerType: string;
    id?: number;
    name: string;
}

interface SocketResult {
    id?: number;
    msg: string;
    ok: boolean;
}

interface DockerHostRoot {
    dockerHostList: DockerHostDraft[];
    getSocket: () => {
        emit: (event: string, ...args: unknown[]) => void;
    };
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
    },
    emits: ["added", "deleted"],
    data() {
        return {
            open: false,
            processing: false,
            id: null as number | null,
            connectionTypes: ["socket", "tcp"],
            dockerHost: {
                name: "",
                dockerDaemon: "",
                dockerType: "",
            } as DockerHostDraft,
        };
    },
    methods: {
        setOpen(open: boolean) {
            this.open = open;
        },
        deleteConfirm() {
            (this.$refs.confirmDelete as ConfirmDialogRef).show();
        },
        show(dockerHostID?: number) {
            if (this.processing) {
                return;
            }
            if (dockerHostID) {
                const root = this.$root as unknown as DockerHostRoot;
                const dockerHost = root.dockerHostList.find((item) => item.id === dockerHostID);
                if (!dockerHost) {
                    root.toastError("Docker Host not found!");
                    return;
                }
                this.id = dockerHostID;
                this.dockerHost = { ...dockerHost };
            } else {
                this.id = null;
                this.dockerHost = {
                    name: "",
                    dockerType: "socket",
                    dockerDaemon: "/var/run/docker.sock",
                };
            }
            this.open = true;
        },
        submit() {
            if (this.processing) {
                return;
            }
            this.processing = true;
            const root = this.$root as unknown as DockerHostRoot;
            root.getSocket().emit("addDockerHost", this.dockerHost, this.id, (res: SocketResult) => {
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
        test() {
            if (this.processing) {
                return;
            }
            this.processing = true;
            const root = this.$root as unknown as DockerHostRoot;
            root.getSocket().emit("testDockerHost", this.dockerHost, (res: SocketResult) => {
                root.toastRes(res);
                this.processing = false;
            });
        },
        deleteDockerHost() {
            if (this.processing) {
                return;
            }
            this.processing = true;
            const root = this.$root as unknown as DockerHostRoot;
            root.getSocket().emit("deleteDockerHost", this.id, (res: SocketResult) => {
                root.toastRes(res);
                this.processing = false;
                if (res.ok) {
                    this.$emit("deleted", this.id);
                    this.open = false;
                }
            });
        },
    },
};
</script>
