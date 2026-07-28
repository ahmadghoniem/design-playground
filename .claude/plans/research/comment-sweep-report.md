# Comment sweep — findings

## Confirmed stale (12)

### 1. `shared/lib/impeccable-skill.ts:14` — severity: high
**Claims:** `/** Most-used commands first — matches the IterateDialog reference UI. */`
**Reality:** `IterateDialog` and the node-level iterate affordance were removed (`e64fb01`). The command order now only feeds the chat skill picker / impeccable menus; there is no IterateDialog UI to match.
**Evidence:** `rg IterateDialog` → only this comment; commit `e64fb01` deleted IterateDialog / iterate-dialog.
**Suggested wording:** `Most-used commands first (chat skill picker order).`

### 2. `shared/ui/playground-nav-icons.tsx:92-95` — severity: high
**Claims:** `Rounded-square "open in new tab" play button — duplicated verbatim across ComponentNode and IterationNode top bars.`
**Reality:** The open-in-new-tab affordance was removed from both nodes; `PlayButtonIcon` is exported but has zero imports anywhere in the tree.
**Evidence:** `rg PlayButtonIcon` → definition only; git history of open-in removal shows both nodes dropped the import/usage.
**Suggested wording:** delete (or delete the unused export + comment together).

### 3. `server/lib/generation-lockfile.ts:9` — severity: high
**Claims:** `On module load, \`reclaimOrphan()\` should be called once to kill/clean up`
**Reality:** The exported function is `cleanupOrphanedProcess()`. `reclaimOrphan` has never existed as a symbol; `generate.ts:75` calls `cleanupOrphanedProcess()`.
**Evidence:** `rg reclaimOrphan` → only this comment; `rg cleanupOrphanedProcess` → definition + `server/routes/generate.ts` call site. File was born with the wrong name in the comment (`2c0ee67`).
**Suggested wording:** `On module load, \`cleanupOrphanedProcess()\` should be called once…`

### 4. `server/routes/generate.ts:32-39` — severity: high
**Claims:** `…so consumers that resolve the component by filename (IterationNode's live preview, the isolated preview page) see it immediately…`
**Reality:** There is no isolated preview page (router / standalone iteration page removed). IterationNode’s live preview via `iterations/index.ts` is still real; the second consumer is gone.
**Evidence:** CLAUDE.md / recent cleanup (no `react-router-dom`); `rg "isolated preview"` → only this comment and `iterations.ts` below.
**Suggested wording:** `…so IterationNode's live preview (via iterations/index.ts) sees it immediately…`

### 5. `server/routes/iterations.ts:186-192` — severity: high
**Claims:** `…which used to silently leave the index — and anything reading it, like the isolated preview page — stale).`
**Reality:** Same as above: the isolated preview page no longer exists. The regenerate-on-write rationale for IterationNode still holds.
**Evidence:** Same as finding 4; this is the twin comment on `regenerateIterationsIndex`.
**Suggested wording:** `…which used to silently leave the index (and IterationNode's dynamic import) stale).`

### 6. `features/generation/useGenerationLifecycle.ts:477` — severity: high
**Claims:** `// Use ref to get latest generation info to distinguish dialog vs drag-to-iterate flows.`
**Reality:** Both the Zap/IterateDialog path and drag-to-iterate were deleted (`e64fb01`). The next line sets `const isDragFlow = !!info?.gridPositions`, but nothing in the repo assigns `gridPositions` anymore, and `isDragFlow` is never read.
**Evidence:** `rg "gridPositions\s*:"` → no writers; `rg isDragFlow` → only the dead assignment; commit `e64fb01` removed the gridLayout branch that populated this path.
**Suggested wording:** delete (and the unused `isDragFlow` binding).

### 7. `features/generation/useGenerationCoordination.ts:18-21` — severity: medium
**Claims:** `Owns the five shared coordination refs (generationInfo, isGenerating, nodes, knownIterations, scanContextOverride) plus scan mutex and reconcile streak refs.`
**Reality:** There are no reconcile-streak refs (and never were in this file’s history). Scan mutex refs (`scanLockRef` / `scanQueuedRef`) exist; the deleted polling-reconciliation loop this phrase refers to is gone. `nodes` / `knownIterations` are mirrored from parent props, not owned here.
**Evidence:** Full file has no `streak` / `reconcile` symbols; `rg "reconcile streak"` → only this comment; interface in `shared/lib/generation-coordination.ts` matches the accessors actually returned.
**Suggested wording:** `Owns generationInfo/isGenerating state plus refs mirroring nodes/knownIterations/scanContextOverride, and the scan mutex (lock + queued).`

