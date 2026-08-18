<template>
    <div class="tw-mb-3">
        <label for="webhook-url" class="gizmo-field-label">{{ $t("Post URL") }}</label>
        <input
            id="webhook-url"
            v-model="$parent.notification.squadcastWebhookURL"
            type="url"
            pattern="https?://.+"
            class="gizmo-native-control"
            required
        />
    </div>
</template>
