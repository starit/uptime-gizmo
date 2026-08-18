<template>
    <img :src="src" :alt="$root.appName" />
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from "vue";

/*
 * The horizontal wordmark exists in two cuts. The light one carries dark
 * lettering for pale surfaces; the dark one carries white lettering and is
 * derived with a transparent plate so it sits on any dark surface without a
 * black rectangle behind it.
 *
 * Theme comes from the root instance's theme mixin, which is what drives the
 * light/dark class on <body>, so the logo follows a runtime theme change with
 * no reload.
 */
const root = getCurrentInstance()?.proxy?.$root as { isDark?: boolean } | undefined;

const src = computed(() =>
    root?.isDark
        ? "/images/uptime-gizmo-logo-horizontal-on-dark.png"
        : "/images/uptime-gizmo-logo-horizontal-light.png",
);
</script>
