<template>
    <GizmoDialog
        :open="open"
        size="md"
        :title="$t('Monitor Setting', [monitor.name])"
        :close-label="$t('Close')"
        @update:open="setOpen"
    >
        <div class="gizmo-form-stack">
            <div class="gizmo-native-check">
                <input
                    id="show-clickable-link"
                    v-model="monitor.isClickAble"
                    class="gizmo-native-check__input"
                    type="checkbox"
                    data-testid="show-clickable-link"
                    autofocus
                    @change="toggleLink(monitor.group_index, monitor.monitor_index)"
                />
                <label class="gizmo-native-check__label" for="show-clickable-link">
                    {{ $t("Show Clickable Link") }}
                </label>
                <div class="gizmo-field-help">
                    {{ $t("Show Clickable Link Description") }}
                </div>
            </div>

            <div v-if="monitor.isClickAble">
                <label for="customUrl" class="gizmo-field-label">{{ $t("Custom URL") }}</label>
                <input
                    id="customUrl"
                    :value="monitor.url"
                    type="url"
                    class="gizmo-native-control"
                    data-testid="custom-url-input"
                    @input="changeUrlFromEvent"
                />
                <div class="gizmo-field-help">
                    {{ $t("customUrlDescription") }}
                </div>
            </div>

            <div>
                <GizmoButton variant="secondary" @click="openBadgeGenerator">
                    <font-awesome-icon icon="certificate" aria-hidden="true" />
                    {{ $t("Open Badge Link Generator") }}
                </GizmoButton>
            </div>
        </div>

        <template #footer>
            <GizmoButton variant="secondary" data-testid="monitor-settings-close" @click="setOpen(false)">
                {{ $t("Close") }}
            </GizmoButton>
        </template>
    </GizmoDialog>
    <BadgeLinkGeneratorDialog ref="badgeLinkGeneratorDialog" />
</template>

<script lang="ts">
import BadgeLinkGeneratorDialog from "./BadgeLinkGeneratorDialog.vue";
import GizmoButton from "./gizmo/GizmoButton.vue";
import GizmoDialog from "./gizmo/GizmoDialog.vue";

interface PublicMonitorSelection {
    group_index: number;
    id: number | null;
    isClickAble: boolean;
    monitor_index: number;
    name: string;
    url: string;
}

interface PublicMonitorElement {
    id: number;
    name: string;
    sendUrl?: boolean;
    url: string;
}

interface PublicMonitorWrapper {
    element: PublicMonitorElement;
    index: number;
}

interface PublicMonitorGroup {
    index: number;
}

interface MonitorSettingRoot {
    publicGroupList: Array<{
        monitorList: Array<{ sendUrl?: boolean; url: string }>;
    }>;
}

interface BadgeDialogRef {
    show: (monitorId: number, monitorName: string) => void;
}

export default {
    components: {
        BadgeLinkGeneratorDialog,
        GizmoButton,
        GizmoDialog,
    },
    data() {
        return {
            open: false,
            monitor: {
                group_index: 0,
                id: null,
                isClickAble: false,
                monitor_index: 0,
                name: "",
                url: "",
            } as PublicMonitorSelection,
        };
    },
    methods: {
        /**
         * Show settings for a public status-page monitor.
         * @param {object} group Monitor group wrapper
         * @param {object} monitor Monitor wrapper
         * @returns {void}
         */
        show(group: PublicMonitorGroup, monitor: PublicMonitorWrapper) {
            this.monitor = {
                id: monitor.element.id,
                name: monitor.element.name,
                monitor_index: monitor.index,
                group_index: group.index,
                isClickAble: this.showLink(monitor),
                url: monitor.element.url,
            };
            this.open = true;
        },

        /**
         * Synchronize the controlled dialog state.
         * @param {boolean} open Next open state
         * @returns {void}
         */
        setOpen(open: boolean) {
            this.open = open;
        },

        /**
         * Open the legacy badge dialog after releasing this dialog's focus scope.
         * @returns {void}
         */
        openBadgeGenerator() {
            this.open = false;
            this.$nextTick(() => {
                if (this.monitor.id !== null) {
                    (this.$refs.badgeLinkGeneratorDialog as BadgeDialogRef).show(this.monitor.id, this.monitor.name);
                }
            });
        },

        /**
         * Toggle whether the public status page exposes the monitor URL.
         * @param {number} groupIndex Group index
         * @param {number} index Monitor index
         * @returns {void}
         */
        toggleLink(groupIndex: number, index: number) {
            const root = this.$root as unknown as MonitorSettingRoot;
            const target = root.publicGroupList[groupIndex].monitorList[index];
            target.sendUrl = !target.sendUrl;
        },

        /**
         * Determine whether a public monitor link should be shown.
         * @param {object} monitor Monitor wrapper
         * @returns {boolean} Whether the link should be shown
         */
        showLink(monitor: PublicMonitorWrapper) {
            return Boolean(
                monitor.element.sendUrl &&
                    monitor.element.url &&
                    monitor.element.url !== "https://"
            );
        },

        /**
         * Store a custom monitor URL from its input event.
         * @param {Event} event URL input event
         * @returns {void}
         */
        changeUrlFromEvent(event: Event) {
            const value = (event.target as HTMLInputElement).value;
            const root = this.$root as unknown as MonitorSettingRoot;
            const target = root.publicGroupList[this.monitor.group_index].monitorList[this.monitor.monitor_index];
            target.url = value;
            this.monitor.url = value;
        },
    },
};
</script>
