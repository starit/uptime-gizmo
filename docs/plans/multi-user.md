# Multiple logins

## Objective

Let more than one person sign in to an Uptime Gizmo instance with their own
password, without sharing an account.

**This is multi-login, not multi-tenancy.** Everyone who can sign in sees and
manages the whole estate, exactly as the single account does today. The name
matters: calling it multi-user invites the assumption that it isolates people
from each other, and it does not.

## What replaced the earlier plan, and why

An earlier version of this plan defined an admin flag that governed resources:
administrators could manage notification channels, proxies, integrations and
other people's API keys, and everyone else could not. It opened by saying "this
is not a permissions system" and then described one.

That tension was the reason to change it. A resource-level split is not free
once, it is a tax forever: every feature added afterwards has to answer "can a
non-admin do this?", and forgetting to ask produces no error. Adding the two Web3
monitor types introduced four socket events that never had to consider it. Under
that plan, each would have.

What the tax buys is worth naming precisely: **not** read-only access for a
person. That plan could not have delivered "this contractor may look but not
touch" — it said so itself — so it paid the cost of a permission system and
still left the case that motivates permission systems unsolved.

Read-only access already exists twice over, without accounts: a status page shows
a chosen set of monitors, optionally behind a password, and an API key marked
`read_only` is refused on every mutating route.

So the admin flag keeps one job, and only one: **who may manage accounts.**

## The model

| Carried by | Flag | Meaning |
| --- | --- | --- |
| User | `admin` | May create, disable and delete accounts |
| API key | `read_only` | The key may read and nothing else |

An account is a way to sign in. It owns nothing except its own password, its own
two-factor settings, and its own API keys.

Monitors, tags, notification channels, proxies, Docker hosts, remote browsers,
Web3 networks, maintenance windows and status pages belong to **the instance**.
Every signed-in person sees all of them and may change all of them, which is what
the single account can do today and therefore introduces no new question about
any existing feature.

## How the estate stays shared

The resource tables carry `user_id`, and roughly ninety places filter on it. The
change does not touch them.

`socket.userID` is assigned in exactly one place, at login. It becomes the
**instance owner** — one account, recorded in settings — for every session. Every
existing query and every existing broadcast then refers to the same estate
without being edited, which is what keeps this change small enough to review.

The session's real account is kept beside it as `socket.loginUserID`, and only
the handful of genuinely personal paths use it:

- API keys, which are per account
- Changing one's own password
- Two-factor settings

Rooms follow the same split. A socket joins the instance owner's room, so every
broadcast keyed on a resource's owner reaches everyone; it also joins its own
account's room, so anything addressed to one person still reaches only them.

**The direction of failure matters here.** Sending a personal list to the shared
room would leak it; sending a shared list to one room would only mean somebody's
screen stops updating. The personal paths are therefore enumerated explicitly and
covered by a test that connects two sessions and asserts, per event, who receives
it.

### Deleting the instance owner

Resources point at that account, so it cannot simply disappear. Deleting it
reassigns every resource to another administrator first, and is refused when
there is no other administrator — which is the same rule that stops the last
administrator being removed.

## Migration

- `user.admin` and `api_key.read_only` already exist.
- Record the existing account as the instance owner. It already owns everything,
  so nothing is reassigned.

## What an administrator does

Create an account, set its initial password, toggle its administrator flag,
disable it, delete it, and reset someone else's password. That is the whole list,
and those are the only events that check the flag.

Everyone, administrator or not, keeps the existing Security page for their own
password and two-factor settings, and their own API keys.

## A disabled account's API keys

`resolveAPIKey` checks that the key is active and unexpired. It does not check
that the account behind it still is, so disabling someone today leaves their keys
working. With one account that is invisible; with several it is a way back in
after access was withdrawn. Authentication has to consider both.

## What this explicitly does not add

- Per-monitor or per-status-page access control
- Read-only access to the web interface
- Groups, teams, or roles beyond the administrator flag
- SSO, LDAP, OAuth or SCIM
- An audit log
- Email invitations or self-registration

Resource-level access control was costed against this codebase: forty-six query
sites, seventeen public HTTP entry points, and — the part that dominates — a
broadcast layer that would have to move from a room per account to a room per
monitor, with sockets re-subscribing whenever permissions change. It is a
separate project with its own design, not an extension of this one.

The case for it is narrower than it first appears. It is needed only when someone
must sign in, may change part of the estate, and must be kept away from the rest.
"Let this person see these services" is a status page.
