# Multiple logins — phase one

Executes [docs/plans/multi-user.md](../plans/multi-user.md), which this work
rewrote before starting.

## What the review changed

The plan as written defined an administrator flag governing resources, opening
with "this is not a permissions system" and then describing one. Reading it
against the code turned up three things that made it unbuildable as stated.

**It contradicted the code.** The plan said monitors are not partitioned by user
and everyone sees the whole estate. `monitor` carries `user_id`, twenty-two
queries filter on it, and heartbeats broadcast to the owner's room — a second
account would have signed in to an empty dashboard that never updated.

**Its enforcement surface was eighty-four socket events, none of which checked
anything beyond being signed in.** Hiding a settings section is not a permission.

**It could not deliver the case that motivates permission systems.** It said so
itself — no read-only web access. So it paid for a permission system and left
"this person may look but not touch" unsolved, when a status page and a
`read_only` API key already solve it without accounts.

The flag now governs one thing: who may manage accounts.

## The shape of the change

`socket.userID` was assigned in exactly one place and read in eighty-seven. It
becomes the **instance owner** for every session, so every existing query and
broadcast refers to the same estate untouched. `socket.loginUserID` holds the
person, and thirteen genuinely personal sites use it: API keys, two-factor
settings, and confirming a password.

That inversion is the whole reason this was a small change rather than a rewrite.

## What went wrong, and what it cost to find

**Confirming a password would have asked everyone for the owner's password.**
`doubleCheckPassword` looked up `socket.userID`, which is now shared. Caught by
reading, fixed before it ran.

**API keys leaked to every session, and a passing test said they did not.**

Rooms are keyed by account id. The estate's room is keyed by the id of the
account that owns it — which for the first account is `1`. Its personal room was
also `1`. Every session joins the estate to see the instance, so every session
was in the owner's personal room, and the owner's API key list went to all of
them.

The source-reading test asserted the emit named `socket.loginUserID`, which it
did. The name was right and the room was wrong. It took two real sockets — one
signed in as each account — to see it: Bob received Alice's `apiKeyList`.

Personal rooms are now namespaced (`user:1`), which cannot collide with a numeric
id, and the test asserts the namespaced room rather than the variable name.

**A disabled account kept working through its API keys.** `resolveAPIKey` checked
that the key was active and unexpired, never that the account behind it still
was. Invisible with one account; a way back in after access was withdrawn with
several. Authentication now checks both, and disabling an account withdraws its
keys.

## Verification

Two accounts, end to end against a real instance:

| | |
| --- | --- |
| Alice (administrator) adds Bob | listed |
| Bob signs in | sees `alice-monitor` — the estate is shared |
| Bob opens Users | "You are not allowed to manage accounts" — refused by the server, not by a hidden menu |
| Bob calls `listUsers` and `addUser` over the socket directly | both refused |
| Bob changes his password using Alice's | "Incorrect current password" |
| Alice creates an API key | Alice receives the list, Bob does not |

Tests: eight assertions covering the identity split, the room namespacing, the
administrator gate on every account event, the last-administrator rule, and the
key withdrawal. Each was verified by breaking the thing it guards — reverting the
room to the colliding form, and removing `checkAdmin` from an event — and
watching it fail.

## Not done here

Phase two, making the estate genuinely shared rather than shared by adoption, is
not needed: adoption already achieves it. What remains unbuilt is anything the
plan lists as out of scope, and resource-level access control, which was costed
separately and is a project of its own.
