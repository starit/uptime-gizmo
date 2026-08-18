<template>
    <div class="tw-mb-3">
        <label for="homeserver-url" class="gizmo-field-label">{{ $t("matrixHomeserverURL") }}</label>
        <span style="color: red"><sup>*</sup></span>
        <input
            id="homeserver-url"
            v-model="$parent.notification.homeserverUrl"
            type="text"
            class="gizmo-native-control"
            :required="true"
        />
    </div>
    <div class="tw-mb-3">
        <label for="internal-room-id" class="gizmo-field-label">{{ $t("Internal Room Id") }}</label>
        <span style="color: red"><sup>*</sup></span>
        <input
            id="internal-room-id"
            v-model="$parent.notification.internalRoomId"
            type="text"
            class="gizmo-native-control"
            required="true"
        />
    </div>
    <div class="tw-mb-3">
        <label for="access-token" class="gizmo-field-label">{{ $t("Access Token") }}</label>
        <span style="color: red"><sup>*</sup></span>
        <HiddenInput
            id="access-token"
            v-model="$parent.notification.accessToken"
            :required="true"
            autocomplete="new-password"
            :maxlength="500"
        ></HiddenInput>
    </div>

    <div class="gizmo-field-help">
        <span style="color: red"><sup>*</sup></span>
        {{ $t("Required") }}
        <p style="margin-top: 8px">
            {{ $t("matrixDesc1") }}
        </p>
        <i18n-t tag="p" keypath="matrixDesc2" style="margin-top: 8px">
            <code>
                curl -XPOST --json '{"type": "m.login.password", "identifier": {"user": "botusername", "type":
                "m.id.user"}, "password": "passwordforuser"}' "https://home.server/_matrix/client/v3/login"
            </code>
            .
        </i18n-t>
    </div>

    <div class="tw-mb-3">
        <div class="gizmo-native-check gizmo-native-switch">
            <input v-model="$parent.notification.matrixUseTemplate" class="gizmo-native-check__input" type="checkbox" />
            <label class="gizmo-native-check__label">{{ $t("matrixUseTemplate") }}</label>
        </div>

        <div class="gizmo-field-help">
            {{ $t("matrixUseTemplateDescription") }}
        </div>
    </div>

    <template v-if="$parent.notification.matrixUseTemplate">
        <div class="tw-mb-3">
            <label class="gizmo-field-label" for="message_template">{{ $t("Message Template") }}</label>
            <TemplatedTextarea
                id="message_template"
                v-model="$parent.notification.matrixTemplate"
                :required="true"
                :placeholder="matrixTemplatedTextareaPlaceholder"
            ></TemplatedTextarea>
        </div>
    </template>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";
import TemplatedTextarea from "../TemplatedTextarea.vue";

export default {
    components: {
        HiddenInput,
        TemplatedTextarea,
    },
    computed: {
        matrixTemplatedTextareaPlaceholder() {
            return this.$t("Example:", [
                `
Uptime Gizmo Alert{% if monitorJSON %} - {{ monitorJSON['name'] }}{% endif %}

{{ msg }}
                `,
            ]);
        },
    },
};
</script>
