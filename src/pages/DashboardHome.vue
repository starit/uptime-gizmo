<template>
    <transition ref="tableContainer" name="slide-fade" appear>
        <div v-if="$route.name === 'DashboardHome'" class="dashboard-overview">
            <!--
                Nothing is being watched yet, so the stat grid would be five
                zeroes above an empty table — a screen that reports emptiness
                without saying what to do about it. The mascot fills the space the
                data will occupy, and the one control is the action that ends it.
            -->
            <section v-if="hasNoMonitors" class="dashboard-welcome">
                <img
                    class="dashboard-welcome-mascot"
                    src="/images/gizmo-mascot-engineer-cutout.webp"
                    alt=""
                    width="448"
                    height="448"
                    decoding="async"
                >
                <div class="dashboard-welcome-copy">
                    <p class="dashboard-welcome-slogan">{{ $t("uptimeIsMoney") }}</p>
                    <p class="dashboard-welcome-lede">{{ $t("uptimeIsMoneySub") }}</p>
                    <router-link to="/add" class="dashboard-welcome-cta">
                        {{ $t("Add New Monitor") }}
                    </router-link>
                </div>
            </section>

            <template v-else>
            <header class="dashboard-overview-header">
                <h1>{{ $t("Quick Stats") }}</h1>
            </header>

            <section class="stat-grid" :aria-label="$t('Quick Stats')">
                <div class="stat-card stat-card-up" :class="{ 'is-muted': $root.stats.up === 0 }">
                    <h2>{{ $t("Up") }}</h2>
                    <span class="stat-card-value">{{ $root.stats.up }}</span>
                </div>
                <div class="stat-card stat-card-down" :class="{ 'is-muted': $root.stats.down === 0 }">
                    <h2>{{ $t("Down") }}</h2>
                    <span class="stat-card-value">{{ $root.stats.down }}</span>
                </div>
                <div class="stat-card stat-card-maintenance" :class="{ 'is-muted': $root.stats.maintenance === 0 }">
                    <h2>{{ $t("Maintenance") }}</h2>
                    <span class="stat-card-value">{{ $root.stats.maintenance }}</span>
                </div>
                <div class="stat-card stat-card-unknown" :class="{ 'is-muted': $root.stats.unknown === 0 }">
                    <h2>{{ $t("Unknown") }}</h2>
                    <span class="stat-card-value">{{ $root.stats.unknown }}</span>
                </div>
                <div class="stat-card stat-card-pause" :class="{ 'is-muted': $root.stats.pause === 0 }">
                    <h2>{{ $t("pauseDashboardHome") }}</h2>
                    <span class="stat-card-value">{{ $root.stats.pause }}</span>
                </div>
            </section>

            <GizmoPanel class="event-panel" density="compact">
                <template #actions>
                    <GizmoButton
                        variant="danger"
                        size="sm"
                        :disabled="clearingAllEvents"
                        @click="clearAllEventsDialog"
                    >
                        {{ $t("Clear All Events") }}
                    </GizmoButton>
                </template>
                <GizmoTable>
                    <thead>
                        <tr>
                            <th v-if="showGroupColumn">{{ $t("Group Name") }}</th>
                            <th class="name-column">{{ $t("Name") }}</th>
                            <th>{{ $t("Status") }}</th>
                            <th>{{ $t("DateTime") }}</th>
                            <th>{{ $t("Message") }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="(beat, index) in displayedRecords"
                            :key="index"
                            :class="{ 'gizmo-mobile-event-row': $root.windowWidth <= 550 }"
                        >
                            <td v-if="showGroupColumn">
                                <router-link
                                    v-if="getGroupName(beat.monitorID)"
                                    :to="`/dashboard/${getGroupId(beat.monitorID)}`"
                                >
                                    {{ getGroupName(beat.monitorID) }}
                                </router-link>
                                <span v-else class="empty-value">—</span>
                            </td>
                            <td class="name-column">
                                <router-link :to="`/dashboard/${beat.monitorID}`">
                                    {{ $root.monitorList[beat.monitorID]?.name }}
                                </router-link>
                            </td>
                            <td><Status :status="beat.status" /></td>
                            <td :class="{ 'gizmo-cell-no-border': !beat.msg }"><Datetime :value="beat.time" /></td>
                            <td class="gizmo-cell-no-border">{{ beat.msg }}</td>
                        </tr>

                        <tr v-if="importantHeartBeatListLength === 0">
                            <td :colspan="tableColumnCount">
                                {{ $t("No important events") }}
                            </td>
                        </tr>
                    </tbody>
                </GizmoTable>

                <template #footer>
                    <div class="gizmo-pagination">
                    <pagination
                        v-model="page"
                        :records="importantHeartBeatListLength"
                        :per-page="perPage"
                        :options="paginationConfig"
                    />
                    </div>
                </template>
            </GizmoPanel>
            </template>
        </div>
    </transition>
    <Confirm
        ref="confirmClearEvents"
        btn-style="btn-danger"
        :yes-text="$t('Yes')"
        :no-text="$t('No')"
        @yes="clearAllEvents"
    >
        {{ $t("clearAllEventsMsg") }}
    </Confirm>
    <router-view ref="child" />
</template>

<script>
import Status from "../components/Status.vue";
import Datetime from "../components/Datetime.vue";
import GizmoButton from "../components/gizmo/GizmoButton.vue";
import GizmoPanel from "../components/gizmo/GizmoPanel.vue";
import GizmoTable from "../components/gizmo/GizmoTable.vue";
import Pagination from "v-pagination-3";
import Confirm from "../components/Confirm.vue";

export default {
    components: {
        Datetime,
        GizmoButton,
        GizmoPanel,
        GizmoTable,
        Status,
        Pagination,
        Confirm,
    },
    props: {
        calculatedHeight: {
            type: Number,
            default: 0,
        },
    },
    data() {
        return {
            page: 1,
            perPage: 25,
            initialPerPage: 25,
            paginationConfig: {
                hideCount: true,
                chunksNavigation: "scroll",
            },
            importantHeartBeatListLength: 0,
            displayedRecords: [],
            clearingAllEvents: false,
        };
    },
    computed: {
        /**
         * Whether the instance is watching anything at all.
         * @returns {boolean} true when no monitor exists
         */
        hasNoMonitors() {
            return Object.keys(this.$root.monitorList).length === 0;
        },

        showGroupColumn() {
            return Object.values(this.$root.monitorList).some((m) => m.parent != null);
        },
        tableColumnCount() {
            return this.showGroupColumn ? 5 : 4;
        },
    },
    watch: {
        perPage() {
            this.$nextTick(() => {
                this.getImportantHeartbeatListPaged();
            });
        },

        page() {
            this.getImportantHeartbeatListPaged();
        },
    },

    mounted() {
        this.getImportantHeartbeatListLength();

        this.$root.emitter.on("newImportantHeartbeat", this.onNewImportantHeartbeat);

        this.initialPerPage = this.perPage;

        window.addEventListener("resize", this.updatePerPage);
        this.updatePerPage();
    },

    beforeUnmount() {
        this.$root.emitter.off("newImportantHeartbeat", this.onNewImportantHeartbeat);

        window.removeEventListener("resize", this.updatePerPage);
    },

    methods: {
        /**
         * Returns the group (parent) name for a monitor, or empty string if none.
         * @param {number} monitorID - The monitor ID.
         * @returns {string} The group name or empty string.
         */
        getGroupName(monitorID) {
            const monitor = this.$root.monitorList[monitorID];
            if (!monitor || monitor.parent == null) {
                return "";
            }
            const parent = this.$root.monitorList[monitor.parent];
            return parent ? parent.name : "";
        },

        /**
         * Returns the group (parent) ID for a monitor, or null if none.
         * @param {number} monitorID - The monitor ID.
         * @returns {number|null} The group monitor ID or null.
         */
        getGroupId(monitorID) {
            const monitor = this.$root.monitorList[monitorID];
            return monitor && monitor.parent != null ? monitor.parent : null;
        },

        /**
         * Updates the displayed records when a new important heartbeat arrives.
         * @param {object} heartbeat - The heartbeat object received.
         * @returns {void}
         */
        onNewImportantHeartbeat(heartbeat) {
            if (this.page === 1) {
                this.displayedRecords.unshift(heartbeat);
                if (this.displayedRecords.length > this.perPage) {
                    this.displayedRecords.pop();
                }
                this.importantHeartBeatListLength += 1;
            }
        },

        /**
         * Retrieves the length of the important heartbeat list for all monitors.
         * @returns {void}
         */
        getImportantHeartbeatListLength() {
            this.$root.getSocket().emit("monitorImportantHeartbeatListCount", null, (res) => {
                if (res.ok) {
                    this.importantHeartBeatListLength = res.count;
                    this.getImportantHeartbeatListPaged();
                }
            });
        },

        /**
         * Retrieves the important heartbeat list for the current page.
         * @returns {void}
         */
        getImportantHeartbeatListPaged() {
            const offset = (this.page - 1) * this.perPage;
            this.$root.getSocket().emit("monitorImportantHeartbeatListPaged", null, offset, this.perPage, (res) => {
                if (res.ok) {
                    this.displayedRecords = res.data;
                }
            });
        },

        /**
         * Updates the number of items shown per page based on the available height.
         * @returns {void}
         */
        updatePerPage() {
            const tableContainer = this.$refs.tableContainer;
            const tableContainerHeight = tableContainer.offsetHeight;
            const availableHeight = window.innerHeight - tableContainerHeight;
            const additionalPerPage = Math.floor(availableHeight / 58);

            if (additionalPerPage > 0) {
                this.perPage = Math.max(this.initialPerPage, this.perPage + additionalPerPage);
            } else {
                this.perPage = this.initialPerPage;
            }
        },

        clearAllEventsDialog() {
            this.$refs.confirmClearEvents.show();
        },
        clearAllEvents() {
            this.clearingAllEvents = true;
            const monitorIDs = Object.keys(this.$root.monitorList);
            let failed = 0;
            const total = monitorIDs.length;

            if (total === 0) {
                this.clearingAllEvents = false;
                this.$root.toastError(this.$t("No monitors found"));
                return;
            }

            monitorIDs.forEach((monitorID) => {
                this.$root.getSocket().emit("clearEvents", monitorID, (res) => {
                    if (!res || !res.ok) {
                        failed++;
                    }
                });
            });
            this.clearingAllEvents = false;
            this.page = 1;
            this.getImportantHeartbeatListLength();
            if (failed === 0) {
                this.$root.toastSuccess(this.$t("Events cleared successfully"));
            } else {
                this.$root.toastError(
                    this.$t("Could not clear events", {
                        failed,
                        total,
                    })
                );
            }
        },
    },
};
</script>

<style lang="scss" scoped>
.dashboard-overview {
    display: grid;
    gap: 1.25rem;
}

.dashboard-overview-header h1 {
    margin: 0;
    color: var(--color-text);
    font-size: clamp(1.6rem, 3vw, 2.25rem);
    font-weight: var(--weight-bold);
    letter-spacing: -0.04em;
}

.stat-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.75rem;
}

