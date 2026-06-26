# Task 12 — Deepen `nodes/shared/IterateDialog.tsx` (1117 LOC)

**Type:** deepening · **Risk:** medium · **Depends on:** none · **Blast radius:** internal + `nodes/shared/IterateDialogParts.tsx` (already 395 LOC)

## The problem

The iterate dialog mixes: two inline dropdown components (`ModelPillDropdown` ~line 85, `VariationCountDropdown` ~172), small icon components (`VariationStackIcon`, `ArrowUpIcon`), a **pending-drag-grid** mechanism (`PendingDragGrid`, `GHOST_NODE_PREFIX = 'drag-ghost-'`), and the main `IterateDialog` (~245) carrying **47 hooks**. There is already a sibling `nodes/shared/IterateDialogParts.tsx` (395 LOC) — so the split was started but the main file is still 1117 LOC.

## Dependency classification

- Dropdowns, icons, grid math: **in-process** (pure UI + geometry).
- Iteration dispatch: **in-process events** + **local-API** via the generation lifecycle (shared with Task 10).

## Target seams

1. **`nodes/shared/iterate-dialog/dropdowns.tsx`** — move `ModelPillDropdown` and `VariationCountDropdown` out. They are self-contained controls; they belong beside `IterateDialogParts`, not inline.
2. **`nodes/shared/iterate-dialog/icons.tsx`** — `VariationStackIcon`, `ArrowUpIcon` (and any other inline SVGs). Trivial leaves.
3. **`lib/drag-ghost-grid.ts`** — the pending-drag-grid math (`PendingDragGrid` type, `GHOST_NODE_PREFIX`, position calculation for the ghost grid). Make the layout calc a **pure function**: `(origin, count, gridConfig) => GhostPlacement[]`. Test it directly — this is the clean in-process win.
4. **`useIterateDialogState` hook** — collapse the 47-hook tangle in the main component into one hook that owns the dialog's form state (selected model, variation count, depth, custom instructions, skill selection) and exposes a small interface to the JSX. The component becomes layout + the hook.
5. **Reconcile with `IterateDialogParts.tsx`** — fold the new files under a `nodes/shared/iterate-dialog/` folder and move `IterateDialogParts` content into cohesive part-files there, so the dialog has one home directory rather than two sibling mega-files.

## Method

- Pull the grid math out as a pure function first (highest test leverage), then the dropdowns/icons (mechanical), then the state hook (collapses the hook count).
- The dialog component should end up reading as: gather state from `useIterateDialogState`, render parts, dispatch on submit.

## Extraction gate (run after each new file)

Code moved into `nodes/shared/iterate-dialog/` or `lib/` changes import depth from the original `nodes/shared/` location. Fix every carried import **to the end of the moved block** (Operating Rule 1 — don't stop partway), then:
```
git grep -nE "from '\.\.?/(lib|nodes|prompts|hooks|components|server|ui|registry|skills|data)" -- nodes/shared/iterate-dialog/ lib/drag-ghost-grid.ts
```
Every hit must resolve. Confirm `IterateDialog.tsx` **imports** the new modules (no leftover copy) and shrank. Keep the submit payload shape exactly as-is (the canvas lifecycle, Task 10, consumes it — see deepening recipe 7).

## Verification

- Open the iterate dialog on a component node and on an iteration node.
- Pick a model (ModelPillDropdown), change variation count (VariationCountDropdown), set depth and custom instructions, submit → the correct number of skeleton nodes appear in the **ghost-grid layout** at the right positions (the extracted grid math).
- Drag-to-iterate ghost preview still positions correctly.

## Done when

The main `IterateDialog.tsx` is layout-over-`useIterateDialogState`, dropdowns/icons/grid-math live in their own modules under `nodes/shared/iterate-dialog/`, the grid math is a tested pure function, and dialog behaviour is unchanged.

## Do NOT

- Do not change the submit payload shape consumed by the generation lifecycle (Task 10 depends on it).
