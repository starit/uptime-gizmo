<template>
    <div class="tw-mb-3">
        <label for="pushdeer-server" class="gizmo-field-label">{{ $t("PushDeer Server URL") }}</label>
        <input
            id="pushdeer-server"
            v-model="$parent.notification.pushdeerServer"
            type="text"
            class="gizmo-native-control"
            placeholder="https://api2.pushdeer.com"
        />
        <div class="gizmo-field-help">{{ $t("pushDeerServerDescription") }}</div>
    </div>
    <div class="tw-mb-3">
        <label for="pushdeer-key" class="gizmo-field-label">{{ $t("PushDeer Key") }}</label>
        <HiddenInput
            id="pushdeer-key"
            v-model="$parent.notification.pushdeerKey"
            :required="true"
            autocomplete="new-password"
            placeholder="PDUxxxx"
        ></HiddenInput>
    </div>

    <i18n-t tag="p" keypath="More info on:" style="margin-top: 8px">
        <a href="http://www.pushdeer.com/" rel="noopener noreferrer" target="_blank">http://www.pushdeer.com/</a>
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
