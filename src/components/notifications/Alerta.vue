<template>
    <div class="tw-mb-3">
        <label for="alerta-api-endpoint" class="gizmo-field-label">{{ $t("alertaApiEndpoint") }}</label>
        <input
            id="alerta-api-endpoint"
            v-model="$parent.notification.alertaApiEndpoint"
            type="text"
            class="gizmo-native-control"
            required
        />
        <label for="alerta-environment" class="gizmo-field-label">{{ $t("alertaEnvironment") }}</label>
        <input
            id="alerta-environment"
            v-model="$parent.notification.alertaEnvironment"
            type="text"
            class="gizmo-native-control"
            required
        />
        <label for="alerta-api-key" class="gizmo-field-label">{{ $t("alertaApiKey") }}</label>
        <input
            id="alerta-api-key"
            v-model="$parent.notification.alertaApiKey"
            type="text"
            class="gizmo-native-control"
            required
        />
        <label for="alerta-alert-state" class="gizmo-field-label">{{ $t("alertaAlertState") }}</label>
        <input
            id="alerta-alert-state"
            v-model="$parent.notification.alertaAlertState"
            type="text"
            class="gizmo-native-control"
            placeholder="critical"
            required
        />
        <label for="alerta-recover-state" class="gizmo-field-label">{{ $t("alertaRecoverState") }}</label>
        <input
            id="alerta-recover-state"
            v-model="$parent.notification.alertaRecoverState"
            type="text"
            class="gizmo-native-control"
            placeholder="cleared"
            required
        />
    </div>
</template>
