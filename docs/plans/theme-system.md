# Theme system plan

## Objective

Give Uptime Gizmo multiple themes, including ones generated from a natural
language description, without loosening the accessibility rules in
[DESIGN.md](../../DESIGN.md) and without coupling 199 components to a
third-party library.

## Target architecture

```text
themed.js Theme (16 colours)
        ↓  src/theme/theme-bridge.ts   ← the only file that knows themed.js exists
--color-* / --status-*  (tokens.scss contract)
        ↓
Gizmo recipes and 199 components — unchanged
```

- **`tokens.scss` stays the source for the built-in light and dark themes.**
  themed.js models a palette as sixteen colours, which cannot express the
  roughly sixty tokens here — in particular the per-status foreground,
  background and border triples, hand-picked to clear WCAG AA. Forcing the
  built-ins through that model would flatten them.
- **themed.js supplies *additional* themes,** layered over whichever built-in
  baseline matches their brightness. Brightness is derived from the background
  rather than declared, so a generated theme lands correctly without knowing
  this project's conventions.
- **The bridge is the seam.** `@themed.js/core` is 0.2.0 and its API may move;
  replacing or upgrading it is a change to one file.

## Storage decisions

| Thing | Where | Why |
| --- | --- | --- |
| LLM credentials | `setting` table, instance-wide | Matches how `steamAPIKey` and `globalpingApiToken` are already stored. The product has no user roles today, so per-user credentials would invent a concept it does not have. |
| Theme definitions | `setting` table, instance-wide | Generating one costs an API call; losing it on a browser change would be wasteful, and a team should share the same set. |
| Which theme is active | `localStorage` | Matches how light/dark already works, and lets two people on one instance see different themes. |
| Status page theme | Per status page, server-side | Already exists and must keep working. Custom themes have to appear in that selector too. |

## Accessibility is a gate, not a guideline

`DESIGN.md` requires WCAG AA: 4.5:1 for body text, 3:1 for UI components. A
generated palette optimises for looking pleasant, not for being legible.

`findContrastFailures()` in the bridge checks body, muted text, links, and every
status foreground and indicator. **No generated theme reaches the document
without passing it.** Without that, an AI theme button is a one-click way to
produce an interface that violates the project's own standard.

## Phases

### Phase 1 — LLM credentials

**Status:** Complete on 2026-08-18. Provider, key, model and base URL under
`/settings/ai`. Nothing is enabled by default; with no provider selected the
instance contacts no AI service. Field shape and provider defaults were read out
of themed.js rather than guessed.

### Phase 2 — Bridge and theme pipeline

**Phase 2a status:** Complete on 2026-08-18. `src/theme/theme-bridge.ts` with
the token mapping and the contrast gate. Sixteen colours in, thirty-seven
variables out.

**Phase 2b:** Not started.

1. Persist theme definitions in the `setting` table and load them over the
   existing socket settings path.
2. Extend the Appearance selector from Light/Dark/Auto to every registered
   theme, keeping the active choice in `localStorage`.
3. Extend the status page theme selector the same way, preserving its
   independence from the workspace theme.

**Exit criteria:** a custom theme can be added, selected, and applied to both
the workspace and a status page, in both baselines, with no component changes.

### Phase 3 — AI generation

Not started.

1. A prompt field and generate action in Appearance, hidden when no provider is
   configured.
2. `generateTheme(prompt)` through themed.js, using the stored credentials.
3. **The result goes through `findContrastFailures()` before it can be applied.**
   A failing theme is reported with the offending pairs rather than silently
   accepted.
4. Generated themes are saved alongside hand-written ones.

**Exit criteria:** a described theme can be generated, is rejected when it fails
contrast, and is indistinguishable from a hand-written theme once saved.

## Guardrails

- Never let a theme reach the document without passing the contrast gate.
- Keep `--color-*` as the contract. Components must not learn about themed.js.
- AI features stay optional and off by default; an operator who configures no
  provider must see no outbound AI traffic and no dead UI.
- The API key is stored in plain text in the database, like the other
  credentials. Say so in the interface rather than implying otherwise.
- Preserve the status page's independent theme.

## Verification matrix

- Both baselines, and a custom theme over each.
- Workspace and status page, whose themes are set separately.
- Contrast gate: a known-good theme passes, a known-bad theme is rejected with
  the failing pairs named.
- Reload persistence: definitions from the server, selection from the browser.
- No provider configured: no AI UI, no outbound request.
