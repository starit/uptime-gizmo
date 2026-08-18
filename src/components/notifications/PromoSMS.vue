<template>
    <div class="tw-mb-3">
        <label for="promosms-login" class="gizmo-field-label">{{ $t("promosmsLogin") }}</label>
        <input
            id="promosms-login"
            v-model="$parent.notification.promosmsLogin"
            type="text"
            class="gizmo-native-control"
            required
        />
        <label for="promosms-key" class="gizmo-field-label">{{ $t("promosmsPassword") }}</label>
        <HiddenInput
            id="promosms-key"
            v-model="$parent.notification.promosmsPassword"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
    </div>
    <div class="tw-mb-3">
        <label for="promosms-type-sms" class="gizmo-field-label">{{ $t("SMS Type") }}</label>
        <select id="promosms-type-sms" v-model="$parent.notification.promosmsSMSType" class="gizmo-native-control gizmo-native-select">
            <option value="0">{{ $t("promosmsTypeFlash") }}</option>
            <option value="1">{{ $t("promosmsTypeEco") }}</option>
            <option value="3">{{ $t("promosmsTypeFull") }}</option>
            <option value="4">{{ $t("promosmsTypeSpeed") }}</option>
        </select>
        <i18n-t tag="div" keypath="checkPriceAt" class="gizmo-field-help">
            <template #service>promosms</template>
            <template #url>
                <a href="https://promosms.com/cennik/" target="_blank">https://promosms.com/cennik/</a>
            </template>
        </i18n-t>
    </div>
    <div class="tw-mb-3">
        <label for="promosms-phone-number" class="gizmo-field-label">{{ $t("promosmsPhoneNumber") }}</label>
        <input
            id="promosms-phone-number"
            v-model="$parent.notification.promosmsPhoneNumber"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>
    <div class="tw-mb-3">
        <label for="promosms-sender-name" class="gizmo-field-label">{{ $t("promosmsSMSSender") }}</label>
        <input
            id="promosms-sender-name"
            v-model="$parent.notification.promosmsSenderName"
            type="text"
            minlength="3"
            maxlength="11"
            class="gizmo-native-control"
        />
    </div>
    <div class="gizmo-native-check gizmo-native-switch">
        <input
            id="promosms-allow-long"
            v-model="$parent.notification.promosmsAllowLongSMS"
            type="checkbox"
            class="gizmo-native-check__input"
        />
        <label for="promosms-allow-long" class="gizmo-field-label">{{ $t("promosmsAllowLongSMS") }}</label>
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
