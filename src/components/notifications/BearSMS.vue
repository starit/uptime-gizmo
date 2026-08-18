<template>
    <div class="tw-mb-3">
        <label for="bearsms-username" class="gizmo-field-label">{{ $t("API Username") }}</label>
        <i18n-t tag="div" class="gizmo-field-help" keypath="wayToGetBearSMSToken">
            <a href="https://app.bearsms.com/" target="_blank">{{ $t("here") }}</a>
        </i18n-t>
        <input
            id="bearsms-username"
            v-model="$parent.notification.bearsmsUsername"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>
    <div class="tw-mb-3">
        <label for="bearsms-hashkey" class="gizmo-field-label">{{ $t("Hash Key") }}</label>
        <HiddenInput
            id="bearsms-hashkey"
            v-model="$parent.notification.bearsmsHashKey"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
    </div>
    <div class="tw-mb-3">
        <label for="bearsms-senderId" class="gizmo-field-label">{{ $t("From Name/Number") }}</label>
        <input
            id="bearsms-senderId"
            v-model="$parent.notification.bearsmsSenderId"
            type="text"
            maxlength="11"
            class="gizmo-native-control"
        />
        <div class="gizmo-field-help">{{ $t("bearsmsSenderDescription") }}</div>
    </div>
    <div class="tw-mb-3">
        <label for="bearsms-phoneNumber" class="gizmo-field-label">{{ $t("Recipient Number") }}</label>
        <input
            id="bearsms-phoneNumber"
            v-model="$parent.notification.bearsmsPhoneNumber"
            type="text"
            class="gizmo-native-control"
            placeholder="9725XXXXXXXX"
            required
        />
        <div class="gizmo-field-help">{{ $t("bearsmsPhoneNumberDescription") }}</div>
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
