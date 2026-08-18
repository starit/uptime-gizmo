<template>
    <div class="tw-mb-3">
        <label for="signal-url" class="gizmo-field-label">{{ $t("Post URL") }}</label>
        <input
            id="signal-url"
            v-model="$parent.notification.signalURL"
            type="url"
            pattern="https?://.+"
            class="gizmo-native-control"
            required
        />
    </div>

    <div class="tw-mb-3">
        <label for="signal-number" class="gizmo-field-label">{{ $t("Number") }}</label>
        <input
            id="signal-number"
            v-model="$parent.notification.signalNumber"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>

    <div class="tw-mb-3">
        <label for="signal-recipients" class="gizmo-field-label">{{ $t("Recipients") }}</label>
        <input
            id="signal-recipients"
            v-model="$parent.notification.signalRecipients"
            type="text"
            class="gizmo-native-control"
            required
        />

        <div class="gizmo-field-help">
            <p style="margin-top: 8px">
                {{ $t("needSignalAPI") }}
            </p>

            <p style="margin-top: 8px">
                {{ $t("wayToCheckSignalURL") }}
            </p>

            <p style="margin-top: 8px">
                <a href="https://github.com/bbernhard/signal-cli-rest-api" target="_blank">
                    https://github.com/bbernhard/signal-cli-rest-api
                </a>
            </p>

            <p style="margin-top: 8px">
                {{ $t("signalImportant") }}
            </p>
        </div>
    </div>

    <div class="tw-mb-3">
        <div class="gizmo-native-check gizmo-native-switch">
            <input v-model="$parent.notification.signalUseTemplate" class="gizmo-native-check__input" type="checkbox" />
            <label class="gizmo-native-check__label">{{ $t("signalUseTemplate") }}</label>
        </div>

        <div class="gizmo-field-help">
            {{ $t("signalUseTemplateDescription") }}
        </div>
    </div>

    <template v-if="$parent.notification.signalUseTemplate">
        <div class="tw-mb-3">
            <label class="gizmo-field-label" for="signal-template">{{ $t("Message Template") }}</label>
            <TemplatedTextarea
                id="signal-template"
                v-model="$parent.notification.signalTemplate"
                :required="true"
                :placeholder="signalTemplatedTextareaPlaceholder"
            ></TemplatedTextarea>
        </div>
    </template>
</template>

<script>
import TemplatedTextarea from "../TemplatedTextarea.vue";

export default {
    components: {
        TemplatedTextarea,
    },
    computed: {
        signalTemplatedTextareaPlaceholder() {
            return this.$t("Example:", [
                `
Signal Alert{% if monitorJSON %} - {{ monitorJSON['name'] }}{% endif %}

{{ msg }}
            `,
            ]);
        },
    },
};
</script>
