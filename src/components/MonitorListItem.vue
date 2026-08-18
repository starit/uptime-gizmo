<template>
    <div>
        <div
            class="draggable-item"
            :style="depthMargin"
            :class="{ 'drag-over': dragOverCount > 0 }"
            @dragstart="onDragStart"
            @dragenter.prevent="onDragEnter"
            @dragleave.prevent="onDragLeave"
            @dragover.prevent
            @drop.prevent="onDrop"
        >
            <!-- Checkbox -->
            <div v-if="isSelectMode" class="select-input-wrapper">
                <input
                    class="gizmo-native-check__input select-input"
                    type="checkbox"
                    :aria-label="$t('Check/Uncheck')"
                    :checked="isSelected(monitor.id)"
                    @click.stop="toggleSelection"
                />
            </div>

            <router-link :to="monitorURL(monitor.id)" class="item" :class="{ disabled: !monitor.active }">
                <div class="monitor-row" :class="monitorStyle">
                    <div class="monitor-row__identity small-padding tw-flex tw-gap-2 tw-items-center">
                        <div class="tw-me-1">
                            <Uptime :monitor="monitor" type="24" :pill="true" />
                        </div>
                        <div class="tw-flex tw-items-center tw-gap-2 tw-flex-1" style="min-width: 0">
                            <span v-if="hasChildren" class="collapse-padding" @click.prevent="changeCollapsed">
                                <font-awesome-icon
                                    icon="chevron-down"
                                    class="animated"
                                    :class="{ collapsed: isCollapsed }"
                                />
                            </span>
                            <div class="tw-flex-1 tw-truncate" style="min-width: 0">
                                <div class="tw-truncate">{{ monitor.name }}</div>
                                <div v-if="monitor.tags.length > 0" class="tags tw-gap-1">
                                    <Tag
                                        v-for="tag in monitor.tags"
                                        :key="tag"
                                        :item="tag"
                                        :size="'sm'"
                                        :title="tag.name"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div
                        v-show="$root.userHeartbeatBar == 'normal'"
                        :key="$root.userHeartbeatBar"
                        class="monitor-row__heartbeat"
                    >
                        <HeartbeatBar ref="heartbeatBar" size="small" :monitor-id="monitor.id" />
                    </div>
                </div>

                <div v-if="$root.userHeartbeatBar == 'bottom'" class="monitor-row monitor-row--bottom">
                    <div class="bottom-style">
                        <HeartbeatBar ref="heartbeatBar" size="small" :monitor-id="monitor.id" />
                    </div>
                </div>
            </router-link>
        </div>

        <transition name="slide-fade-up">
            <div v-if="!isCollapsed" class="childs">
                <MonitorListItem
                    v-for="(item, index) in sortedChildMonitorList"
                    :key="index"
                    :monitor="item"
                    :isSelectMode="isSelectMode"
                    :isSelected="isSelected"
                    :select="select"
                    :deselect="deselect"
                    :depth="depth + 1"
                    :filter-func="filterFunc"
                    :sort-func="sortFunc"
                />
            </div>
        </transition>
    </div>
</template>

<script>
import HeartbeatBar from "../components/HeartbeatBar.vue";
import Tag from "../components/Tag.vue";
import Uptime from "../components/Uptime.vue";
import { getMonitorRelativeURL } from "../util.ts";

