<template>
    <div class="tw-mb-3">
        <label for="ElksUsername" class="gizmo-field-label">{{ $t("Username") }}</label>
        <input
            id="ElksUsername"
            v-model="$parent.notification.elksUsername"
            type="text"
            class="gizmo-native-control"
            required
        />
        <label for="ElksPassword" class="gizmo-field-label">{{ $t("Password") }}</label>
    </div>
    <div class="gizmo-field-help">
        <HiddenInput
            id="ElksPassword"
            v-model="$parent.notification.elksAuthToken"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
        <i18n-t tag="p" keypath="Can be found on:">
            <a href="https://46elks.com/account" target="_blank">https://46elks.com/account</a>
        </i18n-t>
    </div>
    <div class="tw-mb-3">
        <label for="Elks-from-number" class="gizmo-field-label">{{ $t("From") }}</label>
        <input
            id="Elks-from-number"
            v-model="$parent.notification.elksFromNumber"
            type="text"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">
            {{
                $t(
                    "Either a text sender ID or a phone number in E.164 format if you want to be able to receive replies."
                )
            }}
            <i18n-t tag="p" keypath="More info on:">
                <a href="https://46elks.se/kb/text-sender-id" target="_blank">https://46elks.se/kb/text-sender-id</a>
            </i18n-t>
        </div>
    </div>

    <div class="tw-mb-3">
        <label for="Elks-to-number" class="gizmo-field-label">{{ $t("To Number") }}</label>
        <input
            id="Elks-to-number"
            v-model="$parent.notification.elksToNumber"
            type="text"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">
            {{ $t("The phone number of the recipient in E.164 format.") }}
            <i18n-t tag="p" keypath="More info on:">
                <a href="https://46elks.se/kb/e164" target="_blank">https://46elks.se/kb/e164</a>
            </i18n-t>
        </div>
    </div>

    <i18n-t tag="p" keypath="More info on:" style="margin-top: 8px">
        <a href="https://46elks.com/docs/send-sms" target="_blank">https://46elks.com/docs/send-sms</a>
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
