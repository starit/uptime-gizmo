<template>
    <div class="tw-mb-3">
        <label for="fluxer-webhook-url" class="gizmo-field-label">{{ $t("Fluxer Webhook URL") }}</label>
        <HiddenInput
            id="fluxer-webhook-url"
            v-model="$parent.notification.fluxerWebhookUrl"
            type="url"
            required
            autocomplete="false"
        />
        <div class="gizmo-field-help">
            {{ $t("wayToGetFluxerURL") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <label for="fluxer-username" class="gizmo-field-label">{{ $t("Bot Display Name") }}</label>
        <input
            id="fluxer-username"
            v-model="$parent.notification.fluxerUsername"
            type="text"
            class="gizmo-native-control"
            autocomplete="false"
            :placeholder="$root.appName"
        />
    </div>

    <div class="tw-mb-3">
        <label for="fluxer-prefix-message" class="gizmo-field-label">{{ $t("Prefix Custom Message") }}</label>
        <input
            id="fluxer-prefix-message"
            v-model="$parent.notification.fluxerPrefixMessage"
            type="text"
            class="gizmo-native-control"
            autocomplete="false"
            :placeholder="$t('Hello @everyone is...')"
        />
    </div>

    <div class="tw-mb-3">
        <label for="fluxer-message-format" class="gizmo-field-label">{{ $t("fluxerMessageFormat") }}</label>
        <select id="fluxer-message-format" v-model="$parent.notification.fluxerMessageFormat" class="gizmo-native-control gizmo-native-select">
            <option value="normal">{{ $t("fluxerMessageFormatNormal") }}</option>
            <option value="minimalist">{{ $t("fluxerMessageFormatMinimalist") }}</option>
            <option value="custom">{{ $t("fluxerMessageFormatCustom") }}</option>
        </select>
    </div>

    <div v-show="$parent.notification.fluxerMessageFormat === 'custom'">
        <div class="tw-mb-3">
            <label for="fluxer-message-template" class="gizmo-field-label">{{ $t("fluxerMessageTemplate") }}</label>
            <TemplatedTextarea
                id="fluxer-message-template"
                v-model="$parent.notification.fluxerMessageTemplate"
                :required="false"
                placeholder=""
            ></TemplatedTextarea>
            <div class="gizmo-field-help">{{ $t("fluxerUseMessageTemplateDescription") }}</div>
        </div>
    </div>
</template>
<script>
import HiddenInput from "../HiddenInput.vue";
import TemplatedTextarea from "../TemplatedTextarea.vue";

export default {
    components: {
        TemplatedTextarea,
        HiddenInput,
    },
    mounted() {
        if (!this.$parent.notification.fluxerChannelType) {
            this.$parent.notification.fluxerChannelType = "channel";
        }
        if (this.$parent.notification.disableUrl === undefined) {
            this.$parent.notification.disableUrl = false;
        }
        // Message format: default "normal"; migrate from old checkbox
        if (typeof this.$parent.notification.fluxerMessageFormat === "undefined") {
            const hadCustom =
                this.$parent.notification.fluxerUseMessageTemplate === true ||
                !!this.$parent.notification.fluxerMessageTemplate?.trim();
            this.$parent.notification.fluxerMessageFormat = hadCustom ? "custom" : "normal";
        }
    },
};
</script>
