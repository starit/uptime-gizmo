<template>
    <div class="tw-mb-3">
        <label for="splunk-rest-url" class="gizmo-field-label">{{ $t("Splunk Rest URL") }}</label>
        <HiddenInput
            id="splunk-rest-url"
            v-model="$parent.notification.splunkRestURL"
            :required="true"
            autocomplete="false"
        ></HiddenInput>
    </div>
    <div class="tw-mb-3">
        <label for="splunk-severity" class="gizmo-field-label">{{ $t("Severity") }}</label>
        <select id="splunk-severity" v-model="$parent.notification.splunkSeverity" class="gizmo-native-control gizmo-native-select">
            <option value="INFO">{{ $t("info") }}</option>
            <option value="WARNING">{{ $t("warning") }}</option>
            <option value="CRITICAL" selected="selected">{{ $t("critical") }}</option>
        </select>
    </div>
    <div class="tw-mb-3">
        <label for="splunk-resolve" class="gizmo-field-label">{{ $t("Auto resolve or acknowledged") }}</label>
        <select id="splunk-resolve" v-model="$parent.notification.splunkAutoResolve" class="gizmo-native-control gizmo-native-select">
            <option value="0" selected="selected">{{ $t("do nothing") }}</option>
            <option value="ACKNOWLEDGEMENT">{{ $t("auto acknowledged") }}</option>
            <option value="RECOVERY">{{ $t("auto resolve") }}</option>
        </select>
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
