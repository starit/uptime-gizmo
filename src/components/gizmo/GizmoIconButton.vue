<template>
    <GizmoButton
        :type="type"
        :variant="variant"
        :size="size"
        :disabled="disabled"
        :loading="loading"
        :aria-label="label"
        :icon-only="true"
        @click="$emit('click', $event)"
    >
        <slot />
    </GizmoButton>
</template>

<script>
import GizmoButton from "./GizmoButton.vue";

export default {
    components: {
        GizmoButton,
    },
    props: {
        label: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            default: "button",
        },
        variant: {
            type: String,
            default: "outline",
        },
        size: {
            type: String,
            default: "md",
        },
        disabled: Boolean,
        loading: Boolean,
    },
    emits: ["click"],
};
</script>
