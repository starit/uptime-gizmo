<template>
    <div class="tw-mb-3">
        <i18n-t keypath="teltonikaVersionWarning" tag="div" class="gizmo-field-help"></i18n-t>
    </div>
    <div class="tw-mb-3">
        <label for="teltonika-url" class="gizmo-field-label">{{ $t("teltonikaUrl") }}</label>
        <input
            id="teltonika-url"
            v-model="$parent.notification.teltonikaUrl"
            type="url"
            minlength="10"
            placeholder="192.168.100.1"
            class="gizmo-native-control"
            required
        />
        <i18n-t keypath="teltonikaUrlHelptext" tag="div" class="gizmo-field-help">
            <code>https://192.168.100.1</code>
            <code>http://teltonika.domain.com:8080</code>
        </i18n-t>
    </div>
    <div class="tw-mb-3">
        <div class="gizmo-native-check gizmo-native-switch">
            <input v-model="$parent.notification.teltonikaUnsafeTls" class="gizmo-native-check__input" type="checkbox" />
            <label class="gizmo-native-check__label">{{ $t("teltonikaUnsafeTls") }}</label>
        </div>
        <i18n-t keypath="teltonikaUnsafeTlsDescription" tag="div" class="gizmo-field-help"></i18n-t>
    </div>
    <div class="tw-mb-3">
        <label for="teltonika-username" class="gizmo-field-label">{{ $t("teltonikaUsername") }}</label>
        <input
            id="teltonika-username"
            v-model="$parent.notification.teltonikaUsername"
            type="text"
            minlength="3"
            maxlength="20"
            pattern="^[a-zA-Z0-9]*$"
            class="gizmo-native-control"
            required
        />
        <i18n-t keypath="teltonikaUsernameHelptext" tag="div" class="gizmo-field-help"></i18n-t>
    </div>
    <div class="tw-mb-3">
        <label for="teltonika-password" class="gizmo-field-label">{{ $t("teltonikaPassword") }}</label>
        <HiddenInput
            id="teltonika-password"
            v-model="$parent.notification.teltonikaPassword"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <i18n-t keypath="teltonikaPasswordHelptext" tag="div" class="gizmo-field-help">
            <code>https://192.168.100.1/system/admin/multiusers/users_configuration</code>
        </i18n-t>
    </div>
    <div class="tw-mb-3">
        <label for="teltonika-modem" class="gizmo-field-label">{{ $t("teltonikaModem") }}</label>
        <input
            id="teltonika-modem"
            v-model="$parent.notification.teltonikaModem"
            type="text"
            minlength="3"
            maxlength="5"
            pattern="^[0-9]-[0-9]"
            class="gizmo-native-control"
            required
        />
        <i18n-t keypath="teltonikaModemHelptext" tag="div" class="gizmo-field-help">
            <code>1-1</code>
        </i18n-t>
    </div>
    <div class="tw-mb-3">
        <label for="teltonika-phone-number" class="gizmo-field-label">{{ $t("teltonikaPhoneNumber") }}</label>
        <input
            id="teltonika-phone-number"
            v-model="$parent.notification.teltonikaPhoneNumber"
            type="text"
            minlength="10"
            maxlength="20"
            pattern="^[\d+,]+$"
            class="gizmo-native-control"
            required
        />
        <i18n-t keypath="teltonikaPhoneNumberHelptext" tag="div" class="gizmo-field-help">
            <code>+336xxxxxxxx</code>
            <code>+496xxxxxxxx</code>
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
