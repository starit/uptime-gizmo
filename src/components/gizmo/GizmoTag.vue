<template>
    <span
        class="gizmo-tag"
        :class="[`gizmo-tag--${size}`, { 'is-constrained': constrained, 'is-scrollable': scrollable }]"
        :style="tagStyle"
    >
        <span class="gizmo-tag__text">{{ label }}</span>
        <button v-if="removable" type="button" class="gizmo-tag__remove gizmo-focus-ring" :aria-label="removeLabel" @click="$emit('remove')">
            <font-awesome-icon icon="times" aria-hidden="true" />
        </button>
    </span>
</template>

<script>
export default {
    props: {
        label: {
            type: String,
            required: true,
        },
        color: {
            type: String,
            default: "var(--color-text-muted)",
        },
        size: {
            type: String,
            default: "normal",
            validator: (value) => ["normal", "sm"].includes(value),
        },
        removable: Boolean,
        removeLabel: {
            type: String,
            default: "",
        },
        scrollable: Boolean,
        constrained: Boolean,
    },
    emits: ["remove"],
    computed: {
        tagStyle() {
            return {
                "--gizmo-tag-bg": this.color,
            };
        },
    },
};
</script>
