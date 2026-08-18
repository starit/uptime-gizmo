<template>
    <div class="tw-mb-3">
        <label for="clicksendsms-login" class="gizmo-field-label">{{ $t("API Username") }}</label>
        <i18n-t tag="div" class="gizmo-field-help" keypath="wayToGetClickSendSMSToken">
            <a href="http://dashboard.clicksend.com/account/subaccounts" target="_blank">{{ $t("here") }}</a>
        </i18n-t>
        <input
            id="clicksendsms-login"
            v-model="$parent.notification.clicksendsmsLogin"
            type="text"
            class="gizmo-native-control"
            required
        />
        <label for="clicksendsms-key" class="gizmo-field-label">{{ $t("API Key") }}</label>
        <HiddenInput
            id="clicksendsms-key"
            v-model="$parent.notification.clicksendsmsPassword"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
    </div>
    <div class="tw-mb-3">
        <i18n-t tag="div" keypath="checkPriceAt" class="gizmo-field-help">
            <template #service>clicksendsms</template>
            <template #url>
                <a href="https://www.clicksend.com/us/pricing" target="_blank">https://clicksend.com/us/pricing</a>
            </template>
        </i18n-t>
    </div>
    <div class="tw-mb-3">
        <label for="clicksendsms-to-number" class="gizmo-field-label">{{ $t("Recipient Number") }}</label>
        <input
            id="clicksendsms-to-number"
            v-model="$parent.notification.clicksendsmsToNumber"
            type="text"
            minlength="8"
            maxlength="14"
            class="gizmo-native-control"
            required
        />
    </div>
    <div class="tw-mb-3">
        <label for="clicksendsms-sender-name" class="gizmo-field-label">
            {{ $t("From Name/Number") }} -
            <a
                href="https://help.clicksend.com/article/4kgj7krx00-what-is-a-sender-id-or-sender-number"
                target="_blank"
            >
                {{ $t("Read more") }}
            </a>
        </label>
        <input
            id="clicksendsms-sender-name"
            v-model="$parent.notification.clicksendsmsSenderName"
            type="text"
            minlength="3"
            maxlength="11"
            class="gizmo-native-control"
        />
        <div class="gizmo-field-help">{{ $t("Leave blank to use a shared sender number.") }}</div>
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
