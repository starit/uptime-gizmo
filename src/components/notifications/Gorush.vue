<template>
    <div class="tw-mb-3">
        <label for="gorush-device-token" class="gizmo-field-label">{{ $t("Device Token") }}</label>
        <span style="color: red"><sup>*</sup></span>
        <input
            id="gorush-device-token"
            v-model="$parent.notification.gorushDeviceToken"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>

    <div class="tw-mb-3">
        <label for="gorush-server-url" class="gizmo-field-label">{{ $t("Server URL") }}</label>
        <span style="color: red"><sup>*</sup></span>
        <input
            id="gorush-server-url"
            v-model="$parent.notification.gorushServerURL"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>

    <div class="tw-mb-3">
        <label for="gorush-platform" class="gizmo-field-label">{{ $t("Platform") }}</label>
        <span style="color: red"><sup>*</sup></span>
        <select id="gorush-platform" v-model="$parent.notification.gorushPlatform" class="gizmo-native-control gizmo-native-select">
            <option value="ios">iOS</option>
            <option value="android">Android</option>
            <option value="huawei">{{ $t("Huawei") }}</option>
        </select>
    </div>

    <div class="tw-mb-3">
        <label for="gorush-title" class="gizmo-field-label">{{ $t("Title") }}</label>
        <input id="gorush-title" v-model="$parent.notification.gorushTitle" type="text" class="gizmo-native-control" />
    </div>

    <div class="tw-mb-3">
        <label for="gorush-priority" class="gizmo-field-label">{{ $t("Priority") }}</label>
        <select id="gorush-priority" v-model="$parent.notification.gorushPriority" class="gizmo-native-control gizmo-native-select">
            <option value="normal">{{ $t("Normal") }}</option>
            <option value="high">{{ $t("High") }}</option>
        </select>
    </div>

    <div class="tw-mb-3">
        <label for="gorush-retry" class="gizmo-field-label">{{ $t("Retry") }}</label>
        <input id="gorush-retry" v-model="$parent.notification.gorushRetry" type="number" class="gizmo-native-control" />
    </div>

    <div class="tw-mb-3">
        <label for="gorush-topic" class="gizmo-field-label">{{ $t("Topic") }}</label>
        <input id="gorush-topic" v-model="$parent.notification.gorushTopic" type="text" class="gizmo-native-control" />
    </div>

    <div class="gizmo-field-help">
        <span style="color: red"><sup>*</sup></span>
        {{ $t("Required") }}
    </div>
</template>
