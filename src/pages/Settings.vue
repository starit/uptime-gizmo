<template>
    <div class="settings-workspace">
        <div v-if="$root.isMobile" class="gizmo-workspace-panel settings-mobile-links tw-mb-3">
            <router-link to="/manage-status-page" class="settings-mobile-link">
                <font-awesome-icon icon="stream" />
                {{ $t("Status Pages") }}
            </router-link>
            <router-link to="/maintenance" class="settings-mobile-link">
                <font-awesome-icon icon="wrench" />
                {{ $t("Maintenance") }}
            </router-link>
        </div>

        <h1 v-show="show" class="settings-workspace-title tw-mb-3">
            {{ $t("Settings") }}
        </h1>

        <div class="gizmo-workspace-panel settings-workspace-surface">
            <div class="settings-layout">
                <div v-if="showSubMenu" class="settings-menu">
                    <router-link v-for="(item, key) in subMenus" :key="key" :to="`/settings/${key}`">
                        <div class="menu-item">
                            {{ item.title }}
                        </div>
                    </router-link>

                    <!-- Logout Button -->
                    <a
                        v-if="$root.isMobile && $root.loggedIn && $root.socket.token !== 'autoLogin'"
                        class="logout"
                        @click.prevent="$root.logout"
                    >
                        <div class="menu-item">
                            <font-awesome-icon icon="sign-out-alt" />
                            {{ $t("Logout") }}
                        </div>
                    </a>
                </div>
                <div class="settings-content">
                    <div v-if="currentPage" class="settings-content-header">
                        {{ subMenus[currentPage].title }}
                    </div>
                    <div class="tw-mx-3">
                        <router-view v-slot="{ Component }">
                            <transition name="slide-fade" appear>
                                <component :is="Component" />
                            </transition>
                        </router-view>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { useRoute } from "vue-router";

export default {
    data() {
        return {
            show: true,
            settings: {},
            settingsLoaded: false,
        };
    },

    computed: {
        currentPage() {
            let pathSplit = useRoute().path.split("/");
            let pathEnd = pathSplit[pathSplit.length - 1];
            if (!pathEnd || pathEnd === "settings") {
                return null;
            }
            return pathEnd;
        },

        showSubMenu() {
            if (this.$root.isMobile) {
                return !this.currentPage;
            } else {
                return true;
            }
        },

        subMenus() {
            return {
                general: {
                    title: this.$t("General"),
                },
                appearance: {
                    title: this.$t("Appearance"),
                },
                ai: {
                    title: this.$t("AI"),
                },
                notifications: {
                    title: this.$t("Notifications"),
                },
                "reverse-proxy": {
                    title: this.$t("Reverse Proxy"),
                },
                tags: {
                    title: this.$t("Tags"),
                },
                "monitor-history": {
                    title: this.$t("Monitor History"),
                },
                "docker-hosts": {
                    title: this.$t("Docker Hosts"),
                },
                "remote-browsers": {
                    title: this.$t("Remote Browsers"),
                },
                security: {
                    title: this.$t("Security"),
                },
                "api-keys": {
                    title: this.$t("API Keys"),
                },
                proxies: {
                    title: this.$t("Proxies"),
                },
                about: {
                    title: this.$t("About"),
                },
            };
        },
    },

    watch: {
        "$root.isMobile"() {
            this.loadGeneralPage();
        },
    },

    mounted() {
        this.loadSettings();
        this.loadGeneralPage();
    },

    methods: {
        /**
         * Load the general settings page
         * For desktop only, on mobile do nothing
         * @returns {void}
         */
        loadGeneralPage() {
            if (!this.currentPage && !this.$root.isMobile) {
                this.$router.push("/settings/general");
            }
        },

        /**
         * Load settings from server
         * @returns {void}
         */
        loadSettings() {
            this.$root.getSocket().emit("getSettings", (res) => {
                this.settings = res.data;

                if (this.settings.checkUpdate === undefined) {
                    this.settings.checkUpdate = true;
                }

                if (this.settings.searchEngineIndex === undefined) {
                    this.settings.searchEngineIndex = false;
                }

                if (this.settings.entryPage === undefined) {
                    this.settings.entryPage = "dashboard";
                }

                if (this.settings.nscd === undefined) {
                    this.settings.nscd = true;
                }

                if (this.settings.keepDataPeriodDays === undefined) {
                    this.settings.keepDataPeriodDays = 180;
                }

                if (this.settings.tlsExpiryNotifyDays === undefined) {
                    this.settings.tlsExpiryNotifyDays = [7, 14, 21];
                }

                if (this.settings.domainExpiryNotifyDays === undefined) {
                    this.settings.domainExpiryNotifyDays = [7, 14, 21];
                }

                if (this.settings.trustProxy === undefined) {
                    this.settings.trustProxy = false;
                }

                this.settingsLoaded = true;
            });
        },

        /**
         * Callback for saving settings
         * @callback saveSettingsCB
         * @param {object} res Result of operation
         * @returns {void}
         */

        /**
         * Save Settings
         * @param {saveSettingsCB} callback Callback for socket response
         * @param {string} currentPassword Only need for disableAuth to true
         * @returns {void}
         */
        saveSettings(callback, currentPassword) {
            let valid = this.validateSettings();
            if (valid.success) {
                this.$root.getSocket().emit("setSettings", this.settings, currentPassword, (res) => {
                    this.$root.toastRes(res);
                    this.loadSettings();

                    if (callback) {
                        callback();
                    }
                });
            } else {
                this.$root.toastError(valid.msg);
            }
        },

        /**
         * Ensure settings are valid
         * @returns {object} Contains success state and error msg
         */
        validateSettings() {
            if (this.settings.keepDataPeriodDays < 0) {
                return {
                    success: false,
                    msg: this.$t("dataRetentionTimeError"),
                };
            }
            return {
                success: true,
                msg: "",
            };
        },
    },
};
</script>

