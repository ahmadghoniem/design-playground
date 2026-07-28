# Excalidraw as a React Flow replacement — findings

## Verdict
**Not viable** as a replacement for this project’s current canvas role, because the decisive requirement is rendering **live host React components and generated React iteration components inline in the same document**, while Excalidraw’s scene model is fundamentally a canvas-drawn element model with optional embeddable DOM/iframe overlays, not arbitrary mounted React subtrees as first-class scene nodes. In this repo, `component` and `iteration` nodes are the product premise, not an edge case (`app/PlaygroundCanvas.tsx:58-66`, `features/canvas/nodes/ComponentNode.tsx:142-150`, `features/iterations/IterationNode.tsx:317-320`, `CLAUDE.md:37`). Excalidraw can be integrated and controlled programmatically, but its documented APIs (`updateScene`, `getAppState`, `onScrollChange`, embeddable hooks) do not provide a native “custom live React node type” equivalent to React Flow `nodeTypes` ([docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api), [docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/), [docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/render-props)).

## The decisive constraint
This playground depends on two node types that mount **real React trees**:

- `ComponentNode` resolves a registry component and renders it directly (`<Component {...effectiveProps} />`) with interactive gating and mode switching (`features/canvas/nodes/ComponentNode.tsx:142-150`, `features/canvas/nodes/ComponentNode.tsx:303-308`).
- `IterationNode` dynamically imports generated modules and renders `<RenderComponent {...effectiveProps} />` inline (`features/iterations/IterationNode.tsx:120-127`, `features/iterations/IterationNode.tsx:429-449`, `features/iterations/IterationNode.tsx:495-500`).
- Alt-based element selection walks the **actual DOM** and React fiber metadata to extract element/component context (`features/canvas/hooks/useElementSelection.ts:109-116`, `features/canvas/hooks/useElementSelection.ts:145-155`, `shared/lib/element-context.ts:29-49`, `CLAUDE.md:37`).

Excalidraw’s rendering architecture centers on HTML canvas surfaces (`StaticCanvas`/`InteractiveCanvas` with `HTMLCanvasElement`) rather than a node graph of arbitrary React subtrees ([source](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/excalidraw/components/canvases/StaticCanvas.tsx), [source](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/excalidraw/components/canvases/InteractiveCanvas.tsx)).  
So the key mismatch is not “missing one API”; it is the scene primitive itself:

- **React Flow in this app:** nodes are React components with custom renderers (`app/PlaygroundCanvas.tsx:58-66`).
- **Excalidraw:** scene elements are Excalidraw element records; custom DOM injection exists mainly via embeddable rendering and top-level UI hooks, not arbitrary node renderer slots per element ([docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/), [docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/render-props)).

## Parity table
| Capability | React Flow (in use) | Excalidraw | Gap |
| --- | --- | --- | --- |
| Custom node types | `nodeTypes` includes `component`, `iteration`, `skeleton`, `image`, `text`, `shape`, `frame` (`app/PlaygroundCanvas.tsx:58-66`) | Excalidraw exposes scene/data APIs and render hooks, but no direct equivalent to React Flow `nodeTypes` for arbitrary live React nodes ([docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/), [docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api)) | **Hard gap** for live preview nodes |
| Per-node resize handles | `NodeResizeControl`/`NodeResizer` in component/iteration/shape/frame/image nodes (`features/canvas/nodes/ComponentNode.tsx:180-199`, `features/iterations/IterationNode.tsx:330-349`, `features/canvas/nodes/ShapeNode.tsx:89-95`, `features/canvas/nodes/FrameNode.tsx:44-48`) | Element transforms exist; no per-node React component resize control pattern for embedded live DOM trees | **Costly emulation** |
| Multi-select + partial selection box | `selectionOnDrag`, `selectionMode={SelectionMode.Partial}` (`app/PlaygroundCanvas.tsx:470-472`) | Native element selection exists in Excalidraw | Comparable for drawing elements |
| Pan/zoom + programmatic control | `zoomIn`, `zoomOut`, `fitView`, viewport persistence (`app/PlaygroundCanvas.tsx:181-183`, `app/PlaygroundCanvas.tsx:510-518`, `app/usePlaygroundCanvasController.ts:84`, `features/canvas/hooks/useCanvasPersistence.ts:59-70`) | `getAppState`, `updateScene(appState)`, `scrollToContent`, `onScrollChange` are documented ([docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api), [docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/)) | Mostly bridgeable |
| Viewport persistence | Persists `{x,y,zoom}` in `CanvasState.viewport` (`shared/lib/canvas-persistence.ts:44-46`, `shared/lib/canvas-persistence.ts:158-165`) | App state includes `scrollX`, `scrollY`, `zoom` and can be read/written via API ([docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api)) | Bridgeable |
| Parent/child iteration relations + collapse | Separate `CanvasRelation[]`, hidden descendants, per-node collapse state (`shared/lib/canvas-persistence.ts:16-20`, `features/canvas/canvas-visibility.ts:16-31`, `features/canvas/canvas-visibility.ts:44-50`) | No equivalent built-in hierarchy model matching this relation semantics in the documented API | **Custom model rewrite** |
| Sidebar drag-drop to create component + linked iterations | DnD creates component node, fetches iterations, creates relation edges (`features/canvas/hooks/useCanvasDragDrop.ts:112-130`, `features/canvas/hooks/useCanvasDragDrop.ts:150-177`, `features/canvas/hooks/useCanvasDragDrop.ts:180-184`) | Can add elements programmatically, but not as live React component nodes | **Major adaptation** |
| Frames/grouping with reparenting | Frame node + reparent children via `parentId`/`extent` (`features/canvas/hooks/useCanvasFrameOps.ts:90-92`, `features/canvas/hooks/useCanvasFrameOps.ts:145-153`) | Excalidraw has frame-like concepts for drawing elements, not this React Flow parent-child node mechanism | Partial but non-isomorphic |
| Undo/redo ownership | App has its own snapshot history (`features/canvas/canvas-flow.tsx:60`, `features/canvas/canvas-flow.tsx:83-85`, `features/canvas/canvas-flow.tsx:149-165`) | Excalidraw has internal history API and capture semantics ([docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api)) | Possible conflict/double-history design |

