<template>
    <div class="tw-mb-3">
        <label for="twilio-account-sid" class="gizmo-field-label">{{ $t("twilioAccountSID") }}</label>
        <input
            id="twilio-account-sid"
            v-model="$parent.notification.twilioAccountSID"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>

    <div class="tw-mb-3">
        <label for="twilio-apikey-token" class="gizmo-field-label">{{ $t("twilioApiKey") }}</label>
        <input id="twilio-apikey-token" v-model="$parent.notification.twilioApiKey" type="text" class="gizmo-native-control" />
        <div class="gizmo-field-help">{{ $t("twilioApiKeyHelptext") }}</div>
    </div>

    <div class="tw-mb-3">
        <label for="twilio-messaging-service-sid" class="gizmo-field-label">{{ $t("twilioMessagingServiceSID") }}</label>
        <input
            id="twilio-messaging-service-sid"
            v-model="$parent.notification.twilioMessagingServiceSID"
            type="text"
            class="gizmo-native-control"
        />
        <i18n-t key="twilioMessagingServiceSIDHelptext" tag="div" class="gizmo-field-help">
            <template #twillo_messaging_service_help_link>
                <a href="https://help.twilio.com/articles/223134387-What-is-a-Message-SID-" target="_blank">
                    Twilio Messaging Service
                </a>
            </template>
        </i18n-t>
    </div>

    <div class="tw-mb-3">
        <label for="twilio-auth-token" class="gizmo-field-label">{{ $t("twilioAuthToken") }}</label>
        <input
            id="twilio-auth-token"
            v-model="$parent.notification.twilioAuthToken"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>

    <div class="tw-mb-3">
        <label for="twilio-from-number" class="gizmo-field-label">{{ $t("twilioFromNumber") }}</label>
        <input
            id="twilio-from-number"
            v-model="$parent.notification.twilioFromNumber"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>

    <div class="tw-mb-3">
        <label for="twilio-to-number" class="gizmo-field-label">{{ $t("twilioToNumber") }}</label>
        <input
            id="twilio-to-number"
            v-model="$parent.notification.twilioToNumber"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>

    <div class="tw-mb-3">
        <i18n-t tag="p" keypath="More info on:" style="margin-top: 8px">
            <a href="https://www.twilio.com/docs/sms" target="_blank">https://www.twilio.com/docs/sms</a>
        </i18n-t>
    </div>
</template>
