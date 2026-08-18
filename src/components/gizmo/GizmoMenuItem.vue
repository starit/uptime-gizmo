<template>
    <DropdownMenuItem
        class="gizmo-menu__item"
        :class="{ 'gizmo-menu__item--danger': variant === 'danger' }"
        :as-child="asChild"
        :disabled="disabled"
        @select="emit('select', $event)"
    >
        <slot />
    </DropdownMenuItem>
</template>

<script setup lang="ts">
/* eslint-disable vue/require-explicit-emits -- The installed Vue ESLint plugin does not understand typed defineEmits. */
import { DropdownMenuItem } from "reka-ui";

withDefaults(
    defineProps<{
        asChild?: boolean;
        disabled?: boolean;
        variant?: "default" | "danger";
    }>(),
    {
        asChild: false,
        disabled: false,
        variant: "default",
    },
);

const emit = defineEmits<{
    select: [event: Event];
}>();
</script>
