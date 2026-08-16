<template>
    <div>
        <div v-if="settings.disableAuth" class="mt-5 d-flex align-items-center justify-content-center my-3">
            {{ $t("apiKeysDisabledMsg") }}
        </div>
        <div v-else>
            <div class="add-btn">
                <button class="btn btn-primary me-2" type="button" @click="$refs.apiKeyDialog.show()">
                    <font-awesome-icon icon="plus" />
                    {{ $t("Add API Key") }}
                </button>
            </div>

            <div>
                <span
                    v-if="Object.keys(keyList).length === 0"
                    class="d-flex align-items-center justify-content-center my-3"
                >
                    {{ $t("No API Keys") }}
                </span>

                <div v-for="(item, index) in keyList" :key="index" class="item" :class="item.status">
                    <div class="left-part">
                        <div class="circle"></div>
                        <div class="info">
                            <div class="title">{{ item.name }}</div>
                            <div class="status">
                                {{ $t("apiKey-" + item.status) }}
                            </div>
                            <div class="date">{{ $t("createdAt", { date: item.createdDate }) }}</div>
                            <div class="date">
                                {{ $t("Expires") }}:
                                {{ item.expires || $t("Never") }}
                            </div>
                        </div>
                    </div>

                    <div class="buttons">
                        <div class="btn-group" role="group">
                            <button v-if="item.active" class="btn btn-normal" @click="disableDialog(item.id)">
                                <font-awesome-icon icon="pause" />
                                {{ $t("Disable") }}
                            </button>

                            <button v-if="!item.active" class="btn btn-primary" @click="enableKey(item.id)">
                                <font-awesome-icon icon="play" />
                                {{ $t("Enable") }}
                            </button>

                            <button class="btn btn-danger" @click="deleteDialog(item.id)">
                                <font-awesome-icon icon="trash" />
                                {{ $t("Delete") }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="text-center mt-3" style="font-size: 13px">
            <a href="https://github.com/louislam/uptime-kuma/wiki/Prometheus-API-Keys" target="_blank">
                {{ $t("Learn More") }}
            </a>
        </div>

        <Confirm ref="confirmPause" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="disableKey">
            {{ $t("disableAPIKeyMsg") }}
        </Confirm>

        <Confirm ref="confirmDelete" btn-style="btn-danger" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="deleteKey">
            {{ $t("deleteAPIKeyMsg") }}
        </Confirm>

        <APIKeyDialog ref="apiKeyDialog" />
    </div>
</template>

<script>
import APIKeyDialog from "../../components/APIKeyDialog.vue";
import Confirm from "../Confirm.vue";

export default {
    components: {
        APIKeyDialog,
        Confirm,
    },
    data() {
        return {
            selectedKeyID: null,
        };
    },
    computed: {
        keyList() {
            let result = Object.values(this.$root.apiKeyList);
            return result;
        },
        settings() {
            return this.$parent.$parent.$parent.settings;
        },
    },

    methods: {
        /**
         * Show dialog to confirm deletion
         * @param {number} keyID ID of monitor that is being deleted
         * @returns {void}
         */
        deleteDialog(keyID) {
            this.selectedKeyID = keyID;
            this.$refs.confirmDelete.show();
        },

        /**
         * Delete a key
         * @returns {void}
         */
        deleteKey() {
            this.$root.deleteAPIKey(this.selectedKeyID, (res) => {
                this.$root.toastRes(res);
            });
        },

        /**
         * Show dialog to confirm pause
         * @param {number} keyID ID of key to pause
         * @returns {void}
         */
        disableDialog(keyID) {
            this.selectedKeyID = keyID;
            this.$refs.confirmPause.show();
        },

        /**
         * Pause API key
         * @returns {void}
         */
        disableKey() {
            this.$root.getSocket().emit("disableAPIKey", this.selectedKeyID, (res) => {
                this.$root.toastRes(res);
            });
        },

        /**
         * Resume API key
         * @param {number} id Key to resume
         * @returns {void}
         */
        enableKey(id) {
            this.$root.getSocket().emit("enableAPIKey", id, (res) => {
                this.$root.toastRes(res);
            });
        },
    },
};
</script>

<style lang="scss" scoped>

.mobile {
    .item {
        flex-direction: column;
        align-items: flex-start;
        margin-bottom: 1rem;
    }
}

.add-btn {
    padding-top: 1.25rem;
    padding-bottom: 1.25rem;
}

.item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    border: 1px solid transparent;
    border-radius: 0.875rem;
    transition: background-color 160ms ease, border-color 160ms ease;
    justify-content: space-between;
    padding: 0.875rem;
    min-height: 90px;
    margin-bottom: 0.375rem;

    &:hover {
        background-color: var(--color-surface-hover);
        border-color: var(--color-border);
    }

    &.active {
        .circle {
            background-color: var(--status-up);
        }
    }

    &.inactive {
        .circle {
            background-color: var(--status-down);
        }
    }

    &.expired {
        .left-part {
            opacity: 0.3;
        }

        .circle {
            background-color: var(--status-unknown);
        }
    }

    .left-part {
        display: flex;
        gap: 0.75rem;
        align-items: center;

        .circle {
            width: 1.5rem;
            height: 1.5rem;
            border-radius: 50rem;
        }

        .info {
            .title {
                font-weight: bold;
                font-size: 1.1rem;
            }

            .status {
                font-size: 14px;
            }
        }
    }

    .buttons {
        display: flex;
        gap: 0.5rem;
        flex-direction: row-reverse;

        .btn-group {
            width: 310px;
        }
    }
}

.date {
    margin-top: 0.375rem;
    display: block;
    font-size: 14px;
    color: var(--color-text-muted);
    background-color: var(--color-surface-subtle);
    border-radius: 999px;
    padding: 0 0.625rem;
    width: fit-content;

}
</style>
