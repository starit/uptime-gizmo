<template>
    <div :class="classes" class="app-shell">
        <div v-if="!$root.socket.connected && !$root.socket.firstConnect" class="lost-connection">
            <div class="container-fluid">
                {{ $root.connectionErrorMsg }}
                <div v-if="$root.showReverseProxyGuide">
                    {{ $t("Using a Reverse Proxy?") }}
                    <a href="https://github.com/starit/uptime-gizmo/wiki/Reverse-Proxy" target="_blank">
                        {{ $t("Check how to config it for WebSocket") }}
                    </a>
                </div>
            </div>
        </div>

        <!-- Desktop header -->
        <header v-if="!$root.isMobile" class="app-header">
            <router-link
                to="/dashboard"
                class="app-brand"
            >
                <img class="app-brand-logo" src="/images/logo.png" :alt="$root.appName" />
            </router-link>

            <a
                v-if="hasNewVersion"
                target="_blank"
                href="https://github.com/starit/uptime-gizmo/releases"
                class="btn btn-primary app-header-update"
            >
                <font-awesome-icon icon="arrow-alt-circle-up" />
                {{ $t("New Update") }}
            </a>

            <ul class="app-nav">
                <li v-if="$root.loggedIn" class="app-nav-item">
                    <router-link to="/manage-status-page" class="app-nav-link">
                        <font-awesome-icon icon="stream" />
                        {{ $t("Status Pages") }}
                    </router-link>
                </li>
                <li v-if="$root.loggedIn" class="app-nav-item">
                    <router-link to="/dashboard" class="app-nav-link">
                        <font-awesome-icon icon="tachometer-alt" />
                        {{ $t("Dashboard") }}
                    </router-link>
                </li>
                <li v-if="$root.loggedIn" class="app-nav-item">
                    <div class="dropdown dropdown-profile-pic">
                        <div class="nav-link" data-bs-toggle="dropdown">
                            <div class="profile-pic">{{ $root.usernameFirstChar }}</div>
                            <font-awesome-icon icon="angle-down" />
                        </div>

                        <!-- Header's Dropdown Menu -->
                        <ul class="dropdown-menu">
                            <!-- Username -->
                            <li>
                                <i18n-t
                                    v-if="$root.username != null"
                                    tag="span"
                                    keypath="signedInDisp"
                                    class="dropdown-item-text"
                                >
                                    <strong>{{ $root.username }}</strong>
                                </i18n-t>
                                <span v-if="$root.username == null" class="dropdown-item-text">
                                    {{ $t("signedInDispDisabled") }}
                                </span>
                            </li>

                            <li><hr class="dropdown-divider" /></li>

                            <!-- Functions -->
                            <li>
                                <router-link
                                    to="/maintenance"
                                    class="dropdown-item"
                                    :class="{ active: $route.path.includes('manage-maintenance') }"
                                >
                                    <font-awesome-icon icon="wrench" />
                                    {{ $t("Maintenance") }}
                                </router-link>
                            </li>

                            <li>
                                <router-link
                                    to="/settings/general"
                                    class="dropdown-item"
                                    :class="{ active: $route.path.includes('settings') }"
                                >
                                    <font-awesome-icon icon="cog" />
                                    {{ $t("Settings") }}
                                </router-link>
                            </li>

                            <li>
                                <a
                                    href="https://github.com/starit/uptime-gizmo/wiki"
                                    class="dropdown-item"
                                    target="_blank"
                                >
                                    <font-awesome-icon icon="info-circle" />
                                    {{ $t("Help") }}
                                </a>
                            </li>

                            <li v-if="$root.loggedIn && $root.socket.token !== 'autoLogin'">
                                <button class="dropdown-item" @click="$root.logout">
                                    <font-awesome-icon icon="sign-out-alt" />
                                    {{ $t("Logout") }}
                                </button>
                            </li>
                        </ul>
                    </div>
                </li>
            </ul>
        </header>

        <!-- Mobile header -->
        <header v-else class="app-header app-header-mobile">
            <router-link to="/dashboard" class="app-brand">
                <img class="app-brand-logo" src="/images/logo.png" :alt="$root.appName" />
            </router-link>
        </header>

        <main class="app-main">
            <router-view v-if="$root.loggedIn" />
            <Login v-if="!$root.loggedIn && $root.allowLoginDialog" />
        </main>

        <!-- Mobile Only -->
        <div v-if="$root.isMobile" style="width: 100%; height: calc(60px + env(safe-area-inset-bottom))" />
        <nav v-if="$root.isMobile && $root.loggedIn" class="bottom-nav" :aria-label="$t('Dashboard')">
            <router-link to="/dashboard" class="bottom-nav-link">
                <div><font-awesome-icon icon="tachometer-alt" /></div>
                {{ $t("Home") }}
            </router-link>

            <router-link to="/list" class="bottom-nav-link">
                <div><font-awesome-icon icon="list" /></div>
                {{ $t("List") }}
            </router-link>

            <router-link to="/add" class="bottom-nav-link">
                <div><font-awesome-icon icon="plus" /></div>
                {{ $t("Add") }}
            </router-link>

            <router-link to="/settings" class="bottom-nav-link">
                <div><font-awesome-icon icon="cog" /></div>
                {{ $t("Settings") }}
            </router-link>
        </nav>

        <button
            v-if="numActiveToasts != 0"
            type="button"
            class="btn btn-normal clear-all-toast-btn"
            @click="clearToasts"
        >
            <font-awesome-icon icon="times" />
        </button>
    </div>
</template>

<script>
import Login from "../components/Login.vue";
import compareVersions from "compare-versions";
import { useToast } from "vue-toastification";
const toast = useToast();

