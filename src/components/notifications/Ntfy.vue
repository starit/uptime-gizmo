<template>
    <div class="tw-mb-3">
        <label for="ntfy-ntfytopic" class="gizmo-field-label">{{ $t("ntfy Topic") }}</label>
        <input id="ntfy-ntfytopic" v-model="$parent.notification.ntfytopic" type="text" class="gizmo-native-control" required />
    </div>
    <div class="tw-mb-3">
        <label for="ntfy-server-url" class="gizmo-field-label">{{ $t("Server URL") }}</label>
        <input
            id="ntfy-server-url"
            v-model="$parent.notification.ntfyserverurl"
            type="text"
            class="gizmo-native-control"
            required
        />
        <div class="gizmo-field-help">
            {{ $t("Server URL should not contain the nfty topic") }}
        </div>
    </div>
    <div class="tw-mb-3">
        <label for="ntfy-priority" class="gizmo-field-label">{{ $t("Priority") }}</label>
        <input
            id="ntfy-priority"
            v-model="$parent.notification.ntfyPriority"
            type="number"
            class="gizmo-native-control"
            required
            min="1"
            max="5"
            step="1"
        />
        <label for="ntfy-priority-down" class="gizmo-field-label">{{ $t("ntfyPriorityDown") }}</label>
        <input
            id="ntfy-priority-down"
            v-model="$parent.notification.ntfyPriorityDown"
            type="number"
            class="gizmo-native-control"
            required
            min="1"
            max="5"
            step="1"
        />
        <div class="gizmo-field-help">
            <p
                v-if="
                    $parent.notification.ntfyPriority == $parent.notification.ntfyPriorityDown &&
                    $parent.notification.ntfyPriority >= 5
                "
            >
                {{ $t("ntfyPriorityHelptextAllEvents") }}
            </p>
            <i18n-t
                v-else-if="$parent.notification.ntfyPriority > $parent.notification.ntfyPriorityDown"
                tag="p"
                keypath="ntfyPriorityHelptextPriorityHigherThanDown"
            >
                <code>DOWN</code>
                <code>{{ $parent.notification.ntfyPriority }}</code>
                <code>{{ $parent.notification.ntfyPriorityDown }}</code>
            </i18n-t>
            <i18n-t v-else tag="p" keypath="ntfyPriorityHelptextAllExceptDown">
                <code>DOWN</code>
                <code>{{ $parent.notification.ntfyPriorityDown }}</code>
            </i18n-t>
        </div>
    </div>
    <div class="tw-mb-3">
        <label for="authentication-method" class="gizmo-field-label">{{ $t("ntfyAuthenticationMethod") }}</label>
        <select id="authentication-method" v-model="$parent.notification.ntfyAuthenticationMethod" class="gizmo-native-control gizmo-native-select">
            <option v-for="(name, type) in authenticationMethods" :key="type" :value="type">{{ name }}</option>
        </select>
    </div>
    <div v-if="$parent.notification.ntfyAuthenticationMethod === 'usernamePassword'" class="tw-mb-3">
        <label for="ntfy-username" class="gizmo-field-label">{{ $t("Username") }}</label>
        <input id="ntfy-username" v-model="$parent.notification.ntfyusername" type="text" class="gizmo-native-control" />
    </div>
    <div v-if="$parent.notification.ntfyAuthenticationMethod === 'usernamePassword'" class="tw-mb-3">
        <label for="ntfy-password" class="gizmo-field-label">{{ $t("Password") }}</label>
        <HiddenInput
            id="ntfy-password"
            v-model="$parent.notification.ntfypassword"
            autocomplete="new-password"
        ></HiddenInput>
    </div>
    <div v-if="$parent.notification.ntfyAuthenticationMethod === 'accessToken'" class="tw-mb-3">
        <label for="ntfy-access-token" class="gizmo-field-label">{{ $t("Access Token") }}</label>
        <HiddenInput id="ntfy-access-token" v-model="$parent.notification.ntfyaccesstoken"></HiddenInput>
    </div>
    <div class="tw-mb-3">
        <label for="ntfy-icon" class="gizmo-field-label">{{ $t("IconUrl") }}</label>
        <input id="ntfy-icon" v-model="$parent.notification.ntfyIcon" type="text" class="gizmo-native-control" />
    </div>
    <div class="tw-mb-3">
        <label for="ntfy-call" class="gizmo-field-label">{{ $t("ntfyCall") }}</label>
        <input
            id="ntfy-call"
            v-model="$parent.notification.ntfyCall"
            type="text"
            class="gizmo-native-control"
            placeholder="yes or +12223334444"
        />
        <div class="gizmo-field-help">
            {{ $t("ntfyCallHelptext") }}
        </div>
    </div>

    <div class="tw-mb-3">
        <div class="gizmo-native-check gizmo-native-switch">
            <input
                id="ntfy-use-template"
                v-model="$parent.notification.ntfyUseTemplate"
                class="gizmo-native-check__input"
                type="checkbox"
            />
            <label class="gizmo-native-check__label" for="ntfy-use-template">
                {{ $t("ntfyUseTemplate") }}
            </label>
        </div>
        <div class="gizmo-field-help">
            {{ $t("ntfyUseTemplateDescription") }}
        </div>
    </div>

    <div v-show="$parent.notification.ntfyUseTemplate">
        <div class="tw-mb-3">
            <label for="ntfy-title" class="gizmo-field-label">{{ $t("ntfyCustomTitle") }}</label>
            <TemplatedInput
                id="ntfy-title"
                v-model="$parent.notification.ntfyCustomTitle"
                :required="false"
                placeholder=""
            ></TemplatedInput>
            <div class="gizmo-field-help">{{ $t("ntfyNotificationTemplateFallback") }}</div>
        </div>

        <div class="tw-mb-3">
            <label for="ntfy-message" class="gizmo-field-label">{{ $t("ntfyCustomMessage") }}</label>
            <TemplatedTextarea
                id="ntfy-message"
                v-model="$parent.notification.ntfyCustomMessage"
                :required="false"
                placeholder=""
            ></TemplatedTextarea>
            <div class="gizmo-field-help">{{ $t("ntfyNotificationTemplateFallback") }}</div>
        </div>
    </div>
