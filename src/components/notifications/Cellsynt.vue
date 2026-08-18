<template>
    <div class="tw-mb-3">
        <label for="cellsynt-login" class="gizmo-field-label">{{ $t("Username") }}</label>
        <input
            id="cellsynt-login"
            v-model="$parent.notification.cellsyntLogin"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>
    <div class="tw-mb-3">
        <label for="cellsynt-key" class="gizmo-field-label">{{ $t("Password") }}</label>
        <HiddenInput
            id="cellsynt-key"
            v-model="$parent.notification.cellsyntPassword"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>
    </div>
    <div class="tw-mb-3">
        <label for="cellsynt-Originatortype" class="gizmo-field-label">{{ $t("Originator type") }}</label>
        <select
            id="cellsynt-Originatortype"
            v-model="$parent.notification.cellsyntOriginatortype"
            :required="true"
            class="gizmo-native-control gizmo-native-select"
        >
            <option value="alpha">{{ $t("Alphanumeric (recommended)") }}</option>
            <option value="numeric">{{ $t("Telephone number") }}</option>
        </select>
        <div class="gizmo-field-help">
            <p>
                <b>{{ $t("Alphanumeric (recommended)") }}:</b>
                <br />
                {{ $t("cellsyntOriginatortypeAlphanumeric") }}
            </p>
            <p>
                <b>{{ $t("Telephone number") }}:</b>
                <br />
                {{ $t("cellsyntOriginatortypeNumeric") }}
            </p>
        </div>
    </div>
    <div class="tw-mb-3">
        <label for="cellsynt-originator" class="gizmo-field-label">
            {{ $t("Originator") }}
            <small>
                ({{
                    $parent.notification.cellsyntOriginatortype === "alpha"
                        ? $t("max 11 alphanumeric characters")
                        : $t("max 15 digits")
                }})
            </small>
        </label>
        <input
            v-if="$parent.notification.cellsyntOriginatortype === 'alpha'"
            id="cellsynt-originator"
            v-model="$parent.notification.cellsyntOriginator"
            type="text"
            class="gizmo-native-control"
            pattern="[a-zA-Z0-9\s]+"
            maxlength="11"
            required
        />
        <input
            v-else
            id="cellsynt-originator"
            v-model="$parent.notification.cellsyntOriginator"
            type="number"
            class="gizmo-native-control"
            pattern="[0-9]+"
            maxlength="15"
            required
        />
        <div class="gizmo-field-help">
            <p>{{ $t("cellsyntOriginator") }}</p>
        </div>
    </div>
    <div class="tw-mb-3">
        <label for="cellsynt-destination" class="gizmo-field-label">{{ $t("Destination") }}</label>
        <input
            id="cellsynt-destination"
            v-model="$parent.notification.cellsyntDestination"
            type="text"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">
            <p>{{ $t("cellsyntDestination") }}</p>
        </div>
    </div>
    <div class="gizmo-native-check gizmo-native-switch">
        <input
            id="cellsynt-allow-long"
            v-model="$parent.notification.cellsyntAllowLongSMS"
            type="checkbox"
            class="gizmo-native-check__input"
        />
        <label for="cellsynt-allow-long" class="gizmo-field-label">{{ $t("Allow Long SMS") }}</label>
        <div class="gizmo-field-help">{{ $t("cellsyntSplitLongMessages") }}</div>
    </div>
    <i18n-t tag="p" keypath="More info on:" style="margin-top: 8px">
        <a href="https://www.cellsynt.com/en/" target="_blank">https://www.cellsynt.com/en/</a>
    </i18n-t>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";

export default {
    components: {
        HiddenInput,
    },
    mounted() {
        this.$parent.notification.cellsyntOriginatortype ||= "alpha";
        this.$parent.notification.cellsyntOriginator ||= "uptimegizmo";
    },
};
</script>
