<template>
    <div class="tw-mb-3">
        <label for="pushover-user" class="gizmo-field-label">
            {{ $t("User Key") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <HiddenInput
            id="pushover-user"
            v-model="$parent.notification.pushoveruserkey"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <label for="pushover-app-token" class="gizmo-field-label">
            {{ $t("Application Token") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <HiddenInput
            id="pushover-app-token"
            v-model="$parent.notification.pushoverapptoken"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <label for="pushover-device" class="gizmo-field-label">{{ $t("Device") }}</label>
        <input id="pushover-device" v-model="$parent.notification.pushoverdevice" type="text" class="gizmo-native-control" />
        <label for="pushover-device" class="gizmo-field-label">{{ $t("Message Title") }}</label>
        <input id="pushover-title" v-model="$parent.notification.pushovertitle" type="text" class="gizmo-native-control" />
        <label for="pushover-priority" class="gizmo-field-label">{{ $t("Priority") }}</label>
        <select id="pushover-priority" v-model="$parent.notification.pushoverpriority" class="gizmo-native-control gizmo-native-select">
            <option>-2</option>
            <option>-1</option>
            <option>0</option>
            <option>1</option>
            <option>2</option>
        </select>

        <label for="pushover-sound-down" class="gizmo-field-label">{{ $t("Notification Sound") }} - Down</label>
        <select id="pushover-sound-down" v-model="$parent.notification.pushoversounds" class="gizmo-native-control gizmo-native-select">
            <option v-for="sound in soundOptions" :key="sound" :value="sound">
                {{ $t(`pushoversounds ${sound}`) }}
            </option>
        </select>

        <label for="pushover-sound-up" class="gizmo-field-label">{{ $t("Notification Sound") }} - Up</label>
        <select id="pushover-sound-up" v-model="$parent.notification.pushoversounds_up" class="gizmo-native-control gizmo-native-select">
            <option v-for="sound in soundOptions" :key="sound" :value="sound">
                {{ $t(`pushoversounds ${sound}`) }}
            </option>
        </select>

        <label for="pushover-ttl" class="gizmo-field-label">{{ $t("pushoverMessageTtl") }}</label>
        <input
            id="pushover-ttl"
            v-model="$parent.notification.pushoverttl"
            type="number"
            min="0"
            step="1"
            class="gizmo-native-control"
        />

        <div class="gizmo-field-help">
            <span style="color: red"><sup>*</sup></span>
            {{ $t("Required") }}
            <i18n-t tag="p" keypath="More info on:" style="margin-top: 8px">
                <a href="https://pushover.net/api" target="_blank">https://pushover.net/api</a>
            </i18n-t>
            <p style="margin-top: 8px">
                {{ $t("pushoverDesc1") }}
            </p>
            <p style="margin-top: 8px">
                {{ $t("pushoverDesc2") }}
            </p>
        </div>
    </div>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";

export default {
    components: {
        HiddenInput,
    },
    data() {
        return {
            soundOptions: [
                "pushover",
                "bike",
                "bugle",
                "cashregister",
                "classical",
                "cosmic",
                "falling",
                "gamelan",
                "incoming",
                "intermission",
                "magic",
                "mechanical",
                "pianobar",
                "siren",
                "spacealarm",
                "tugboat",
                "alien",
                "climb",
                "persistent",
                "echo",
                "updown",
                "vibrate",
                "none",
            ],
        };
    },
};
</script>
