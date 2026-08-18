<template>
    <div class="tw-mb-3">
        <div class="tw-mb-3">
            <label for="onebot-http-addr" class="gizmo-field-label">
                {{ $t("onebotHttpAddress") }}
                <span style="color: red"><sup>*</sup></span>
            </label>
            <input id="HttpUrl" v-model="$parent.notification.httpAddr" type="text" class="gizmo-native-control" required />
        </div>
        <div class="tw-mb-3">
            <label for="onebot-access-token" class="gizmo-field-label">
                AccessToken
                <span style="color: red"><sup>*</sup></span>
            </label>
            <input id="HttpUrl" v-model="$parent.notification.accessToken" type="text" class="gizmo-native-control" required />
            <div class="gizmo-field-help">
                <p>{{ $t("onebotSafetyTips") }}</p>
            </div>
        </div>

        <div class="tw-mb-3">
            <label for="onebot-msg-type" class="gizmo-field-label">{{ $t("onebotMessageType") }}</label>
            <select id="onebot-msg-type" v-model="$parent.notification.msgType" class="gizmo-native-control gizmo-native-select">
                <option value="group">{{ $t("onebotGroupMessage") }}</option>
                <option value="private">{{ $t("onebotPrivateMessage") }}</option>
            </select>
        </div>

        <div class="tw-mb-3">
            <label for="onebot-reciever-id" class="gizmo-field-label">
                {{ $t("onebotUserOrGroupId") }}
                <span style="color: red"><sup>*</sup></span>
            </label>
            <input id="secretKey" v-model="$parent.notification.recieverId" type="text" class="gizmo-native-control" required />
        </div>

        <div class="gizmo-field-help">
            <i18n-t tag="p" keypath="Read more:">
                <a href="https://github.com/botuniverse/onebot-11" target="_blank">
                    https://github.com/botuniverse/onebot-11
                </a>
            </i18n-t>
        </div>
    </div>
</template>
