<template>
    <div class="configuration-transfer tw-my-4">
        <div v-if="!$root.info.isAdmin" class="configuration-callout configuration-callout--warning">
            <strong>{{ $t("configurationTransferAdminOnlyTitle") }}</strong>
            <p class="tw-mb-0">{{ $t("configurationTransferAdminOnlyBody") }}</p>
        </div>

        <template v-else>
            <div class="configuration-callout">
                <strong>{{ $t("configurationTransferScopeTitle") }}</strong>
                <p>{{ $t("configurationTransferScopeBody") }}</p>
                <p class="tw-mb-0">{{ $t("configurationTransferSensitive") }}</p>
            </div>

            <section class="configuration-section" aria-labelledby="configuration-export-title">
                <div class="configuration-section__heading">
                    <div>
                        <h5 id="configuration-export-title" class="settings-subheading tw-mb-1">
                            {{ $t("configurationExportTitle") }}
                        </h5>
                        <p class="configuration-section__description tw-mb-0">
                            {{ $t("configurationExportBody") }}
                        </p>
                    </div>
                    <font-awesome-icon icon="download" class="configuration-section__icon" />
                </div>

                <form class="configuration-action" autocomplete="off" @submit.prevent="exportConfiguration">
                    <div class="configuration-action__field">
                        <label for="configuration-export-password" class="gizmo-field-label">
                            {{ $t("Current Password") }}
                        </label>
                        <input
                            id="configuration-export-password"
                            v-model="exportPassword"
                            class="gizmo-native-control"
                            type="password"
                            autocomplete="current-password"
                            required
                        />
                    </div>
                    <button
                        class="gizmo-native-button gizmo-native-button--primary configuration-action__button"
                        type="submit"
                        :disabled="exporting || !exportPassword"
                    >
                        <font-awesome-icon icon="download" />
                        {{ exporting ? $t("configurationExporting") : $t("configurationExportAction") }}
                    </button>
                </form>
            </section>

            <section
                class="configuration-section configuration-section--danger"
                aria-labelledby="configuration-import-title"
            >
                <div class="configuration-section__heading">
                    <div>
                        <h5 id="configuration-import-title" class="settings-subheading tw-mb-1">
                            {{ $t("configurationImportTitle") }}
                        </h5>
                        <p class="configuration-section__description tw-mb-0">
                            {{ $t("configurationImportBody") }}
                        </p>
                    </div>
                    <font-awesome-icon icon="upload" class="configuration-section__icon" />
                </div>

                <ul class="configuration-exclusions">
                    <li>{{ $t("configurationImportKeepsIdentity") }}</li>
                    <li>{{ $t("configurationImportClearsHistory") }}</li>
                    <li>{{ $t("configurationImportNextStart") }}</li>
                </ul>

                <form class="configuration-action" autocomplete="off" @submit.prevent="confirmImport">
                    <div class="configuration-action__field">
                        <label for="configuration-import-file" class="gizmo-field-label">
                            {{ $t("configurationArchiveFile") }}
                        </label>
                        <input
                            id="configuration-import-file"
                            ref="importFile"
                            class="gizmo-native-control configuration-file"
                            type="file"
                            accept=".ugbackup,application/json,application/vnd.uptime-gizmo.configuration+json"
                            required
                            @change="selectImportFile"
                        />
                        <div v-if="selectedFile" class="gizmo-field-help">
                            {{ selectedFile.name }} · {{ formatBytes(selectedFile.size) }}
                        </div>
                    </div>
                    <div class="configuration-action__field">
                        <label for="configuration-import-password" class="gizmo-field-label">
                            {{ $t("Current Password") }}
                        </label>
                        <input
                            id="configuration-import-password"
                            v-model="importPassword"
                            class="gizmo-native-control"
                            type="password"
                            autocomplete="current-password"
                            required
                        />
                    </div>
                    <button
                        class="gizmo-native-button gizmo-native-button--danger configuration-action__button"
                        type="submit"
                        :disabled="importing || !selectedFile || !importPassword"
                    >
                        <font-awesome-icon icon="upload" />
                        {{ importing ? $t("configurationImporting") : $t("configurationImportAction") }}
                    </button>
                </form>
            </section>

            <section
                v-if="status.state !== 'none'"
                class="configuration-status"
                :class="`configuration-status--${status.state}`"
            >
                <strong>{{ statusTitle }}</strong>
                <p class="tw-mb-0">{{ statusBody }}</p>
                <dl v-if="status.summary" class="configuration-summary tw-mb-0">
                    <div>
                        <dt>{{ $t("Monitors") }}</dt>
                        <dd>{{ status.summary.monitors ?? 0 }}</dd>
                    </div>
                    <div>
                        <dt>{{ $t("Notifications") }}</dt>
                        <dd>{{ status.summary.notifications ?? 0 }}</dd>
                    </div>
                    <div>
                        <dt>{{ $t("Status Pages") }}</dt>
                        <dd>{{ status.summary.statusPages ?? 0 }}</dd>
                    </div>
                    <div>
                        <dt>{{ $t("Maintenance") }}</dt>
                        <dd>{{ status.summary.maintenances ?? 0 }}</dd>
                    </div>
                </dl>
            </section>
        </template>

        <Confirm
            ref="confirmImport"
            btn-style="btn-danger"
            :yes-text="$t('configurationImportConfirmAction')"
            :no-text="$t('Cancel')"
            @yes="importConfiguration"
        >
            <p>
                <strong>{{ $t("configurationImportConfirmTitle") }}</strong>
            </p>
            <p>{{ $t("configurationImportConfirmBody") }}</p>
            <p class="tw-mb-0">{{ $t("configurationImportConfirmRestart") }}</p>
        </Confirm>
    </div>
