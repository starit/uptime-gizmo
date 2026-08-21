<template>
    <div class="incident-group" data-testid="incident-group">
        <div v-if="loading && incidents.length === 0" class="tw-text-center tw-py-4">
            <div class="gizmo-spinner-inline tw-text-interactive" role="status">
                <span class="gizmo-visually-hidden">{{ $t("Loading...") }}</span>
            </div>
        </div>

        <div v-else-if="incidents.length === 0" class="tw-text-center tw-py-4 tw-text-content-muted">
            {{ $t("No incidents recorded") }}
        </div>

        <div v-else class="incident-list">
            <div
                v-for="incident in incidents"
                :key="incident.id"
                class="incident-item"
                :class="{ resolved: !incident.active }"
            >
                <div class="incident-style-indicator" :class="indicatorClass(incident.style)"></div>
                <div class="incident-body">
                    <div class="incident-header tw-flex tw-justify-between tw-items-start">
                        <h5 class="incident-title tw-mb-0">{{ incident.title }}</h5>
                        <div v-if="editMode" class="incident-actions">
                            <button
                                v-if="incident.active"
                                class="gizmo-native-button gizmo-native-button--success gizmo-native-button--sm tw-me-1"
                                :title="$t('Resolve')"
                                :aria-label="$t('Resolve')"
                                @click="$emit('resolve-incident', incident)"
                            >
                                <font-awesome-icon icon="check" />
                            </button>
                            <button
                                class="gizmo-native-button gizmo-native-button--outline gizmo-native-button--sm tw-me-1"
                                :title="$t('Edit')"
                                :aria-label="$t('Edit')"
                                @click="$emit('edit-incident', incident)"
                            >
                                <font-awesome-icon icon="edit" />
                            </button>
                            <button
                                class="gizmo-native-button gizmo-native-button--danger-outline gizmo-native-button--sm"
                                :title="$t('Delete')"
                                :aria-label="$t('Delete')"
                                @click="$emit('delete-incident', incident)"
                            >
                                <font-awesome-icon icon="trash" />
                            </button>
                        </div>
                    </div>
                    <!-- eslint-disable-next-line vue/no-v-html-->
                    <div class="incident-content tw-mt-1" v-html="getIncidentHTML(incident.content)"></div>
                    <div class="incident-meta tw-text-content-muted tw-text-sm tw-mt-2">
                        <div>{{ $t("createdAt", { date: datetime(incident.createdDate) }) }}</div>
                        <div v-if="incident.lastUpdatedDate">
                            {{ $t("lastUpdatedAt", { date: datetime(incident.lastUpdatedDate) }) }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { marked } from "marked";
import DOMPurify from "dompurify";
import datetimeMixin from "../mixins/datetime";

export default {
    name: "IncidentHistory",
    mixins: [datetimeMixin],
    props: {
        incidents: {
            type: Array,
            default: () => [],
        },
        editMode: {
            type: Boolean,
            default: false,
        },
        loading: {
            type: Boolean,
            default: false,
        },
    },
    emits: ["edit-incident", "delete-incident", "resolve-incident"],
    methods: {
        /**
         * The colour strip for an incident's style.
         *
         * These used to be bg-warning and friends — Bootstrap utilities, removed
         * with Bootstrap, so the strip has been colourless ever since. Written
         * out rather than built from the value, for the same reason the banner
         * is: a class the build cannot see is a class the build removes.
         * @param {string} style the style stored on the incident
         * @returns {string} a class defined in this component
         */
        indicatorClass(style) {
            return {
                info: "incident-style-indicator--info",
                warning: "incident-style-indicator--warning",
                danger: "incident-style-indicator--danger",
                primary: "incident-style-indicator--info",
                light: "incident-style-indicator--light",
                dark: "incident-style-indicator--dark",
            }[style] ?? "incident-style-indicator--info";
        },

        /**
         * Get sanitized HTML for incident content
         * @param {string} content - Markdown content
         * @returns {string} Sanitized HTML
         */
        getIncidentHTML(content) {
            if (content != null) {
                return DOMPurify.sanitize(marked(content));
            }
            return "";
        },
    },
};
</script>

<style lang="scss" scoped>

.incident-group {
    padding: 0.75rem;

    .incident-list {
        .incident-item {
            display: flex;
            padding: 0.875rem;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            background: var(--color-surface);
            transition: background-color 160ms ease, border-color 160ms ease;

            & + .incident-item {
                margin-top: 0.625rem;
            }

            &:hover {
                background-color: var(--color-surface-hover);
                border-color: var(--color-border-strong);
            }

            &.resolved {
                opacity: 0.7;
            }

            .incident-style-indicator {
                background: var(--color-border-strong);
                width: 6px;
                min-height: 100%;
                border-radius: var(--radius-pill);
                flex-shrink: 0;
                margin-right: 0.75rem;

                &--info { background: var(--color-interactive); }
                &--warning { background: var(--status-degraded); }
                &--danger { background: var(--status-down); }
                &--light { background: var(--color-border-strong); }
                &--dark { background: var(--color-text); }
            }

            .incident-body {
                flex: 1;
                min-width: 0;
            }

            .incident-meta {
                font-size: 0.75rem;
            }
        }
    }
}

</style>
