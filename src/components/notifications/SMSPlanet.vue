<template>
    <div class="tw-mb-3">
        <label for="smsplanet-api-token" class="gizmo-field-label">{{ $t("smsplanetApiToken") }}</label>
        <HiddenInput
            id="smsplanet-api-token"
            v-model="$parent.notification.smsplanetApiToken"
            :required="true"
        ></HiddenInput>
        <i18n-t tag="div" keypath="smsplanetApiDocs" class="gizmo-field-help">
            <template #the_smsplanet_documentation>
                <a href="https://smsplanet.pl/doc/slate/index.html#introduction" target="_blank">
                    {{ $t("the smsplanet documentation") }}
                </a>
            </template>
        </i18n-t>
    </div>
    <div class="tw-mb-3">
        <label for="smsplanet-phone-numbers" class="gizmo-field-label">{{ $t("Phone numbers") }}</label>
        <textarea
            id="smsplanet-phone-numbers"
            v-model="$parent.notification.smsplanetPhoneNumbers"
            class="gizmo-native-control"
            :placeholder="smsplanetPhoneNumbers"
            required
        ></textarea>
    </div>
    <div class="tw-mb-3">
        <label for="smsplanet-sender-name" class="gizmo-field-label">{{ $t("Sender name") }}</label>
        <input
            id="smsplanet-sender-name"
            v-model="$parent.notification.smsplanetSenderName"
            type="text"
            minlength="3"
            maxlength="11"
            class="gizmo-native-control"
        />
        <div class="gizmo-field-help">{{ $t("smsplanetNeedToApproveName") }}</div>
    </div>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";

export default {
    components: {
        HiddenInput,
    },
    computed: {
        smsplanetPhoneNumbers() {
            return this.$t("Example:", ["+48123456789,+48111222333"]);
        },
    },
};
</script>
