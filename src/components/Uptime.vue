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
.uptime-pill {
    min-width: 62px;
    display: inline-flex;
    justify-content: center;
    padding: 0.2rem 0.5rem;
    border: 1px solid var(--status-unknown-border);
    border-radius: var(--radius-pill);
    color: var(--status-unknown-fg);
    background: var(--status-unknown-bg);
}

.uptime-pill-up {
    border-color: var(--status-up-border);
    color: var(--status-up-fg);
    background: var(--status-up-bg);
}

.uptime-pill-danger {
    border-color: var(--status-down-border);
    color: var(--status-down-fg);
    background: var(--status-down-bg);
}

.uptime-pill-warning {
    border-color: var(--status-degraded-border);
    color: var(--status-degraded-fg);
    background: var(--status-degraded-bg);
}

.uptime-pill-maintenance {
    border-color: var(--status-maintenance-border);
    color: var(--status-maintenance-fg);
    background: var(--status-maintenance-bg);
}
</style>
