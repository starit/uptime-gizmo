# Skills

Two skills for working with a running Uptime Gizmo instance. Each is a
`SKILL.md` with front matter and nothing else: the instructions reach the
instance with `curl` and an API key, so no part of them is specific to one agent
runtime, and nothing here needs this repository checked out.

Where a skill file goes is the one runtime-specific detail. Claude Code reads
them from `.claude/skills`; another agent may read them from somewhere else, or
simply be handed the file. The paths below use the Claude Code location because
it needs to say something concrete.

| Skill | Version | What it does |
| --- | --- | --- |
| [uptime-gizmo-status](uptime-gizmo-status/SKILL.md) | 1.0.1 | Reads an instance: what is monitored, what is broken and for how long, what changed, which channels and windows exist. Never writes. |
| [uptime-gizmo-sync](uptime-gizmo-sync/SKILL.md) | 1.0.5 | Creates and updates monitors, pauses and resumes them, and manages tags. Does not delete. |

## Installing one

A skill is a directory holding a `SKILL.md`. You do not need this repository
checked out. Fetch the file from GitHub into the project that should have it:

```bash
mkdir -p .claude/skills/uptime-gizmo-status
curl -fsSL -o .claude/skills/uptime-gizmo-status/SKILL.md \
  https://raw.githubusercontent.com/starit/uptime-gizmo/main/skills/uptime-gizmo-status/SKILL.md
```

The other skill is the same path with `uptime-gizmo-sync` in place of
`uptime-gizmo-status`. Current copies:

- https://github.com/starit/uptime-gizmo/blob/main/skills/uptime-gizmo-status/SKILL.md
- https://github.com/starit/uptime-gizmo/blob/main/skills/uptime-gizmo-sync/SKILL.md

If you already have this repository, copying from `skills/` works too:

```bash
mkdir -p /path/to/your-project/.claude/skills
cp -r skills/uptime-gizmo-status /path/to/your-project/.claude/skills/
```

Then set the two variables the skills read:

```bash
export UPTIME_GIZMO_URL=https://uptime.example.com
export UPTIME_GIZMO_API_KEY=uk1_...
```

Create the key under **Settings → API Keys**. Give an agent a **read-only** key
unless it genuinely needs to change your monitoring; new keys are read-only by
default, and the API refuses a write from one regardless of which skill is
loaded.

## Versioning

Each skill carries a `version` in its front matter, and the table above repeats
it. They are versioned independently, because they are copied independently: a
project may hold `uptime-gizmo-status` for a year while `uptime-gizmo-sync`
gains fields.

The number describes the skill, not the server. A new monitor type or field
appearing in the API is a minor bump in the skill that documents it; a change in
what a skill tells an agent to *do* — an endpoint that moved, a rule that
reversed — is a major one.

## Updating a copy

The file in `.claude/skills` is a snapshot. It does not update itself. Re-fetch
it from GitHub and compare the `version` in the front matter:

```bash
curl -fsSL -o .claude/skills/uptime-gizmo-sync/SKILL.md \
  https://raw.githubusercontent.com/starit/uptime-gizmo/main/skills/uptime-gizmo-sync/SKILL.md
```

Same URL as install. If the GitHub copy's version is newer, the local file was
the stale one.

## They live here, not in `.claude/`

An agent working *on* this repository would auto-load anything in `.claude/skills`
— that is where Claude Code looks. These sit in a top-level `skills/` directory
instead, because they are a **product of this repository rather than tooling for
developing it**: the audience is somebody else's project. Nothing here loads them
automatically, which is the intended consequence — an agent editing Uptime Gizmo
should not silently gain the ability to reconfigure a production instance.

To use them while working on this repository, copy or link one into
`.claude/skills` the same way any other project would.
