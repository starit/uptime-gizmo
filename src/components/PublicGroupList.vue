<template>
    <!-- Group List -->
    <Draggable v-model="$root.publicGroupList" class="service-groups" :disabled="!editMode" item-key="id" :animation="100">
        <template #item="group">
            <div class="service-group" data-testid="group">
                <!-- Group Title -->
                <h2 class="group-title">
                    <font-awesome-icon v-if="editMode && showGroupDrag" icon="arrows-alt-v" class="action drag tw-me-3" />
                    <font-awesome-icon
                        v-if="editMode"
                        icon="times"
                        class="action remove tw-me-3"
                        @click="removeGroup(group.index)"
                    />
                    <span class="collapse-toggle" @click="toggleGroup(group.element)">
                        <font-awesome-icon
                            icon="chevron-down"
                            class="chevron tw-me-2"
                            :class="{ collapsed: isGroupCollapsed(group.element) }"
                        />
                    </span>
                    <Editable
                        v-model="group.element.name"
                        :contenteditable="editMode"
                        tag="span"
                        :class="{ 'collapse-toggle': !editMode }"
                        data-testid="group-name"
                        @click="!editMode && toggleGroup(group.element)"
                    />
                </h2>

                <transition name="slide-fade-up">
                    <div v-if="!isGroupCollapsed(group.element)" class="monitor-list tw-relative">
                        <div v-if="group.element.monitorList.length === 0" class="tw-text-center no-monitor-msg">
                            {{ $t("No Monitors") }}
                        </div>

                        <!-- Monitor List -->
                        <!-- animation is not working, no idea why -->
                        <Draggable
                            v-model="group.element.monitorList"
                            class="monitor-list"
                            group="same-group"
                            :disabled="!editMode"
                            :animation="100"
                            item-key="id"
                        >
                            <template #item="monitor">
                                <div class="item" data-testid="monitor">
                                    <div class="public-monitor-row">
                                        <div>
                                            <div class="info">
                                                <font-awesome-icon
                                                    v-if="editMode"
                                                    icon="arrows-alt-v"
                                                    class="action drag tw-me-3"
                                                />
                                                <font-awesome-icon
                                                    v-if="editMode"
                                                    icon="times"
                                                    class="action remove tw-me-3"
                                                    @click="removeMonitor(group.index, monitor.index)"
                                                />

                                                <font-awesome-icon
                                                    v-if="editMode"
                                                    icon="cog"
                                                    class="action tw-me-3 tw-ms-0 monitor-settings-action link-active"
                                                    data-testid="monitor-settings"
                                                    @click="$refs.monitorSettingDialog.show(group, monitor)"
                                                />
                                                <Status
                                                    v-if="showOnlyLastHeartbeat"
                                                    :status="statusOfLastHeartbeat(monitor.element.id)"
                                                />
                                                <Uptime v-else :monitor="monitor.element" type="24" :pill="true" />
                                                <a
                                                    v-if="showLink(monitor)"
                                                    :href="monitor.element.url"
                                                    class="item-name"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    data-testid="monitor-name"
                                                >
                                                    {{ monitor.element.name }}
                                                </a>
                                                <p v-else class="item-name" data-testid="monitor-name">
                                                    {{ monitor.element.name }}
                                                </p>
                                            </div>
                                            <div class="extra-info">
                                                <div
                                                    v-if="
                                                        showCertificateExpiry && monitor.element.certExpiryDaysRemaining
                                                    "
                                                >
                                                    <Tag
                                                        :item="{
                                                            name: $t('Cert Exp.'),
                                                            value: formattedCertExpiryMessage(monitor),
                                                            color: certExpiryColor(monitor),
                                                        }"
                                                        :size="'sm'"
                                                    />
                                                </div>
                                                <div v-if="showTags">
                                                    <Tag
                                                        v-for="tag in monitor.element.tags"
                                                        :key="tag"
                                                        :item="tag"
                                                        :size="'sm'"
                                                        data-testid="monitor-tag"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div :key="$root.userHeartbeatBar">
                                            <HeartbeatBar size="mid" :monitor-id="monitor.element.id" />
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Draggable>
                    </div>
                </transition>
            </div>
        </template>
    </Draggable>
    <MonitorSettingDialog ref="monitorSettingDialog" />
