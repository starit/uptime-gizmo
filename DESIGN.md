# Uptime Gizmo Design System

This document is the source of truth for Uptime Gizmo's visual identity and product UI. It consolidates the brand guidance from `Uptime_Gizmo_Color_Guidelines.docx` and the design information previously kept in the README.

## Brand

**Uptime Gizmo** is a calm, capable infrastructure product with a little engineering personality.

> **Uptime is money, friend!**

The identity combines a gear, the letter “G,” and goggles to represent monitoring, engineering, and value. Product UI should be clear and restrained; the mascot can bring warmth to marketing and campaign surfaces.

### Brand assets

- Use [`public/images/uptime-gizmo-logo-horizontal-light.png`](public/images/uptime-gizmo-logo-horizontal-light.png) as the current primary horizontal logo.
- Use `uptime-gizmo-mark-light.png` or `uptime-gizmo-mark-dark.png` for icons, favicons, and compact surfaces.
- Reserve [`public/images/gizmo-mascot-engineer.png`](public/images/gizmo-mascot-engineer.png) and `gizmo-monitoring-workshop-hero.png` for hero artwork, campaigns, and other expressive brand surfaces.
- Keep `uptime-gizmo-brand-reference.png` as a design reference rather than a runtime product asset.
- Keep the logo readable at favicon size. Avoid heavy glow, photorealism, or decorative effects in the core mark.

## Color principles

The palette is built around Gold, Navy, and Blue:

- **Gizmo Gold** carries the brand and engineering personality.
- **Deep Navy** anchors the developer and infrastructure aesthetic.
- **Signal Blue** represents monitoring intelligence, AI, and interaction.
- **Monitoring status colors are semantic, not brand colors.** Never use Gold as the default warning state.

For product and marketing surfaces, target a restrained balance of roughly 60% Navy/White foundations, 25% Gold brand elements, 10% Signal Blue interaction accents, and no more than 5% high-energy supporting color.

## Core palette

| Token | Hex | RGB | Use |
| --- | --- | --- | --- |
| `--gizmo-gold` | `#ECAB24` | `236, 171, 36` | Brand accent, gear and mascot details, selected primary actions |
| `--gizmo-navy` | `#0A151E` | `10, 21, 30` | Dark foundation, wordmark, navigation, high-contrast text |
| `--gizmo-blue` | `#1E64E7` | `30, 100, 231` | AI and monitoring intelligence, active controls, links, information |
| `--gizmo-white` | `#FCFCFC` | `252, 252, 252` | Primary light surface and page background |
| `--gizmo-gray-600` | `#575D64` | `87, 93, 100` | Secondary text, subdued labels, disabled and supporting UI |
| `--gizmo-gray-400` | `#A2A4A7` | `162, 164, 167` | Dividers, borders, and tertiary metadata; use sparingly |

### Semantic status palette

| State | Base token | Hex | Meaning |
| --- | --- | --- | --- |
| Operational | `--status-up` | `#22C55E` | Healthy, online, passed |
| Degraded | `--status-degraded` | `#F59E0B` | Warning, degraded performance |
| Incident | `--status-down` | `#EF4444` | Down, failed, incident |
| Maintenance | `--status-maintenance` | `#8B5CF6` | Scheduled maintenance, paused |
| Unknown | `--status-unknown` | `#6B7280` | Unknown, no data, disabled |

## Theme tokens

Use semantic UI tokens in application code instead of hard-coding primitive colors. The values below complete the light and dark product themes while retaining the brand palette above.

