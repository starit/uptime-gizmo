<template>
    <GizmoDialog
        :open="open"
        size="lg"
        :title="$t('Browser Screenshot')"
        :close-label="$t('Close')"
        @update:open="setOpen"
    >
        <img class="gizmo-dialog-screenshot" :src="imageURL" :alt="$t('screenshot of the website')" />
    </GizmoDialog>
</template>

<script lang="ts">
import GizmoDialog from "./gizmo/GizmoDialog.vue";

export default {
    components: {
        GizmoDialog,
    },
    props: {
        imageURL: {
            type: String,
            required: true,
        },
    },
    data() {
        return {
            open: false,
        };
    },
    methods: {
        show() {
            this.open = true;
        },
        setOpen(open: boolean) {
            this.open = open;
        },
    },
};
</script>
