<template>
    <div class="tw-mb-3">
        <label for="nostr-relays" class="gizmo-field-label">
            {{ $t("nostrRelays") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <textarea
            id="nostr-relays"
            v-model="$parent.notification.relays"
            class="gizmo-native-control"
            :required="true"
            placeholder="wss://127.0.0.1:7777/"
        ></textarea>
        <small class="gizmo-field-help tw-text-content-muted">{{ $t("nostrRelaysHelp") }}</small>
    </div>
    <div class="tw-mb-3">
        <label for="nostr-sender" class="gizmo-field-label">
            {{ $t("nostrSender") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <HiddenInput
            id="nostr-sender"
            v-model="$parent.notification.sender"
            autocomplete="new-password"
            :required="true"
        ></HiddenInput>
    </div>
    <div class="tw-mb-3">
        <label for="nostr-recipients" class="gizmo-field-label">
            {{ $t("nostrRecipients") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <textarea
            id="nostr-recipients"
            v-model="$parent.notification.recipients"
            class="gizmo-native-control"
            :required="true"
            placeholder="npub123...&#10;npub789..."
        ></textarea>
        <small class="gizmo-field-help tw-text-content-muted">{{ $t("nostrRecipientsHelp") }}</small>
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