## Escape hatches examined
1. **Embeddable/iframe elements**
   - Excalidraw supports embeddables via `validateEmbeddable` and `renderEmbeddable` ([docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/), [docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/render-props)).
   - The upstream implementation explicitly uses DOM iframes over canvas and notes layering limitations (“iframes ... always display on top”) ([PR #6691](https://github.com/excalidraw/excalidraw/pull/6691)).
   - For this repo, iframe-based live previews are a regression against the explicit “no iframe” direction (`CLAUDE.md:37`).

2. **DOM overlay synchronized to Excalidraw pan/zoom**
   - Technically possible: Excalidraw exposes scroll/zoom state and change notifications (`onScrollChange`, `getAppState`, `updateScene`) ([docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/), [docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api)).
   - But this is effectively building and maintaining a second scene graph (DOM layer) above Excalidraw while Excalidraw remains only a backdrop. You would re-implement hit-testing coordination, selection interop, z-order semantics, and persistence mapping currently provided by React Flow + node data.
   - Result: **can do, but high-complexity workaround**, not a clean replacement.

3. **Headless/coexistence: keep React Flow for live nodes, use Excalidraw for annotation only**
   - This is the most realistic path if Excalidraw is desired: use it as an annotation layer (text/arrow/freehand), not as canvas replacement.
   - Excalidraw package is still a substantial embedded editor component with its own UI/state model ([installation](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/installation), [props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/)).
   - So this is **coexistence**, not replacement.

## What Excalidraw would be better at
- Freehand drawing/annotation ergonomics and hand-drawn visual language (its native strength).
- Richer built-in sketch tools, text/arrow workflows, and whiteboard affordances.
- Collaboration-ready primitives (if collaborative mode is ever in scope) through Excalidraw’s model and ecosystem ([props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/)).
- Embeddable web content tooling already exists (with caveats) ([docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/render-props), [PR #6691](https://github.com/excalidraw/excalidraw/pull/6691)).

Note on current product intent: this repo recently removed ShapeNode’s rough border style and reverted to plain radius (`git` commit `fe1f6a6`, diff on `features/canvas/nodes/ShapeNode.tsx`), which weakens the argument that the canvas wants to move toward a rough/sketch look.

## If we did it anyway
Likely migration shape (replacement attempt):

1. Replace `ReactFlowProvider`/`ReactFlow` composition points in `app/PlaygroundClient.tsx` and `app/PlaygroundCanvas.tsx` with Excalidraw host component (`app/PlaygroundClient.tsx:2`, `app/PlaygroundClient.tsx:146-147`, `app/PlaygroundCanvas.tsx:445-487`).
2. Rewrite all hooks relying on React Flow node lifecycle/utilities (`useReactFlow`, `screenToFlowPosition`, drag/drop placement, auto-arrange fit/viewport, frame grouping, element selection assumptions) (`app/usePlaygroundCanvasController.ts:84`, `features/canvas/hooks/useCanvasDragDrop.ts:29-35`, `features/canvas/hooks/useCanvasAutoArrange.ts:16`, `features/canvas/hooks/useCanvasFrameOps.ts:90-92`, `features/canvas/hooks/useElementSelection.ts:86-93`).
3. Redesign persisted schema:
   - Current persisted shape is `CanvasState { nodes, relations, nodeIdCounter, knownIterations, collapsedNodeIds?, viewport? }` (`shared/lib/canvas-persistence.ts:38-46`).
   - Excalidraw persistence uses elements/appState/files semantics ([docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/), [docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api)).
   - Existing saved canvases would need migration logic; `component`/`iteration` node payloads have no first-class Excalidraw equivalent.
4. Rebuild interaction model tied to live preview DOM:
   - `data-pg-interact-catcher` gating and Alt element selection over real DOM (`features/canvas/nodes/ComponentNode.tsx:303-308`, `features/canvas/hooks/useElementSelection.ts:172-190`) would not transfer directly.

What breaks immediately for existing users:
- Saved canvases containing `component`/`iteration` live nodes cannot be rendered with equivalent behavior without a custom overlay architecture.
- Alt element-level prompt targeting over live DOM would degrade or require a new non-Excalidraw interaction substrate.
- Relation collapse/tree semantics and frame reparenting behavior would need a fresh implementation.

## Open questions
- Is there an official Excalidraw-supported pattern for large arbitrary DOM overlays synchronized to scene transforms (beyond embeddables and top-level UI render props)? I found no first-class API for this in current docs; confirmation from maintainers would settle it.
- If coexistence is considered, what exact UX should own pointer priority between React Flow nodes and Excalidraw tools (draw vs inspect vs interact)?
- Dependency/bundle impact in this nested-install architecture was not benchmarked here (no install allowed), so only qualitative dependency notes were included.
