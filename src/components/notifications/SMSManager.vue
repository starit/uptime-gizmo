<template>
    <div class="tw-mb-3">
        <label for="smsmanager-key" class="gizmo-field-label">{{ $t("API Key") }}</label>
        <div class="gizmo-field-help">
            {{ $t("SMSManager API Docs") }}
            <a href="https://smsmanager.cz/api/http#send" target="_blank">{{ $t("here") }}</a>
        </div>
        <input id="smsmanager-key" v-model="$parent.notification.smsmanagerApiKey" type="text" class="gizmo-native-control" />
    </div>
    <div class="tw-mb-3">
        <label for="smsmanager-numbers" class="gizmo-field-label">{{ $t("Recipients") }}</label>
        <i18n-t tag="div" keypath="You can divide numbers with commas or semicolons" class="gizmo-field-help">
            <template #comma>
                <code>,</code>
            </template>
            <template #semicolon>
                <code>;</code>
            </template>
        </i18n-t>
        <input id="smsmanager-numbers" v-model="$parent.notification.numbers" type="text" class="gizmo-native-control" />
    </div>
    <div class="tw-mb-3">
        <label for="smsmanager-messageType" class="gizmo-field-label">{{ $t("Gateway Type") }}</label>
        <select id="smsmanager-messageType" v-model="$parent.notification.messageType" class="gizmo-native-control gizmo-native-select">
            <option value="economy">{{ $t("Economy") }}</option>
            <option value="lowcost">{{ $t("Lowcost") }}</option>
            <option value="high" selected>{{ $t("High") }}</option>
        </select>
    </div>
    <div class="tw-mb-3">
        <i18n-t tag="div" keypath="checkPriceAt" class="gizmo-field-help">
            <template #service>SMSManager</template>
            <template #url>
                <a href="https://smsmanager.cz/rozesilani-sms/ceny/ceska-republika/" target="_blank">
                    {{ $t("here") }}
                </a>
            </template>
        </i18n-t>
    </div>
</template>
