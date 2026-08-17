<template>
    <section class="gizmo-empty-state">
        <div v-if="$slots.icon" class="gizmo-empty-state__icon" aria-hidden="true"><slot name="icon" /></div>
        <h2 v-if="title" class="gizmo-empty-state__title">{{ title }}</h2>
        <p v-if="description" class="gizmo-empty-state__description">{{ description }}</p>
        <div v-if="$slots.actions" class="gizmo-empty-state__actions"><slot name="actions" /></div>
    </section>
</template>

<script>
export default {
    props: {
        title: {
            type: String,
            default: "",
        },
        description: {
            type: String,
            default: "",
        },
    },
};
</script>
