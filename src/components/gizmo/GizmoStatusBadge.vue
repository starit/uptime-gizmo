<template>
    <span class="gizmo-status gizmo-compact-data" :class="`gizmo-status--${tone}`">
        <span class="gizmo-status__dot" aria-hidden="true"></span>
        <slot>{{ text }}</slot>
    </span>
</template>

<script>
export default {
    props: {
        tone: {
            type: String,
            required: true,
            validator: (value) => ["up", "degraded", "down", "maintenance", "unknown"].includes(value),
        },
        text: {
            type: String,
            default: "",
        },
    },
};
</script>
