<template>
    <GizmoDialog
        :open="open"
        size="sm"
        :title="$t('New Group')"
        :close-label="$t('Close')"
        :close-on-backdrop="false"
        @update:open="setOpen"
    >
        <form id="create-monitor-group-form" @submit.prevent="confirm">
            <label for="draftGroupName" class="form-label">{{ $t("Group Name") }}</label>
            <input
                id="draftGroupName"
                v-model.trim="groupName"
                type="text"
                class="form-control"
                required
                autofocus
            />
        </form>

        <template #footer>
            <GizmoButton variant="secondary" @click="setOpen(false)">
                {{ $t("Cancel") }}
            </GizmoButton>
            <GizmoButton
                form="create-monitor-group-form"
                type="submit"
                :disabled="!groupName"
            >
                {{ $t("Confirm") }}
            </GizmoButton>
        </template>
    </GizmoDialog>
</template>

<script lang="ts">
import GizmoButton from "./gizmo/GizmoButton.vue";
import GizmoDialog from "./gizmo/GizmoDialog.vue";

export default {
    components: {
        GizmoButton,
        GizmoDialog,
    },
    emits: ["added"],
    data() {
        return {
            open: false,
            groupName: "",
        };
    },
    methods: {
        show() {
            this.groupName = "";
            this.open = true;
        },
        setOpen(open: boolean) {
            this.open = open;
        },
        confirm() {
            if (!this.groupName) {
                return;
            }
            this.$emit("added", this.groupName);
            this.open = false;
        },
    },
};
</script>
