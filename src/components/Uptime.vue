<template>
    <span :class="className" :title="title">{{ uptime }}</span>
</template>

<script>
import { DOWN, MAINTENANCE, PENDING, UP } from "../util.ts";

export default {
    props: {
        /** Monitor this represents */
        monitor: {
            type: Object,
            default: null,
        },
        /** Type of monitor */
        type: {
            type: String,
            default: null,
        },
        /** Is this a pill? */
        pill: {
            type: Boolean,
            default: false,
        },
    },

    computed: {
        uptime() {
            if (this.type === "maintenance") {
                return this.$t("statusMaintenance");
            }

            let key = this.monitor.id + "_" + this.type;

            if (this.$root.uptimeList[key] !== undefined) {
                let result = Math.round(this.$root.uptimeList[key] * 10000) / 100;
                // Only perform sanity check on status page. See starit/uptime-gizmo#2628
                if (this.$route.path.startsWith("/status") && result > 100) {
                    return "100%";
                } else {
                    return result + "%";
                }
            }

            return this.$t("notAvailableShort");
        },

        color() {
            if (this.lastHeartBeat.status === MAINTENANCE) {
                return "maintenance";
            }

            if (this.lastHeartBeat.status === DOWN) {
                return "danger";
            }

            if (this.lastHeartBeat.status === UP) {
                return "up";
            }

            if (this.lastHeartBeat.status === PENDING) {
                return "warning";
            }

            return "secondary";
        },

        lastHeartBeat() {
            if (this.monitor.id in this.$root.lastHeartbeatList && this.$root.lastHeartbeatList[this.monitor.id]) {
                return this.$root.lastHeartbeatList[this.monitor.id];
            }

            return {
                status: -1,
            };
        },

        className() {
            if (this.pill) {
                return `uptime-pill uptime-pill-${this.color}`;
            }

            return "";
        },

        title() {
            if (this.type === "1y") {
                return this.$t("years", 1);
            }
            if (this.type === "720") {
                return this.$t("days", 30);
            }
            return this.$t("hours", 24);
        },
    },
};
</script>

<style scoped>
/*
 * A percentage is a figure, so it reads as one: tabular, aligned, tinted by
 * state. The capsule with a border around it was badge chrome that added
 * weight without adding meaning.
 */
.uptime-pill {
    min-width: 3.25rem;
    display: inline-flex;
    justify-content: flex-end;
    padding: 0;
    border: 0;
    background: none;
    color: var(--status-unknown-fg);
    font-size: 0.8125rem;
    font-weight: var(--weight-semibold);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
}

.uptime-pill-up {
    color: var(--status-up-fg);
}

.uptime-pill-danger {
    color: var(--status-down-fg);
}

.uptime-pill-warning {
    color: var(--status-degraded-fg);
}

.uptime-pill-maintenance {
    color: var(--status-maintenance-fg);
}
</style>
