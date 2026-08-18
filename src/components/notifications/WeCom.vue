<template>
    <div class="tw-mb-3">
        <label for="WeCom Bot Key" class="gizmo-field-label">
            {{ $t("WeCom Bot Key") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input
            id="WeCom Bot Key"
            v-model="$parent.notification.weComBotKey"
            type="text"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">
            <p>
                <span style="color: red"><sup>*</sup></span>
                {{ $t("Required") }}
            </p>
        </div>
        <i18n-t tag="p" keypath="Read more:">
            <a href="https://work.weixin.qq.com/api/doc/90000/90136/91770" target="_blank">
                https://work.weixin.qq.com/api/doc/90000/90136/91770
            </a>
        </i18n-t>
    </div>

    <div class="tw-mb-3">
        <label for="wecom-mentioned-mobile-list" class="gizmo-field-label">{{ $t("WeCom Mentioned Mobile List") }}</label>
        <input
            id="wecom-mentioned-mobile-list"
            v-model="$parent.notification.weComMentionedMobileList"
            type="text"
            class="gizmo-native-control"
            placeholder="13800001111,13900002222,@all"
        />
        <p class="gizmo-field-help">{{ $t("WeCom Mentioned Mobile List Description") }}</p>
    </div>
</template>
