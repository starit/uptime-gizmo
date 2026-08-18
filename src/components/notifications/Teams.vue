<template>
    <div class="tw-mb-3">
        <label for="teams-webhookurl" class="gizmo-field-label">{{ $t("Webhook URL") }}</label>
        <input
            id="teams-webhookurl"
            v-model="$parent.notification.webhookUrl"
            type="text"
            class="gizmo-native-control"
            required
        />
        <i18n-t tag="div" keypath="wayToGetTeamsURL" class="gizmo-field-help">
            <a
                href="https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook"
                target="_blank"
            >
                {{ $t("here") }}
            </a>
        </i18n-t>
    </div>

    <div class="tw-mb-3">
        <div class="gizmo-native-check gizmo-native-switch">
            <input v-model="$parent.notification.teamsEnableTags" class="gizmo-native-check__input" type="checkbox" />
            <label class="gizmo-native-check__label">{{ $t("teamsEnableTags") }}</label>
        </div>

        <div class="gizmo-field-help">
            {{ $t("teamsEnableTagsDescription") }}
        </div>
    </div>
</template>
