<template>
    <div class="tw-mb-3">
        <label for="signl4-webhook-url" class="gizmo-field-label">{{ $t("SIGNL4 Webhook URL") }}</label>
        <input
            id="signl4-webhook-url"
            v-model="$parent.notification.webhookURL"
            type="url"
            pattern="https?://.+"
            class="gizmo-native-control"
            required
        />
        <i18n-t tag="div" keypath="signl4Docs" class="gizmo-field-help">
            <a href="https://docs.signl4.com/integrations/uptime-kuma/uptime-kuma.html" target="_blank">SIGNL4 Docs</a>
        </i18n-t>
    </div>
</template>
