<template>
    <div class="tw-mb-3">
        <label for="bitrix24-webhook-url" class="gizmo-field-label">{{ $t("Bitrix24 Webhook URL") }}</label>
        <HiddenInput
            id="bitrix24-webhook-url"
            v-model="$parent.notification.bitrix24WebhookURL"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <i18n-t tag="div" keypath="wayToGetBitrix24Webhook" class="gizmo-field-help">
            <a href="https://helpdesk.bitrix24.com/open/12357038/" target="_blank">
                https://helpdesk.bitrix24.com/open/12357038/
            </a>
        </i18n-t>
    </div>

    <div class="tw-mb-3">
        <label for="bitrix24-user-id" class="gizmo-field-label">{{ $t("User ID") }}</label>
        <input
            id="bitrix24-user-id"
            v-model="$parent.notification.bitrix24UserID"
            type="text"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">{{ $t("bitrix24SupportUserID") }}</div>
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