.stat-card {
    min-width: 0;
    padding: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-top: 3px solid var(--status-unknown);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-raised);

    h2 {
        margin: 0 0 0.55rem;
        color: var(--color-text-muted);
        font-size: 0.78rem;
        font-weight: var(--weight-bold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }
}

.stat-card-value {
    display: block;
    color: var(--color-text);
    font-family: "IBM Plex Mono", "Noto Sans Mono", monospace;
    font-size: clamp(1.75rem, 4vw, 2.6rem);
    font-weight: var(--weight-bold);
    line-height: 1;
}

.stat-card-up { border-top-color: var(--status-up); }
.stat-card-down { border-top-color: var(--status-down); }
.stat-card-maintenance { border-top-color: var(--status-maintenance); }
.stat-card-unknown { border-top-color: var(--status-unknown); }
.stat-card-pause { border-top-color: var(--color-border-strong); }

.stat-card.is-muted {
    opacity: 0.62;
}

.dashboard-welcome {
    display: grid;
    grid-template-columns: minmax(0, auto) minmax(0, 1fr);
    align-items: center;
    gap: clamp(1rem, 4vw, 3rem);
    padding: clamp(1.5rem, 4vw, 3rem);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-panel);
}

.dashboard-welcome-mascot {
    width: clamp(9rem, 22vw, 15rem);
    height: auto;

    /* The cutout carries its own studio shadow; a second one would read as two
       light sources. */
    filter: drop-shadow(0 12px 20px rgba(0, 0, 0, 0.18));
}

