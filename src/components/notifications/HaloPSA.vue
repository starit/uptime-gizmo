<template>
    <div class="tw-mb-3">
        <label for="halopsa-webhook-url" class="gizmo-field-label">
            {{ $t("Halo PSA Webhook URL") }}
            <span class="test-danger">*</span>
        </label>
        <HiddenInput
            v-model="$parent.notification.halowebhookurl"
            :maxlength="500"
            placeholder="https://your-instance.halopsa.com/api/v1/webhook"
            autocomplete="off"
            required
        />
        <div class="gizmo-field-help">
            {{ $t("halopsa_webhook_url_desc") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <label for="halopsa-username" class="gizmo-field-label">
            {{ $t("Username") }}
        </label>
        <input
            id="halopsa-username"
            v-model="$parent.notification.haloUsername"
            type="text"
            class="gizmo-native-control"
            autocomplete="off"
            :placeholder="$t('Username')"
        />
        <div class="gizmo-field-help">
            {{ $t("halopsa_username_desc") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <label for="halopsa-password" class="gizmo-field-label">
            {{ $t("Password") }}
        </label>
        <input
            id="halopsa-password"
            v-model="$parent.notification.haloPassword"
            type="text"
            class="gizmo-native-control"
            :maxlength="500"
            autocomplete="off"
            :placeholder="$t('Password')"
        />
        <div class="gizmo-field-help">
            {{ $t("halopsa_password_desc") }}
        </div>
    </div>
    <div class="tw-mb-3">
        <div class="gizmo-field-help">
            <b>{{ $t("Webhook Payload Fields") }}:</b>
            <p class="tw-mb-2 tw-mt-2">{{ $t("halopsa_payload_desc") }}</p>
            <ul class="tw-mb-2">
                <li>
                    <b>title</b>
                    : {{ $t("halopsa_field_title") }}
                </li>
                <li>
                    <b>status</b>
                    : {{ $t("halopsa_field_status") }}
                </li>
                <li>
                    <b>monitor</b>
                    : {{ $t("halopsa_field_monitor") }}
                </li>
                <li>
                    <b>monitor_id</b>
                    : {{ $t("halopsa_field_monitor_id") }}
                </li>
                <li>
                    <b>message</b>
                    : {{ $t("halopsa_field_message") }}
                </li>
                <li>
                    <b>timestamp</b>
                    : {{ $t("halopsa_field_timestamp") }}
                </li>
                <li>
                    <b>uptime_gizmo_version</b>
                    : {{ $t("halopsa_field_uptime_gizmo_version") }}
                </li>
            </ul>
            <p class="tw-mb-0 tw-text-content-muted">
                <small>{{ $t("halopsa_id_usage_hint") }}</small>
            </p>
        </div>
    </div>

    <div class="tw-mb-3">
        <div class="gizmo-field-help">
            <b>{{ $t("Setup Instructions") }}:</b>
            <ol class="tw-mb-0 tw-mt-2">
                <li>{{ $t("halopsa_setup_step1") }}</li>
                <li>{{ $t("halopsa_setup_step2") }}</li>
                <li>{{ $t("halopsa_setup_step3") }}</li>
                <li>{{ $t("halopsa_setup_step4") }}</li>
                <li>{{ $t("halopsa_setup_step5") }}</li>
            </ol>
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
