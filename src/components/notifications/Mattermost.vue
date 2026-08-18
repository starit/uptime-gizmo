<template>
    <div class="tw-mb-3">
        <label for="mattermost-webhook-url" class="gizmo-field-label">
            {{ $t("Webhook URL") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input
            id="mattermost-webhook-url"
            v-model="$parent.notification.mattermostWebhookUrl"
            type="text"
            class="gizmo-native-control"
            required
        />
        <label for="mattermost-username" class="gizmo-field-label">{{ $t("Username") }}</label>
        <input
            id="mattermost-username"
            v-model="$parent.notification.mattermostusername"
            type="text"
            class="gizmo-native-control"
        />
        <label for="mattermost-iconurl" class="gizmo-field-label">{{ $t("Icon URL") }}</label>
        <input
            id="mattermost-iconurl"
            v-model="$parent.notification.mattermosticonurl"
            type="text"
            class="gizmo-native-control"
        />
        <label for="mattermost-iconemo" class="gizmo-field-label">{{ $t("Icon Emoji") }}</label>
        <input
            id="mattermost-iconemo"
            v-model="$parent.notification.mattermosticonemo"
            type="text"
            class="gizmo-native-control"
        />
        <label for="mattermost-channel" class="gizmo-field-label">{{ $t("Channel Name") }}</label>
        <input
            id="mattermost-channel-name"
            v-model="$parent.notification.mattermostchannel"
            type="text"
            class="gizmo-native-control"
        />
        <div class="gizmo-field-help">
            <span style="color: red"><sup>*</sup></span>
            {{ $t("Required") }}
            <i18n-t tag="p" keypath="aboutWebhooks" style="margin-top: 8px">
                <a href="https://developers.mattermost.com/integrate/webhooks/incoming/" target="_blank">
                    https://developers.mattermost.com/integrate/webhooks/incoming/
                </a>
            </i18n-t>
            <p style="margin-top: 8px">
                {{ $t("aboutMattermostChannelName") }}
            </p>
            <p style="margin-top: 8px">
                {{ $t("aboutKumaURL") }}
            </p>
            <p style="margin-top: 8px">
                {{ $t("aboutIconURL") }}
            </p>
            <i18n-t tag="p" keypath="emojiCheatSheet" style="margin-top: 8px">
                <a href="https://www.webfx.com/tools/emoji-cheat-sheet/" target="_blank">
                    https://www.webfx.com/tools/emoji-cheat-sheet/
                </a>
            </i18n-t>
        </div>
    </div>
</template>