</template>

<script>
import HiddenInput from "../HiddenInput.vue";
import TemplatedInput from "../TemplatedInput.vue";
import TemplatedTextarea from "../TemplatedTextarea.vue";

export default {
    components: {
        HiddenInput,
        TemplatedInput,
        TemplatedTextarea,
    },
    computed: {
        authenticationMethods() {
            return {
                none: this.$t("None"),
                usernamePassword: this.$t("ntfyUsernameAndPassword"),
                accessToken: this.$t("Access Token"),
            };
        },
    },
    mounted() {
        if (typeof this.$parent.notification.ntfyPriority === "undefined") {
            this.$parent.notification.ntfyserverurl = "https://ntfy.sh";
            this.$parent.notification.ntfyPriority = 5;
        }

        // Setting down priority if it's undefined
        if (typeof this.$parent.notification.ntfyPriorityDown === "undefined") {
            this.$parent.notification.ntfyPriorityDown = 5;
        }

        // Handling notifications that added before 1.22.0
        if (typeof this.$parent.notification.ntfyAuthenticationMethod === "undefined") {
            if (!this.$parent.notification.ntfyusername) {
                this.$parent.notification.ntfyAuthenticationMethod = "none";
            } else {
                this.$parent.notification.ntfyAuthenticationMethod = "usernamePassword";
            }
        }

        // Auto-enable template checkbox if either field has content
        if (typeof this.$parent.notification.ntfyUseTemplate === "undefined") {
            const hasTitle = !!this.$parent.notification.ntfyCustomTitle?.trim();
            const hasMessage = !!this.$parent.notification.ntfyCustomMessage?.trim();
            this.$parent.notification.ntfyUseTemplate = hasTitle || hasMessage;
        }
    },
};
</script>
