<template>
    <div class="tw-mb-3">
        <label for="egosms-username" class="gizmo-field-label">{{ $t("API Username") }}</label>
        <i18n-t tag="div" class="gizmo-field-help" keypath="wayToGetEgoSMSToken">
            <a href="https://www.egosms.co/" target="_blank">{{ $t("here") }}</a>
        </i18n-t>
        <input
            id="egosms-username"
            v-model="$parent.notification.egosmsUsername"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>
    <div class="tw-mb-3">
        <label for="egosms-password" class="gizmo-field-label">{{ $t("Password") }}</label>
        <HiddenInput
            id="egosms-password"
            v-model="$parent.notification.egosmsPassword"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
    </div>
    <div class="tw-mb-3">
        <label for="egosms-sender" class="gizmo-field-label">{{ $t("From Name/Number") }}</label>
        <input
            id="egosms-sender"
            v-model="$parent.notification.egosmsSender"
            type="text"
            maxlength="11"
            class="gizmo-native-control"
            placeholder="EGOSMS"
        />
        <div class="gizmo-field-help">{{ $t("egosmsSenderDescription") }}</div>
    </div>
    <div class="tw-mb-3">
        <label for="egosms-phoneNumber" class="gizmo-field-label">{{ $t("Recipient Number") }}</label>
        <input
            id="egosms-phoneNumber"
            v-model="$parent.notification.egosmsPhoneNumber"
            type="text"
            class="gizmo-native-control"
            placeholder="2567XXXXXXXX"
            required
        />
        <div class="gizmo-field-help">{{ $t("egosmsPhoneNumberDescription") }}</div>
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
