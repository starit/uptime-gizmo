<template>
    <div class="tw-mb-3">
        <label for="freemobileUser" class="gizmo-field-label">
            {{ $t("Free Mobile User Identifier") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input
            id="freemobileUser"
            v-model="$parent.notification.freemobileUser"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>

    <div class="tw-mb-3">
        <label for="freemobilePass" class="gizmo-field-label">
            {{ $t("Free Mobile API Key") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input
            id="freemobilePass"
            v-model="$parent.notification.freemobilePass"
            type="text"
            class="gizmo-native-control"
            required
        />
    </div>
</template>
