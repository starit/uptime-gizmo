<template>
    <div class="tw-mb-3">
        <label for="evolution-instance-name" class="gizmo-field-label">{{ $t("evolutionInstanceName") }}</label>
        <input
            id="evolution-instance-name"
            v-model="$parent.notification.evolutionInstanceName"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>

    <div class="tw-mb-3">
        <label for="evolution-api-url" class="gizmo-field-label">{{ $t("API URL") }}</label>
        <input
            id="evolution-api-url"
            v-model="$parent.notification.evolutionApiUrl"
            placeholder="https://evoapicloud.com/"
            type="text"
            class="gizmo-native-control"
        />
    </div>

    <div class="tw-mb-3">
        <label for="evolution-auth-token" class="gizmo-field-label">{{ $t("Token") }}</label>
        <HiddenInput
            id="evolution-auth-token"
            v-model="$parent.notification.evolutionAuthToken"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <i18n-t tag="div" keypath="wayToGetEvolutionUrlAndToken" class="gizmo-field-help">
            <a href="https://evoapicloud.com" target="_blank">https://evoapicloud.com</a>
        </i18n-t>
    </div>

    <div class="tw-mb-3">
        <label for="evolution-recipient" class="gizmo-field-label">{{ $t("evolutionRecipient") }}</label>
        <input
            id="evolution-recipient"
            v-model="$parent.notification.evolutionRecipient"
            type="text"
            pattern="^[\d-]{10,31}(@[\w\.]{1,})?$"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">
            {{
                $t("wayToWriteEvolutionRecipient", [
                    "00117612345678",
                    "00117612345678@s.whatsapp.net",
                    "123456789012345678@g.us",
                ])
            }}
        </div>
    </div>

    <div class="tw-mb-3">
        <div class="gizmo-native-check gizmo-native-switch">
            <input v-model="$parent.notification.evolutionUseCustomMessage" class="gizmo-native-check__input" type="checkbox" />
            <label class="gizmo-native-check__label">{{ $t("evolutionCustomMessageTitle") }}</label>
        </div>
        <div class="gizmo-field-help">{{ $t("evolutionCustomMessageDesc") }}</div>
    </div>

    <template v-if="$parent.notification.evolutionUseCustomMessage">
        <div class="tw-mb-3">
            <TemplatedTextarea
                id="evolution-custom-message"
                v-model="$parent.notification.evolutionCustomMessage"
                :required="true"
                :placeholder="customMessagePlaceholder"
            ></TemplatedTextarea>
        </div>
    </template>

    <i18n-t tag="div" keypath="More info on:" class="tw-mb-3 gizmo-field-help">
        <a href="https://evoapicloud.com/" target="_blank">https://evoapicloud.com/</a>
    </i18n-t>
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
        customMessagePlaceholder() {
            return this.$t("Example:", [`[{{ name }}] [{{ status }}]\n{{ msg }}`]);
        },
    },
};
</script>
