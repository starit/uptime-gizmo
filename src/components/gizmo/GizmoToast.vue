<template>
    <section class="gizmo-toast" :class="`gizmo-toast--${tone}`" :role="role" aria-live="polite">
        <div v-if="$slots.icon" class="gizmo-toast__icon" aria-hidden="true"><slot name="icon" /></div>
        <div class="gizmo-toast__message"><slot /></div>
        <button v-if="dismissLabel" type="button" class="gizmo-toast__dismiss gizmo-focus-ring" :aria-label="dismissLabel" @click="$emit('dismiss')">
            <font-awesome-icon icon="times" aria-hidden="true" />
        </button>
    </section>
</template>

<script>
export default {
    props: {
        tone: {
            type: String,
            default: "info",
            validator: (value) => ["info", "success", "warning", "danger"].includes(value),
        },
        dismissLabel: {
            type: String,
            default: "",
        },
        role: {
            type: String,
            default: "status",
        },
    },
    emits: ["dismiss"],
};
</script>
