<template>
    <div class="tw-mb-3">
        <label for="GrafanaOncallURL" class="gizmo-field-label">
            {{ $t("GrafanaOncallURL") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input
            id="GrafanaOncallURL"
            v-model="$parent.notification.GrafanaOncallURL"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>
</template>
