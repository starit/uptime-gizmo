<template>
    <div class="tw-mb-3">
        <label for="max-bot-token" class="gizmo-field-label">{{ $t("Bot Token") }}</label>
        <HiddenInput
            id="max-bot-token"
            v-model="$parent.notification.maxBotToken"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <i18n-t tag="div" keypath="wayToGetMaxToken" class="gizmo-field-help">
            <a href="https://dev.max.ru/docs" target="_blank">https://dev.max.ru/docs</a>
        </i18n-t>
    </div>

    <div class="tw-mb-3">
        <label for="max-api-url" class="gizmo-field-label">{{ $t("API URL") }}</label>
        <input id="max-api-url" v-model="$parent.notification.maxApiUrl" type="text" class="gizmo-native-control" required />
        <div class="gizmo-field-help">
            {{ $t("maxApiUrlDescription") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <label for="max-chat-id" class="gizmo-field-label">{{ $t("Chat ID") }}</label>
        <input id="max-chat-id" v-model="$parent.notification.maxChatID" type="text" class="gizmo-native-control" required />
        <div class="gizmo-field-help">
            {{ $t("wayToGetMaxChatID") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <div class="gizmo-native-check gizmo-native-switch">
            <input v-model="$parent.notification.maxUseTemplate" class="gizmo-native-check__input" type="checkbox" />
            <label class="gizmo-native-check__label">{{ $t("maxUseTemplate") }}</label>
        </div>
        <div class="gizmo-field-help">
            {{ $t("maxUseTemplateDescription") }}
        </div>
    </div>

    <template v-if="$parent.notification.maxUseTemplate">
        <div class="tw-mb-3">
            <label class="gizmo-field-label" for="max-message-format">{{ $t("Message Format") }}</label>
            <select
                id="max-message-format"
                v-model="$parent.notification.maxTemplateFormat"
                class="gizmo-native-control gizmo-native-select"
                required
            >
                <option value="plain">{{ $t("Plain Text") }}</option>
                <option value="markdown">Markdown</option>
                <option value="html">HTML</option>
            </select>
            <p class="gizmo-field-help">
                {{ $t("maxTemplateFormatDescription") }}
            </p>

            <label class="gizmo-field-label" for="max-message-template">{{ $t("Message Template") }}</label>
            <TemplatedTextarea
                id="max-message-template"
                v-model="$parent.notification.maxTemplate"
                :required="true"
            ></TemplatedTextarea>
        </div>
    </template>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";
import TemplatedTextarea from "../TemplatedTextarea.vue";

export default {
    components: {
        HiddenInput,
        TemplatedTextarea,
    },
    mounted() {
        this.$parent.notification.maxApiUrl ||= "https://platform-api.max.ru";
        this.$parent.notification.maxTemplateFormat ||= "plain";
    },
};
</script>
