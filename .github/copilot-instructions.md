# Copilot instructions for Uptime Gizmo

Read [AGENTS.md](../AGENTS.md) and [CLAUDE.md](../CLAUDE.md) first. They are the
contribution and code-agent guide for this repository, and they win wherever
this file disagrees with them. What follows is the short orientation and the
handful of things that are easy to get wrong.

## Review behaviour

- Check spelling.
- Do not print a "Pull Request Overview" section.
- Say nothing if there is nothing wrong.

## What this is

A self-hosted monitoring platform, forked from
[Uptime Kuma](https://github.com/louislam/uptime-kuma). Vue 3 frontend, Node.js
and Express backend, Socket.IO for live updates, SQLite by default with MariaDB
and MySQL supported.

The fork adds a REST API under `/api/v1`, an MCP server in `mcp-server/`,
on-chain monitors, and a rebuilt interface. Most backend logic still arrives
over Socket.IO rather than REST, so look in `server/socket-handlers/` before
assuming an endpoint exists.

- **Frontend**: Vue 3, Vite, Tailwind, Chart.js. Bootstrap has been removed;
  do not reintroduce it or any of its class names.
- **Styling**: design tokens only. [DESIGN.md](../DESIGN.md) is the source of
  truth for colour, radius, weight, status palette, density and accessibility.
  A hard-coded hex in a component is a review comment.
- **Package manager**: pnpm, pinned by `packageManager` in `package.json`. Never
  npm or yarn. `.npmrc` also sets a minimum release age on dependencies; adding
  an exemption is a decision to raise in review, not a fix for a failing
  install.

## Commands

```bash
corepack enable pnpm
pnpm install --frozen-lockfile   # always --frozen-lockfile, in CI and locally

pnpm run dev                     # frontend :3000, backend :3001
pnpm run lint                    # eslint + stylelint
pnpm run tsc                     # must pass; it is clean today
pnpm run build                   # writes dist/
pnpm run test-backend            # run pnpm run build first
```

## Layout

```
server/                  Backend
  model/                 Database models, auto-mapped to tables
  monitor-types/         One file per monitor type
  notification-providers/
  routers/               Express routers, including the REST API
  socket-handlers/       Socket.IO handlers, where most logic lives
  uptime-gizmo-server.js Main server logic
src/                     Vue 3 frontend
  components/gizmo/      The shared design-system components
  pages/, components/, lang/
  assets/tokens.scss     The design tokens DESIGN.md documents
  theme/theme-bridge.ts  The only file that knows themed.js exists
db/knex_migrations/      Migrations
mcp-server/              MCP server, its own package and process
docs/plans/              Design notes for the larger pieces
test/backend-test/, test/e2e/
```

## Code style

Enforced by `.eslintrc.js` and `.stylelintrc`, so run the linters rather than
arguing from memory. Four spaces, double quotes, LF, semicolons. JSDoc on every
function. camelCase in JS and TS, snake_case in SQLite, kebab-case in CSS.

Prefer TypeScript for new modules and for Vue component logic. Existing
JavaScript migrates incrementally; do not convert a file as a side effect of an
unrelated change.

## Translations

This fork has no Weblate. Add keys to `src/lang/en.json`, and translate them by
hand in the same change for the languages the fork carries its own strings in:
`zh-CN`, `zh-TW`, `fr-FR`, `de-DE`, `es-ES`, `pt-BR`, `ru-RU`, `ja`, `ko-KR`.

Check placeholders against the English source. Several strings carry `{0}` and
`{1}`, and a dropped one renders as literal braces in front of a user.

## Adding a monitor type

1. `server/monitor-types/TYPE.js`
2. Register it in `server/uptime-gizmo-server.js`
3. `src/pages/EditMonitor.vue` for the form
4. `src/lang/en.json`, plus the translations above

## Adding a notification provider

1. `server/notification-providers/PROVIDER.js`
2. Register in `server/notification.js`
3. `src/components/notifications/PROVIDER.vue`
4. Register in `src/components/notifications/index.js`
5. Add it to `src/components/NotificationDialog.vue`
6. `src/lang/en.json`, plus the translations above

## Things that catch people out

- The Docker image does not build the frontend. `docker/dockerfile` expects
  `dist/` to exist in the build context, so run `pnpm run build` on the host
  first. It fails with a message rather than shipping an interface-less image.
- `pnpm run test-backend` has one pre-existing failure, an IDN punycode test in
  `test/backend-test/test-util-server.js`. It is not yours.
- `pnpm run lint:style` has one pre-existing error in `MonitorListItem.vue`.
- Never commit `data/`, `dist/`, `tmp/`, `private/` or `node_modules/`.
- Backing up means copying the data directory, and one way of doing it loses
  data silently. See [docs/backup-and-restore.md](../docs/backup-and-restore.md).
