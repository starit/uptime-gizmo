<template>
    <transition name="slide-fade" appear>
        <div class="management-workspace maintenance-workspace">
            <h1 class="management-workspace-title tw-mb-3">
                {{ $t("Maintenance") }}
            </h1>

            <div>
                <router-link to="/add-maintenance" class="gizmo-native-button gizmo-native-button--primary tw-mb-3">
                    <font-awesome-icon icon="plus" />
                    {{ $t("Schedule Maintenance") }}
                </router-link>
            </div>

            <div class="shadow-box management-workspace-surface">
                <span
                    v-if="Object.keys(sortedMaintenanceList).length === 0"
                    class="tw-flex tw-items-center tw-justify-center tw-my-3"
                >
                    {{ $t("No Maintenance") }}
                </span>

                <div v-for="(item, index) in sortedMaintenanceList" :key="index" class="item" :class="item.status">
                    <div class="left-part">
                        <div class="info">
                            <div class="title">{{ item.title }}</div>
                            <div class="status">
                                <span class="circle"></span>
                                {{ $t("maintenanceStatus-" + item.status) }}
                            </div>

                            <MaintenanceTime :maintenance="item" />
                        </div>
                    </div>

                    <div class="buttons">
                        <div class="gizmo-action-group" role="group">
                            <button
                                v-if="item.active"
                                class="gizmo-native-button btn-normal"
                                :aria-label="$t('ariaPauseMaintenance')"
                                @click="pauseDialog(item.id)"
                            >
                                <font-awesome-icon icon="pause" />
                                {{ $t("Pause") }}
                            </button>

                            <button
                                v-if="!item.active"
                                class="gizmo-native-button gizmo-native-button--primary"
                                :aria-label="$t('ariaResumeMaintenance')"
                                @click="resumeMaintenance(item.id)"
                            >
                                <font-awesome-icon icon="play" />
                                {{ $t("Resume") }}
                            </button>

                            <router-link
                                :to="'/maintenance/clone/' + item.id"
                                class="gizmo-native-button btn-normal"
                                :aria-label="$t('ariaCloneMaintenance')"
                            >
                                <font-awesome-icon icon="clone" />
                                {{ $t("Clone") }}
                            </router-link>

                            <router-link
                                :to="'/maintenance/edit/' + item.id"
                                class="gizmo-native-button btn-normal"
                                :aria-label="$t('ariaEditMaintenance')"
                            >
                                <font-awesome-icon icon="edit" />
                                {{ $t("Edit") }}
                            </router-link>

                            <!--
                                A variant rather than a colour laid over the
                                normal button. btn-normal sets a colour of its own
                                and lands later in the stylesheet, so the red was
                                overwritten and delete looked exactly like clone.
                            -->
                            <button
                                class="gizmo-native-button gizmo-native-button--danger-outline"
                                :aria-label="$t('ariaDeleteMaintenance')"
                                @click="deleteDialog(item.id)"
                            >
                                <font-awesome-icon icon="trash" />
                                {{ $t("Delete") }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tw-text-center tw-mt-3 gizmo-field-help">
                <a href="https://github.com/starit/uptime-gizmo/wiki/Maintenance" target="_blank">
                    {{ $t("Learn More") }}
                </a>
            </div>

            <Confirm ref="confirmPause" :yes-text="$t('Yes')" :no-text="$t('No')" @yes="pauseMaintenance">
                {{ $t("pauseMaintenanceMsg") }}
            </Confirm>

            <Confirm
                ref="confirmDelete"
                btn-style="btn-danger"
                :yes-text="$t('Yes')"
                :no-text="$t('No')"
                @yes="deleteMaintenance"
            >
                {{ $t("deleteMaintenanceMsg") }}
            </Confirm>
        </div>
    </transition>
</template>

<script>
import { getResBaseURL } from "../util-frontend";
import Confirm from "../components/Confirm.vue";
import MaintenanceTime from "../components/MaintenanceTime.vue";

export default {
    components: {
        MaintenanceTime,
        Confirm,
    },
    data() {
        return {
            selectedMaintenanceID: undefined,
            statusOrderList: {
                "under-maintenance": 1000,
                scheduled: 900,
                inactive: 800,
                ended: 700,
                unknown: 0,
            },
        };
    },
    computed: {
        sortedMaintenanceList() {
            let result = Object.values(this.$root.maintenanceList);

            result.sort((m1, m2) => {
                if (this.statusOrderList[m1.status] === this.statusOrderList[m2.status]) {
                    return m1.title.localeCompare(m2.title);
                } else {
                    return this.statusOrderList[m1.status] < this.statusOrderList[m2.status];
                }
            });

            return result;
        },
    },
    mounted() {},
    methods: {
        /**
         * Get the correct URL for the icon
         * @param {string} icon Path for icon
         * @returns {string} Correctly formatted path including port numbers
         */
        icon(icon) {
            if (icon === "/icon.svg" || icon === "/icon-512x512.png") {
                return icon;
            } else {
                return getResBaseURL() + icon;
            }
        },

        /**
         * Show delete confirmation
         * @param {number} maintenanceID ID of maintenance to show delete
         * confirmation for.
         * @returns {void}
         */
        deleteDialog(maintenanceID) {
            this.selectedMaintenanceID = maintenanceID;
            this.$refs.confirmDelete.show();
        },

        /**
         * Delete maintenance after showing confirmation dialog
         * @returns {void}
         */
        deleteMaintenance() {
            this.$root.deleteMaintenance(this.selectedMaintenanceID, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.$router.push("/maintenance");
                }
            });
        },

        /**
         * Show dialog to confirm pause
         * @param {number} maintenanceID ID of maintenance to confirm
         * pause.
         * @returns {void}
         */
        pauseDialog(maintenanceID) {
            this.selectedMaintenanceID = maintenanceID;
            this.$refs.confirmPause.show();
        },

        /**
         * Pause maintenance
         * @returns {void}
         */
        pauseMaintenance() {
            this.$root.getSocket().emit("pauseMaintenance", this.selectedMaintenanceID, (res) => {
                this.$root.toastRes(res);
            });
        },

        /**
         * Resume maintenance
         * @param {number} id ID of maintenance to resume
         * @returns {void}
         */
        resumeMaintenance(id) {
            this.$root.getSocket().emit("resumeMaintenance", id, (res) => {
                this.$root.toastRes(res);
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.management-workspace {
    max-width: 1040px;
}

.management-workspace-title {
    letter-spacing: -0.035em;
}

.management-workspace-surface {
    padding: 0.75rem;
    border: 1px solid var(--color-border);
}

.mobile {
    .item {
        flex-direction: column;
        align-items: flex-start;
        margin-bottom: 1rem;
    }
}

.item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    transition: background-color 160ms ease, border-color 160ms ease;
    justify-content: space-between;
    padding: 0.875rem;
    min-height: 90px;
    margin-bottom: 0.375rem;

    &:hover {
        background-color: var(--color-surface-hover);
        border-color: var(--color-border);
    }

    &.under-maintenance {
        background-color: var(--status-maintenance-bg);

        &:hover {
            background-color: var(--status-maintenance-bg) !important;
        }

        .circle {
            background-color: var(--status-maintenance);
        }
    }

    &.scheduled {
        .circle {
            background-color: var(--status-degraded);
        }
    }

    &.inactive {
        .circle {
            background-color: var(--status-down);
        }
    }

    &.ended {
        .left-part {
            opacity: 0.3;
        }

        .circle {
            background-color: var(--status-unknown);
        }
    }

    &.unknown {
        .circle {
            background-color: var(--status-unknown);
        }
    }

    .left-part {
        display: flex;
        gap: 0.75rem;
        align-items: center;

        .info {
            .title {
                font-weight: var(--weight-bold);
                font-size: 1.25rem;
            }

            /* The dot sits beside the word it qualifies. At 25px it was taller
               than the title and a line away from "Scheduled", so the colour
               said one thing alone and the word repeated it below. */
            .status {
                display: flex;
                align-items: center;
                gap: 0.4rem;
                color: var(--color-text-muted);
                font-size: 0.875rem;
            }

            .circle {
                flex: none;
                width: 0.5rem;
                height: 0.5rem;
                border-radius: var(--radius-pill);
            }
        }
    }

    .buttons {
        display: flex;
        gap: 0.5rem;
        flex-direction: row-reverse;

        @media (max-width: 550px) {
            & {
                width: 100%;
            }

            .gizmo-action-group {
                margin: 1em 1em 0 1em;
                width: 100%;
            }
        }
    }
}

</style>
