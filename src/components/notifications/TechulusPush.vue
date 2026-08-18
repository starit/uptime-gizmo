<template>
    <div class="tw-mb-3">
        <label for="push-api-key" class="gizmo-field-label">{{ $t("API Key") }}</label>
        <HiddenInput
            id="push-api-key"
            v-model="$parent.notification.pushAPIKey"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
    </div>

    <div class="tw-mb-3">
        <label for="push-api-title" class="gizmo-field-label">{{ $t("Title") }}</label>
        <input id="push-api-title" v-model="$parent.notification.pushTitle" type="text" class="gizmo-native-control" />
    </div>

    <div class="tw-mb-3">
        <label for="push-api-channel" class="gizmo-field-label">{{ $t("Notification Channel") }}</label>
        <input
            id="push-api-channel"
            v-model="$parent.notification.pushChannel"
            type="text"
            class="gizmo-native-control"
            pattern="[A-Za-z0-9-]+"
        />
        <div class="gizmo-field-help">
            {{ $t("Alphanumerical string and hyphens only") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <label for="push-api-sound" class="gizmo-field-label">{{ $t("Sound") }}</label>
        <select id="push-api-sound" v-model="$parent.notification.pushSound" class="gizmo-native-control gizmo-native-select">
            <option value="default">{{ $t("Default") }}</option>
            <option value="arcade">{{ $t("Arcade") }}</option>
            <option value="correct">{{ $t("Correct") }}</option>
            <option value="fail">{{ $t("Fail") }}</option>
            <option value="harp">{{ $t("Harp") }}</option>
            <option value="reveal">{{ $t("Reveal") }}</option>
            <option value="bubble">{{ $t("Bubble") }}</option>
            <option value="doorbell">{{ $t("Doorbell") }}</option>
            <option value="flute">{{ $t("Flute") }}</option>
            <option value="money">{{ $t("Money") }}</option>
            <option value="scifi">{{ $t("Scifi") }}</option>
            <option value="clear">{{ $t("Clear") }}</option>
            <option value="elevator">{{ $t("Elevator") }}</option>
            <option value="guitar">{{ $t("Guitar") }}</option>
            <option value="pop">{{ $t("Pop") }}</option>
        </select>
        <div class="gizmo-field-help">
            {{ $t("Custom sound to override default notification sound") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <div class="gizmo-native-check gizmo-native-switch">
            <input v-model="$parent.notification.pushTimeSensitive" class="gizmo-native-check__input" type="checkbox" />
            <label class="gizmo-native-check__label">{{ $t("Time Sensitive (iOS Only)") }}</label>
        </div>
        <div class="gizmo-field-help">
            {{
                $t(
                    "Time sensitive notifications will be delivered immediately, even if the device is in do not disturb mode."
                )
            }}
        </div>
    </div>

    <i18n-t tag="p" keypath="More info on:" style="margin-top: 8px">
        <a href="https://docs.push.techulus.com" target="_blank">https://docs.push.techulus.com</a>
    </i18n-t>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";

export default {
    components: {
        HiddenInput,
    },
    mounted() {
        if (typeof this.$parent.notification.pushTitle === "undefined") {
            this.$parent.notification.pushTitle = "Uptime-Gizmo";
        }
        if (typeof this.$parent.notification.pushChannel === "undefined") {
            this.$parent.notification.pushChannel = "uptime-gizmo";
        }
        if (typeof this.$parent.notification.pushSound === "undefined") {
            this.$parent.notification.pushSound = "default";
        }
        if (typeof this.$parent.notification.pushTimeSensitive === "undefined") {
            this.$parent.notification.pushTimeSensitive = true;
        }
    },
};
</script>
