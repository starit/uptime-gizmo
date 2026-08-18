<template>
    <div class="tw-mb-3">
        <label for="webhook-url" class="gizmo-field-label">{{ $t("Host URL") }}</label>
        <input
            id="webhook-url"
            v-model="$parent.notification.webhookURL"
            type="url"
            pattern="https?://.+"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">
            <i18n-t tag="p" keypath="Read more:">
                <a href="https://docs.keephq.dev/providers/documentation/uptimekuma-provider" target="_blank">
                    https://docs.keephq.dev/providers/documentation/uptimekuma-provider
                </a>
            </i18n-t>
        </div>
    </div>

    <div class="tw-mb-3">
        <label for="webhook-apikey" class="gizmo-field-label">{{ $t("API Key") }}</label>
        <HiddenInput id="webhook-apikey" v-model="$parent.notification.webhookAPIKey" :required="true"></HiddenInput>
    </div>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";

export default {
    components: {
        HiddenInput,
    },
    mounted() {
        this.$parent.notification.webhookURL ||= "";
    },
};
</script>
