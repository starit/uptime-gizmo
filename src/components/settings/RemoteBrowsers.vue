<template>
    <div>
        <div class="dockerHost-list tw-my-4">
            <p v-if="$root.remoteBrowserList.length === 0">
                {{ $t("Not available, please setup.") }}
            </p>

            <ul class="gizmo-list-group tw-mb-3" style="border-radius: 1rem">
                <li v-for="(remoteBrowser, index) in $root.remoteBrowserList" :key="index" class="gizmo-list-group__item">
                    {{ remoteBrowser.name }}
                    <br />
                    <a href="#" @click="$refs.remoteBrowserDialog.show(remoteBrowser.id)">{{ $t("Edit") }}</a>
                </li>
            </ul>

            <button class="gizmo-native-button gizmo-native-button--primary tw-me-2" type="button" @click="$refs.remoteBrowserDialog.show()">
                <font-awesome-icon icon="plus" />
                {{ $t("Add Remote Browser") }}
            </button>
        </div>

        <div class="tw-my-4 tw-pt-4">
            <h5 class="tw-my-4 settings-subheading">{{ $t("What is a Remote Browser?") }}</h5>
            <p>
                {{ $t("remoteBrowsersDescription") }}
                <a href="https://hub.docker.com/r/browserless/chrome">{{ $t("self-hosted container") }}</a>
            </p>
        </div>

        <RemoteBrowserDialog ref="remoteBrowserDialog" />
    </div>
</template>

<script>
import RemoteBrowserDialog from "../../components/RemoteBrowserDialog.vue";

export default {
    components: {
        RemoteBrowserDialog,
    },

    data() {
        return {};
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
};
</script>
