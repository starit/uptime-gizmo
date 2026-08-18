<template>
    <div class="tw-mb-3">
        <label for="smsir-key" class="gizmo-field-label">{{ $t("API Key") }}</label>
        <HiddenInput
            id="smsir-key"
            v-model="$parent.notification.smsirApiKey"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
    </div>
    <div class="tw-mb-3">
        <label for="smsir-number" class="gizmo-field-label">{{ $t("Recipient Numbers") }}</label>
        <input
            id="smsir-number"
            v-model="$parent.notification.smsirNumber"
            placeholder="9123456789,09987654321"
            type="text"
            minlength="10"
            class="gizmo-native-control"
            required
        />
    </div>
    <div class="tw-mb-3">
        <label for="smsir-template" class="gizmo-field-label">{{ $t("Template ID") }}</label>
        <input
            id="smsir-template"
            v-model="$parent.notification.smsirTemplate"
            placeholder="12345"
            type="text"
            class="gizmo-native-control"
            required
        />
        <i18n-t tag="div" class="gizmo-field-help" keypath="wayToGetClickSMSIRTemplateID">
            <template #uptkumaalert>
                <code>#uptkumaalert#</code>
            </template>
            <template #here>
                <a href="https://app.sms.ir/fast-send/template" target="_blank">{{ $t("here") }}</a>
            </template>
        </i18n-t>
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
