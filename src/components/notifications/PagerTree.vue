<template>
    <div class="tw-mb-3">
        <label for="pagertree-integration-url" class="gizmo-field-label">
            {{ $t("pagertreeIntegrationUrl") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input
            id="pagertree-integration-url"
            v-model="$parent.notification.pagertreeIntegrationUrl"
            type="text"
            class="gizmo-native-control"
            autocomplete="false"
        />
        <i18n-t tag="div" keypath="wayToGetPagerTreeIntegrationURL" class="gizmo-field-help">
            <a href="https://pagertree.com/docs/integration-guides/introduction#copy-the-endpoint-url" target="_blank">
                {{ $t("here") }}
            </a>
        </i18n-t>
    </div>
    <div class="tw-mb-3">
        <label for="pagertree-urgency" class="gizmo-field-label">{{ $t("pagertreeUrgency") }}</label>
        <select id="pagertree-urgency" v-model="$parent.notification.pagertreeUrgency" class="gizmo-native-control gizmo-native-select">
            <option value="silent">{{ $t("pagertreeSilent") }}</option>
            <option value="low">{{ $t("pagertreeLow") }}</option>
            <option value="medium" selected="selected">{{ $t("pagertreeMedium") }}</option>
            <option value="high">{{ $t("pagertreeHigh") }}</option>
            <option value="critical">{{ $t("pagertreeCritical") }}</option>
        </select>
    </div>
    <div class="tw-mb-3">
        <label for="pagertree-resolve" class="gizmo-field-label">{{ $t("pagertreeResolve") }}</label>
        <select id="pagertree-resolve" v-model="$parent.notification.pagertreeAutoResolve" class="gizmo-native-control gizmo-native-select">
            <option value="resolve" selected="selected">{{ $t("pagertreeResolve") }}</option>
            <option value="0">{{ $t("pagertreeDoNothing") }}</option>
        </select>
    </div>
</template>

<script>
export default {};
</script>
