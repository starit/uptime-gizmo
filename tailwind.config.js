/** @type {import("tailwindcss").Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts}",
    ],
    // Keep the foundational token utilities available while Phase 2 introduces
    // their first component consumers. This is intentionally a tiny set rather
    // than a broad pattern that would enlarge the production stylesheet.
    safelist: [
        "tw-bg-canvas",
        "tw-bg-surface",
        "tw-text-content",
        "tw-border-border",
        "tw-ring-focus-ring",
        "tw-font-sans",
        "tw-rounded-gizmo",
        "tw-shadow-float",
        "tw-ease-gizmo",
        "gizmo-focus-ring",
        "gizmo-surface",
        "gizmo-surface-subtle",
        "gizmo-compact-data",
        "gizmo-status-up",
        "gizmo-status-degraded",
        "gizmo-status-down",
        "gizmo-status-maintenance",
        "gizmo-status-unknown",
    ],
    prefix: "tw-",
    corePlugins: {
        // Bootstrap remains active through the incremental migration. Disabling
        // Preflight prevents Tailwind's global reset from changing legacy routes.
        preflight: false,
    },
    theme: {
        screens: {
            sm: "640px",
            md: "768px",
            lg: "1024px",
            xl: "1280px",
            "2xl": "1536px",
        },
        extend: {
            colors: {
                canvas: "var(--color-bg)",
                surface: {
                    DEFAULT: "var(--color-surface)",
                    subtle: "var(--color-surface-subtle)",
                    hover: "var(--color-surface-hover)",
                },
                border: {
                    DEFAULT: "var(--color-border)",
                    strong: "var(--color-border-strong)",
                },
                content: {
                    DEFAULT: "var(--color-text)",
                    muted: "var(--color-text-muted)",
                    subtle: "var(--color-text-subtle)",
                    inverse: "var(--color-text-inverse)",
                },
                brand: {
                    DEFAULT: "var(--color-brand)",
                    hover: "var(--color-brand-hover)",
                    contrast: "var(--color-brand-contrast)",
                },
                interactive: {
                    DEFAULT: "var(--color-interactive)",
                    hover: "var(--color-interactive-hover)",
                    subtle: "var(--color-interactive-subtle)",
                },
                "focus-ring": "var(--color-focus-ring)",
                status: {
                    up: {
                        DEFAULT: "var(--status-up)",
                        fg: "var(--status-up-fg)",
                        bg: "var(--status-up-bg)",
                        border: "var(--status-up-border)",
                    },
                    degraded: {
                        DEFAULT: "var(--status-degraded)",
                        fg: "var(--status-degraded-fg)",
                        bg: "var(--status-degraded-bg)",
                        border: "var(--status-degraded-border)",
                    },
                    down: {
                        DEFAULT: "var(--status-down)",
                        fg: "var(--status-down-fg)",
                        bg: "var(--status-down-bg)",
                        border: "var(--status-down-border)",
                    },
                    maintenance: {
                        DEFAULT: "var(--status-maintenance)",
                        fg: "var(--status-maintenance-fg)",
                        bg: "var(--status-maintenance-bg)",
                        border: "var(--status-maintenance-border)",
                    },
                    unknown: {
                        DEFAULT: "var(--status-unknown)",
                        fg: "var(--status-unknown-fg)",
                        bg: "var(--status-unknown-bg)",
                        border: "var(--status-unknown-border)",
                    },
                },
            },
            fontFamily: {
                sans: ["IBM Plex Sans", "Noto Sans", "sans-serif"],
            },
            borderRadius: {
                gizmo: "0.875rem",
                compact: "0.625rem",
            },
            boxShadow: {
                float: "var(--shadow-float)",
            },
            transitionTimingFunction: {
                "gizmo-in": "var(--easing-in)",
                "gizmo-out": "var(--easing-out)",
                gizmo: "var(--easing-in-out)",
            },
        },
    },
};
