<template>
    <div class="tw-mb-3">
        <label for="whapi-api-url" class="gizmo-field-label">{{ $t("API URL") }}</label>
        <input
            id="whapi-api-url"
            v-model="$parent.notification.whapiApiUrl"
            placeholder="https://gate.whapi.cloud/"
            type="text"
            class="gizmo-native-control"
        />
    </div>

    <div class="tw-mb-3">
        <label for="whapi-auth-token" class="gizmo-field-label">{{ $t("Token") }}</label>
        <HiddenInput
            id="whapi-auth-token"
            v-model="$parent.notification.whapiAuthToken"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <i18n-t tag="div" keypath="wayToGetWhapiUrlAndToken" class="gizmo-field-help">
            <a href="https://panel.whapi.cloud/dashboard" target="_blank">https://panel.whapi.cloud/dashboard</a>
        </i18n-t>
    </div>

    <div class="tw-mb-3">
        <label for="whapi-recipient" class="gizmo-field-label">{{ $t("whapiRecipient") }}</label>
        <input
            id="whapi-recipient"
            v-model="$parent.notification.whapiRecipient"
            type="text"
            pattern="^[\d-]{10,31}(@[\w\.]{1,})?$"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">
            {{
                $t("wayToWriteWhapiRecipient", [
                    "00117612345678",
                    "00117612345678@s.whatsapp.net",
                    "123456789012345678@g.us",
                ])
            }}
        </div>
    </div>

    <i18n-t tag="div" keypath="More info on:" class="tw-mb-3 gizmo-field-help">
        <a href="https://whapi.cloud/" target="_blank">https://whapi.cloud/</a>
    </i18n-t>
</template>
<script>
import HiddenInput from "../HiddenInput.vue";

export default {
    components: {
        HiddenInput,
    },
};
</script>
