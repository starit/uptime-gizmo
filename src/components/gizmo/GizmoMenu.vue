<template>
    <div class="gizmo-menu-anchor">
        <DropdownMenuRoot v-slot="{ open }">
            <DropdownMenuTrigger as-child>
                <slot name="trigger" :open="open" />
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
                <DropdownMenuContent
                    class="gizmo-menu"
                    :align="align"
                    :side-offset="sideOffset"
                    :collision-padding="8"
                >
                    <slot />
                </DropdownMenuContent>
            </DropdownMenuPortal>
        </DropdownMenuRoot>
    </div>
</template>

<script setup lang="ts">
import {
    DropdownMenuContent,
    DropdownMenuPortal,
    DropdownMenuRoot,
    DropdownMenuTrigger,
} from "reka-ui";

withDefaults(
    defineProps<{
        align?: "start" | "center" | "end";
        sideOffset?: number;
    }>(),
    {
        align: "start",
        sideOffset: 6,
    },
);
</script>
