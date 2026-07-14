Stack: React 19 + @xyflow/react + Vite, TypeScript. Relative imports, no `@` alias.

TASK: Remove the canvas minimap, the dynamic-background zoom-scaling hook, and the dead edge-connection wiring; replace the background with static gap/size.

Edit `app/PlaygroundCanvas.tsx`:
- Remove `MiniMap` from the `@xyflow/react` import.
- Remove the `MINIMAP_NODE_COLORS` const and the `getMinimapNodeColor` function.
- Remove the entire `<MiniMap ... />` JSX element inside `<ReactFlow>`.
- Remove the import of `useDynamicBackground` from `../hooks/useDynamicBackground` and the `const dynamicBg = useDynamicBackground();` line.
- Change the `<Background>` element to use static values: `gap={BACKGROUND_GAP}` and `size={BACKGROUND_DOT_SIZE}` (import these two from `../lib/constants` — `BACKGROUND_GAP` is already used elsewhere; add `BACKGROUND_DOT_SIZE` to the existing constants import if not present). Keep `variant`, `bgColor`, and `color` props unchanged.
- Remove the dead edge wiring: delete the `addEdge` and `Connection` imports from `@xyflow/react`, delete the `onConnect` useCallback, and remove the `onConnect={onConnect}` prop from `<ReactFlow>`. (Nodes are non-connectable: `nodesConnectable={false}`, so this is dead.) Keep `edges`, `setEdges`, `onEdgesChange` — those are still used for data-only parent→iteration edges.

Delete this file entirely:
- `hooks/useDynamicBackground.ts`

Edit `lib/constants.ts`:
- Delete the minimap color/mask constants: `MINIMAP_SKELETON_COLOR`, `MINIMAP_ITERATION_COLOR`, `MINIMAP_COMPONENT_COLOR`, `MINIMAP_IMAGE_COLOR`, `MINIMAP_TEXT_COLOR`, `MINIMAP_MASK_COLOR` (and the "MiniMap Colors" comment header).
- Delete the dynamic-background-only constants: `BACKGROUND_ZOOM_STEPS`, `BACKGROUND_MIN_GAP`, `BACKGROUND_MAX_GAP`, `BACKGROUND_MIN_DOT_SIZE`, `BACKGROUND_MAX_DOT_SIZE`.
- KEEP `BACKGROUND_GAP` and `BACKGROUND_DOT_SIZE` (now used statically) and `CANVAS_MIN_ZOOM`/`CANVAS_MAX_ZOOM`.

Edit `hooks/useElementSelection.ts`:
- Remove `'.react-flow__minimap'` from the `EXCLUDE_SELECTORS` array.

CONSTRAINTS:
- Do not remove `BACKGROUND_GAP`/`BACKGROUND_DOT_SIZE` — they are the static replacements.
- Do not touch `<HelperLines>` (Figma-style alignment guides — keep) or `<Background>`'s other props.
- SHARED FILES: `app/PlaygroundCanvas.tsx`, `lib/constants.ts`, `hooks/useElementSelection.ts` are edited by other tasks — only make the changes listed here.

VERIFY:
- `grep -rn "MiniMap\|MINIMAP_\|useDynamicBackground\|BACKGROUND_ZOOM_STEPS\|BACKGROUND_MIN_\|BACKGROUND_MAX_\|addEdge\|onConnect" --include=*.ts --include=*.tsx .` returns no matches (should be empty).
- `grep -n "BACKGROUND_GAP\|BACKGROUND_DOT_SIZE" app/PlaygroundCanvas.tsx` shows both used on `<Background>`.
