<template>
    <div class="tw-mb-3">
        <label for="clickup-token" class="gizmo-field-label">
            {{ $t("ClickUp API Token") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <HiddenInput
            id="clickup-token"
            v-model="$parent.notification.clickupToken"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <div class="gizmo-field-help">
            {{ $t("ClickUp API Token Description") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <label for="clickup-workspace-id" class="gizmo-field-label">
            {{ $t("ClickUp Workspace ID") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input
            id="clickup-workspace-id"
            v-model="$parent.notification.clickupWorkspaceId"
            type="text"
            class="gizmo-native-control"
            required
            autocomplete="off"
        />
        <div class="gizmo-field-help">
            {{ $t("ClickUp Workspace ID Description") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <label for="clickup-channel-id" class="gizmo-field-label">
            {{ $t("ClickUp Channel ID") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input
            id="clickup-channel-id"
            v-model="$parent.notification.clickupChannelId"
            type="text"
            class="gizmo-native-control"
            required
            autocomplete="off"
        />
        <div class="gizmo-field-help">
            {{ $t("ClickUp Channel ID Description") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <div class="gizmo-native-check gizmo-native-switch">
            <input
                id="clickup-disable-url"
                v-model="$parent.notification.clickupDisableUrl"
                type="checkbox"
                class="gizmo-native-check__input"
            />
            <label for="clickup-disable-url" class="gizmo-native-check__label">
                {{ $t("Disable URL in Notification") }}
            </label>
        </div>
    </div>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";
export default {
    components: {
        HiddenInput,
    },
    mounted() {},
};
</script>
