<template>
    <div class="tw-mb-3">
        <label for="slack-webhook-url" class="gizmo-field-label">
            {{ $t("Webhook URL") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input
            id="slack-webhook-url"
            v-model="$parent.notification.slackwebhookURL"
            type="text"
            class="gizmo-native-control"
            required
        />
        <label for="slack-username" class="gizmo-field-label">{{ $t("Username") }}</label>
        <input id="slack-username" v-model="$parent.notification.slackusername" type="text" class="gizmo-native-control" />
        <div class="gizmo-field-help">
            {{ $t("aboutSlackUsername") }}
        </div>
        <label for="slack-iconemo" class="gizmo-field-label">{{ $t("Icon Emoji") }}</label>
        <input id="slack-iconemo" v-model="$parent.notification.slackiconemo" type="text" class="gizmo-native-control" />
        <label for="slack-channel" class="gizmo-field-label">{{ $t("Channel Name") }}</label>
        <input id="slack-channel-name" v-model="$parent.notification.slackchannel" type="text" class="gizmo-native-control" />

        <label class="gizmo-field-label">{{ $t("Message format") }}</label>
        <div class="gizmo-native-check gizmo-native-switch">
            <input
                id="slack-text-message"
                v-model="$parent.notification.slackrichmessage"
                type="checkbox"
                class="gizmo-native-check__input"
            />
            <label for="slack-text-message" class="gizmo-field-label">{{ $t("Send rich messages") }}</label>
        </div>

        <div class="tw-mb-3">
            <div class="gizmo-native-check gizmo-native-switch">
                <input
                    id="slack-include-group-name"
                    v-model="$parent.notification.slackIncludeGroupName"
                    type="checkbox"
                    class="gizmo-native-check__input"
                />
                <label for="slack-include-group-name" class="gizmo-native-check__label">{{ $t("slackIncludeGroupName") }}</label>
            </div>
            <div class="gizmo-field-help">
                {{ $t("slackIncludeGroupNameDescription") }}
            </div>
        </div>

        <div class="tw-mb-3">
            <div class="gizmo-native-check gizmo-native-switch">
                <input v-model="$parent.notification.slackUseTemplate" class="gizmo-native-check__input" type="checkbox" />
                <label class="gizmo-native-check__label">{{ $t("slackUseTemplate") }}</label>
            </div>
            <div class="gizmo-field-help">
                {{ $t("slackUseTemplateDescription") }}
            </div>
        </div>

        <template v-if="$parent.notification.slackUseTemplate">
            <div class="tw-mb-3">
                <label class="gizmo-field-label" for="slack-message-template">{{ $t("Message Template") }}</label>
                <TemplatedTextarea
                    id="slack-message-template"
                    v-model="$parent.notification.slackTemplate"
                    :required="true"
                    :placeholder="slackTemplatedTextareaPlaceholder"
                ></TemplatedTextarea>
            </div>
        </template>

        <div class="gizmo-field-help">
            <span style="color: red"><sup>*</sup></span>
            {{ $t("Required") }}
            <i18n-t tag="p" keypath="aboutWebhooks" style="margin-top: 8px">
                <a href="https://api.slack.com/messaging/webhooks" target="_blank">
                    https://api.slack.com/messaging/webhooks
                </a>
            </i18n-t>
            <p style="margin-top: 8px">
                {{ $t("aboutChannelName", ["slack"]) }}
            </p>
            <p style="margin-top: 8px">
                {{ $t("aboutKumaURL") }}
            </p>
            <i18n-t tag="p" keypath="emojiCheatSheet" style="margin-top: 8px">
                <a href="https://www.webfx.com/tools/emoji-cheat-sheet/" target="_blank">
                    https://www.webfx.com/tools/emoji-cheat-sheet/
                </a>
            </i18n-t>
        </div>

        <div class="gizmo-native-check gizmo-native-switch">
            <input
                id="slack-channel-notify"
                v-model="$parent.notification.slackchannelnotify"
                type="checkbox"
                class="gizmo-native-check__input"
            />
            <label for="slack-channel-notify" class="gizmo-field-label">{{ $t("Notify Channel") }}</label>
        </div>
        <div class="gizmo-field-help">
            {{ $t("aboutNotifyChannel") }}
        </div>
    </div>
</template>

<script>
import TemplatedTextarea from "../TemplatedTextarea.vue";

export default {
    components: {
        TemplatedTextarea,
    },
    computed: {
        slackTemplatedTextareaPlaceholder() {
            return this.$t("Example:", [
                `
Uptime Gizmo Alert{% if monitorJSON %} - {{ monitorJSON['name'] }}{% endif %}
{% if monitorJSON and monitorJSON.path and monitorJSON.path.length > 1 %}_{{ monitorJSON.path.slice(0, -1).join(' / ') }}_\n{% endif %}
{{ msg }}
                `,
            ]);
        },
    },
    mounted() {
        if (typeof this.$parent.notification.slackIncludeGroupName === "undefined") {
            this.$parent.notification.slackIncludeGroupName = true;
        }
    },
};
</script>