### 8. `features/generation/useGenerationLifecycle.ts:135-144` — severity: medium
**Claims:** (block) `shift the entire group downward until none of them overlap…` and (line 144) `const SHIFT_STEP = 80; // px to shift down per iteration`
**Reality:** On collision the code does `rect.x += SHIFT_STEP` (shifts **right**). The nearby `// Shift all candidate rects to the right` is correct; the docblock and `SHIFT_STEP` comment are not.
**Evidence:** `useGenerationLifecycle.ts:178-182`.
**Suggested wording:** `shift the entire group right…` / `// px to shift right per attempt`

### 9. `shared/lib/constants.ts:20` — severity: medium
**Claims:** `/** Key for persisting canvas state (nodes, edges, counter) */`
**Reality:** Persisted shape is `nodes`, `relations`, `nodeIdCounter`, etc. `edges` were replaced by `relations` (migration still reads legacy `edges` on load).
**Evidence:** `CanvasState` in `shared/lib/canvas-persistence.ts:40-48`; `saveCanvasState` writes `relations`, not `edges`.
**Suggested wording:** `Key for persisting canvas state (nodes, relations, counter, …)`

### 10. `shared/lib/canvas-persistence.ts:32` — severity: medium
**Claims:** `/** Skeleton positions for post-generation repositioning (always set) */`
**Reality:** Field is optional. Edit-mode starts set `skeletonNodeIds: []` with no `skeletonPositions`. Only freeform / parent-anchored iterate paths set it.
**Evidence:** `useGenerationLifecycle.ts` editMode branch (~201-210) vs freeform (~236-245) and parent path (~334-346).
**Suggested wording:** `Skeleton positions for post-generation repositioning (set when skeletons are created)`

### 11. `shared/lib/canvas-persistence.ts:36` — severity: medium
**Claims:** `/** Parent node cell size so real iteration nodes can match ghost/skeleton sizing */`
**Reality:** `gridCellSize` is never written anywhere. Drag-ghost nodes (`DragGhostNode` / `drag-ghost` type) were removed with drag-to-iterate; only skeleton nodes remain.
**Evidence:** `rg gridCellSize` → type field only; `rg drag-ghost|DragGhost` → no matches.
**Suggested wording:** delete the field (preferred) or `Legacy; unused after drag-to-iterate removal.`

### 12. `features/iterations/useIterationAdoption.ts:19` — severity: medium
**Claims:** `openAdoptConfirm()    — show the confirm dialog + start thumbnail capture`
**Reality:** `openAdoptConfirm` only does `setShowAdoptConfirm(true)`. There is no thumbnail capture in this hook (screenshot/thumbnail paths were removed earlier).
**Evidence:** `useIterationAdoption.ts:51-53`; `rg thumbnail` under `features/iterations` → only this comment line.
**Suggested wording:** `openAdoptConfirm() — show the confirm dialog`

## Unverified (3)

| File:line | Claim | What I'd need to resolve it |
|---|---|---|
| `shared/lib/canvas-persistence.ts:34` | `Grid layout positions for each skeleton node (ordered by variant number)` | Confirm whether any persisted mid-run snapshots in the wild still carry `gridPositions` worth documenting, vs deleting the field with `gridCellSize`. Runtime writers are gone; load path strips `generationInfo` entirely. |
| `server/vite-plugin.ts:34` | `Vite's cwd is the host project root — same truth the API route used.` | Past-tense “used” is likely true for deleted `playground-root` route; worth a quick `git log -p -- server/routes/playground-root.ts` confirmation if you want this graded stale-low vs accurate archaeology. |
| `shared/lib/generation-events.ts:9-10` | `Replaces the window CustomEvent bus (GENERATION_*_EVENT)` | Confirm those constant names were the real pre-bus event names (history exists) and whether naming them still helps readers or is pure archaeology. |

## Checked and correct (78)

Seventy-eight claim-bearing comments in the priority dirs (`features/generation`, `features/iterations`, `server/routes/generate.ts`, `server/lib/*`, `features/canvas/hooks`, `shared/lib/canvas-persistence.ts`) and the absolute-claim keyword sweep were verified and held. Surprised by accuracy: `features/registry-sidebar/useFocusNode.ts` correctly documents that `playground:focus-node` was a dead CustomEvent with no listener — and `registry.tsx`’s HMR/`import.meta.hot` comments are now true after the cleanup.
