<template>
    <div class="tw-mb-3">
        <label for="opsgenie-region" class="gizmo-field-label">
            {{ $t("Region") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <select id="opsgenie-region" v-model="$parent.notification.opsgenieRegion" class="gizmo-native-control gizmo-native-select" required>
            <option value="us">US (Default)</option>
            <option value="eu">EU</option>
        </select>
    </div>
    <div class="tw-mb-3">
        <label for="opsgenie-apikey" class="gizmo-field-label">
            {{ $t("API Key") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <HiddenInput
            id="opsgenie-apikey"
            v-model="$parent.notification.opsgenieApiKey"
            required="true"
            autocomplete="false"
        ></HiddenInput>
    </div>
    <div class="tw-mb-3">
        <label for="opsgenie-priority" class="gizmo-field-label">{{ $t("Priority") }}</label>
        <input
            id="opsgenie-priority"
            v-model="$parent.notification.opsgeniePriority"
            type="number"
            class="gizmo-native-control"
            min="1"
            max="5"
            step="1"
        />
    </div>
    <div class="gizmo-field-help">
        <span style="color: red"><sup>*</sup></span>
        {{ $t("Required") }}
        <i18n-t tag="p" keypath="aboutWebhooks" style="margin-top: 8px">
            <a href="https://docs.opsgenie.com/docs/alert-api" target="_blank">
                https://docs.opsgenie.com/docs/alert-api
            </a>
        </i18n-t>
    </div>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";
export default {
    components: {
        HiddenInput,
    },
};
</script>
