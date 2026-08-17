<template>
    <GizmoStatusBadge :tone="tone" :text="text" />
</template>

<script>
import GizmoStatusBadge from "./gizmo/GizmoStatusBadge.vue";

export default {
    components: {
        GizmoStatusBadge,
    },
    props: {
        /** Current status of monitor */
        status: {
            type: Number,
            default: 0,
        },
    },

    computed: {
        tone() {
            if (this.status === 0) {
                return "down";
            }

            if (this.status === 1) {
                return "up";
            }

            if (this.status === 2) {
                return "degraded";
            }

            if (this.status === 3) {
                return "maintenance";
            }

            return "unknown";
        },

        text() {
            if (this.status === 0) {
                return this.$t("Down");
            }

            if (this.status === 1) {
                return this.$t("Up");
            }

            if (this.status === 2) {
                return this.$t("Pending");
            }

            if (this.status === 3) {
                return this.$t("statusMaintenance");
            }

            return this.$t("Unknown");
        },
    },
};
</script>
