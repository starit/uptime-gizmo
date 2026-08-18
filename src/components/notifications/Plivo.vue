<template>
    <div class="tw-mb-3">
        <label for="plivo-auth-id" class="gizmo-field-label">{{ $t("plivoAuthID") }}</label>
        <input
            id="plivo-auth-id"
            v-model="$parent.notification.plivoAuthID"
            type="text"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">{{ $t("plivoAuthIDHelptext") }}</div>
    </div>

    <div class="tw-mb-3">
        <label for="plivo-auth-token" class="gizmo-field-label">{{ $t("plivoAuthToken") }}</label>
        <HiddenInput
            id="plivo-auth-token"
            v-model="$parent.notification.plivoAuthToken"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <div class="gizmo-field-help">{{ $t("plivoAuthTokenHelptext") }}</div>
    </div>

    <div class="tw-mb-3">
        <label for="plivo-from-number" class="gizmo-field-label">{{ $t("plivoFromNumber") }}</label>
        <input
            id="plivo-from-number"
            v-model="$parent.notification.plivoFromNumber"
            type="text"
            class="gizmo-native-control"
            placeholder="+15551234567"
            required
        />
        <div class="gizmo-field-help">{{ $t("plivoFromNumberHelptext") }}</div>
    </div>

    <div class="tw-mb-3">
        <label for="plivo-to-number" class="gizmo-field-label">{{ $t("plivoToNumber") }}</label>
        <input
            id="plivo-to-number"
            v-model="$parent.notification.plivoToNumber"
            type="text"
            class="gizmo-native-control"
            placeholder="+15559876543"
            required
        />
        <div class="gizmo-field-help">{{ $t("plivoToNumberHelptext") }}</div>
    </div>

    <div class="tw-mb-3">
        <label for="plivo-message-type" class="gizmo-field-label">{{ $t("plivoMessageType") }}</label>
        <select id="plivo-message-type" v-model="$parent.notification.plivoMessageType" class="gizmo-native-control gizmo-native-select">
            <option value="sms">SMS</option>
            <option value="call">{{ $t("plivoVoiceCall") }}</option>
        </select>
    </div>

    <div v-if="$parent.notification.plivoMessageType === 'call'" class="tw-mb-3">
        <label for="plivo-answer-url" class="gizmo-field-label">{{ $t("plivoAnswerUrl") }}</label>
        <input
            id="plivo-answer-url"
            v-model="$parent.notification.plivoAnswerUrl"
            type="url"
            class="gizmo-native-control"
            placeholder="https://example.com/answer.xml"
            :required="true"
        />
        <div class="gizmo-field-help">{{ $t("plivoAnswerUrlHelptext") }}</div>
    </div>

    <div class="tw-mb-3">
        <i18n-t tag="p" keypath="More info on:" style="margin-top: 8px">
            <a
                v-if="$parent.notification.plivoMessageType === 'call'"
                href="https://www.plivo.com/docs/voice/api/call"
                target="_blank"
            >
                https://www.plivo.com/docs/voice/api/call
            </a>
            <a v-else href="https://www.plivo.com/docs/messaging/api/message" target="_blank">
                https://www.plivo.com/docs/messaging/api/message
            </a>
        </i18n-t>
    </div>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";

export default {
    components: {
        HiddenInput,
    },
    mounted() {
        if (typeof this.$parent.notification.plivoMessageType === "undefined") {
            this.$parent.notification.plivoMessageType = "sms";
        }
    },
};
</script>
