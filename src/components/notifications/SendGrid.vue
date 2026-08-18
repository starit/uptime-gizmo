<template>
    <div class="tw-mb-3">
        <label for="sendgrid-api-key" class="gizmo-field-label">{{ $t("SendGrid API Key") }}</label>
        <HiddenInput
            id="push-api-key"
            v-model="$parent.notification.sendgridApiKey"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
    </div>
    <div class="tw-mb-3">
        <label for="sendgrid-from-email" class="gizmo-field-label">{{ $t("From Email") }}</label>
        <input
            id="sendgrid-from-email"
            v-model="$parent.notification.sendgridFromEmail"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>
    <div class="tw-mb-3">
        <label for="sendgrid-to-email" class="gizmo-field-label">{{ $t("To Email") }}</label>
        <input
            id="sendgrid-to-email"
            v-model="$parent.notification.sendgridToEmail"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>
    <div class="tw-mb-3">
        <label for="sendgrid-cc-email" class="gizmo-field-label">{{ $t("smtpCC") }}</label>
        <input id="sendgrid-cc-email" v-model="$parent.notification.sendgridCcEmail" type="text" class="gizmo-native-control" />
        <div class="gizmo-field-help">{{ $t("Separate multiple email addresses with commas") }}</div>
    </div>
    <div class="tw-mb-3">
        <label for="sendgrid-bcc-email" class="gizmo-field-label">{{ $t("smtpBCC") }}</label>
        <input
            id="sendgrid-bcc-email"
            v-model="$parent.notification.sendgridBccEmail"
            type="text"
            class="gizmo-native-control"
        />
        <small class="gizmo-field-help tw-text-content-muted">{{ $t("Separate multiple email addresses with commas") }}</small>
    </div>
    <div class="tw-mb-3">
        <label for="sendgrid-subject" class="gizmo-field-label">{{ $t("Subject:") }}</label>
        <input id="sendgrid-subject" v-model="$parent.notification.sendgridSubject" type="text" class="gizmo-native-control" />
        <small class="gizmo-field-help tw-text-content-muted">{{ $t("leave blank for default subject") }}</small>
    </div>
    <i18n-t tag="p" keypath="More info on:" style="margin-top: 8px">
        <a href="https://docs.sendgrid.com/api-reference/mail-send/mail-send" target="_blank">
            https://docs.sendgrid.com/api-reference/mail-send/mail-send
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
        if (typeof this.$parent.notification.sendgridSubject === "undefined") {
            this.$parent.notification.sendgridSubject = "Notification from Your Uptime Gizmo";
        }
    },
};
</script>
