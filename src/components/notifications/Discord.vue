<template>
    <div class="tw-mb-3">
        <label for="discord-webhook-url" class="gizmo-field-label">{{ $t("Discord Webhook URL") }}</label>
        <HiddenInput
            id="discord-webhook-url"
            v-model="$parent.notification.discordWebhookUrl"
            type="text"
            required
            autocomplete="false"
        />
        <div class="gizmo-field-help">
            {{ $t("wayToGetDiscordURL") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <label for="discord-username" class="gizmo-field-label">{{ $t("Bot Display Name") }}</label>
        <input
            id="discord-username"
            v-model="$parent.notification.discordUsername"
            type="text"
            class="gizmo-native-control"
            autocomplete="false"
            :placeholder="$root.appName"
        />
    </div>

    <div class="tw-mb-3">
        <label for="discord-prefix-message" class="gizmo-field-label">{{ $t("Prefix Custom Message") }}</label>
        <input
            id="discord-prefix-message"
            v-model="$parent.notification.discordPrefixMessage"
            type="text"
            class="gizmo-native-control"
            autocomplete="false"
            :placeholder="$t('Hello @everyone is...')"
        />
    </div>

    <div class="tw-mb-3">
        <label for="discord-message-format" class="gizmo-field-label">{{ $t("discordMessageFormat") }}</label>
        <select id="discord-message-format" v-model="$parent.notification.discordMessageFormat" class="gizmo-native-control gizmo-native-select">
            <option value="normal">{{ $t("discordMessageFormatNormal") }}</option>
            <option value="minimalist">{{ $t("discordMessageFormatMinimalist") }}</option>
            <option value="custom">{{ $t("discordMessageFormatCustom") }}</option>
        </select>
    </div>

    <div v-show="$parent.notification.discordMessageFormat === 'custom'">
        <div class="tw-mb-3">
            <label for="discord-message-template" class="gizmo-field-label">{{ $t("discordMessageTemplate") }}</label>
            <TemplatedTextarea
                id="discord-message-template"
                v-model="$parent.notification.discordMessageTemplate"
                :required="false"
                placeholder=""
            ></TemplatedTextarea>
            <div class="gizmo-field-help">{{ $t("discordUseMessageTemplateDescription") }}</div>
        </div>
    </div>

    <div class="tw-mb-3">
        <label for="discord-message-type" class="gizmo-field-label">{{ $t("Select message type") }}</label>
        <select id="discord-message-type" v-model="$parent.notification.discordChannelType" class="gizmo-native-control gizmo-native-select">
            <option value="channel">{{ $t("Send to channel") }}</option>
            <option value="createNewForumPost">{{ $t("Create new forum post") }}</option>
            <option value="postToThread">{{ $t("postToExistingThread") }}</option>
        </select>
    </div>

    <div v-if="$parent.notification.discordChannelType === 'createNewForumPost'">
        <div class="tw-mb-3">
            <label for="discord-target" class="gizmo-field-label">
                {{ $t("forumPostName") }}
            </label>
            <input
                id="discord-target"
                v-model="$parent.notification.postName"
                type="text"
                class="gizmo-native-control"
                autocomplete="false"
            />
            <div class="gizmo-field-help">
                {{ $t("whatHappensAtForumPost", { option: $t("postToExistingThread") }) }}
            </div>
        </div>
    </div>
    <div v-if="$parent.notification.discordChannelType === 'postToThread'">
        <div class="tw-mb-3">
            <label for="discord-target" class="gizmo-field-label">
                {{ $t("threadForumPostID") }}
            </label>
            <input
                id="discord-target"
                v-model="$parent.notification.threadId"
                type="text"
                class="gizmo-native-control"
                autocomplete="false"
                :placeholder="$t('e.g. {discordThreadID}', { discordThreadID: 1177566663751782411 })"
            />
            <div class="gizmo-field-help">
                <i18n-t keypath="wayToGetDiscordThreadId">
                    <a
                        href="https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-"
                        target="_blank"
                    >
                        {{ $t("here") }}
                    </a>
                </i18n-t>
            </div>
        </div>
    </div>

    <div class="tw-mb-3">
        <div class="gizmo-native-check gizmo-native-switch">
            <input
                id="discord-disable-url"
                v-model="$parent.notification.disableUrl"
                class="gizmo-native-check__input"
                type="checkbox"
                role="switch"
            />
            <label class="gizmo-native-check__label" for="discord-disable-url">{{ $t("Disable URL in Notification") }}</label>
        </div>
    </div>

    <div class="tw-mb-3">
        <div class="gizmo-native-check gizmo-native-switch">
            <input
                id="discord-suppress-notifications"
                v-model="$parent.notification.discordSuppressNotifications"
                class="gizmo-native-check__input"
                type="checkbox"
                role="switch"
            />
            <label class="gizmo-native-check__label" for="discord-suppress-notifications">
                {{ $t("Suppress Notifications") }}
            </label>
        </div>
        <div class="gizmo-field-help">
            {{ $t("discordSuppressNotificationsHelptext") }}
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
        if (!this.$parent.notification.discordChannelType) {
            this.$parent.notification.discordChannelType = "channel";
        }
        if (this.$parent.notification.disableUrl === undefined) {
            this.$parent.notification.disableUrl = false;
        }
        if (this.$parent.notification.discordSuppressNotifications === undefined) {
            this.$parent.notification.discordSuppressNotifications = false;
        }
        // Message format: default "normal"; migrate from old checkbox
        if (typeof this.$parent.notification.discordMessageFormat === "undefined") {
            const hadCustom =
                this.$parent.notification.discordUseMessageTemplate === true ||
                !!this.$parent.notification.discordMessageTemplate?.trim();
            this.$parent.notification.discordMessageFormat = hadCustom ? "custom" : "normal";
        }
    },
};
</script>
