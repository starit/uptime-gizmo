<template>
    <div class="tw-mb-3">
        <label for="notifery-api-key" class="gizmo-field-label">{{ $t("API Key") }}</label>
        <HiddenInput
            id="notifery-api-key"
            v-model="$parent.notification.notiferyApiKey"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
    </div>

    <div class="tw-mb-3">
        <label for="notifery-title" class="gizmo-field-label">{{ $t("Title") }}</label>
        <input
            id="notifery-title"
            v-model="$parent.notification.notiferyTitle"
            type="text"
            class="gizmo-native-control"
            placeholder="Uptime Gizmo Alert"
        />
    </div>

    <div class="tw-mb-3">
        <label for="notifery-group" class="gizmo-field-label">{{ $t("Group") }}</label>
        <input
            id="notifery-group"
            v-model="$parent.notification.notiferyGroup"
            type="text"
            class="gizmo-native-control"
            :placeholder="$t('Optional')"
        />
    </div>

    <i18n-t tag="p" keypath="More info on:" style="margin-top: 8px">
        <a href="https://docs.notifery.com/api/event/" target="_blank">https://docs.notifery.com/api/event/</a>
    </i18n-t>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";

export default {
    components: {
        HiddenInput,
    },
};
</script>
