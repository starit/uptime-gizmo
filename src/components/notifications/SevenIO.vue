<template>
    <div class="tw-mb-3">
        <label for="sevenio-api-key" class="gizmo-field-label">{{ $t("apiKeySevenIO") }}</label>
        <HiddenInput
            id="sevenio-api-key"
            v-model="$parent.notification.sevenioApiKey"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <div class="gizmo-field-help">
            {{ $t("wayToGetSevenIOApiKey") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <label for="sevenio-sender" class="gizmo-field-label">{{ $t("senderSevenIO") }}</label>
        <input
            id="sevenio-sender"
            v-model="$parent.notification.sevenioSender"
            type="text"
            class="gizmo-native-control"
            autocomplete="false"
            placeholder="Uptime Gizmo"
        />
    </div>

    <div class="tw-mb-3">
        <label for="sevenio-receiver" class="gizmo-field-label">{{ $t("receiverSevenIO") }}</label>
        <input
            id="sevenio-receiver"
            v-model="$parent.notification.sevenioReceiver"
            type="number"
            class="gizmo-native-control"
            required
            autocomplete="false"
            placeholder="0123456789"
        />
        <div class="gizmo-field-help">
            {{ $t("receiverInfoSevenIO") }}
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
