# Uptime Gizmo Agent Guide

Uptime Gizmo is a self-hosted monitoring project based on Uptime Gizmo. Its direction is to provide richer monitoring, modern status pages, and safe integrations for automation and AI agents.

## Working principles

- Use AI as an assistant for understanding, implementation, and review—not as a substitute for maintainer judgment.
- Inspect the relevant code, documentation, configuration, and existing tests before changing anything.
- Keep changes focused on the requested outcome. Do not perform unrelated cleanup, dependency upgrades, rewrites, or formatting churn.
- Preserve existing behavior unless the request explicitly changes it.
- Treat plans and future features as plans. Do not document an idea as implemented until the code supports it.
- Never expose secrets, credentials, private data, or local machine details in code, logs, commits, or documentation.

## Implementation rules

- Prefer the smallest clear change that solves the problem.
- Follow the surrounding JavaScript, Vue, CSS, and project conventions.
- Treat [DESIGN.md](DESIGN.md) as the source of truth for brand assets, color tokens, themes, status colors, accessibility, and UI implementation rules.
- Reuse existing components, utilities, APIs, and styles before introducing new abstractions.
- Use `apply_patch` for hand-written file edits.
- Do not delete, reset, or overwrite user changes. If work overlaps with existing changes, stop and explain the conflict.
- Do not make external changes, publish releases, push branches, or open pull requests unless explicitly requested.

## Verification

- Run the narrowest relevant test, lint, build, or documentation check after editing.
- For UI changes, verify the affected screen at an appropriate viewport and check loading, empty, error, and responsive states when relevant.
- Review the final diff for accidental changes, stale claims, debug code, and missing documentation.
- Report what was changed, what was verified, and any checks that could not be run.

## Documentation

- Keep README and project documentation concise, accurate, and explicit about current versus planned functionality.
- Use project-specific names and links; remove copied upstream instructions that do not apply to Uptime Gizmo.
- Explain user-visible behavior and setup requirements without inventing unsupported features.
- Update [DESIGN.md](DESIGN.md) when a deliberate visual-system, logo, token, or accessibility decision changes.
