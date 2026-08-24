# Public status page

Status pages still work as in Kuma: several pages, optional password, custom domains, groups, incidents, maintenance, badges, RSS.

The public page was rebuilt on the same design tokens as the dashboard.

<img src="images/status-page.png" alt="Public status page: All Systems Operational, then a Services list. Gizmo in the footer." width="760" />

## What looks different

- **Overall status leads.** The page used to open on one service’s incident.
- **One list, not a card per group.** The same services take less vertical space.
- **Incident severity has colour again.**

## Themes

Each status page picks Light, Dark, Auto, or a [custom theme](themes.md) stored on the instance. That choice is independent of whoever is signed in to the dashboard.

## Editing

Open the page and use **Edit** when you are signed in. That connects the dashboard Socket.IO session so you can save. Public visitors never use that socket; they load the page over HTTP.

Custom domains still need **Settings → Reverse Proxy → Trust Proxy** if Gizmo sits behind nginx or a load balancer, so `/` can match the forwarded host.
