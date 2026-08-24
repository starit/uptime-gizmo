# Multiple logins

More than one person can sign in, each with their own password.

**This is not multi-tenancy.** Everyone who can sign in sees and manages the **whole instance**: the same monitors, notifications, proxies, Web3 networks, and status pages. Accounts separate passwords, not data.

## Who may manage accounts

**Settings → Users** (administrators only). An administrator can create an account, set its password, promote or demote the administrator flag, disable or enable, reset someone else’s password, and delete an account.

The administrator flag governs **accounts**, and the **AI credential** settings (because those send an API key to a URL). It does not hide monitors from anyone.

Everyone still has **Settings → Security** for their own password and 2FA, and **Settings → API Keys** for their own keys.

## What this does not add

- Per-monitor or per-status-page access control
- A read-only login for the web UI

To let someone **watch without touching**, give them a public status page (optionally password-protected) or a [read-only API key](rest-api.md).

## Disabling someone

A disabled account cannot sign in, and its API keys stop working.

The first account on the instance owns the estate in the database. Deleting that account is refused unless another administrator exists, and resources are reassigned first.

## LLM settings

Only an administrator may write **Settings → AI**. The stored base URL must be HTTPS (HTTP is allowed only on localhost) and must not point at link-local or cloud-metadata addresses.
