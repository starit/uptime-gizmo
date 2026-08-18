<template>
    <div class="tw-mb-3">
        <label for="smspartner-key" class="gizmo-field-label">{{ $t("API Key") }}</label>
        <HiddenInput
            id="smspartner-key"
            v-model="$parent.notification.smspartnerApikey"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <div class="gizmo-field-help">
            <i18n-t keypath="smspartnerApiurl" tag="div" class="gizmo-field-help">
                <a href="https://my.smspartner.fr/dashboard/api" target="_blank">my.smspartner.fr/dashboard/api</a>
            </i18n-t>
        </div>
    </div>
    <div class="tw-mb-3">
        <label for="smspartner-phone-number" class="gizmo-field-label">{{ $t("smspartnerPhoneNumber") }}</label>
        <input
            id="smspartner-phone-number"
            v-model="$parent.notification.smspartnerPhoneNumber"
            type="text"
            minlength="3"
            maxlength="20"
            pattern="^[\d+,]+$"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">
            <i18n-t keypath="smspartnerPhoneNumberHelptext" tag="div" class="gizmo-field-help">
                <code>+336xxxxxxxx</code>
                <code>+496xxxxxxxx</code>
                <code>,</code>
            </i18n-t>
        </div>
    </div>
    <div class="tw-mb-3">
        <label for="smspartner-sender-name" class="gizmo-field-label">{{ $t("smspartnerSenderName") }}</label>
        <input
            id="smspartner-sender-name"
            v-model="$parent.notification.smspartnerSenderName"
            type="text"
            minlength="3"
            maxlength="11"
            pattern="^[a-zA-Z0-9]*$"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">
            {{ $t("smspartnerSenderNameInfo") }}
        </div>
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
