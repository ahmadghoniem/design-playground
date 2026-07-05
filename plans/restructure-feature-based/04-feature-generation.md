Stack: React 19 + TS. `@/` alias + shared/ + features/providers exist. Client imports are `@/`-absolute.

TASK: Create `features/generation/` (the agent-generation subsystem) and move its hooks + all prompt templates into it, updating all `@/`-import references.

--- hooks ---
`git mv` into `features/generation/`:
- `hooks/useGenerationCoordination.ts` → `features/generation/useGenerationCoordination.ts`
- `hooks/useGenerationLifecycle.ts`    → `features/generation/useGenerationLifecycle.ts`

--- prompts (all 16 templates + shared helpers) ---
`git mv` the ENTIRE `prompts/` directory contents into `features/generation/prompts/`:
- adopt.prompt.ts, create-page.prompt.ts, discovery-analyze.prompt.ts, discovery.prompt.ts,
  edit.prompt.ts, element-iteration.prompt.ts, freeform-reference.prompt.ts, html-adopt.prompt.ts,
  html-iteration-from-iteration.prompt.ts, html-iteration.prompt.ts, iteration-from-iteration.prompt.ts,
  iteration.prompt.ts, jsx-iteration-from-iteration.prompt.ts, jsx-iteration.prompt.ts,
  shared-sections.ts, utility.ts
- Each → `features/generation/prompts/<same-name>`

Then update every reference repo-wide:
- `@/hooks/useGenerationCoordination` → `@/features/generation/useGenerationCoordination`
- `@/hooks/useGenerationLifecycle` → `@/features/generation/useGenerationLifecycle`
- `@/prompts/<x>` → `@/features/generation/prompts/<x>`

CONSTRAINTS:
- `server/routes/discover.ts` imports `@/prompts/discovery.prompt` and `@/prompts/discovery-analyze.prompt`
  (converted in plan 01). Update those two server `@/` specifiers to `@/features/generation/prompts/...`
  too — string-only edit, no other server change.
- No logic change. `git mv` only.

VERIFY:
- `grep -rn "@/prompts/\|@/hooks/useGeneration" --include=*.ts --include=*.tsx .` → no matches (client AND server).
- `ls features/generation features/generation/prompts` shows the moved files.
- `grep -rn "@/features/generation/prompts/discovery" --include=*.ts server` → shows discover.ts updated.
