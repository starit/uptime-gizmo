<template>
    <component :is="form" />
</template>

<script lang="ts">
import { defineComponent, type Component, type PropType } from "vue";

/*
 * Mount point for the per-provider notification forms.
 *
 * Every one of them still reads `$parent.notification`, so this component has
 * to stay open on its public instance. That rules out `<script setup>`: Vue
 * marks such components closed by setting an empty `exposed`, and `$parent`
 * then hands the child an expose proxy where the prop is invisible. Options API
 * keeps props reachable through the normal public-instance lookup.
 *
 * The prop exists only to serve that legacy lookup. Migrate the forms to props
 * and events, then delete both it and this component.
 */
export default defineComponent({
    name: "NotificationFormHost",
    props: {
        form: {
            type: Object as PropType<Component | null>,
            default: null,
        },
        notification: {
            type: Object as PropType<Record<string, unknown>>,
            required: true,
        },
    },
});
</script>