.dashboard-welcome-slogan {
    margin: 0;
    color: var(--color-text);
    font-size: clamp(1.5rem, 3.4vw, 2.4rem);
    font-weight: var(--weight-bold);
    letter-spacing: -0.03em;
    line-height: 1.1;
    text-wrap: balance;
}

.dashboard-welcome-lede {
    margin: 0.7rem 0 0;
    max-width: 42ch;
    color: var(--color-text-muted);
    font-size: 1rem;
    line-height: 1.55;
}

.dashboard-welcome-cta {
    display: inline-block;
    margin-top: 1.4rem;
    padding: 0.6rem 1.3rem;
    background: var(--color-brand);
    color: var(--color-brand-contrast);
    border-radius: var(--radius-md);
    font-weight: var(--weight-semibold);
    text-decoration: none;
    transition: background 0.15s ease;

    &:hover {
        background: var(--color-brand-hover);
        color: var(--color-brand-contrast);
    }

    &:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
    }
}

/* Below this the mascot and the copy stop sharing a line comfortably. */
@media (max-width: 640px) {
    .dashboard-welcome {
        grid-template-columns: minmax(0, 1fr);
        justify-items: center;
        text-align: center;
    }

    .dashboard-welcome-lede {
        margin-inline: auto;
    }
}

.empty-value {
    color: var(--color-text-subtle);
}

.gizmo-cell-no-border {
    border-bottom-color: transparent;
}

.gizmo-pagination {
    display: flex;
    justify-content: center;
}

@media (max-width: 550px) {
    .gizmo-mobile-event-row {
        background: var(--color-surface);
        outline: 1px solid var(--color-border);
    }
}

@media screen and (max-width: 1280px) {
    .name-column {
        min-width: 150px;
    }
}

@media screen and (min-aspect-ratio: 4/3) {
    .name-column {
        min-width: 200px;
    }
}

@media (max-width: 1100px) {
    .stat-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 620px) {
    .stat-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
</style>
