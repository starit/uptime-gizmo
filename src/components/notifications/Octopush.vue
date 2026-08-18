<template>
    <div class="tw-mb-3">
        <label for="octopush-version" class="gizmo-field-label">{{ $t("Octopush API Version") }}</label>
        <select id="octopush-version" v-model="$parent.notification.octopushVersion" class="gizmo-native-control gizmo-native-select">
            <option value="2">{{ $t("octopushEndpoint", { url: "api.octopush.com" }) }}</option>
            <option value="1">{{ $t("legacyOctopushEndpoint", { url: "www.octopush-dm.com" }) }}</option>
        </select>
        <div class="gizmo-field-help">
            {{ $t("octopushLegacyHint") }}
        </div>
    </div>
    <div class="tw-mb-3">
        <label for="octopush-key" class="gizmo-field-label">{{ $t("octopushAPIKey") }}</label>
        <HiddenInput
            id="octopush-key"
            v-model="$parent.notification.octopushAPIKey"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <label for="octopush-login" class="gizmo-field-label">{{ $t("octopushLogin") }}</label>
        <input
            id="octopush-login"
            v-model="$parent.notification.octopushLogin"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>
    <div class="tw-mb-3">
        <label for="octopush-type-sms" class="gizmo-field-label">{{ $t("SMS Type") }}</label>
        <select id="octopush-type-sms" v-model="$parent.notification.octopushSMSType" class="gizmo-native-control gizmo-native-select">
            <option value="sms_premium">{{ $t("octopushTypePremium") }}</option>
            <option value="sms_low_cost">{{ $t("octopushTypeLowCost") }}</option>
        </select>
        <i18n-t tag="div" keypath="Check octopush prices" class="gizmo-field-help">
            <a href="https://octopush.com/tarifs-sms-international/" target="_blank">
                https://octopush.com/tarifs-sms-international/
            </a>
        </i18n-t>
    </div>
    <div class="tw-mb-3">
        <label for="octopush-phone-number" class="gizmo-field-label">{{ $t("octopushPhoneNumber") }}</label>
        <input
            id="octopush-phone-number"
            v-model="$parent.notification.octopushPhoneNumber"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>
    <div class="tw-mb-3">
        <label for="octopush-sender-name" class="gizmo-field-label">{{ $t("octopushSMSSender") }}</label>
        <input
            id="octopush-sender-name"
            v-model="$parent.notification.octopushSenderName"
            type="text"
            minlength="3"
            maxlength="11"
            class="gizmo-native-control"
        />
    </div>

    <i18n-t tag="p" keypath="More info on:" style="margin-top: 8px">
        <a href="https://octopush.com/api-sms-documentation/envoi-de-sms/" target="_blank">
            https://octopush.com/api-sms-documentation/envoi-de-sms/
        </a>
    </i18n-t>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";

export default {
    components: {
        HiddenInput,
    },
};
</script>
