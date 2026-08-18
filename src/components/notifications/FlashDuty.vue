<template>
    <div class="tw-mb-3">
        <label for="flashduty-integration-url" class="gizmo-field-label">
            {{ $t("FlashDuty Push URL") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <HiddenInput
            id="flashduty-integration-url"
            v-model="$parent.notification.flashdutyIntegrationKey"
            autocomplete="false"
            :placeholder="$t('FlashDuty Push URL Placeholder')"
        />
        <div class="gizmo-field-help">
            <p>
                <span style="color: red"><sup>*</sup></span>
                {{ $t("Required") }}
            </p>
        </div>
        <i18n-t tag="div" keypath="wayToGetFlashDutyKey" class="gizmo-field-help">
            <a href="https://flashcat.cloud/product/flashduty?from=kuma" target="_blank">{{ $t("here") }}</a>
        </i18n-t>
    </div>
    <div class="tw-mb-3">
        <label for="flashduty-severity" class="gizmo-field-label">{{ $t("FlashDuty Severity") }}</label>
        <select
            id="flashduty-severity"
            v-model="$parent.notification.flashdutySeverity"
            class="gizmo-native-control gizmo-native-select"
            :required="true"
        >
            <option value="Info" selected>Info</option>
            <option value="Warning" selected>Warning</option>
            <option value="Critical">Critical</option>
        </select>
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
