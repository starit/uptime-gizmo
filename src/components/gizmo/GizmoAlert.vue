<template>
    <section class="gizmo-alert" :class="`gizmo-alert--${tone}`" :role="role">
        <div v-if="$slots.icon" class="gizmo-alert__icon" aria-hidden="true"><slot name="icon" /></div>
        <div class="gizmo-alert__content">
            <div v-if="$slots.title" class="gizmo-alert__title"><slot name="title" /></div>
            <div class="gizmo-alert__message"><slot /></div>
        </div>
        <div v-if="$slots.actions" class="gizmo-alert__actions"><slot name="actions" /></div>
    </section>
</template>

<script>
export default {
    props: {
        tone: {
            type: String,
            default: "info",
            validator: (value) => ["info", "success", "warning", "danger", "maintenance"].includes(value),
        },
        role: {
            type: String,
            default: "alert",
        },
    },
};
</script>
