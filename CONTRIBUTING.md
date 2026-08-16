# Contributing to Uptime Gizmo

Thank you for helping improve Uptime Gizmo. Please read the [Code of Conduct](CODE_OF_CONDUCT.md) and [Security Policy](SECURITY.md) before contributing.

## Before you start

For a bug fix or small improvement, you can open a pull request directly. For a new feature, architecture change, or breaking change, open an issue first so the scope and design can be discussed.

Keep each change focused and reviewable. Avoid unrelated refactors, dependency upgrades, formatting churn, or changes to behavior that are not part of the request.

## Development setup

Requirements:

- Node.js >= 20.4.0
- npm
- Git

```bash
git clone https://github.com/starit/uptime-gizmo.git
cd uptime-gizmo
npm install
npm run dev
```

The development frontend runs at <http://localhost:3000>. The backend runs at <http://localhost:3001>.

## Project structure

- `src/` — Vue frontend
- `server/` — Node.js backend
- `config/` — development and test configuration
- `db/` — database initialization and migrations
- `docker/` — Docker build and development files
- `extra/` — maintenance and utility scripts
- `public/` — frontend assets
- `test/` — backend and end-to-end test support

## Making changes

- Read the surrounding code before editing it.
- Reuse existing components, utilities, styles, and APIs where possible.
- Preserve existing behavior unless the change explicitly requires otherwise.
- Add or update translations in `src/lang/en.json` when adding user-facing text.
- Do not commit secrets, credentials, local configuration, generated build output, or unrelated assets.
- For UI changes, consider loading, empty, error, mobile, and accessibility states.
- For monitoring and notification changes, include tests and explain how the behavior was verified.

## Verification

Run the checks relevant to your change:

```bash
npm run lint
npm run build
npm test
```

`npm test` runs backend and end-to-end tests and may require additional local services or browser dependencies. If a check cannot be run, state the reason in the pull request.

Before submitting, review the final diff for accidental changes, stale documentation, debug code, and missing tests.

## Pull requests

Pull requests should include:

- A short description of the problem and solution
- The relevant issue or design discussion, when applicable
- Tests or manual verification performed
- Screenshots or recordings for meaningful UI changes
- Notes about configuration, migration, compatibility, or security impact

Keep commits and pull requests understandable. Maintainers may request changes to simplify the implementation or align it with the project's direction.

## Coding style

- Follow `.editorconfig`, ESLint, Stylelint, and the existing code style.
- Use four spaces where the project style requires indentation.
- Use camelCase for JavaScript and TypeScript names.
- Use snake_case for SQLite names.
- Use kebab-case for CSS and SCSS names.
- Use clear names and comments only where they explain non-obvious behavior.

## Security issues

Do not report security vulnerabilities in a public issue or pull request. Follow the [Security Policy](SECURITY.md) instead.
