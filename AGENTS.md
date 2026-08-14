# AGENTS.md
- Choose the simplest implementation that fully meets the current requirements. Avoid speculative abstractions, configuration, and indirection.
- Do not preserve backward compatibility. Remove obsolete paths instead of adding compatibility layers, fallbacks, or migrations.

- Keep components modular and concerns clearly separated.

- Prefer established, well-maintained libraries when they reduce overall complexity or improve reliability. Do not reimplement common functionality without a clear reason.

- Lean on the dependencies already in the project before writing your own implementation or adding packages. Do not assume a library lacks a capability without checking its documentation and types.
- 
> **your response should only be about what is present and does work.** An absence carries no information — a non-event, or something a constraint removed, is noise, and stating it costs a longer, harder-to-parse sentence than the fact deserves. Two things still earn a line: a missing piece a reader would otherwise hunt for, and an idea worth stopping someone from re-proposing.

- if i did point out something that i don't like such like the agent defaulting to preserving for backward compatability or jumping into conclusion before reading the documentation)
or not liking some of the way you phrase stuff
for example (How we redesigned the Magic Patterns chat thread — and the two things we refused to compromise on.) or (This isn't X. This is Y.) if any of these could be added in agents.md provide suggestions it at the end of your response

- Don't read DRAFT.md it's my personal scratchpad

# AGENTS.md


Guidance for working in this repository.
**Source of truth:** follow [`CLAUDE.md`](./CLAUDE.md). This file exists so agent runners that look for `AGENTS.md` find the same guidance. Do not diverge the two — edit `CLAUDE.md` and keep this pointer.

## Writing things down

> **Record only what is present and does work.** An absence carries no information — a non-event, or something a constraint removed, is noise, and stating it costs a longer, harder-to-parse sentence than the fact deserves. Two things still earn a line: a missing piece a reader would otherwise hunt for, and an idea worth stopping someone from re-proposing.

## Quick facts (must match CLAUDE.md)

- **Agent CLI:** Claude Code only (`claude`) **for now** — a maintenance choice, not a commitment; more agents are planned. Still no provider registry and no `shared/lib/providers/`: don't pre-build the abstraction, just keep CLI knowledge inside `shared/lib/agent-config.ts` and process concerns inside `server/lib/spawn-agent.ts` so a second agent stays a contained change. `--max-budget-usd` is deliberately not exposed.
- **Events:** no window `CustomEvent` is dispatched anywhere. Use a callback, a `shared/stores/` zustand store, or `generation-events`.
- **Frontend:** React mounted from `dev-entry.tsx` → `<PlaygroundClient />`. No `react-router-dom`.
- **Selection:** inline DOM (`useElementSelection` + `element-context`). No iframes, no penpal.
- **Stream parser:** `server/lib/claude-jsonl.ts`.
- **Docs:** `.claude/specs/` is the source of truth for post-cleanup work, split per feature for a Fable audit. `.claude/research/` is a frozen archive, not a source of truth. `.claude/ROADMAP.md` holds open work plus the "how we work" process decisions.
- **Model helper:** `shared/lib/model-selection.ts`.
- **Spawn:** `server/lib/spawn-agent.ts` (server-only). Config: `shared/lib/agent-config.ts`.
- **Checks:** `bun run check:architecture` (dependency-cruiser + knip triage + host typecheck reminder).

See `CLAUDE.md` for directory layout, Hono conventions, setup, and gotchas.