</template>

<script>
import MonitorSettingDialog from "./MonitorSettingDialog.vue";
import Draggable from "vuedraggable";
import HeartbeatBar from "./HeartbeatBar.vue";
import Uptime from "./Uptime.vue";
import Tag from "./Tag.vue";
import Status from "./Status.vue";

export default {
    components: {
        MonitorSettingDialog,
        Draggable,
        HeartbeatBar,
        Uptime,
        Tag,
        Status,
    },
    props: {
        /** Are we in edit mode? */
        editMode: {
            type: Boolean,
            required: true,
        },
        /** Should tags be shown? */
        showTags: {
            type: Boolean,
        },
        /** Should expiry be shown? */
        showCertificateExpiry: {
            type: Boolean,
        },
        /** Should only the last heartbeat be shown? */
        showOnlyLastHeartbeat: {
            type: Boolean,
        },
    },
    data() {
        return {};
    },
    computed: {
        showGroupDrag() {
            return this.$root.publicGroupList.length >= 2;
        },
    },
    methods: {
        /**
         * Toggle collapsed state for a group
         * @param {object} group Group to toggle
         * @returns {void}
         */
        toggleGroup(group) {
            if (!this.$router) {
                return;
            }

            const groupId = this.getGroupIdentifier(group);
            const collapsed = this.getCollapsedList();
            const index = collapsed.indexOf(groupId);

            if (index >= 0) {
                collapsed.splice(index, 1);
            } else {
                collapsed.push(groupId);
            }

            const query = { ...this.$route.query };
            if (collapsed.length > 0) {
                query.collapse = collapsed;
            } else {
                delete query.collapse;
            }

            this.$router.push({ query }).catch(() => {});
        },

        /**
         * Check if a group is collapsed
         * @param {object} group Group to check
         * @returns {boolean} Whether the group is collapsed
         */
        isGroupCollapsed(group) {
            return this.getCollapsedList().includes(this.getGroupIdentifier(group));
        },

        /**
         * Get list of collapsed group identifiers from the query param.
         * Vue Router normalises repeated params (?collapse=1&collapse=2) into an array.
         * @returns {string[]} Collapsed group identifiers
         */
        getCollapsedList() {
            const raw = this.$route.query.collapse;
            if (!raw) {
                return [];
            }
            // Normalise to array: a single query param is a string, repeated params are already an array
            return [].concat(raw);
        },

        /**
         * Remove the specified group
         * @param {number} index Index of group to remove
         * @returns {void}
         */
        removeGroup(index) {
            this.$root.publicGroupList.splice(index, 1);
        },

        /**
         * Remove a monitor from a group
         * @param {number} groupIndex Index of group to remove monitor from
         * @param {number} index Index of monitor to remove
         * @returns {void}
         */
        removeMonitor(groupIndex, index) {
            this.$root.publicGroupList[groupIndex].monitorList.splice(index, 1);
        },

        /**
         * Should a link to the monitor be shown?
         * Attempts to guess if a link should be shown based upon if
         * sendUrl is set and if the URL is default or not.
         * @param {object} monitor Monitor to check
         * @param {boolean} ignoreSendUrl Should the presence of the sendUrl
         * property be ignored. This will only work in edit mode.
         * @returns {boolean} Should the link be shown
         */
        showLink(monitor, ignoreSendUrl = false) {
            // We must check if there are any elements in monitorList to
            // prevent undefined errors if it hasn't been loaded yet
            if (this.$parent.editMode && ignoreSendUrl && Object.keys(this.$root.monitorList).length) {
                return (
                    this.$root.monitorList[monitor.element.id].type === "http" ||
                    this.$root.monitorList[monitor.element.id].type === "keyword" ||
                    this.$root.monitorList[monitor.element.id].type === "json-query"
                );
            }
            return monitor.element.sendUrl && monitor.element.url && monitor.element.url !== "https://";
        },

        /**
         * Returns formatted certificate expiry or Bad cert message
         * @param {object} monitor Monitor to show expiry for
         * @returns {string} Certificate expiry message
         */
        formattedCertExpiryMessage(monitor) {
            if (monitor?.element?.validCert && monitor?.element?.certExpiryDaysRemaining) {
                return this.$t("days", monitor.element.certExpiryDaysRemaining);
            } else if (monitor?.element?.validCert === false) {
                return this.$t("noOrBadCertificate");
            } else {
                return this.$t("unknownDays");
            }
        },

        /**
         * Returns the status of the last heartbeat
         * @param {number} monitorId Id of the monitor to get status for
         * @returns {number} Status of the last heartbeat
         */
        statusOfLastHeartbeat(monitorId) {
            let heartbeats = this.$root.heartbeatList[monitorId] ?? [];
            let lastHeartbeat = heartbeats[heartbeats.length - 1];
            return lastHeartbeat?.status;
        },

        /**
         * Returns certificate expiry color based on days remaining
         * @param {object} monitor Monitor to show expiry for
         * @returns {string} Color for certificate expiry
         */
        certExpiryColor(monitor) {
            if (monitor?.element?.validCert && monitor.element.certExpiryDaysRemaining > 7) {
                return "var(--status-up)";
            }
            return "var(--status-down)";
        },

        /**
         * Get unique identifier for a group
         * @param {object} group object
         * @returns {string} group identifier
         */
        getGroupIdentifier(group) {
            if (group.id !== undefined && group.id !== null) {
                return group.id.toString();
            }
            return `group${this.$root.publicGroupList.indexOf(group)}`;
        },
    },
};
</script>