<style lang="scss" scoped>
.settings-workspace {
    max-width: 1240px;
}

.settings-workspace-title {
    letter-spacing: -0.035em;
}

.settings-mobile-links {
    display: grid;
    gap: 0.25rem;
}

.settings-mobile-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 0.75rem;
    border-radius: var(--radius-sm);
    color: var(--color-text);
    text-decoration: none;
}
.settings-mobile-link:hover { background: var(--color-surface-hover); }

.settings-workspace-surface {
    border: 1px solid var(--color-border);
}

.settings-layout {
    display: grid;
    grid-template-columns: minmax(12rem, 0.28fr) minmax(0, 1fr);
    min-height: calc(100vh - 155px);
}

.settings-menu {
    padding: 0.75rem;
    border-inline-end: 1px solid var(--color-border);

    a {
        text-decoration: none !important;
    }

    .menu-item {
        color: var(--color-text-muted);
        border-radius: var(--radius-sm);
        margin: 0.5em;
        padding: 0.7em 1em;
        cursor: pointer;
        border-left-width: 0;
        transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease;
    }

    .menu-item:hover {
        color: var(--color-text);
        background: var(--color-surface-hover);
    }

    .active .menu-item {
        color: var(--color-text);
        background: var(--color-interactive-subtle);
        border-left: 4px solid var(--color-interactive);
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
    }
}

.settings-content {
    min-width: 0;
    padding: 1.25rem;

    .settings-content-header {
        width: calc(100% + 20px);
        border-bottom: 1px solid var(--color-border);
        border-radius: 0 var(--radius-md) 0 0;
        margin-top: -20px;
        margin-right: -20px;
        padding: 12.5px 1em;
        font-size: 26px;

        .mobile & {
            padding: 15px 0 0 0;
        }
    }
}

@media (max-width: 767px) {
    .settings-layout {
        grid-template-columns: 1fr;
        min-height: 0;
    }
    .settings-menu { border-inline-end: 0; }
    .settings-content { padding: 0.75rem; }
}

footer {
    color: var(--color-text-muted);
    font-size: 13px;
    margin-top: 20px;
    padding-bottom: 30px;
    text-align: center;
}

.logout {
    color: var(--status-down) !important;
}
</style>
