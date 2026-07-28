# AGENTS.md

Guidance for working in this repository.

**Source of truth:** follow [`CLAUDE.md`](./CLAUDE.md). This file exists so agent runners that look for `AGENTS.md` find the same guidance. Do not diverge the two — edit `CLAUDE.md` and keep this pointer.

## Quick facts (must match CLAUDE.md)

- **Agent CLI:** Claude Code only (`claude`). No Codex, no multi-provider registry, no `shared/lib/providers/`.
- **Frontend:** React mounted from `dev-entry.tsx` → `<PlaygroundClient />`. No `react-router-dom`.
- **Selection:** inline DOM (`useElementSelection` + `element-context`). No iframes, no penpal.
- **Stream parser:** `server/lib/claude-jsonl.ts`.
- **Docs:** there is no `docs/` directory. Plans live under `.claude/plans/`.
- **Model helper:** `shared/lib/model-selection.ts`.
- **Spawn:** `server/lib/spawn-agent.ts` (server-only). Config: `shared/lib/agent-config.ts`.
- **Checks:** `bun run check:architecture` (dependency-cruiser + knip triage + host typecheck reminder).

See `CLAUDE.md` for directory layout, Hono conventions, setup, and gotchas.
