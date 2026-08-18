<template>
    <div class="tw-mb-3">
        <div class="tw-mb-3">
            <label for="milky-http-addr" class="gizmo-field-label">
                {{ $t("milkyHttpAddress") }}
                <span style="color: red"><sup>*</sup></span>
            </label>
            <input id="HttpUrl" v-model="$parent.notification.httpAddr" type="text" class="gizmo-native-control" required />
        </div>
        <div class="tw-mb-3">
            <label for="milky-access-token" class="gizmo-field-label">
                AccessToken
                <span style="color: red"><sup>*</sup></span>
            </label>
            <input
                id="HttpUrl"
                v-model="$parent.notification.accessToken"
                type="password"
                class="gizmo-native-control"
                required
            />
            <div class="gizmo-field-help">
                <p>{{ $t("milkySafetyTips") }}</p>
            </div>
        </div>

        <div class="tw-mb-3">
            <label for="milky-msg-type" class="gizmo-field-label">{{ $t("milkyMessageType") }}</label>
            <select id="milky-msg-type" v-model="$parent.notification.msgType" class="gizmo-native-control gizmo-native-select">
                <option value="group">{{ $t("milkyGroupMessage") }}</option>
                <option value="private">{{ $t("milkyPrivateMessage") }}</option>
            </select>
        </div>

        <div class="tw-mb-3">
            <label for="milky-reciever-id" class="gizmo-field-label">
                {{ $t("milkyUserOrGroupId") }}
                <span style="color: red"><sup>*</sup></span>
            </label>
            <input id="secretKey" v-model="$parent.notification.recieverId" type="text" class="gizmo-native-control" required />
        </div>

        <div class="gizmo-field-help">
            <i18n-t tag="p" keypath="Read more:">
                <a href="https://milky.ntqqrev.org/" target="_blank">https://milky.ntqqrev.org/</a>
            </i18n-t>
        </div>
    </div>
</template>