</template>

<script>
import Confirm from "../../components/Confirm.vue";

export default {
    components: { Confirm },

    data() {
        return {
            exportPassword: "",
            importPassword: "",
            selectedFile: null,
            exporting: false,
            importing: false,
            status: { state: "none" },
        };
    },

    computed: {
        statusTitle() {
            return this.$t(`configurationImportStatus.${this.status.state}.title`);
        },
        statusBody() {
            return this.status.message || this.$t(`configurationImportStatus.${this.status.state}.body`);
        },
    },

    mounted() {
        if (this.$root.info.isAdmin) {
            this.loadStatus();
        }
    },

    methods: {
        /**
         * Ask the authenticated socket for a one-use HTTP transfer ticket.
         * @param {"export"|"import"} purpose ticket purpose
         * @param {string} password current password
         * @returns {Promise<string>} ticket
         */
        requestTicket(purpose, password) {
            return new Promise((resolve, reject) => {
                this.$root.getSocket().emit("createConfigurationTransferTicket", purpose, password, (res) => {
                    if (res.ok) {
                        resolve(res.ticket);
                    } else {
                        reject(new Error(res.msg));
                    }
                });
            });
        },

        /**
         * Convert an HTTP failure to a concise UI message.
         * @param {Response} response fetch response
         * @returns {Promise<string>} message
         */
        async responseError(response) {
            try {
                return (await response.json()).msg || response.statusText;
            } catch (_) {
                return response.statusText || this.$t("configurationTransferFailed");
            }
        },

        /**
         * Download the configuration archive without putting its ticket in a URL.
         * @returns {Promise<void>} nothing
         */
        async exportConfiguration() {
            this.exporting = true;
            try {
                const ticket = await this.requestTicket("export", this.exportPassword);
                const response = await fetch("/api/internal/configuration-export", {
                    headers: { "X-Uptime-Gizmo-Transfer-Ticket": ticket },
                    cache: "no-store",
                });
                if (!response.ok) {
                    throw new Error(await this.responseError(response));
                }
                const blob = await response.blob();
                const disposition = response.headers.get("content-disposition") || "";
                const filename = disposition.match(/filename="([^"]+)"/)?.[1] || "uptime-gizmo-configuration.ugbackup";
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = filename;
                link.click();
                URL.revokeObjectURL(url);
                this.$root.toastSuccess(this.$t("configurationExportReady"));
            } catch (error) {
                this.$root.toastError(error.message);
            } finally {
                this.exportPassword = "";
                this.exporting = false;
            }
        },

        /**
         * Store the selected browser File object.
         * @param {Event} event file input event
         * @returns {void}
         */
        selectImportFile(event) {
            this.selectedFile = event.target.files?.[0] || null;
        },

        /**
         * Open the destructive replace confirmation.
         * @returns {void}
         */
        confirmImport() {
            if (this.selectedFile && this.importPassword) {
                this.$refs.confirmImport.show();
            }
        },

        /**
         * Validate and stage an archive; database replacement waits for restart.
         * @returns {Promise<void>} nothing
         */
        async importConfiguration() {
            this.importing = true;
            try {
                const ticket = await this.requestTicket("import", this.importPassword);
                const response = await fetch("/api/internal/configuration-import", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/octet-stream",
                        "X-Uptime-Gizmo-Transfer-Ticket": ticket,
                    },
                    body: this.selectedFile,
                    cache: "no-store",
                });
                const result = await response.json();
                if (!response.ok || !result.ok) {
                    throw new Error(result.msg || response.statusText);
                }
                this.status = result;
                this.$root.toastSuccess(this.$t("configurationImportStaged"));
                this.importPassword = "";
                this.selectedFile = null;
                this.$refs.importFile.value = "";
            } catch (error) {
                this.$root.toastError(error.message);
            } finally {
                this.importPassword = "";
                this.importing = false;
            }
        },

        /**
         * Refresh the non-secret staged/applied status.
         * @returns {void}
         */
        loadStatus() {
            this.$root.getSocket().emit("getConfigurationImportStatus", (res) => {
                if (res.ok) {
                    this.status = res.data;
                }
            });
        },

        /**
         * Format a file size for the selected-file summary.
         * @param {number} bytes byte count
         * @returns {string} display size
         */
        formatBytes(bytes) {
            if (bytes < 1024 * 1024) {
                return `${Math.max(1, Math.round(bytes / 1024))} KB`;
            }
            return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
        },
    },
};
</script>

