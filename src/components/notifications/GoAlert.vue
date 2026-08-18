<template>
    <div class="tw-mb-3">
        <label for="goalert-base-url" class="gizmo-field-label">{{ $t("Base URL") }}</label>
        <input
            id="goalert-base-url"
            v-model="$parent.notification.goAlertBaseURL"
            type="text"
            class="gizmo-native-control"
            required
        />
        <i18n-t tag="div" keypath="goAlertInfo" class="gizmo-field-help">
            <a href="https://goalert.me" target="_blank">https://goalert.me</a>
        </i18n-t>
    </div>

    <div class="tw-mb-3">
        <label for="goalert-token" class="gizmo-field-label">{{ $t("Token") }}</label>
        <HiddenInput
            id="goalert-token"
            v-model="$parent.notification.goAlertToken"
            autocomplete="new-password"
            :required="true"
        ></HiddenInput>

        <div class="gizmo-field-help">
            {{ $t("goAlertIntegrationKeyInfo") }}
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
