<template>
    <div class="tw-mb-3">
        <label for="jsm-cloud-id" class="gizmo-field-label">
            {{ $t("Cloud ID") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input id="jsm-cloud-id" v-model="$parent.notification.jsmCloudId" type="text" class="gizmo-native-control" required />
        <i18n-t tag="p" keypath="aboutJiraCloudId" style="margin-top: 8px">
            <a href="https://support.atlassian.com/jira/kb/retrieve-my-atlassian-sites-cloud-id/" target="_blank">
                {{ $t("see Jira Cloud Docs") }}
            </a>
        </i18n-t>
    </div>
    <div class="tw-mb-3">
        <label for="jsm-email" class="gizmo-field-label">
            {{ $t("Email") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input id="jsm-email" v-model="$parent.notification.jsmEmail" type="email" class="gizmo-native-control" required />
    </div>
    <div class="tw-mb-3">
        <label for="jsm-api-token" class="gizmo-field-label">
            {{ $t("API Token") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <HiddenInput
            id="jsm-api-token"
            v-model="$parent.notification.jsmApiToken"
            required="true"
            autocomplete="false"
        ></HiddenInput>
    </div>
    <div class="tw-mb-3">
        <label for="jsm-priority" class="gizmo-field-label">{{ $t("Priority") }}</label>
        <input
            id="jsm-priority"
            v-model="$parent.notification.jsmPriority"
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
