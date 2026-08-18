<template>
    <div class="tw-mb-3">
        <label for="alertnow-webhook-url" class="gizmo-field-label">
            {{ $t("Webhook URL") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input
            id="alertnow-webhook-url"
            v-model="$parent.notification.alertNowWebhookURL"
            type="text"
            class="gizmo-native-control"
            required
        />

        <div class="gizmo-field-help">
            <span style="color: red"><sup>*</sup></span>
            {{ $t("Required") }}
            <i18n-t tag="p" keypath="aboutWebhooks" style="margin-top: 8px">
                <a
                    href="https://service.opsnow.com/docs/alertnow/en/user-guide-alertnow-en.html#standard"
                    target="_blank"
                >
                    {{ $t("here") }}
                </a>
            </i18n-t>
        </div>
    </div>
</template>
