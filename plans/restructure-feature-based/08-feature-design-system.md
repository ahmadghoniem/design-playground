Stack: React 19 + TS. `@/` alias + shared/ + prior features exist. Client imports are `@/`-absolute.

TASK: Create `features/design-system/` and move the design-system modal + design-md pipeline into it, updating all `@/`-import references (INCLUDING two server routes that import the design-md libs).

`git mv` into `features/design-system/`:
- `components/modals/DesignSystemModal.tsx`        → `features/design-system/DesignSystemModal.tsx`
- `components/modals/design-system/ActionSection.tsx`  → `features/design-system/ActionSection.tsx`
- `components/modals/design-system/EditSection.tsx`    → `features/design-system/EditSection.tsx`
- `components/modals/design-system/ExportSection.tsx`  → `features/design-system/ExportSection.tsx`
- `components/modals/design-system/HomeSection.tsx`    → `features/design-system/HomeSection.tsx`
- `components/modals/design-system/PreviewSection.tsx` → `features/design-system/PreviewSection.tsx`
- `components/modals/design-system/SpecSection.tsx`    → `features/design-system/SpecSection.tsx`
- `components/modals/design-system/cards.tsx`          → `features/design-system/cards.tsx`
- `components/modals/design-system/useDesignSystemCli.ts` → `features/design-system/useDesignSystemCli.ts`
- `components/canvas/sidebar/DesignSystemPreviewCard.tsx` → `features/design-system/DesignSystemPreviewCard.tsx`
- `lib/design-md-helpers.ts`   → `features/design-system/design-md-helpers.ts`
- `lib/parse-design-md.ts`     → `features/design-system/parse-design-md.ts`
- `lib/run-design-md-cli.ts`   → `features/design-system/run-design-md-cli.ts`

Then update every reference repo-wide (client `.tsx/.ts`):
- `@/components/modals/DesignSystemModal` → `@/features/design-system/DesignSystemModal`
- `@/components/modals/design-system/<x>` → `@/features/design-system/<x>`
- `@/components/canvas/sidebar/DesignSystemPreviewCard` → `@/features/design-system/DesignSystemPreviewCard`
- `@/lib/design-md-helpers` → `@/features/design-system/design-md-helpers`
- `@/lib/parse-design-md` → `@/features/design-system/parse-design-md`
- `@/lib/run-design-md-cli` → `@/features/design-system/run-design-md-cli`

SERVER UPDATE (string-only, no logic/structure change):
- `server/routes/design.ts` imports `@/lib/design-md-helpers`, `@/lib/run-design-md-cli`,
  `@/lib/parse-design-md` (converted in plan 01). Update those specifiers to
  `@/features/design-system/...`.
- `server/routes/generate.ts` imports `@/lib/design-md-helpers`. Update to
  `@/features/design-system/design-md-helpers`.

CONSTRAINTS:
- No logic/JSX change. `git mv` only. Only the listed server import strings change.

VERIFY:
- `grep -rn "@/components/modals/design-system\|@/components/modals/DesignSystemModal\|@/lib/design-md-helpers\|@/lib/parse-design-md\|@/lib/run-design-md-cli\|@/components/canvas/sidebar/DesignSystemPreviewCard" --include=*.ts --include=*.tsx .` → no matches (client AND server).
- `ls features/design-system` shows the moved files.
- `grep -rn "@/features/design-system/design-md-helpers" --include=*.ts server` → shows design.ts + generate.ts updated.
