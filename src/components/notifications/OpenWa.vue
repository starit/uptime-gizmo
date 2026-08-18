<template>
    <div class="tw-mb-3">
        <label for="openwa-api-url" class="gizmo-field-label">{{ $t("API URL") }}</label>
        <input
            id="openwa-api-url"
            v-model="$parent.notification.openwaApiUrl"
            placeholder="http://localhost:2785/"
            type="url"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">{{ $t("wayToGetOpenwaApiUrl") }}</div>
    </div>

    <div class="tw-mb-3">
        <label for="openwa-api-key" class="gizmo-field-label">{{ $t("API Key") }}</label>
        <HiddenInput
            id="openwa-api-key"
            v-model="$parent.notification.openwaApiKey"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <div class="gizmo-field-help">{{ $t("wayToGetOpenwaApiKey") }}</div>
    </div>

    <div class="tw-mb-3">
        <label for="openwa-session" class="gizmo-field-label">{{ $t("openwaSession") }}</label>
        <input
            id="openwa-session"
            v-model="$parent.notification.openwaSession"
            type="text"
            placeholder="default"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">{{ $t("wayToGetOpenwaSession") }}</div>
    </div>

    <div class="tw-mb-3">
        <label for="openwa-chat-id" class="gizmo-field-label">{{ $t("openwaChatId") }}</label>
        <input
            id="openwa-chat-id"
            v-model="$parent.notification.openwaChatId"
            type="text"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">
            {{ $t("wayToWriteOpenwaChatId", ["00117612345678@c.us", "123456789012345678@g.us", "1234567890@lid"]) }}
        </div>
    </div>

    <div class="tw-mb-3">
        <div class="gizmo-native-check gizmo-native-switch">
            <input v-model="$parent.notification.openwaUseCustomMessage" class="gizmo-native-check__input" type="checkbox" />
            <label class="gizmo-native-check__label">{{ $t("openwaCustomMessageTitle") }}</label>
        </div>
        <div class="gizmo-field-help">{{ $t("openwaCustomMessageDesc") }}</div>
    </div>

    <template v-if="$parent.notification.openwaUseCustomMessage">
        <div class="tw-mb-3">
            <TemplatedTextarea
                id="openwa-custom-message"
                v-model="$parent.notification.openwaCustomMessage"
                :required="true"
                :placeholder="customMessagePlaceholder"
            ></TemplatedTextarea>
        </div>
    </template>

    <i18n-t tag="div" keypath="More info on:" class="tw-mb-3 gizmo-field-help">
        <a href="https://www.open-wa.org/" target="_blank">https://www.open-wa.org/</a>
    </i18n-t>
</template>
<script>
import HiddenInput from "../HiddenInput.vue";
import TemplatedTextarea from "../TemplatedTextarea.vue";

export default {
    components: {
        HiddenInput,
        TemplatedTextarea,
    },
    computed: {
        customMessagePlaceholder() {
            return this.$t("Example:", [`[{{ name }}] [{{ status }}]\n{{ msg }}`]);
        },
    },
};
</script>
