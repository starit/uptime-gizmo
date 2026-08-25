# Skills

Two Claude Code skills for working with a running Uptime Gizmo instance. They
talk to `/api/v1` with `curl` and nothing else, so an agent using them does not
need this repository checked out — only the skill file and an API key.

| Skill | Version | What it does |
| --- | --- | --- |
| [uptime-gizmo-status](uptime-gizmo-status/SKILL.md) | 1.0.0 | Reads an instance: what is monitored, what is broken and for how long, what changed, which channels and windows exist. Never writes. |
| [uptime-gizmo-sync](uptime-gizmo-sync/SKILL.md) | 1.0.0 | Creates and updates monitors, pauses and resumes them, and manages tags. Does not delete. |

## Installing one

A skill is a directory holding a `SKILL.md`. Copy the one you want into the
project that should have it:

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

## They live here, not in `.claude/`

Claude Code auto-discovers project skills in `.claude/skills`. These are in a
top-level `skills/` directory instead, because they are a **product of this
repository rather than tooling for developing it** — the audience is somebody
else's project. Nothing in this repository loads them automatically, which is
the intended consequence: an agent editing Uptime Gizmo should not silently gain
the ability to reconfigure a production instance.

To use them while working on this repository, copy or link one into
`.claude/skills` the same way any other project would.
