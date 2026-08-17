<template>
    <section class="gizmo-panel" :class="[`gizmo-panel--${density}`, { 'has-full-width-footer': footerFullWidth }]">
        <header v-if="$slots.header || $slots.actions" class="gizmo-panel__header">
            <div class="gizmo-panel__heading"><slot name="header" /></div>
            <div v-if="$slots.actions" class="gizmo-panel__actions"><slot name="actions" /></div>
        </header>
        <div class="gizmo-panel__body"><slot /></div>
        <footer v-if="$slots.footer" class="gizmo-panel__footer"><slot name="footer" /></footer>
    </section>
</template>

<script>
export default {
    props: {
        density: {
            type: String,
            default: "default",
            validator: (value) => ["compact", "default"].includes(value),
        },
        footerFullWidth: Boolean,
    },
};
</script>
