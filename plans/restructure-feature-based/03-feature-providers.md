Stack: React 19 + TS. `@/` alias + shared/ layer exist. Client imports are `@/`-absolute.

TASK: Create `features/providers/` and move the provider subsystem into it, updating all `@/`-import references.

`git mv` these into `features/providers/` (keep the `providers/` subfolder flat — move files to `features/providers/<name>`):
- `lib/providers/index.ts`      → `features/providers/index.ts`
- `lib/providers/claude-code.ts`→ `features/providers/claude-code.ts`
- `lib/providers/registry.ts`   → `features/providers/registry.ts`
- `lib/providers/spawn-agent.ts`→ `features/providers/spawn-agent.ts`
- `lib/providers/types.ts`      → `features/providers/types.ts`
- `lib/resolve-agent-model.ts`  → `features/providers/resolve-agent-model.ts`

Then update every reference repo-wide:
- `@/lib/providers/<x>` → `@/features/providers/<x>`
- `@/lib/providers` (barrel) → `@/features/providers`
- `@/lib/resolve-agent-model` → `@/features/providers/resolve-agent-model`

CONSTRAINTS:
- `server/routes/design.ts`, `discover.ts`, `generate.ts`, `models.ts` import providers via
  `@/lib/providers` (converted in plan 01). Update those server `@/` specifiers to
  `@/features/providers` too — string-only edit, no other server change.
- `DEFAULT_PROVIDER_ID` is re-exported from `@/shared/lib/constants` — do not change that re-export chain, just its import path if referenced.
- No logic change. `git mv` only.

VERIFY:
- `grep -rn "@/lib/providers\|@/lib/resolve-agent-model" --include=*.ts --include=*.tsx .` → no matches (client AND server).
- `ls features/providers` shows the 6 files.
- `grep -rn "@/features/providers" --include=*.ts --include=*.tsx . | head` shows updated importers.