export default {
    components: {
        Login,
    },

    data() {
        return {
            toastContainer: null,
            numActiveToasts: 0,
            toastContainerObserver: null,
        };
    },

    computed: {
        // Theme or Mobile
        classes() {
            const classes = {};
            classes[this.$root.theme] = true;
            classes["mobile"] = this.$root.isMobile;
            return classes;
        },

        hasNewVersion() {
            if (this.$root.info.latestVersion && this.$root.info.version) {
                return compareVersions(this.$root.info.latestVersion, this.$root.info.version) >= 1;
            } else {
                return false;
            }
        },
    },

    watch: {},

    mounted() {
        this.toastContainer = document.querySelector(".bottom-right.toast-container");

        // Watch the number of active toasts
        this.toastContainerObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    this.numActiveToasts = mutation.target.children.length;
                }
            }
        });

        if (this.toastContainer != null) {
            this.toastContainerObserver.observe(this.toastContainer, { childList: true });
        }
    },

    beforeUnmount() {
        this.toastContainerObserver.disconnect();
    },

    methods: {
        /**
         * Clear all toast notifications.
         * @returns {void}
         */
        clearToasts() {
            toast.clear();
        },
    },
};
</script>

<style lang="scss" scoped>
.app-shell {
    min-height: 100vh;
    background:
        linear-gradient(135deg, color-mix(in srgb, var(--color-brand) 8%, transparent), transparent 28rem),
        var(--color-bg);
}

.app-header {
    position: sticky;
    top: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    min-height: 76px;
    padding: 0.75rem clamp(1rem, 3vw, 3rem);
    background: color-mix(in srgb, var(--color-surface) 90%, transparent);
    border-bottom: 1px solid var(--color-border);
    backdrop-filter: blur(18px);
}

.app-header-mobile {
    justify-content: center;
    min-height: 64px;

    .app-brand {
        margin-right: 0;
    }
}

.app-brand {
    display: inline-flex;
    align-items: center;
    min-width: 0;
    margin-right: auto;
}

.app-brand-logo {
    display: block;
    width: min(13rem, 42vw);
    height: auto;
    border-radius: 0.65rem;
}

.app-header-update {
    margin-right: 0.75rem;
}

.app-nav {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0;
    margin: 0;
    list-style: none;
}

.app-nav-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.8rem;
    border-radius: 0.7rem;
    color: var(--color-text-muted);
    font-weight: 650;
    text-decoration: none;

    &:hover,
    &.router-link-active {
        background-color: var(--color-interactive-subtle);
        color: var(--color-interactive);
    }
}

.app-main {
    min-height: calc(100vh - 76px);
    padding: clamp(1rem, 2vw, 2rem) 0;
}

.lost-connection {
    padding: 0.75rem 1rem;
    background-color: var(--status-down-bg);
    border-bottom: 1px solid var(--status-down-border);
    color: var(--status-down-fg);
    position: fixed;
    width: 100%;
    z-index: 99999;
}

// Profile Pic Button with Dropdown
.dropdown-profile-pic {
    user-select: none;

    .nav-link {
        cursor: pointer;
        display: flex;
        gap: 6px;
        align-items: center;
        background-color: var(--color-surface-subtle);
        padding: 0.5rem 0.8rem;

        &:hover {
            background-color: var(--color-surface-hover);
        }
    }

    .dropdown-menu {
        transition: all 0.2s;
        padding-left: 0;
        padding-bottom: 0;
        margin-top: 8px !important;
        border: 1px solid var(--color-border);
        border-radius: 0.875rem;
        overflow: hidden;

        .dropdown-divider {
            margin: 0;
            border-top: 1px solid var(--color-border);
            background-color: transparent;
        }

        .dropdown-item-text {
            font-size: 14px;
            padding-bottom: 0.7rem;
        }

        .dropdown-item {
            color: var(--color-text);
            padding: 0.7rem 1rem;

            &.active,
            &:hover {
                background-color: var(--color-surface-hover);
                color: var(--color-text);
            }
        }
    }

    .profile-pic {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-brand-contrast);
        background-color: var(--color-brand);
        width: 24px;
        height: 24px;
        margin-right: 5px;
        border-radius: 50rem;
        font-weight: bold;
        font-size: 10px;
    }
}

.bottom-nav {
    position: fixed;
    z-index: 1000;
    right: 0;
    bottom: 0;
    left: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    height: calc(64px + env(safe-area-inset-bottom));
    padding: 0.35rem 0.5rem env(safe-area-inset-bottom);
    background: color-mix(in srgb, var(--color-surface) 94%, transparent);
    border-top: 1px solid var(--color-border);
    backdrop-filter: blur(18px);
}

.bottom-nav-link {
    display: grid;
    place-content: center;
    gap: 0.2rem;
    min-width: 0;
    color: var(--color-text-subtle);
    font-size: 0.72rem;
    font-weight: 700;
    text-align: center;
    text-decoration: none;

    div {
        font-size: 1.05rem;
    }

    &.router-link-exact-active,
    &.active {
        color: var(--color-interactive);
    }
}

.clear-all-toast-btn {
    position: fixed;
    right: 1em;
    bottom: 1em;
    font-size: 1.2em;
    padding: 9px 15px;
    width: 48px;
    box-shadow: var(--shadow-float);
    z-index: 100;
}

@media (max-width: 900px) {
    .app-nav-link {
        font-size: 0;

        svg {
            font-size: 1rem;
        }
    }
}

@media (max-width: 770px) {
    .clear-all-toast-btn {
        bottom: 72px;
    }
}
</style>
