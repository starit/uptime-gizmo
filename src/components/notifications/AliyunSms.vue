<template>
    <div class="tw-mb-3">
        <label for="accessKeyId" class="gizmo-field-label">
            {{ $t("AccessKeyId") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <HiddenInput
            id="accessKeyId"
            v-model="$parent.notification.accessKeyId"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>

        <label for="secretAccessKey" class="gizmo-field-label">
            {{ $t("SecretAccessKey") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <HiddenInput
            id="secretAccessKey"
            v-model="$parent.notification.secretAccessKey"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>

        <label for="phonenumber" class="gizmo-field-label">
            {{ $t("PhoneNumbers") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <HiddenInput
            id="phonenumber"
            v-model="$parent.notification.phonenumber"
            :required="true"
            autocomplete="new-password"
        ></HiddenInput>

        <label for="templateCode" class="gizmo-field-label">
            {{ $t("TemplateCode") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input
            id="templateCode"
            v-model="$parent.notification.templateCode"
            type="text"
            class="gizmo-native-control"
            required
        />

        <label for="signName" class="gizmo-field-label">
            {{ $t("SignName") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input id="signName" v-model="$parent.notification.signName" type="text" class="gizmo-native-control" required />
        <div class="gizmo-native-check gizmo-native-switch">
            <label class="gizmo-native-check__label">{{ $t("OptionalParameters") }}</label>
            <input
                id="optionalParameters"
                v-model="$parent.notification.optionalParameters"
                class="gizmo-native-check__input"
                type="checkbox"
            />
            <div class="gizmo-field-help">{{ $t("aliyun_enable_optional_variables_at_the_risk_of_non_delivery") }}</div>
        </div>
        <br />
        <div class="gizmo-field-help">
            <i18n-t tag="p" keypath="aliyun-template-requirements-and-parameters">
                <template #parameters>
                    <code>${name} ${time} ${status}</code>
                </template>
            </i18n-t>
            <i18n-t tag="p" keypath="aliyun-template-optional-parameters">
                <template #parameters>
                    <code>${msg}</code>
                </template>
            </i18n-t>
            <i18n-t tag="p" keypath="Read more:">
                <a href="https://help.aliyun.com/document_detail/101414.html" target="_blank">
                    https://help.aliyun.com/document_detail/101414.html
                </a>
            </i18n-t>
        </div>
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
