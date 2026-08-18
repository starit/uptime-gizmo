<template>
    <component :is="form" />
</template>

<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
    form: Component | null;
    notification: Record<string, unknown>;
}>();
</script>
