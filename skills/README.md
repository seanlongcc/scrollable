# Repo-Local Skills

This directory vendors the Codex skills referenced by this repository so other
developers can inspect or install the same guidance without relying on one
machine's global Codex or plugin cache.

`docs/agent/skills.md` remains the task-to-skill index. This directory is the
repo-local source copy for those entries.

## Layout

- `system/` - bundled Codex system skills used by this repo.
- `standalone/` - standalone skills from the developer skill directory.
- `supabase/` - Supabase-specific skills.
- `plugins/browser-use/` - Browser Use plugin skills.
- `plugins/superpowers/` - Superpowers plugin skills.
- `plugins/vercel/` - Vercel plugin skills.

## Name Mapping

Namespaced skills map to source folders like this:

- `browser-use:browser` -> `skills/plugins/browser-use/browser/SKILL.md`
- `superpowers:<name>` -> `skills/plugins/superpowers/<name>/SKILL.md`
- `vercel:<name>` -> `skills/plugins/vercel/<name>/SKILL.md`

Standalone skill names map directly to either `skills/standalone/<name>/SKILL.md`,
`skills/system/<name>/SKILL.md`, or `skills/supabase/<name>/SKILL.md`.

## Updating

When `docs/agent/skills.md` adds or removes a skill, update this directory in
the same change. Copy the full skill folder, not only `SKILL.md`, because skills
may depend on bundled `references/`, `scripts/`, or `assets/`.
