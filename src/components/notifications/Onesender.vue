<template>
    <div class="tw-mb-3">
        <label for="host-onesender" class="gizmo-field-label">{{ $t("Host Onesender") }}</label>
        <input
            id="host-onesender"
            v-model="$parent.notification.onesenderURL"
            type="url"
            placeholder="https://xxxxxxxxxxx.com/api/v1/messages"
            pattern="https?://.+"
            class="gizmo-native-control"
            required
        />
    </div>

    <div class="tw-mb-3">
        <label for="receiver-onesender" class="gizmo-field-label">{{ $t("Token Onesender") }}</label>
        <HiddenInput
            id="receiver-onesender"
            v-model="$parent.notification.onesenderToken"
            :required="true"
            autocomplete="false"
        ></HiddenInput>
        <i18n-t tag="div" keypath="wayToGetOnesenderUrlandToken" class="gizmo-field-help">
            <a href="https://onesender.net/" target="_blank">{{ $t("here") }}</a>
        </i18n-t>
    </div>

    <div class="tw-mb-3">
        <label for="webhook-request-body" class="gizmo-field-label">{{ $t("Recipient Type") }}</label>
        <select
            id="webhook-request-body"
            v-model="$parent.notification.onesenderTypeReceiver"
            class="gizmo-native-control gizmo-native-select"
            required
        >
            <option value="private">{{ $t("Private Number") }}</option>
            <option value="group">{{ $t("Group ID") }}</option>
        </select>
    </div>
    <div v-if="$parent.notification.onesenderTypeReceiver == 'private'" class="gizmo-field-help">
        {{ $t("privateOnesenderDesc", ['"application/json"']) }}
    </div>
    <div v-else class="gizmo-field-help">{{ $t("groupOnesenderDesc") }}</div>
    <div class="tw-mb-3">
        <input
            id="type-receiver-onesender"
            v-model="$parent.notification.onesenderReceiver"
            type="text"
            placeholder="628123456789 or 628123456789-34534"
            class="gizmo-native-control"
            required
        />
    </div>
    <div class="tw-mb-3">
        <input
            id="type-receiver-onesender"
            v-model="computedReceiverResult"
            type="text"
            class="gizmo-native-control"
            disabled
        />
    </div>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";

export default {
    components: {
        HiddenInput,
    },
    data() {
        return {};
    },
    computed: {
        computedReceiverResult() {
            let receiver = this.$parent.notification.onesenderReceiver;
            return this.$parent.notification.onesenderTypeReceiver === "private"
                ? receiver + "@s.whatsapp.net"
                : receiver + "@g.us";
        },
    },
};
</script>

<style lang="scss" scoped>
textarea {
    min-height: 200px;
}
</style>
