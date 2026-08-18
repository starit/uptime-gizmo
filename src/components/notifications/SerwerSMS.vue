<template>
    <div class="tw-mb-3">
        <label for="serwersms-username" class="gizmo-field-label">{{ $t("serwersmsAPIUser") }}</label>
        <input
            id="serwersms-username"
            v-model="$parent.notification.serwersmsUsername"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>
    <div class="tw-mb-3">
        <label for="serwersms-key" class="gizmo-field-label">{{ $t("serwersmsAPIPassword") }}</label>
        <HiddenInput
            id="serwersms-key"
            v-model="$parent.notification.serwersmsPassword"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
    </div>
    <div class="tw-mb-3">
        <label for="serwersms-recipient-type" class="gizmo-field-label">{{ $t("serwersmsRecipientType") }}</label>
        <select id="serwersms-recipient-type" v-model="$parent.notification.serwersmsRecipientType" class="gizmo-native-control gizmo-native-select">
            <option value="phone">{{ $t("serwersmsRecipientTypePhone") }}</option>
            <option value="group">{{ $t("serwersmsRecipientTypeGroup") }}</option>
        </select>
    </div>
    <div v-if="$parent.notification.serwersmsRecipientType !== 'group'" class="tw-mb-3">
        <label for="serwersms-phone-number" class="gizmo-field-label">{{ $t("serwersmsPhoneNumber") }}</label>
        <input
            id="serwersms-phone-number"
            v-model="$parent.notification.serwersmsPhoneNumber"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>
    <div v-if="$parent.notification.serwersmsRecipientType === 'group'" class="tw-mb-3">
        <label for="serwersms-group-id" class="gizmo-field-label">{{ $t("serwersmsGroupId") }}</label>
        <input
            id="serwersms-group-id"
            v-model="$parent.notification.serwersmsGroupId"
            type="text"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">{{ $t("serwersmsGroupIdHelptext") }}</div>
    </div>
    <div class="tw-mb-3">
        <label for="serwersms-sender-name" class="gizmo-field-label">{{ $t("serwersmsSenderName") }}</label>
        <input
            id="serwersms-sender-name"
            v-model="$parent.notification.serwersmsSenderName"
            type="text"
            minlength="3"
            maxlength="11"
            class="gizmo-native-control"
        />
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
