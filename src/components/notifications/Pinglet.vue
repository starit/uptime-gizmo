<template>
    <div class="tw-mb-3">
        <label for="pinglet-publish-url" class="gizmo-field-label">
            {{ $t("Pinglet Topic URL") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input
            id="pinglet-publish-url"
            v-model="$parent.notification.pingletPublishUrl"
            type="url"
            class="gizmo-native-control"
            required
            autocomplete="false"
            placeholder="https://app.pinglet.co.uk/your-namespace/alerts"
        />
        <div class="gizmo-field-help">
            {{ $t("pingletTopicUrlDescription") }}
        </div>
    </div>
    <div class="tw-mb-3">
        <label for="pinglet-api-key" class="gizmo-field-label">
            {{ $t("API Key") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <HiddenInput
            id="pinglet-api-key"
            v-model="$parent.notification.pingletApiKey"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
    </div>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";

export default {
    components: {
        HiddenInput,
    },
};
</script>
