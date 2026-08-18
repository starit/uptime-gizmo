<template>
    <div class="tw-mb-3">
        <label for="flowtriq-webhook-url" class="gizmo-field-label">
            {{ $t("Flowtriq Webhook URL") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input
            id="flowtriq-webhook-url"
            v-model="$parent.notification.flowtriqWebhookUrl"
            type="url"
            class="gizmo-native-control"
            required
            autocomplete="false"
            placeholder="https://app.flowtriq.com/api/webhooks/..."
        />
    </div>
    <div class="tw-mb-3">
        <label for="flowtriq-api-key" class="gizmo-field-label">
            {{ $t("Flowtriq API Key") }}
        </label>
        <HiddenInput
            id="flowtriq-api-key"
            v-model="$parent.notification.flowtriqApiKey"
            autocomplete="false"
            :placeholder="$t('Optional')"
        />
        <div class="gizmo-field-help">
            {{ $t("flowtriqApiKeyDescription") }}
        </div>
    </div>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";
export default {
    components: {
        HiddenInput,
    },
    mounted() {},
};
</script>
