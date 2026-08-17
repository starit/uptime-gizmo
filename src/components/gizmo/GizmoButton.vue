<template>
    <button
        :type="type"
        class="gizmo-button gizmo-focus-ring"
        :class="[variantClass, sizeClass, { 'is-loading': loading, 'is-icon-only': iconOnly }]"
        :disabled="disabled || loading"
        :aria-busy="loading || undefined"
        @click="$emit('click', $event)"
    >
        <span v-if="loading" class="gizmo-button__spinner" aria-hidden="true"></span>
        <span class="gizmo-button__content"><slot /></span>
    </button>
</template>

<script>
export default {
    props: {
        type: {
            type: String,
            default: "button",
        },
        variant: {
            type: String,
            default: "primary",
            validator: (value) => ["primary", "secondary", "outline", "ghost", "danger"].includes(value),
        },
        size: {
            type: String,
            default: "md",
            validator: (value) => ["sm", "md"].includes(value),
        },
        disabled: Boolean,
        loading: Boolean,
        iconOnly: Boolean,
    },
    emits: ["click"],
    computed: {
        variantClass() {
            return `gizmo-button--${this.variant}`;
        },
        sizeClass() {
            return `gizmo-button--${this.size}`;
        },
    },
};
</script>
