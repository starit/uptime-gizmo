# Multi-user plan

## Objective

Let more than one person sign in to an Uptime Gizmo instance, with their own
password, and distinguish administrators from everyone else.

**Deliberately minimal.** This is not a permissions system. Teams that need
per-resource access control, groups, SSO, or audited delegation should use a
platform built for that; trying to grow one here would cost more than it is
worth and would complicate every route in the product.

## Current state

`user` exists as a table and `User` as a model, but there is no way to create a
second account: no `addUser` or `listUsers` socket handler, no user management
UI, and no role column. Every authenticated session has full authority.

The API-key table hangs off `user_id` already, so keys are per user in the
schema even though there is only ever one user.

## The whole model

Two flags. Nothing else.

| Carried by | Flag | Meaning |
| --- | --- | --- |
| User | `admin` | May manage users, notifications, integrations, and API keys |
| API key | `read_only` | The key may issue `GET` requests and nothing else |

Effective authority is the intersection. A key never exceeds its owner; a
read-only key is read-only whoever owns it.

That is the complete permission model, and it is the same one
[the MCP plan](mcp-and-agent-api.md) depends on.

### What an admin can do that a non-admin cannot

- Create, disable and delete users
- Change another user's password
- Manage notification channels, proxies, Docker hosts and remote browsers
- Manage API keys belonging to other users
- Change instance settings, including the AI credentials

### What every signed-in user can do

- Create and manage monitors, tags, maintenance windows and status pages
- Manage their own password and their own API keys
- See everything the instance monitors

**Monitors are not partitioned by user.** An instance watches one estate, and
everyone signed in can see all of it. Hiding monitors between colleagues is the
kind of requirement that belongs on a different platform.

## Migration

- Add `admin` to `user`, defaulting to false.
- The existing account becomes an admin, since it is the only one and has always
  had full authority.
- An instance must always keep at least one admin; the last one cannot be
  demoted or deleted.

## UI

A Users section under Settings, visible to admins only:

- List of users with their admin flag and active state
- Create a user with a username and initial password
- Toggle admin, disable, delete
- Reset another user's password

Every user, admin or not, keeps the existing Security page for their own
password and two-factor settings.

## What this plan explicitly does not add

- Per-monitor or per-status-page access control
- Groups, teams, or roles beyond the admin flag
- SSO, LDAP, OAuth or SCIM
- An audit log
- Email invitations or self-registration

Each of these is a reasonable thing to want and none of them is reasonable to
bolt onto this model. If one becomes necessary, it should be designed as its own
change with its own justification, not smuggled in as an extension of the admin
flag.

## Open questions

- **Whether a non-admin should be able to delete a monitor someone else made.**
  Consistent with "one estate, everyone sees it" they should; the risk is that
  it is unrecoverable and unattributed without an audit log.
- **What happens to a disabled user's API keys.** Disabling the key alongside
  the account is the safe default, but it should be stated rather than implied.
- **Whether 2FA should be enforceable by an admin,** or remain each user's own
  choice.
