<template>
    <div class="tw-mb-3">
        <label for="line-channel-access-token" class="gizmo-field-label">{{ $t("Channel access token (Long-lived)") }}</label>
        <HiddenInput
            id="line-channel-access-token"
            v-model="$parent.notification.lineChannelAccessToken"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
    </div>
    <i18n-t tag="div" keypath="lineDevConsoleTo" class="gizmo-field-help">
        <b>{{ $t("Messaging API") }}</b>
    </i18n-t>
    <div class="tw-mb-3" style="margin-top: 12px">
        <label for="line-user-id" class="gizmo-field-label">{{ $t("Your User ID") }}</label>
        <input id="line-user-id" v-model="$parent.notification.lineUserID" type="text" class="gizmo-native-control" required />
    </div>
    <i18n-t tag="div" keypath="lineDevConsoleTo" class="gizmo-field-help">
        <b>{{ $t("Basic Settings") }}</b>
    </i18n-t>
    <i18n-t tag="div" keypath="wayToGetLineChannelToken" class="gizmo-field-help" style="margin-top: 8px">
        <a href="https://developers.line.biz/console/" target="_blank">{{ $t("Line Developers Console") }}</a>
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
