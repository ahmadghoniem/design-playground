Stack: React 19 + TS. `@/` alias + shared/ + features/{providers,generation} exist. Client imports are `@/`-absolute.

TASK: Create `features/iterations/` and move the iteration-node + adopt/scan subsystem into it, updating all `@/`-import references.

`git mv` into `features/iterations/`:
- `nodes/IterationNode.tsx`               → `features/iterations/nodes/IterationNode.tsx`
- `nodes/SkeletonIterationNode.tsx`       → `features/iterations/nodes/SkeletonIterationNode.tsx`
- `nodes/shared/IterateDialog.tsx`        → `features/iterations/IterateDialog.tsx`
- `nodes/shared/iterate-dialog/dropdowns.tsx`        → `features/iterations/iterate-dialog/dropdowns.tsx`
- `nodes/shared/iterate-dialog/parts.tsx`            → `features/iterations/iterate-dialog/parts.tsx`
- `nodes/shared/iterate-dialog/useIterateDialogState.ts` → `features/iterations/iterate-dialog/useIterateDialogState.ts`
- `hooks/useIterationScan.ts`             → `features/iterations/useIterationScan.ts`
- `hooks/useIterationAdoption.ts`         → `features/iterations/useIterationAdoption.ts`
- `hooks/useDragToIterate.ts`             → `features/iterations/useDragToIterate.ts`
- `lib/iteration-filename.ts`             → `features/iterations/iteration-filename.ts`

Then update every reference repo-wide:
- `@/nodes/IterationNode` → `@/features/iterations/nodes/IterationNode`
- `@/nodes/SkeletonIterationNode` → `@/features/iterations/nodes/SkeletonIterationNode`
- `@/nodes/shared/IterateDialog` → `@/features/iterations/IterateDialog`
- `@/nodes/shared/iterate-dialog/<x>` → `@/features/iterations/iterate-dialog/<x>`
- `@/hooks/useIterationScan` → `@/features/iterations/useIterationScan`
- `@/hooks/useIterationAdoption` → `@/features/iterations/useIterationAdoption`
- `@/hooks/useDragToIterate` → `@/features/iterations/useDragToIterate`
- `@/lib/iteration-filename` → `@/features/iterations/iteration-filename`

CONSTRAINTS:
- `app/PlaygroundCanvas.tsx` (soon to be `features/canvas/`) imports `useDragToIterate` and the
  iteration node types. This is a KNOWN canvas→iterations coupling; leave the import working via
  the new path. Do NOT try to eliminate it here — plan 11 documents it as a reviewed edge.
- No server import references these files — do NOT touch server in this plan.
- No logic change. `git mv` only.

VERIFY:
- `grep -rn "@/nodes/IterationNode\|@/nodes/SkeletonIterationNode\|@/nodes/shared/IterateDialog\|@/nodes/shared/iterate-dialog\|@/hooks/useIteration\|@/hooks/useDragToIterate\|@/lib/iteration-filename" --include=*.ts --include=*.tsx .` → no matches.
- `ls features/iterations features/iterations/nodes features/iterations/iterate-dialog` shows the moved files.
