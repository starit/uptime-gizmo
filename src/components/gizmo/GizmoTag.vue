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
            default: "var(--color-tag-default)",
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
                "--gizmo-tag-fg": this.foregroundColor,
            };
        },
        foregroundColor() {
            if (typeof this.color !== "string") {
                return "var(--color-tag-text-light)";
            }

            const match = this.color.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
            if (!match) {
                return "var(--color-tag-text-light)";
            }

            const hex = match[1].length === 3
                ? match[1].split("").map((character) => character + character).join("")
                : match[1];
            const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
            const linear = channels.map((channel) => channel <= 0.04045
                ? channel / 12.92
                : ((channel + 0.055) / 1.055) ** 2.4);
            const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];

            return luminance > 0.2 ? "var(--color-tag-text-dark)" : "var(--color-tag-text-light)";
        },
    },
};
</script>
