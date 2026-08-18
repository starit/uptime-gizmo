<template>
    <div class="tw-mb-3">
        <label for="vkteams-bot-token" class="gizmo-field-label">{{ $t("Bot Token") }}</label>
        <HiddenInput
            id="vkteams-bot-token"
            v-model="$parent.notification.vkteamsBotToken"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <i18n-t tag="div" keypath="VKTeams Bot Token Description" class="gizmo-field-help">
            <a href="https://teams.vk.com/botapi/" target="_blank">https://teams.vk.com/botapi/</a>
        </i18n-t>
    </div>

    <div class="tw-mb-3">
        <label for="vkteams-bot-chat-id" class="gizmo-field-label">{{ $t("Chat ID") }}</label>
        <input
            id="vkteams-bot-chat-id"
            v-model="$parent.notification.vkteamsChatId"
            type="text"
            class="gizmo-native-control"
            placeholder="*****@chat.agent"
            required
        />
        <div class="gizmo-field-help">
            {{ $t("VKTeams Chat Id Description") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <label for="vkteams-api-url" class="gizmo-field-label">{{ $t("API URL") }}</label>
        <input
            id="vkteams-api-url"
            v-model="$parent.notification.vkteamsBaseUrl"
            type="text"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">
            {{ $t("VKTeams Base Url Description") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <div class="gizmo-native-check gizmo-native-switch">
            <input v-model="$parent.notification.vkteamsUseTemplate" class="gizmo-native-check__input" type="checkbox" />
            <label class="gizmo-native-check__label">{{ $t("VKTeams Use Template") }}</label>
        </div>
        <div class="gizmo-field-help">
            {{ $t("VKTeams Use Template Description") }}
        </div>
    </div>

    <template v-if="$parent.notification.vkteamsUseTemplate">
        <div class="tw-mb-3">
            <label class="gizmo-field-label" for="vkteams-message-format">{{ $t("Message Format") }}</label>
            <select
                id="vkteams-message-format"
                v-model="$parent.notification.vkteamsTemplateFormat"
                class="gizmo-native-control gizmo-native-select"
                required
            >
                <option value="plain">{{ $t("Plain Text") }}</option>
                <option value="MarkdownV2">MarkdownV2</option>
                <option value="HTML">HTML</option>
            </select>
            <p class="gizmo-field-help">
                {{ $t("VKTeams Template Format Description") }}
            </p>

            <label class="gizmo-field-label" for="vkteams-message-template">{{ $t("Message Template") }}</label>
            <TemplatedTextarea
                id="vkteams-message-template"
                v-model="$parent.notification.vkteamsTemplate"
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
        TemplatedTextarea,
        HiddenInput,
    },
    mounted() {
        this.$parent.notification.vkteamsBaseUrl ||= "https://myteam.mail.ru";
        this.$parent.notification.vkteamsTemplateFormat ||= "plain";
    },
};
</script>
