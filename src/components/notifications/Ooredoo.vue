<template>
    <div class="tw-mb-3">
        <label for="ooredoo-username" class="gizmo-field-label">{{ $t("Username") }}</label>
        <input
            id="ooredoo-username"
            v-model="$parent.notification.ooredooUsername"
            type="text"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">{{ $t("ooredooUsernameDescription") }}</div>
    </div>
    <div class="tw-mb-3">
        <label for="ooredoo-access-key" class="gizmo-field-label">{{ $t("Access Key") }}</label>
        <HiddenInput
            id="ooredoo-access-key"
            v-model="$parent.notification.ooredooAccessKey"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <div class="gizmo-field-help">{{ $t("ooredooAccessKeyDescription") }}</div>
    </div>
    <div class="tw-mb-3">
        <label for="ooredoo-bearer-token" class="gizmo-field-label">{{ $t("Bearer Token") }}</label>
        <HiddenInput
            id="ooredoo-bearer-token"
            v-model="$parent.notification.ooredooBearerToken"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <div class="gizmo-field-help">{{ $t("ooredooBearerTokenDescription") }}</div>
    </div>
    <div class="tw-mb-3">
        <label for="ooredoo-to-number" class="gizmo-field-label">{{ $t("Recipient Number") }}</label>
        <input
            id="ooredoo-to-number"
            v-model="$parent.notification.ooredooToNumber"
            type="text"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">{{ $t("ooredooRecipientDescription") }}</div>
    </div>
    <div class="tw-mb-3">
        <label for="ooredoo-server-url" class="gizmo-field-label">{{ $t("API URL") }}</label>
        <input
            id="ooredoo-server-url"
            v-model="$parent.notification.ooredooServerUrl"
            type="text"
            class="gizmo-native-control"
            placeholder="https://o-papi1-lb01.ooredoo.mv/bulk_sms/v2"
        />
        <div class="gizmo-field-help">{{ $t("Leave blank to use the default Ooredoo endpoint.") }}</div>
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
