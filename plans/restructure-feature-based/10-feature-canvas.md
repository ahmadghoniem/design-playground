Stack: React 19 + @xyflow/react + TS. `@/` alias + shared/ + all other features exist. Client imports are `@/`-absolute. This is the LARGEST move — the canvas core, the draw tool, and the remaining (non-iteration) node primitives.

TASK: Create `features/canvas/` and move everything canvas/draw/node-primitive related into it, updating all `@/`-import references. By this point, everything NOT moved by plans 02–09 and not staying in `app/` should end up here.

--- shell + canvas UI ---
`git mv` into `features/canvas/`:
- `app/PlaygroundCanvas.tsx`                          → `features/canvas/PlaygroundCanvas.tsx`
- `components/canvas/ElementHighlight.tsx`            → `features/canvas/ElementHighlight.tsx`
- `components/canvas/PlaygroundCanvasContextMenu.tsx` → `features/canvas/PlaygroundCanvasContextMenu.tsx`
- `components/canvas/PlaygroundCanvasDialogs.tsx`     → `features/canvas/PlaygroundCanvasDialogs.tsx`
- `components/canvas/PlaygroundCanvasDrawLayer.tsx`   → `features/canvas/PlaygroundCanvasDrawLayer.tsx`
- `components/canvas/PlaygroundCanvasToolbar.tsx`     → `features/canvas/PlaygroundCanvasToolbar.tsx`
- `components/canvas/ShapeToolGroup.tsx`              → `features/canvas/ShapeToolGroup.tsx`

--- canvas hooks ---
`git mv` into `features/canvas/`:
- `hooks/useCanvasAutoArrange.ts`, `hooks/useCanvasClear.ts`, `hooks/useCanvasCreatePage.ts`,
  `hooks/useCanvasDragDrop.ts`, `hooks/useCanvasDrawTool.ts`, `hooks/useCanvasFrameOps.ts`,
  `hooks/useCanvasNodeDelete.ts`, `hooks/useCanvasPaste.ts`, `hooks/useCanvasPersistence.ts`,
  `hooks/useElementSelection.ts`, `hooks/useNodeSelection.ts`, `hooks/useFocusNode.ts`
  → `features/canvas/<same-name>`

--- canvas lib ---
`git mv` into `features/canvas/`:
- `lib/canvas-auto-arrange.ts`, `lib/canvas-flow.tsx`, `lib/canvas-paste.ts`,
  `lib/canvas-persistence.ts`, `lib/canvas-visibility.ts`, `lib/draw-hit-test.ts`,
  `lib/draw-types.ts`, `lib/html-utils.ts`, `lib/jsx-utils.ts`,
  `lib/iframe-selection-bridge.ts`, `lib/plan-frame-name.ts`
  → `features/canvas/<same-name>`

--- canvas stores ---
`git mv` into `features/canvas/`:
- `stores/playground-draw-store.ts` → `features/canvas/playground-draw-store.ts`
- `stores/interactive-node-store.ts` → `features/canvas/interactive-node-store.ts`

--- node primitives (non-iteration) ---
`git mv` into `features/canvas/nodes/`:
- `nodes/ComponentNode.tsx`, `nodes/ComponentErrorBoundary.tsx`, `nodes/DragGhostNode.tsx`,
  `nodes/FrameNode.tsx`, `nodes/ImageNode.tsx`, `nodes/ShapeNode.tsx`, `nodes/TextNode.tsx`,
  `nodes/oncanvas-loader.ts`
  → `features/canvas/nodes/<same-name>`
- `nodes/shared/DragSelectionOverlay.tsx`, `nodes/shared/DrawStrokePaths.tsx`,
  `nodes/shared/FrameHoverHint.tsx`, `nodes/shared/HelperLines.tsx`, `nodes/shared/NodeLabel.tsx`,
  `nodes/shared/SizeButtons.tsx`
  → `features/canvas/nodes/shared/<same-name>`
- `hooks/useNodeShared.ts` → `features/canvas/nodes/shared/useNodeShared.ts`

Then update EVERY reference repo-wide from the old `@/` path to the new
`@/features/canvas/...` path for each moved file (map `@/app/PlaygroundCanvas`,
`@/components/canvas/<x>`, `@/hooks/<canvasHook>`, `@/lib/<canvasLib>`, `@/stores/<canvasStore>`,
`@/nodes/<x>`, `@/nodes/shared/<x>`, `@/hooks/useNodeShared`).

CONSTRAINTS:
- `nodes/IterationNode`, `nodes/SkeletonIterationNode`, `nodes/shared/IterateDialog` and the
  `iterate-dialog/` folder already moved to `features/iterations/` in plan 05 — they are NOT here.
- `server/routes/oncanvas-components.ts` imports only `@/shared/lib/*` (already updated) — it does
  NOT import any file moved in this plan. Do NOT touch server.
- The canvas→iterations coupling (`useDragToIterate`, iteration node types) is expected; keep those
  imports pointing at `@/features/iterations/...`.
- No logic/JSX change. `git mv` only.

VERIFY:
- `grep -rn "@/app/PlaygroundCanvas\|@/components/canvas/\|@/hooks/useCanvas\|@/hooks/useElementSelection\|@/hooks/useNodeSelection\|@/hooks/useFocusNode\|@/hooks/useNodeShared\|@/lib/canvas-\|@/lib/draw-\|@/lib/html-utils\|@/lib/jsx-utils\|@/lib/iframe-selection-bridge\|@/lib/plan-frame-name\|@/stores/playground-draw-store\|@/stores/interactive-node-store\|@/nodes/" --include=*.ts --include=*.tsx .` → no matches.
- `ls features/canvas features/canvas/nodes features/canvas/nodes/shared` shows the moved files.