export default {
    name: "MonitorListItem",
    components: {
        Uptime,
        HeartbeatBar,
        Tag,
    },
    props: {
        /** Monitor this represents */
        monitor: {
            type: Object,
            default: null,
        },
        /** If the user is in select mode */
        isSelectMode: {
            type: Boolean,
            default: false,
        },
        /** How many ancestors are above this monitor */
        depth: {
            type: Number,
            default: 0,
        },
        /** Callback to determine if monitor is selected */
        isSelected: {
            type: Function,
            default: () => {},
        },
        /** Callback fired when monitor is selected */
        select: {
            type: Function,
            default: () => {},
        },
        /** Callback fired when monitor is deselected */
        deselect: {
            type: Function,
            default: () => {},
        },
        /** Function to filter child monitors */
        filterFunc: {
            type: Function,
            default: () => {},
        },
        /** Function to sort child monitors */
        sortFunc: {
            type: Function,
            default: () => {},
        },
    },
    data() {
        return {
            isCollapsed: true,
            dragOverCount: 0,
        };
    },
    computed: {
        sortedChildMonitorList() {
            let result = Object.values(this.$root.monitorList);

            // Get children
            result = result.filter((childMonitor) => childMonitor.parent === this.monitor.id);

            // Run filter on children
            result = result.filter(this.filterFunc);

            result.sort(this.sortFunc);

            return result;
        },
        hasChildren() {
            return this.sortedChildMonitorList.length > 0;
        },
        depthMargin() {
            return {
                marginLeft: `${20 * this.depth}px`,
            };
        },
        monitorStyle() {
            const isFullWidth = this.$root.userHeartbeatBar === "bottom" || this.$root.userHeartbeatBar === "none";
            return {
                "monitor-row--split": !isFullWidth,
            };
        },
    },
    watch: {
        isSelectMode() {
            // TODO: Resize the heartbeat bar, but too slow
            // this.$refs.heartbeatBar.resize();
        },
    },
    beforeMount() {
        // Always unfold if monitor is accessed directly
        if (this.monitor.childrenIDs.includes(parseInt(this.$route.params.id))) {
            this.isCollapsed = false;
            return;
        }

        // Set collapsed value based on local storage
        let storage = window.localStorage.getItem("monitorCollapsed");
        if (storage === null) {
            return;
        }

        let storageObject = JSON.parse(storage);
        if (storageObject[`monitor_${this.monitor.id}`] == null) {
            return;
        }

        this.isCollapsed = storageObject[`monitor_${this.monitor.id}`];
    },
    methods: {
        /**
         * Changes the collapsed value of the current monitor and saves
         * it to local storage
         * @returns {void}
         */
        changeCollapsed() {
            this.isCollapsed = !this.isCollapsed;

            // Save collapsed value into local storage
            let storage = window.localStorage.getItem("monitorCollapsed");
            let storageObject = {};
            if (storage !== null) {
                storageObject = JSON.parse(storage);
            }
            storageObject[`monitor_${this.monitor.id}`] = this.isCollapsed;

            window.localStorage.setItem("monitorCollapsed", JSON.stringify(storageObject));
        },
        /**
         * Initializes the drag operation if the monitor is draggable.
         * @param {DragEvent} event - The dragstart event triggered by the browser.
         * @returns {void} This method does not return anything.
         */
        onDragStart(event) {
            try {
                event.dataTransfer.setData("text/monitor-id", String(this.monitor.id));
                event.dataTransfer.effectAllowed = "move";
            } catch (e) {
                // ignore
            }
        },

        onDragEnter(event) {
            if (this.monitor.type !== "group") {
                return;
            }

            this.dragOverCount++;
        },

        onDragLeave(event) {
            if (this.monitor.type !== "group") {
                return;
            }

            this.dragOverCount = Math.max(0, this.dragOverCount - 1);
        },

        async onDrop(event) {
            this.dragOverCount = 0;

            // Only groups accept drops
            if (this.monitor.type !== "group") {
                return;
            }

            const draggedId = event.dataTransfer.getData("text/monitor-id");
            if (!draggedId) {
                return;
            }

            const draggedMonitorId = parseInt(draggedId);
            if (isNaN(draggedMonitorId) || draggedMonitorId === this.monitor.id) {
                return;
            }

            const draggedMonitor = this.$root.monitorList[draggedMonitorId];
            if (!draggedMonitor) {
                return;
            }

            // Save original parent so we can revert locally if server returns error
            const originalParent = draggedMonitor.parent;

            // Prepare a full monitor object (clone) and set new parent
            const monitorToSave = JSON.parse(JSON.stringify(draggedMonitor));
            monitorToSave.parent = this.monitor.id;

            // Optimistically update local state so UI updates immediately
            this.$root.monitorList[draggedMonitorId].parent = this.monitor.id;

            // Send updated monitor state via socket
            try {
                this.$root.getSocket().emit("editMonitor", monitorToSave, (res) => {
                    if (!res || !res.ok) {
                        // Revert local change on error
                        if (this.$root.monitorList[draggedMonitorId]) {
                            this.$root.monitorList[draggedMonitorId].parent = originalParent;
                        }
                        if (res && res.msg) {
                            this.$root.toastError(res.msg);
                        }
                    } else {
                        this.$root.toastRes(res);
                    }
                });
            } catch (e) {
                // revert on exception
                if (this.$root.monitorList[draggedMonitorId]) {
                    this.$root.monitorList[draggedMonitorId].parent = originalParent;
                }
            }
        },
        /**
         * Get URL of monitor
         * @param {number} id ID of monitor
         * @returns {string} Relative URL of monitor
         */
        monitorURL(id) {
            return getMonitorRelativeURL(id);
        },
        /**
         * Toggle selection of monitor
         * @returns {void}
         */
        toggleSelection() {
            if (this.isSelected(this.monitor.id)) {
                this.deselect(this.monitor.id);
            } else {
                this.select(this.monitor.id);
            }
        },
    },
};
</script>

<style lang="scss" scoped>
.small-padding {
    padding-left: 0.5rem !important;
    padding-right: 0.5rem !important;
}

.monitor-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: center;
    gap: 0.75rem;
}

/*
 * The heartbeat is a fixed-purpose sparkline, so it takes a fixed width and the
 * name absorbs whatever is left. The Bootstrap markup used col-3 col-xl-6,
 * which widened the heartbeat to half the row whenever the *window* passed
 * 1200px — regardless of how narrow the rail itself was — leaving the name
 * about 80px and truncating all but the shortest.
 */
.monitor-row--split { grid-template-columns: minmax(0, 1fr) 5rem; }

.monitor-row__identity,
.monitor-row__heartbeat { min-width: 0; }
.monitor-row--bottom { margin-top: 0.375rem; }


.tags {
    margin-top: 0.25rem;
    padding-left: 0.25rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0;
}

.collapsed {
    transform: rotate(-90deg);
}

.animated {
    transition: transform 0.2s ease-in;
}

.select-input-wrapper {
    float: left;
    margin-top: 0.875rem;
    margin-left: 0.25rem;
    margin-right: 0.625rem;
    padding-left: 0.25rem;
    position: relative;
    z-index: 15;
}

.drag-over {
    outline: 2px dashed var(--color-interactive);
    outline-offset: 2px;
    border-radius: 0.875rem;
    background-color: var(--color-interactive-subtle);
}

.monitor-list .drag-over .item {
    background: var(--color-interactive-subtle);
}

.draggable-item {
    cursor: grab;
    position: relative;

    .item {
        display: block;
        margin: 0.25rem 0;
        padding: 0.75rem;
        color: var(--color-text);
        background: var(--color-surface);
        border: 1px solid transparent;
        border-radius: 0.875rem;
        transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease;

        &:hover {
            color: var(--color-text);
            background: var(--color-surface-hover);
            border-color: var(--color-border);
            transform: translateX(2px);
        }

        &.disabled {
            opacity: 0.58;
        }
    }

    &.dragging {
        cursor: grabbing;
    }
}

.bottom-style {
    margin-left: -0.625rem;
    margin-top: 0.375rem;
}
</style>
