<template>
    <div class="about-layout">
        <div class="logo">
            <img class="about-logo" width="200" height="200" src="/icon-512x512.png" :alt="$root.appName" />
            <div class="about-title">Uptime Gizmo</div>
            <div>{{ $t("versionIs", { version: $root.info.version }) }}</div>
            <div class="frontend-version">{{ $t("frontendVersionIs", { version: $root.frontendVersion }) }}</div>

            <GizmoAlert v-if="!$root.isFrontendBackendVersionMatched" class="about-version-alert" tone="warning">
                <template #icon><font-awesome-icon icon="exclamation-triangle" /></template>
                {{ $t("Frontend Version do not match backend version!") }}
            </GizmoAlert>

            <div class="update-link">
                <a href="https://github.com/starit/uptime-gizmo/releases" target="_blank" rel="noopener">
                    {{ $t("Check Update On GitHub") }}
                </a>
            </div>

            <div class="about-settings">
                <GizmoSwitch v-model="settings.checkUpdate" @change="saveSettings()">
                    {{ $t("Show update if available") }}
                </GizmoSwitch>

                <GizmoSwitch v-model="settings.checkBeta" :disabled="!settings.checkUpdate" @change="saveSettings()">
                    {{ $t("Also check beta release") }}
                </GizmoSwitch>
            </div>
            <div class="about-license">
                <p>
                    {{ $t("Font Twemoji by Twitter licensed under") }}
                    <a href="https://creativecommons.org/licenses/by/4.0/">CC-BY 4.0</a>
                </p>
            </div>
        </div>
    </div>
</template>

<script>
import GizmoAlert from "../gizmo/GizmoAlert.vue";
import GizmoSwitch from "../gizmo/GizmoSwitch.vue";

export default {
    components: {
        GizmoAlert,
        GizmoSwitch,
    },
    computed: {
        settings() {
            return this.$parent.$parent.$parent.settings;
        },
        saveSettings() {
            return this.$parent.$parent.$parent.saveSettings;
        },
        settingsLoaded() {
            return this.$parent.$parent.$parent.settingsLoaded;
        },
    },

    watch: {},
};
</script>

<style lang="scss" scoped>
.logo {
    display: grid;
    justify-items: center;
    gap: 0.5rem;
    margin: 4em 1em;
    text-align: center;
}

.about-layout {
    display: flex;
    justify-content: center;
}

.about-logo {
    margin-block: 1.5rem;
}

.about-title {
    font-size: 1.25rem;
    font-weight: 700;
}

.about-version-alert,
.update-link,
.about-license {
    margin-top: 1rem;
}

.about-settings {
    display: grid;
    justify-items: start;
    gap: 0.25rem;
    margin-top: 0.25rem;
}

.update-link {
    font-size: 0.8em;
}

.frontend-version {
    font-size: 0.9em;
    color: var(--color-text-muted);
}
</style>
