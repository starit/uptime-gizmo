<template>
    <div class="tw-mb-3">
        <label for="telegram-bot-token" class="gizmo-field-label">{{ $t("Bot Token") }}</label>
        <HiddenInput
            id="telegram-bot-token"
            v-model="$parent.notification.telegramBotToken"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <i18n-t tag="div" keypath="wayToGetTelegramToken" class="gizmo-field-help">
            <a href="https://t.me/BotFather" target="_blank">https://t.me/BotFather</a>
        </i18n-t>
    </div>

    <div class="tw-mb-3">
        <label for="telegram-chat-id" class="gizmo-field-label">{{ $t("Chat ID") }}</label>

        <div class="gizmo-input-group tw-mb-3">
            <input
                id="telegram-chat-id"
                v-model="$parent.notification.telegramChatID"
                type="text"
                class="gizmo-native-control"
                required
            />
            <button
                v-if="$parent.notification.telegramBotToken"
                class="gizmo-native-button gizmo-native-button--secondary"
                type="button"
                @click="autoGetTelegramChatID"
            >
                {{ $t("Auto Get") }}
            </button>
        </div>

        <div class="gizmo-field-help">
            {{ $t("supportTelegramChatID") }}

            <p style="margin-top: 8px">
                {{ $t("wayToGetTelegramChatID") }}
            </p>

            <p style="margin-top: 8px">
                <a :href="telegramGetUpdatesURL('withToken')" target="_blank" style="word-break: break-word">
                    {{ telegramGetUpdatesURL("masked") }}
                </a>
            </p>
        </div>

        <label for="message_thread_id" class="gizmo-field-label">{{ $t("telegramMessageThreadID") }}</label>
        <input
            id="message_thread_id"
            v-model="$parent.notification.telegramMessageThreadID"
            type="text"
            class="gizmo-native-control"
        />
        <p class="gizmo-field-help">{{ $t("telegramMessageThreadIDDescription") }}</p>

        <label for="server_url" class="gizmo-field-label">{{ $t("telegramServerUrl") }}</label>
        <input id="server_url" v-model="$parent.notification.telegramServerUrl" type="text" class="gizmo-native-control" />
        <div class="gizmo-field-help">
            <i18n-t keypath="telegramServerUrlDescription">
                <a href="https://core.telegram.org/bots/api#using-a-local-bot-api-server" target="_blank">
                    {{ $t("here") }}
                </a>
                <a href="https://api.telegram.org" target="_blank">https://api.telegram.org</a>
            </i18n-t>
        </div>
    </div>

    <div class="tw-mb-3">
        <div class="gizmo-native-check gizmo-native-switch">
            <input v-model="$parent.notification.telegramUseTemplate" class="gizmo-native-check__input" type="checkbox" />
            <label class="gizmo-native-check__label">{{ $t("telegramUseTemplate") }}</label>
        </div>

        <div class="gizmo-field-help">
            {{ $t("telegramUseTemplateDescription") }}
        </div>
    </div>

    <template v-if="$parent.notification.telegramUseTemplate">
        <div class="tw-mb-3">
            <label class="gizmo-field-label" for="message_parse_mode">{{ $t("Message Format") }}</label>
            <select
                id="message_parse_mode"
                v-model="$parent.notification.telegramTemplateParseMode"
                class="gizmo-native-control gizmo-native-select"
                required
            >
                <option value="plain">{{ $t("Plain Text") }}</option>
                <option value="HTML">HTML</option>
                <option value="MarkdownV2">MarkdownV2</option>
            </select>
            <i18n-t tag="p" keypath="telegramTemplateFormatDescription" class="gizmo-field-help">
                <a href="https://core.telegram.org/bots/api#formatting-options" target="_blank">
                    {{ $t("documentation") }}
                </a>
            </i18n-t>

            <label class="gizmo-field-label" for="message_template">{{ $t("Message Template") }}</label>
            <TemplatedTextarea
                id="message_template"
                v-model="$parent.notification.telegramTemplate"
                :required="true"
                :placeholder="telegramTemplatedTextareaPlaceholder"
            ></TemplatedTextarea>
        </div>
    </template>

    <div class="tw-mb-3">
        <div class="gizmo-native-check gizmo-native-switch">
            <input v-model="$parent.notification.telegramSendSilently" class="gizmo-native-check__input" type="checkbox" />
            <label class="gizmo-native-check__label">{{ $t("telegramSendSilently") }}</label>
        </div>

        <div class="gizmo-field-help">
            {{ $t("telegramSendSilentlyDescription") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <div class="gizmo-native-check gizmo-native-switch">
            <input v-model="$parent.notification.telegramProtectContent" class="gizmo-native-check__input" type="checkbox" />
            <label class="gizmo-native-check__label">{{ $t("telegramProtectContent") }}</label>
        </div>

        <div class="gizmo-field-help">
            {{ $t("telegramProtectContentDescription") }}
        </div>
    </div>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";
import TemplatedTextarea from "../TemplatedTextarea.vue";
import axios from "axios";

export default {
    components: {
        HiddenInput,
        TemplatedTextarea,
    },
    computed: {
        telegramTemplatedTextareaPlaceholder() {
            return this.$t("Example:", [
                `
Uptime Gizmo Alert{% if monitorJSON %} - {{ monitorJSON['name'] }}{% endif %}

{{ msg }}
                `,
            ]);
        },
    },
    mounted() {
        this.$parent.notification.telegramServerUrl ||= "https://api.telegram.org";
    },
    methods: {
        /**
         * Get the URL for telegram updates
         * @param {string} mode Should the token be masked?
         * @returns {string} formatted URL
         */
        telegramGetUpdatesURL(mode = "masked") {
            let token = `<${this.$t("YOUR BOT TOKEN HERE")}>`;

            if (this.$parent.notification.telegramBotToken) {
                if (mode === "withToken") {
                    token = this.$parent.notification.telegramBotToken;
                } else if (mode === "masked") {
                    token = "*".repeat(this.$parent.notification.telegramBotToken.length);
                }
            }

            return `${this.$parent.notification.telegramServerUrl}/bot${token}/getUpdates`;
        },

        /**
         * Get the telegram chat ID
         * @returns {Promise<void>}
         * @throws The chat ID could not be found
         */
        async autoGetTelegramChatID() {
            try {
                let res = await axios.get(this.telegramGetUpdatesURL("withToken"));

                if (res.data.result.length >= 1) {
                    let update = res.data.result[res.data.result.length - 1];

                    if (update.channel_post) {
                        this.$parent.notification.telegramChatID = update.channel_post.chat.id;
                    } else if (update.message) {
                        this.$parent.notification.telegramChatID = update.message.chat.id;
                    } else {
                        throw new Error(this.$t("chatIDNotFound"));
                    }
                } else {
                    throw new Error(this.$t("chatIDNotFound"));
                }
            } catch (error) {
                this.$root.toastError(error.message);
            }
        },
    },
};
</script>