<style lang="scss" scoped>
.configuration-transfer {
    display: grid;
    gap: 1rem;
    max-width: 52rem;
}

.configuration-callout,
.configuration-status {
    padding: 1rem 1.125rem;
    border: 1px solid var(--color-border);
    border-inline-start: 0.25rem solid var(--color-interactive);
    border-radius: var(--radius-md);
    background: var(--color-surface-subtle);
}

.configuration-callout p {
    margin-top: 0.35rem;
}

.configuration-callout--warning,
.configuration-status--pending {
    border-inline-start-color: var(--status-degraded);
}

.configuration-section {
    padding: 1.25rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
}

.configuration-section--danger {
    border-color: var(--status-down-border);
}

.configuration-section__heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
}

.configuration-section__description {
    color: var(--color-text-muted);
}

.configuration-section__icon {
    margin-top: 0.15rem;
    color: var(--color-interactive);
    font-size: 1.15rem;
}

.configuration-section--danger .configuration-section__icon {
    color: var(--status-down);
}

.configuration-action {
    display: grid;
    grid-template-columns: minmax(14rem, 1fr) auto;
    align-items: end;
    gap: 0.75rem;
    margin-top: 1rem;
}

.configuration-section--danger .configuration-action {
    grid-template-columns: minmax(14rem, 1fr) minmax(14rem, 1fr) auto;
}

.configuration-action__field {
    min-width: 0;
}

.configuration-action__button {
    min-height: 2.5rem;
    white-space: nowrap;
}

.configuration-file {
    padding: 0.35rem;
}

.configuration-exclusions {
    margin: 1rem 0 0;
    padding-inline-start: 1.2rem;
    color: var(--color-text-muted);
}

.configuration-status--applied {
    border-inline-start-color: var(--status-up);
}

.configuration-status--failed {
    border-inline-start-color: var(--status-down);
}

.configuration-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 0.85rem;
}

.configuration-summary div {
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
}

.configuration-summary dt {
    color: var(--color-text-muted);
    font-size: 0.78rem;
}

.configuration-summary dd {
    margin: 0.2rem 0 0;
    font-family: "IBM Plex Mono", "Noto Sans Mono", monospace;
    font-size: 1rem;
    font-weight: 600;
}

@media (max-width: 900px) {
    .configuration-action,
    .configuration-section--danger .configuration-action,
    .configuration-summary {
        grid-template-columns: 1fr;
    }

    .configuration-action__button {
        width: 100%;
    }
}
</style>
