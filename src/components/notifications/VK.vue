<template>
    <div class="tw-mb-3">
        <label for="vk-access-token" class="gizmo-field-label">{{ $t("Access Token") }}</label>
        <HiddenInput
            id="vk-access-token"
            v-model="$parent.notification.vkAccessToken"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
    </div>

    <div class="tw-mb-3">
        <label for="vk-api-version" class="gizmo-field-label">{{ $t("API Version") }}</label>
        <input
            id="vk-api-version"
            v-model="$parent.notification.vkApiVersion"
            type="text"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">
            {{ $t("vkApiVersionDescription") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <label for="vk-peer-id" class="gizmo-field-label">{{ $t("Peer ID") }}</label>
        <input id="vk-peer-id" v-model="$parent.notification.vkPeerId" type="text" class="gizmo-native-control" required />
        <div class="gizmo-field-help">
            {{ $t("vkPeerIdDescription") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <div class="gizmo-native-check gizmo-native-switch">
            <input v-model="$parent.notification.vkDontParseLinks" class="gizmo-native-check__input" type="checkbox" />
            <label class="gizmo-native-check__label">{{ $t("vkDontParseLinks") }}</label>
        </div>
        <div class="gizmo-field-help">
            {{ $t("vkDontParseLinksDescription") }}
        </div>
    </div>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";

export default {
    components: {
        HiddenInput,
    },
    mounted() {
        this.$parent.notification.vkApiVersion ||= "5.199";
        this.$parent.notification.vkDontParseLinks ||= false;
    },
};
</script>
