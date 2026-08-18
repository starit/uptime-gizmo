<template>
    <div class="tw-mb-3">
        <label for="kook-bot-token" class="gizmo-field-label">{{ $t("Bot Token") }}</label>
        <HiddenInput
            id="kook-bot-token"
            v-model="$parent.notification.kookBotToken"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <i18n-t tag="div" keypath="wayToGetKookBotToken" class="gizmo-field-help">
            <a href="https://developer.kookapp.cn/bot" target="_blank">https://developer.kookapp.cn/bot</a>
        </i18n-t>
    </div>

    <div class="tw-mb-3">
        <label for="kook-guild-id" class="gizmo-field-label">{{ $t("Guild ID") }}</label>
        <input
            id="kook-guild-id"
            v-model="$parent.notification.kookGuildID"
            type="text"
            class="gizmo-native-control"
            required
        />

        <div class="gizmo-field-help">
            <p style="margin-top: 8px">
                {{ $t("wayToGetKookGuildID") }}
            </p>
        </div>
    </div>

    <i18n-t tag="p" keypath="More info on:" style="margin-top: 8px">
        <a href="https://developer.kookapp.cn" target="_blank">https://developer.kookapp.cn</a>
    </i18n-t>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";
export default {
    components: {
        HiddenInput,
    },
};
</script>
