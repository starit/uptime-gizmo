# Uptime Gizmo brand-renaming record

Date: 2026-08-17

## Scope completed

- Replaced Uptime Kuma product copy with **Uptime Gizmo** throughout the application, notifications, language packs, project documentation, developer tools, and deployment configuration.
- Renamed the server entry module and Push helper from `uptime-kuma-*` to `uptime-gizmo-*` and updated every in-repository import and build reference.
- Updated package metadata, GitHub links, Docker image names, release tooling, and notification avatar URLs to the `starit/uptime-gizmo` project.
- Corrected the README acknowledgement so it identifies the upstream foundation without presenting it as this product.

## Deliberately retained references

The remaining `uptime-kuma` strings are only external or historical references:

- Upstream issue, pull-request, security-advisory, migration, and translation-source URLs in code comments and tests.
- Third-party provider documentation URLs and URL parameters maintained by those providers.
- The legacy Weblate project path.

Those identifiers belong to external systems and must remain unchanged for the links and integrations to work.

## Verification

- `npm run lint` completed with 10 pre-existing warnings and no errors.
- `npm run build` completed successfully.
