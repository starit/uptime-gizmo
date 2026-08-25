<template>
    <div :class="classes" class="app-shell">
        <div v-if="!$root.socket.connected && !$root.socket.firstConnect" class="lost-connection">
            <div class="lost-connection__inner">
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
                <BrandLogo class="app-brand-logo" />
            </router-link>

            <a
                v-if="hasNewVersion"
                target="_blank"
                href="https://github.com/starit/uptime-gizmo/releases"
                class="gizmo-native-button gizmo-native-button--primary app-header-update"
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
                    <div class="dropdown-profile-pic">
                        <GizmoMenu align="end">
                            <template #trigger>
                                <button type="button" class="profile-menu-trigger" :aria-label="$t('User')">
                                    <span class="profile-pic">{{ $root.usernameFirstChar }}</span>
                                    <font-awesome-icon icon="angle-down" />
                                </button>
                            </template>

                            <i18n-t
                                v-if="$root.username != null"
                                tag="div"
                                keypath="signedInDisp"
                                class="gizmo-menu__label"
                            >
                                <strong>{{ $root.username }}</strong>
                            </i18n-t>
                            <div v-else class="gizmo-menu__label">
                                {{ $t("signedInDispDisabled") }}
                            </div>
                            <div class="gizmo-menu__separator" role="separator"></div>

                            <GizmoMenuItem as-child>
                                <router-link
                                    to="/maintenance"
                                    :class="{ active: onMaintenance }"
                                >
                                    <font-awesome-icon icon="wrench" />
                                    {{ $t("Maintenance") }}
                                </router-link>
                            </GizmoMenuItem>
                            <GizmoMenuItem as-child>
                                <router-link
                                    to="/settings/general"
                                    :class="{ active: onSettings }"
                                >
                                    <font-awesome-icon icon="cog" />
                                    {{ $t("Settings") }}
                                </router-link>
                            </GizmoMenuItem>
                            <GizmoMenuItem as-child>
                                <router-link to="/settings/api-docs" :class="{ active: onApiDocs }">
                                    <font-awesome-icon icon="book" />
                                    {{ $t("API Documentation") }}
                                </router-link>
                            </GizmoMenuItem>
                            <GizmoMenuItem as-child>
                                <a
                                    href="https://github.com/starit/uptime-gizmo/wiki"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <font-awesome-icon icon="info-circle" />
                                    {{ $t("Help") }}
                                </a>
                            </GizmoMenuItem>
                            <GizmoMenuItem
                                v-if="$root.loggedIn && $root.socket.token !== 'autoLogin'"
                                @select="$root.logout"
                            >
                                <font-awesome-icon icon="sign-out-alt" />
                                {{ $t("Logout") }}
                            </GizmoMenuItem>
                        </GizmoMenu>
                    </div>
                </li>
            </ul>
        </header>

        <!-- Mobile header -->
        <header v-else class="app-header app-header-mobile">
            <router-link to="/dashboard" class="app-brand">
                <BrandLogo class="app-brand-logo" />
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
            class="clear-all-toast-btn"
            :aria-label="$t('dismissAllToasts')"
            :title="$t('dismissAllToasts')"
            @click="clearToasts"
        >
            <font-awesome-icon icon="times" aria-hidden="true" />
        </button>
    </div>
</template>

<script>
import Login from "../components/Login.vue";
import GizmoMenu from "../components/gizmo/GizmoMenu.vue";
import GizmoMenuItem from "../components/gizmo/GizmoMenuItem.vue";
import compareVersions from "compare-versions";
import { useToast } from "vue-toastification";
import BrandLogo from "../components/BrandLogo.vue";
const toast = useToast();

export default {
    components: {
        BrandLogo,
        GizmoMenu,
        GizmoMenuItem,
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
        /*
         * Which menu entry is the page you are on.
         *
         * Substring matching was the bug: API Documentation lives at
         * /settings/api-docs, so a path test of includes("settings") lit Settings
         * up as well, and two entries claimed to be the current page at once. The
         * maintenance test looked for a path — manage-maintenance — that no route
         * has, so that entry never lit up at all.
         */
        onApiDocs() {
            return this.$route.path === "/settings/api-docs";
        },

        // Every settings pane except API Documentation, which is its own entry.
        onSettings() {
            return this.$route.path.startsWith("/settings") && !this.onApiDocs;
        },

        onMaintenance() {
            return /^\/(maintenance|add-maintenance)(\/|$)/.test(this.$route.path);
        },

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
    background: var(--color-bg);
}

.app-header {
    position: sticky;
    top: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    min-height: 3.5rem;
    padding: 0.5rem clamp(1rem, 3vw, 2rem);
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
}

.app-header-mobile {
    justify-content: center;
    min-height: 3.5rem;

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
    border-radius: var(--radius-sm);
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
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    font-weight: var(--weight-semibold);
    text-decoration: none;

    &:hover,
    &.router-link-active {
        background-color: var(--color-interactive-subtle);
        color: var(--color-interactive);
    }
}

.app-main {
    min-height: calc(100vh - 3.5rem);
    padding: clamp(0.75rem, 1.5vw, 1.25rem) 0;
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

    .profile-menu-trigger {
        cursor: pointer;
        display: flex;
        gap: 0.375rem;
        align-items: center;
        border: 0;
        background-color: transparent;
        color: var(--color-text);
        padding: 0.5rem 0.75rem;
        border-radius: var(--radius-sm);

        &:hover {
            background-color: var(--color-surface-hover);
        }
    }

    .profile-pic {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-brand-contrast);
        background-color: var(--color-brand);
        width: 1.75rem;
        height: 1.75rem;
        margin-inline-end: 0.25rem;
        border-radius: var(--radius-pill);
        font-weight: var(--weight-bold);
        font-size: 0.75rem;
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
    background: var(--color-bg);
    border-top: 1px solid var(--color-border);
}

.bottom-nav-link {
    display: grid;
    place-content: center;
    gap: 0.2rem;
    min-width: 0;
    color: var(--color-text-subtle);
    font-size: 0.72rem;
    font-weight: var(--weight-bold);
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

/*
 * Appears only while toasts are on screen, so it reads as part of them: the same
 * surface, border and shadow the notifications themselves now use, rather than a
 * filled button competing with them for attention.
 */
.clear-all-toast-btn {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 100;
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    box-shadow: var(--shadow-float);
    color: var(--color-text-muted);
    font-size: 0.95rem;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;

    &:hover {
        background: var(--color-surface-hover);
        color: var(--color-text);
    }

    &:focus-visible {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
    }
}

@media (max-width: 900px) {
    .app-nav-link {
        font-size: 0;

        :deep(svg) {
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