```css
:root {
    /* Surfaces */
    --color-bg: #FCFCFC;
    --color-surface: #FFFFFF;
    --color-surface-subtle: #F4F5F6;
    --color-surface-hover: #EEF1F4;
    --color-border: #D7DCE1;
    --color-border-strong: #A2A4A7;

    /* Content */
    --color-text: #0A151E;
    --color-text-muted: #575D64;
    --color-text-subtle: #6B7280;
    --color-text-inverse: #FCFCFC;
    --color-tag-default: #4B5563;
    --color-tag-text-light: #FFFFFF;
    --color-tag-text-dark: #0A151E;

    /* Brand and interaction */
    --color-brand: #ECAB24;
    --color-brand-hover: #D99B1E;
    --color-brand-contrast: #0A151E;
    --color-interactive: #1E64E7;
    --color-interactive-hover: #1854C4;
    --color-interactive-subtle: #E8F0FF;
    --color-focus-ring: #1E64E7;
    --color-overlay: rgb(10 21 30 / 68%);

    /* Status: light mode */
    --status-up: #22C55E;
    --status-up-fg: #166534;
    --status-up-bg: #DCFCE7;
    --status-up-border: #86EFAC;
    --status-degraded: #F59E0B;
    --status-degraded-fg: #92400E;
    --status-degraded-bg: #FEF3C7;
    --status-degraded-border: #FCD34D;
    --status-down: #EF4444;
    --status-down-fg: #B91C1C;
    --status-down-bg: #FEE2E2;
    --status-down-border: #FCA5A5;
    --status-maintenance: #8B5CF6;
    --status-maintenance-fg: #6D28D9;
    --status-maintenance-bg: #EDE9FE;
    --status-maintenance-border: #C4B5FD;
    --status-unknown: #6B7280;
    --status-unknown-fg: #4B5563;
    --status-unknown-bg: #F3F4F6;
    --status-unknown-border: #D1D5DB;
}

body.dark,
[data-theme="dark"] {
    /* Surfaces */
    --color-bg: #0A151E;
    --color-surface: #101E29;
    --color-surface-subtle: #172937;
    --color-surface-hover: #203746;
    --color-border: #2B3D4B;
    --color-border-strong: #4B6273;

    /* Content */
    --color-text: #FCFCFC;
    --color-text-muted: #C6CBD0;
    --color-text-subtle: #9CA7B1;
    --color-text-inverse: #0A151E;
    --color-tag-default: #4B5563;
    --color-tag-text-light: #FFFFFF;
    --color-tag-text-dark: #0A151E;

    /* Brand and interaction */
    --color-brand: #F5BE4F;
    --color-brand-hover: #FFD06A;
    --color-brand-contrast: #0A151E;
    --color-interactive: #75A7FF;
    --color-interactive-hover: #9ABEFF;
    --color-interactive-subtle: #132E5C;
    --color-focus-ring: #75A7FF;
    --color-overlay: rgb(2 8 13 / 78%);

    /* Status: dark mode */
    --status-up: #4ADE80;
    --status-up-fg: #86EFAC;
    --status-up-bg: #143D27;
    --status-up-border: #237A45;
    --status-degraded: #FBBF24;
    --status-degraded-fg: #FCD34D;
    --status-degraded-bg: #4A2C05;
    --status-degraded-border: #9A670E;
    --status-down: #F87171;
    --status-down-fg: #FCA5A5;
    --status-down-bg: #4A1111;
    --status-down-border: #9F2D2D;
    --status-maintenance: #A78BFA;
    --status-maintenance-fg: #C4B5FD;
    --status-maintenance-bg: #2E1065;
    --status-maintenance-border: #6D4CC5;
    --status-unknown: #9CA3AF;
    --status-unknown-fg: #D1D5DB;
    --status-unknown-bg: #27313C;
    --status-unknown-border: #4B5563;
}
```

## Usage rules

### Monitoring density

The private monitoring workspace is an operational tool, not a marketing surface. Operators must be able to scan monitor health, recent changes, and available actions quickly—especially during an incident. Information density is therefore a product requirement, not an aesthetic preference.

- Prefer a compact list, table, inline metric, or grouped row when it communicates operational data more directly than a card. Cards must establish a meaningful boundary; do not use one merely to decorate a single value or action.
- Keep primary monitor identity, current status, the most useful recent signal, and the relevant action visible together at desktop widths. Do not require opening a detail view for routine triage.
- Use whitespace to separate semantic groups, not to make routine data look spacious. Avoid oversized page headers, hero areas, repeated card padding, and decorative artwork in authenticated monitoring workflows.
- Make status the strongest signal, monitor name the next strongest, and secondary metadata intentionally quieter. Preserve a stable scan order across rows, filters, and screen sizes.
- Use compact controls for dense desktop workflows, but preserve a minimum 2.5rem target for controls that need pointer or touch interaction. Responsive layouts may reflow or reveal secondary data on demand; they must not discard a monitor's state or its accessible name.
- Keep labels and operational metadata readable: use at least 0.75rem for secondary text, tabular numerals for time, counts, and latency, and avoid wrapping status/action controls where a responsive row layout can prevent it.
- Prefer CSS transitions and already-loaded icons over decorative animation, large illustrations, or continuous effects in the private workspace. Visual effects must never compete with alert, incident, or recovery signals.
- Public status pages may use more breathing room and brand expression, but availability, incident history, and affected components must still be immediately scannable.

Density does not excuse inaccessible UI: keyboard focus, labels, contrast, error messages, and touch targets remain mandatory. If density and clarity conflict, preserve clarity first.

### Brand and interaction

- Use Gold for the logo, mascot details, branded highlights, and selected primary calls to action.
- Use Blue for AI actions, links, selected controls, live states, and informational UI.
- Use Navy for dark navigation, dark backgrounds, and strong text—not pure black.
- Keep most surfaces Cloud White or neutral gray. The mascot may be expressive; the interface should remain simple.
- Do not use Gold for small body text on a light surface. Use Navy or a suitable neutral instead.

### Monitoring status

- Use status tokens only for their semantic meaning; do not repurpose them as decorative accent colors.
- Never communicate a monitoring state with color alone. Pair it with a label, icon, shape, or other non-color cue.
- Use the `*-fg`, `*-bg`, and `*-border` status tokens together for badges, banners, and status rows so contrast remains reliable in both themes.

### Accessibility

- Use Deep Navy on Cloud White for primary light-theme content, and Cloud White on Deep Navy for primary dark-theme content.
- Meet at least WCAG AA contrast: 4.5:1 for normal text and 3:1 for large text and UI components.
- Use `--color-focus-ring` for a visible keyboard focus indicator; do not remove focus styling.
- Treat color as supporting information, never as the only signal for an error, incident, or disabled state.

## Product implementation checklist

Before shipping a UI change, confirm that it:

- Uses semantic tokens rather than new one-off hex values.
- Works in both light and dark themes.
- Keeps status colors separate from brand and AI-interaction colors.
- Provides sufficient contrast and visible focus states.
- Uses the flat logo treatment in product UI and reserves 3D artwork for marketing contexts.
- Handles loading, empty, error, and responsive states when relevant.
- Keeps authenticated monitoring workflows dense enough for rapid incident triage without reducing readability, accessibility, or status clarity.
