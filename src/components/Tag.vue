<template>
    <GizmoTag
        :label="displayText"
        :color="item.color"
        :size="size"
        :removable="remove != null"
        :remove-label="$t('Delete')"
        :scrollable="scrollable"
        :constrained="constrained"
        @remove="remove(item)"
    />
</template>

<script>
import GizmoTag from "./gizmo/GizmoTag.vue";

/**
 * @typedef {import('./TagsManager.vue').Tag} Tag
 */

export default {
    components: {
        GizmoTag,
    },
    props: {
        /**
         * Object representing tag
         * @type {Tag}
         */
        item: {
            type: Object,
            required: true,
        },
        /** Function to remove tag */
        remove: {
            type: Function,
            default: null,
        },
        /**
         * Size of tag
         * @type {"normal" | "small"}
         */
        size: {
            type: String,
            default: "normal",
        },
        /**
         * Whether the tag text should be horizontally scrollable
         * instead of truncated with ellipsis.
         */
        scrollable: {
            type: Boolean,
            default: false,
        },
        /**
         * Whether the tag should be constrained to its parent's width.
         */
        constrained: {
            type: Boolean,
            default: false,
        },
    },
    computed: {
        displayText() {
            if (this.item.value === "" || this.item.value === undefined || this.item.value === null) {
                return this.item.name;
            } else {
                return `${this.item.name}: ${this.item.value}`;
            }
        },
    },
};
</script>
