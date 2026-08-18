import { darken, getContrastRatio, isLight, lighten, mix } from "@themed.js/core";
import type { Theme } from "@themed.js/core";

/*
 * Bridge between themed.js and the Gizmo token contract.
 *
 * Every component and recipe in this project reads `--color-*` and `--status-*`
 * from tokens.scss. Those names are the interface and they do not move. This
 * module is the only place that knows themed.js exists, so replacing or
 * upgrading that library is a change to one file rather than to 199 components.
 *
 * Direction is deliberate. tokens.scss stays the source for the built-in light
 * and dark themes: themed.js models a palette as sixteen colours, which cannot
 * express the roughly sixty tokens here — in particular the per-status
 * foreground, background and border triples, which are hand-picked to clear
 * WCAG AA and would be flattened by any derivation. themed.js instead supplies
 * *additional* themes, and this bridge layers them over whichever built-in
 * baseline matches their brightness.
 */

/** The CSS custom properties a bridged theme is allowed to set. */
export type GizmoVars = Record<string, string>;

/**
 * Whether a theme should sit on the light or the dark baseline.
 * Derived from the background rather than declared, so an AI-generated theme
 * lands correctly without having to know about this project's conventions.
 * @param theme themed.js theme to classify
 * @returns which built-in baseline the theme layers over
 */
export function baselineFor(theme: Theme): "light" | "dark" {
    return isLight(theme.tokens.colors.background) ? "light" : "dark";
}

/**
 * Map a themed.js theme onto the Gizmo token contract.
 *
 * Sixteen colours in, roughly forty out. Anything themed.js does not carry is
 * derived from what it does, in the same direction the hand-written themes
 * move: hover states step toward the text colour, subtle fills step away from
 * it, and status tints are built from the status hue against the surface.
 * @param theme themed.js theme to translate
 * @returns the CSS custom properties to write for that theme
 */
export function themeToGizmoVars(theme: Theme): GizmoVars {
    const c = theme.tokens.colors;
    const dark = baselineFor(theme) === "dark";

    /*
     * themed.js takes these amounts as percentages, not fractions. Its types say
     * `amount: number` with no unit, and passing 0-1 silently does almost
     * nothing rather than failing, which is worth knowing before trusting any
     * derived colour. mix's weight is the share of the *second* colour.
     */
    // Step a colour toward the foreground of the current baseline.
    const toward = (hex: string, pct: number) => (dark ? lighten(hex, pct) : darken(hex, pct));
    // Step a colour away from the foreground of the current baseline.
    const away = (hex: string, pct: number) => (dark ? darken(hex, pct) : lighten(hex, pct));
    // A quiet fill of a hue that still reads as the surface it sits on.
    const tint = (hue: string) => mix(hue, c.surface, dark ? 82 : 88);
    // A legible version of a hue for text on that tint.
    const onTint = (hue: string) => (dark ? lighten(hue, 22) : darken(hue, 22));

    const status = (hue: string, prefix: string): GizmoVars => ({
        [`--status-${prefix}`]: hue,
        [`--status-${prefix}-fg`]: onTint(hue),
        [`--status-${prefix}-bg`]: tint(hue),
        [`--status-${prefix}-border`]: mix(hue, c.border, 45),
    });

    return {
        // Surfaces
        "--color-bg": c.background,
        "--color-surface": c.surface,
        "--color-surface-subtle": toward(c.surface, 4),
        "--color-surface-hover": toward(c.surface, 8),
        "--color-border": c.border,
        "--color-border-strong": c.borderDark,

        // Content
        "--color-text": c.textPrimary,
        "--color-text-muted": c.textSecondary,
        "--color-text-subtle": c.textDisabled,
        "--color-text-inverse": c.textInverse,

        // Brand and interaction
        "--color-brand": c.primary,
        "--color-brand-hover": away(c.primary, 10),
        "--color-brand-contrast": isLight(c.primary) ? c.textPrimary : c.textInverse,
        "--color-interactive": c.accent,
        "--color-interactive-hover": toward(c.accent, 12),
        "--color-interactive-subtle": tint(c.accent),
        "--color-focus-ring": c.accent,

        // Monitoring status. themed.js has no maintenance concept, so that one
        // comes from the secondary colour, which is the closest thing it has to
        // a second brand hue.
        ...status(c.success, "up"),
        ...status(c.warning, "degraded"),
        ...status(c.error, "down"),
        ...status(c.secondary, "maintenance"),
        // borderDark is too pale against a light page to clear the 3:1 floor for
        // a UI component; the muted text colour is legible by definition.
        ...status(c.textSecondary, "unknown"),
    };
}

const STYLE_ELEMENT_ID = "gizmo-theme-bridge";

/**
 * Write a bridged theme onto the document, or clear it.
 *
 * The variables go into a stylesheet rather than inline styles so that the
 * baseline in tokens.scss still applies to anything a theme does not set, and
 * so an override can be removed in one step.
 * @param theme themed.js theme to apply, or null to fall back to the built-ins
 * @returns {void}
 */
export function applyBridgedTheme(theme: Theme | null): void {
    const existing = document.getElementById(STYLE_ELEMENT_ID);

    if (!theme) {
        existing?.remove();
        return;
    }

    const vars = themeToGizmoVars(theme);
    const body = Object.entries(vars)
        .map(([ name, value ]) => `    ${name}: ${value};`)
        .join("\n");

    const style = existing ?? document.createElement("style");
    style.id = STYLE_ELEMENT_ID;
    // Matching the specificity tokens.scss uses for its dark block keeps the
    // cascade predictable: last one in wins, and this element is appended last.
    style.textContent = `:root,\n.dark,\n[data-theme="dark"] {\n${body}\n}\n`;

    if (!existing) {
        document.head.appendChild(style);
    }
}

/** A token pair that does not meet the contrast DESIGN.md requires. */
export interface ContrastFailure {
    /** What the pair is for, e.g. "status down text". */
    label: string;
    /** Measured ratio. */
    ratio: number;
    /** Ratio the pair has to reach. */
    required: number;
}

/**
 * Check a bridged theme against the contrast floors DESIGN.md sets: 4.5:1 for
 * body text and 3:1 for UI components.
 *
 * A generated palette optimises for looking pleasant, not for being legible, so
 * nothing should reach the document without passing through here first.
 * @param theme themed.js theme to check
 * @returns every pair that falls short, empty when the theme is usable
 */
export function findContrastFailures(theme: Theme): ContrastFailure[] {
    const v = themeToGizmoVars(theme);
    const failures: ContrastFailure[] = [];

    const check = (label: string, fg: string, bg: string, required: number) => {
        const ratio = getContrastRatio(fg, bg);
        if (ratio < required) {
            failures.push({ label, ratio, required });
        }
    };

    check("body text", v["--color-text"], v["--color-bg"], 4.5);
    check("muted text", v["--color-text-muted"], v["--color-bg"], 4.5);
    check("link", v["--color-interactive"], v["--color-bg"], 4.5);

    for (const name of [ "up", "degraded", "down", "maintenance", "unknown" ]) {
        check(`status ${name} text`, v[`--status-${name}-fg`], v[`--status-${name}-bg`], 4.5);
        check(`status ${name} indicator`, v[`--status-${name}`], v["--color-bg"], 3);
    }

    return failures;
}
