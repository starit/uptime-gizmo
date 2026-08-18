<template>
    <div class="tw-mb-3">
        <label for="zcliq-webhookurl" class="gizmo-field-label">{{ $t("Webhook URL") }}</label>
        <input
            id="zcliq-webhookurl"
            v-model="$parent.notification.webhookUrl"
            type="text"
            class="gizmo-native-control"
            required
        />
        <i18n-t tag="div" keypath="wayToGetZohoCliqURL" class="gizmo-field-help">
            <a href="https://www.zoho.com/cliq/help/platform/webhook-tokens.html" target="_blank">{{ $t("here") }}</a>
        </i18n-t>
    </div>
</template>