<style lang="scss" scoped>
/*
 * One surface for the whole service list. Every group used to be its own card,
 * so three groups of one monitor each produced three 90px cards around three
 * 24px rows, and the group headings floated outside them. Groups are now
 * sections inside a single container, separated by rules.
 */
.service-groups {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    overflow: hidden;
}

.service-group + .service-group .group-title {
    border-top: 1px solid var(--color-border);
}

/*
 * A group name labels the list beneath it; it is not competing with the
 * overall status for the visitor's attention.
 */
.group-title {
    margin: 0;
    padding: 0.625rem 1rem;
    background: var(--color-surface-subtle);
    color: var(--color-text-muted);
    font-size: 0.75rem;
    font-weight: var(--weight-semibold);
    letter-spacing: 0.06em;
    text-transform: uppercase;

    span {
        display: inline-block;
        min-width: 15px;
    }
}


.extra-info {
    display: flex;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
    gap: 0.25rem;
}

.no-monitor-msg {
    position: absolute;
    width: 100%;
    top: 20px;
    left: 0;
}

.monitor-list {
    min-height: 46px;
}

.shadow-box.monitor-list {
    padding: 0.5rem;
    border: 1px solid var(--color-border);
}

.item {
    /*
     * Uniform rows. The heartbeat only prints its time range once it has more
     * than four beats, so a freshly added monitor rendered 14px shorter than
     * its neighbours and broke the list's rhythm.
     */
    display: flex;
    min-height: 4.75rem;
    flex-direction: column;
    justify-content: center;
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--color-border);
    transition: background-color 160ms ease;

    &:hover {
        background: var(--color-surface-hover);
    }
}

.group-title + * .item:first-child,
.monitor-list > .item:first-child {
    border-top: 0;
}

.item-name {
    padding-left: 0.375rem;
    padding-right: 0.375rem;
    margin: 0;
    display: inline-block;
    color: var(--color-text);
    font-weight: var(--weight-semibold);
}

/* Renamed from .btn-link: it was always a local rule, and the Bootstrap class
   of that name contributed nothing to an inline SVG. */
.monitor-settings-action {
    color: var(--color-text-subtle);
    margin-left: 0.375rem;
}

/* Was .row with col-9/col-3, widening to 6/6 at Bootstrap's 1200px xl. */
.public-monitor-row {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
    align-items: center;
    gap: 1.5rem;
}

@media (min-width: 1200px) {
    .public-monitor-row {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
}

.link-active {
    color: var(--color-interactive);
}

.drag {
    color: var(--color-text-subtle);
    cursor: grab;
}

.remove {
    color: var(--status-down);
}


.collapse-toggle {
    cursor: pointer;
    padding: 0.125rem;
}

.chevron {
    font-size: 0.8em;
    color: var(--color-text-subtle);
    transition: transform 0.2s ease-in;

    &.collapsed {
        transform: rotate(-90deg);
    }
}

</style>
