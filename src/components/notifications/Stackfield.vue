<template>
    <div class="tw-mb-3">
        <label for="stackfield-webhook-url" class="gizmo-field-label">
            {{ $t("Webhook URL") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input
            id="stackfield-webhook-url"
            v-model="$parent.notification.stackfieldwebhookURL"
            type="text"
            class="gizmo-native-control"
            required
        />

        <div class="gizmo-field-help">
            <span style="color: red"><sup>*</sup></span>
            {{ $t("Required") }}
            <i18n-t tag="p" keypath="aboutWebhooks" style="margin-top: 8px">
                <a href="https://www.stackfield.com/developer-api#AnchorAPI2" target="_blank">
                    https://www.stackfield.com/developer-api#AnchorAPI2
                </a>
            </i18n-t>
        </div>
    </div>
</template>
