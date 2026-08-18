<template>
    <div>
        <h4 class="tw-mt-4">Cloudflare Tunnel</h4>

        <div class="tw-my-3">
            <div>
                cloudflared:
                <span v-if="installed === true" class="tw-text-interactive">{{ $t("Installed") }}</span>
                <span v-else-if="installed === false" class="tw-text-status-down-fg">{{ $t("Not installed") }}</span>
            </div>

            <div>
                {{ $t("Status") }}:
                <span v-if="running" class="tw-text-interactive">{{ $t("Running") }}</span>
                <span v-else-if="!running" class="tw-text-status-down-fg">{{ $t("Not running") }}</span>
            </div>

            <div v-if="errorMessage" class="tw-mt-3">
                {{ $t("Message:") }}
                <textarea v-model="errorMessage" class="gizmo-native-control" readonly></textarea>
            </div>

            <i18n-t v-if="installed === false" tag="p" keypath="wayToGetCloudflaredURL">
                <a
                    href="https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
                    target="_blank"
                >
                    {{ $t("cloudflareWebsite") }}
                </a>
            </i18n-t>
        </div>

        <!-- If installed show token input -->
        <div v-if="installed" class="tw-mb-2">
            <div class="tw-mb-4">
                <label class="gizmo-field-label" for="cloudflareTunnelToken">Cloudflare Tunnel {{ $t("Token") }}</label>
                <HiddenInput
                    id="cloudflareTunnelToken"
                    v-model="cloudflareTunnelToken"
                    autocomplete="new-password"
                    :readonly="running"
                />
                <div class="gizmo-field-help">
                    <div v-if="cloudflareTunnelToken" class="tw-mb-3">
                        <span v-if="!running" class="remove-token" @click="removeToken">{{ $t("Remove Token") }}</span>
                    </div>

                    {{ $t("Don't know how to get the token? Please read the guide:") }}
                    <br />
                    <a
                        href="https://github.com/starit/uptime-gizmo/wiki/Reverse-Proxy-with-Cloudflare-Tunnel"
                        target="_blank"
                    >
                        https://github.com/starit/uptime-gizmo/wiki/Reverse-Proxy-with-Cloudflare-Tunnel
                    </a>
                </div>
            </div>

            <div>
                <button v-if="!running" class="gizmo-native-button gizmo-native-button--primary" type="submit" @click="start">
                    {{ $t("Start") }} cloudflared
                </button>

                <button v-if="running" class="gizmo-native-button gizmo-native-button--danger" type="submit" @click="$refs.confirmStop.show()">
                    {{ $t("Stop") }} cloudflared
                </button>

                <Confirm
                    ref="confirmStop"
                    btn-style="btn-danger"
                    :yes-text="$t('Stop') + ' cloudflared'"
                    :no-text="$t('Cancel')"
                    @yes="stop"
                >
                    {{
                        $t(
                            "The current connection may be lost if you are currently connecting via Cloudflare Tunnel. Are you sure want to stop it? Type your current password to confirm it."
                        )
                    }}

                    <p class="tw-mt-2">{{ $t("disableCloudflaredNoAuthMsg") }}</p>

                    <div v-if="!settings.disableAuth" class="tw-mt-3">
                        <label for="current-password2" class="gizmo-field-label">
                            {{ $t("Current Password") }}
                        </label>
                        <input
                            id="current-password2"
                            v-model="currentPassword"
                            type="password"
                            class="gizmo-native-control"
                            required
                        />
                    </div>
                </Confirm>
            </div>
        </div>

        <h4 class="tw-mt-4">{{ $t("Other Software") }}</h4>
        <div>
            {{ $t("For example: nginx, Apache and Traefik.") }}
            <br />
            {{ $t("Please read") }}
            <a href="https://github.com/starit/uptime-gizmo/wiki/Reverse-Proxy" target="_blank">
                https://github.com/starit/uptime-gizmo/wiki/Reverse-Proxy
            </a>
            .
        </div>

        <h4 class="tw-my-4">{{ $t("HTTP Headers") }}</h4>
        <div class="tw-my-3">
            <label class="gizmo-field-label">
                {{ $t("Trust Proxy") }}
            </label>
            <div class="gizmo-native-check">
                <input
                    id="trustProxyYes"
                    v-model="settings.trustProxy"
                    class="gizmo-native-check__input"
                    type="radio"
                    name="trustProxyYes"
                    :value="true"
                    required
                />
                <label class="gizmo-native-check__label" for="trustProxyYes">
                    {{ $t("Yes") }}
                </label>
            </div>
            <div class="gizmo-native-check">
                <input
                    id="trustProxyNo"
                    v-model="settings.trustProxy"
                    class="gizmo-native-check__input"
                    type="radio"
                    name="flexRadioDefault"
                    :value="false"
                    required
                />
                <label class="gizmo-native-check__label" for="trustProxyNo">
                    {{ $t("No") }}
                </label>
            </div>

            <div class="gizmo-field-help">
                {{ $t("trustProxyDescription") }}
            </div>
        </div>

        <div>
            <button class="gizmo-native-button gizmo-native-button--primary" type="submit" @click="saveSettings()">
                {{ $t("Save") }}
            </button>
        </div>
    </div>
</template>

<script>
import HiddenInput from "../../components/HiddenInput.vue";
import Confirm from "../Confirm.vue";

const prefix = "cloudflared_";

export default {
    components: {
        HiddenInput,
        Confirm,
    },
    data() {
        // See /src/mixins/socket.js
        return this.$root.cloudflared;
    },
    computed: {
        settings() {
            return this.$parent.$parent.$parent.settings;
        },
        saveSettings() {
            return this.$parent.$parent.$parent.saveSettings;
        },
        settingsLoaded() {
            return this.$parent.$parent.$parent.settingsLoaded;
        },
    },
    watch: {},
    created() {
        this.$root.getSocket().emit(prefix + "join");
    },
    unmounted() {
        this.$root.getSocket().emit(prefix + "leave");
    },
    methods: {
        /**
         * Start the Cloudflare tunnel
         * @returns {void}
         */
        start() {
            this.$root.getSocket().emit(prefix + "start", this.cloudflareTunnelToken);
        },
        /**
         * Stop the Cloudflare tunnel
         * @returns {void}
         */
        stop() {
            this.$root.getSocket().emit(prefix + "stop", this.currentPassword, (res) => {
                this.$root.toastRes(res);
            });
        },
        /**
         * Remove the token for the Cloudflare tunnel
         * @returns {void}
         */
        removeToken() {
            this.$root.getSocket().emit(prefix + "removeToken");
            this.cloudflareTunnelToken = "";
        },
    },
};
</script>

<style lang="scss" scoped>
.remove-token {
    text-decoration: underline;
    cursor: pointer;
}
</style>
