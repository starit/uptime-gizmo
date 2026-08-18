<template>
    <div class="tw-mb-3">
        <label for="Feishu-WebHookUrl" class="gizmo-field-label">
            {{ $t("Feishu WebHookUrl") }}
            <span style="color: red"><sup>*</sup></span>
        </label>
        <input
            id="Feishu-WebHookUrl"
            v-model="$parent.notification.feishuWebHookUrl"
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
        <i18n-t tag="div" keypath="wayToGetTeamsURL" class="gizmo-field-help">
            <a href="https://www.feishu.cn/hc/zh-CN/articles/360024984973" target="_blank">{{ $t("here") }}</a>
        </i18n-t>
    </div>
</template>
