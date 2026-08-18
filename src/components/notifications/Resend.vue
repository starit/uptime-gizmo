<template>
    <div class="tw-mb-3">
        <label for="resend-api-key" class="gizmo-field-label">{{ $t("resendApiKey") }}</label>
        <HiddenInput
            id="resend-api-key"
            v-model="$parent.notification.resendApiKey"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <i18n-t tag="div" keypath="resendApiHelp" class="gizmo-field-help">
            <a href="https://resend.com/api-keys" target="_blank">https://resend.com/api-keys</a>
        </i18n-t>
    </div>
    <div class="tw-mb-3">
        <label for="resend-from-email" class="gizmo-field-label">{{ $t("resendFromEmail") }}</label>
        <input
            id="resend-from-email"
            v-model="$parent.notification.resendFromEmail"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>
    <div class="tw-mb-3">
        <label for="resend-from-name" class="gizmo-field-label">{{ $t("resendFromName") }}</label>
        <input id="resend-from-name" v-model="$parent.notification.resendFromName" type="text" class="gizmo-native-control" />
        <div class="gizmo-field-help">{{ $t("resendLeaveBlankForDefaultName") }}</div>
    </div>
    <div class="tw-mb-3">
        <label for="resend-to-email" class="gizmo-field-label">{{ $t("resendToEmail") }}</label>
        <input
            id="resend-to-email"
            v-model="$parent.notification.resendToEmail"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>
    <div class="tw-mb-3">
        <label for="resend-subject" class="gizmo-field-label">{{ $t("resendSubject") }}</label>
        <input id="resend-subject" v-model="$parent.notification.resendSubject" type="text" class="gizmo-native-control" />
        <small class="gizmo-field-help tw-text-content-muted">{{ $t("resendLeaveBlankForDefaultSubject") }}</small>
    </div>
    <i18n-t tag="p" keypath="More info on:" style="margin-top: 8px">
        <a href="https://resend.com/docs/dashboard/emails/introduction" target="_blank">
            https://resend.com/docs/dashboard/emails/introduction
        </a>
    </i18n-t>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";

export default {
    components: {
        HiddenInput,
    },
    mounted() {
        if (typeof this.$parent.notification.resendSubject === "undefined") {
            this.$parent.notification.resendSubject = "Notification from Your Uptime Gizmo";
        }
        if (typeof this.$parent.notification.resendFromName === "undefined") {
            this.$parent.notification.resendFromName = "Uptime Gizmo";
        }
    },
};
</script>
