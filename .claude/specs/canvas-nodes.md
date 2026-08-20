# Canvas nodes

Node chrome on the canvas: labels, viewport controls, the NodeRail, text nodes, and failure
presentation. Node components live under `features/canvas/nodes/`; iteration nodes under
`features/iterations/`.

## Settled

- **Two-zone, selection-gated chrome.** A NodeLabel row across the top — the node's name on the
  left, the ViewportSelector on the right — and a vertical rounded NodeRail down the node's right
  edge. Chrome appears on selection or hover, never permanently. *Why:* a board of ten nodes wearing
  permanent chrome reads as ten toolbars, not ten designs.
- **No kind or status badge chips.** `original`, `editable`, `component`, `iteration N`, `text`,
  `reference` and the failed pill are all removed. The node's name, the Adopted mark, and the failure
  card's own content already carry that meaning; a chip repeating it is noise.
- **Adopt is hidden on component nodes, not disabled.** It renders on iteration nodes only. *Why:* a
  permanently disabled control teaches nothing — it just occupies a slot and invites a click that
  does nothing.
- **The failure card stays on the canvas.** A failed generation shows its reason, the offending
  detail, and a retry action, in place. It is not hidden or swept away. Which failures get named is
  `agent-failures.md`'s subject — cross-reference it rather than restating.
- **Text nodes are plain text.** Around 20px, no background, no card. Selection shows an outline and
  four corner handles.
- **No freeform drag-resize** on component or iteration nodes. Their size comes from the
  ViewportSelector, not from a handle.
- **Delete is per-node.** The NodeRail carries it; there is no canvas-wide clear-everything action.
  *Why:* destructive and canvas-scoped are a bad pair to put behind one button.

## As the code is today

Read from `master` (`features/canvas/nodes/`, `features/iterations/`, `shared/ui/`).

- **Two-zone chrome — partially built, not hover-gated.** `ComponentNode.tsx` and
  `IterationNode.tsx` both render a top label row always visible and gate the ViewportSelector to
  selection only (`opacity-0 pointer-events-none` when not selected). `IterationNode` and
  `ImageNode.tsx` carry a right-side vertical button column (Adopt + Delete, or Delete only) that
  appears on selection only. Nothing shows chrome on hover alone; labels on component and iteration
  nodes stay visible when unselected.
- **No kind or status badge chips — largely true.** Neither node type renders `original`, `editable`,
  `component`, `text`, or `reference` chips. `IterationNode` shows `pageName | #N` in the NodeLabel
  and a green **Adopted** pill when adopted — the settled Adopted mark, not a kind chip.
- **Adopt — built on iteration nodes only.** `IterationNode.tsx` renders an Adopt button on the
  right rail, wired through `useIterationAdoption`. `ComponentNode.tsx` has no Adopt control.
- **Failure card — not built for generation failures.** `ComponentErrorBoundary` catches render
  crashes inside a preview and shows the error message plus a Retry button in place — that is the
  closest built shape. `useGenerationLifecycle.ts` handles generation errors with a toast and removes
  skeleton nodes; it does not leave a failure card on the canvas. Which failures get named →
  `agent-failures.md`.
- **Text nodes — built.** `TextNode.tsx` renders ~20px plain text with a transparent background; no
  card chrome. Selection draws a blue outline and four corner handle squares.
- **No freeform drag-resize on component or iteration nodes — built.** Freeform `NodeResizeControl`
  was removed in commit `6cef11a`; `canvas-persistence.ts` scrubs persisted width/height on reload so
  old stretched wrappers don't stick. Size comes from `ViewportButtons` / `ComponentSize` presets.
  `ImageNode.tsx` still carries a bottom-right resize handle — image nodes are out of scope for the
  no-resize rule above.
- **Delete is per-node — built, no canvas-wide clear.** `IterationNode` and `ImageNode` carry Delete
  on the NodeRail. Component nodes delete through React Flow's keyboard delete path and
  `useCanvasNodeDelete.ts` (with a cascade/reparent dialog when an iteration has children). There is
  no header or toolbar "clear all" action.

## Open

- **Selection-or-hover chrome.** The settled shape gates all chrome behind selection or hover; the
  built code keeps labels permanently visible on component and iteration nodes.
- **Measured width for iteration placement.** `useCanvasDragDrop.ts` uses
  `DEFAULT_COMPONENT_NODE_WIDTH` (650) unconditionally, which matches no real component, so
  narrow presets leave a ~455px gap.
- **Tagging canvas changes with their author** (person / agent / undo) as an undo/redo
  improvement. Unresearched — needs research before it becomes a decision.
