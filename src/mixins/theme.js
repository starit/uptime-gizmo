import { applyBridgedTheme, baselineFor } from "../theme/theme-bridge";

export default {
    data() {
        return {
            system: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
            userTheme: localStorage.theme,
            userHeartbeatBar: localStorage.heartbeatBarTheme,
            styleElapsedTime: localStorage.styleElapsedTime,
            statusPageTheme: "light",
            forceStatusPageTheme: false,
            path: "",
        };
    },

    mounted() {
        // Default Light
        if (!this.userTheme) {
            this.userTheme = "auto";
        }

        // Default Heartbeat Bar
        if (!this.userHeartbeatBar) {
            this.userHeartbeatBar = "normal";
        }

        // Default Elapsed Time Style
        if (!this.styleElapsedTime) {
            this.styleElapsedTime = "no-line";
        }

        document.body.classList.add(this.theme);
        this.updateThemeColorMeta();
        applyBridgedTheme(this.activeCustomTheme);
    },

    computed: {
        /** Themes defined on this instance, delivered with the boot payload. */
        customThemes() {
            return this.info?.customThemes ?? [];
        },

        /**
         * The raw selection for the surface currently on screen: one of "light",
         * "dark", "auto", or the id of a custom theme.
         */
        selectedThemeId() {
            if (this.forceStatusPageTheme) {
                return this.statusPageTheme;
            }
            if (this.path === "") {
                return "light";
            }
            if (this.path.startsWith("/status-page") || this.path.startsWith("/status")) {
                return this.statusPageTheme;
            }
            return this.userTheme;
        },

        /** The custom theme in effect, or null when a built-in is selected. */
        activeCustomTheme() {
            return this.customThemes.find((theme) => theme.id === this.selectedThemeId) ?? null;
        },

        theme() {
            // A custom theme is an overlay; it still sits on a light or dark
            // baseline, chosen from its own background rather than declared.
            if (this.activeCustomTheme) {
                return baselineFor(this.activeCustomTheme);
            }

            // As entry can be status page now, set forceStatusPageTheme to true to use status page theme
            if (this.forceStatusPageTheme) {
                if (this.statusPageTheme === "auto") {
                    return this.system;
                }
                return this.statusPageTheme;
            }

            // Entry no need dark
            if (this.path === "") {
                return "light";
            }

            if (this.path.startsWith("/status-page") || this.path.startsWith("/status")) {
                if (this.statusPageTheme === "auto") {
                    return this.system;
                }
                return this.statusPageTheme;
            } else {
                if (this.userTheme === "auto") {
                    return this.system;
                }
                return this.userTheme;
            }
        },

        isDark() {
            return this.theme === "dark";
        },
    },

    watch: {
        "$route.fullPath"(path) {
            this.path = path;
        },

        userTheme(to, from) {
            localStorage.theme = to;
        },

        styleElapsedTime(to, from) {
            localStorage.styleElapsedTime = to;
        },

        theme(to, from) {
            document.body.classList.remove(from);
            document.body.classList.add(this.theme);
            this.updateThemeColorMeta();
        },

        activeCustomTheme: {
            handler(theme) {
                applyBridgedTheme(theme);
            },
            immediate: false,
        },

        userHeartbeatBar(to, from) {
            localStorage.heartbeatBarTheme = to;
        },

        heartbeatBarTheme(to, from) {
            document.body.classList.remove(from);
            document.body.classList.add(this.heartbeatBarTheme);
        },
    },

    methods: {
        /**
         * Update the theme color meta tag
         * @returns {void}
         */
        updateThemeColorMeta() {
            if (this.theme === "dark") {
                document.querySelector("#theme-color").setAttribute("content", "#0A151E");
            } else {
                document.querySelector("#theme-color").setAttribute("content", "#FCFCFC");
            }
        },
    },
};
