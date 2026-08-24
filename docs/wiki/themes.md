# Themes

Light, dark, and auto still live in this browser (**Settings → Appearance**). **Custom themes live on the instance** and are offered to everyone who signs in.

<img src="images/dashboard-dark.png" alt="Dashboard in dark theme, using the rebuilt token system." width="760" />

A custom theme is a palette layered over the built-in light or dark baseline. Which baseline is chosen from the theme’s own background, so a light theme stays light even if you picked Dark above.

## Add a theme

**Settings → Appearance:**

- **Import** JSON from another instance or written by hand.
- **Generate** from a sentence, if an administrator has configured **Settings → AI**.

Generation runs on the server. The LLM API key never reaches the browser. Only an administrator may change the AI provider, key, model, or base URL — generating a theme sends that key as a Bearer token, so changing the base URL could send it somewhere else.

No provider is required. With none selected, the instance contacts no AI service.

## Contrast gate

Every custom theme is measured against [DESIGN.md](../../DESIGN.md): **4.5:1** for text, **3:1** for indicators and controls. A palette that fails is not stored and not applied. Generation retries up to three times if the model returns something that misses the floor.

## Where it applies

- Workspace: pick the theme in Appearance (this browser).
- Public status pages: each page has its own theme selector, including custom ones. The public page does not follow the dashboard theme.

Hover states, muted fills, and status tints are derived from the sixteen colours the theme supplies. You do not set them by hand.
