# Excalidraw annotation features — coexistence inventory

## Summary

**An Excalidraw coexistence layer is probably not worth building for this playground.** The app already covers the annotation primitives it actually uses (rect/ellipse/line-arrow, text, image, frame, select/hand, snap guides, undo/redo) in React Flow nodes (`features/canvas/components/ShapeToolGroup.tsx:18-33`, `features/canvas/components/PlaygroundCanvasToolbar.tsx:77-138`, `features/canvas/canvas-flow.tsx:60`). A recent commit deliberately removed the hand-drawn rough border from shapes (`fe1f6a6`, `features/canvas/nodes/ShapeNode.tsx:131-152`), which undercuts the main aesthetic reason to adopt Excalidraw.

The biggest obstacle is not any single missing tool — it is **arrow binding to live `ComponentNode` / `IterationNode` previews**. Excalidraw binds arrows only to `ExcalidrawBindableElement` records in its own scene graph ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts)); React Flow nodes are a separate graph. Without a costly proxy-sync layer, annotations stay visually detached from the product nodes they are meant to annotate. Layer that on dual undo stacks, pointer-priority arbitration, ~47 MB nested dependency weight ([npm](https://www.npmjs.com/package/@excalidraw/excalidraw)), and the integration cost dwarfs the incremental value over extending the existing React Flow annotation nodes — especially freehand, which React Flow documents as Pro-example-only but can be reproduced with MIT `perfect-freehand` ([React Flow example](https://reactflow.dev/examples/whiteboard/freehand-draw), [perfect-freehand](https://www.npmjs.com/package/perfect-freehand)).

## Full feature inventory

| Feature | Category | This app today | Coexistence verdict | Notes |
|---|---|---|---|---|
| Selection tool | Drawing tool | Yes — select tool, box select on drag (`app/PlaygroundCanvas.tsx:470-471`, `features/canvas/components/PlaygroundCanvasToolbar.tsx:71-82`) | **CONFLICTS** | Two independent selection systems; user cannot select a ComponentNode and an Excalidraw arrow in one gesture without custom union logic. Excalidraw tool: [TOOL_TYPE.selection](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/common/src/constants.ts). |
| Lasso selection | Drawing tool | No — React Flow `selectionOnDrag` is rectangular only (`app/PlaygroundCanvas.tsx:470-471`) | **WORKS, DEGRADED** | Works inside Excalidraw layer only; cannot lasso-select React Flow nodes + Excalidraw elements together unless RF's free lasso example is also wired ([React Flow lasso](https://reactflow.dev/examples/whiteboard/lasso-selection), [TOOL_TYPE.lasso](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/common/src/constants.ts)). |
| Hand / pan tool | Drawing tool | Yes (`features/canvas/components/PlaygroundCanvasToolbar.tsx:88-99`, `app/PlaygroundCanvas.tsx:468`) | **CONFLICTS** | Both layers need pan; viewport must be bidirectionally synced (`scrollX`/`scrollY`/`zoom` via Excalidraw API — [excalidrawAPI](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api)) or one layer pans alone. |
| Rectangle | Drawing tool | Yes — `shape: "rect"` (`features/canvas/components/ShapeToolGroup.tsx:16-19`, `features/canvas/nodes/ShapeNode.tsx:131-152`) | **WORKS, DEGRADED** | Duplicate toolchains; styling much richer in Excalidraw (fill styles, roughness). App uses plain CSS border, 6px radius, no fill picker UI. |
| Diamond | Drawing tool | No | **WORKS** | Pure Excalidraw-side feature ([element skeleton](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/excalidraw-element-skeleton)). No RF collision except persistence/z-order. |
| Ellipse | Drawing tool | Yes — `shape: "ellipse"` (`features/canvas/components/ShapeToolGroup.tsx:22-26`, `features/canvas/nodes/ShapeNode.tsx:132-133`) | **WORKS, DEGRADED** | Same duplication cost as rectangle. |
| Arrow | Drawing tool | Partial — line shape with SVG markerEnd only (`features/canvas/nodes/ShapeNode.tsx:82-128`) | **WORKS, DEGRADED** | Excalidraw arrows are multi-point, bindable, labelable, elbow-capable ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts)). App arrow is a straight horizontal `<line>`. |
| Line (no arrowhead) | Drawing tool | Partial — `shape: "line"` is always drawn with arrowhead (`features/canvas/nodes/ShapeNode.tsx:116-124`) | **WORKS** | Excalidraw distinguishes `line` vs `arrow` ([element skeleton](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/excalidraw-element-skeleton)). |
| Freedraw / pencil | Drawing tool | No | **WORKS** | Core Excalidraw strength ([TOOL_TYPE.freedraw](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/common/src/constants.ts), shortcuts [PR #5832](https://github.com/excalidraw/excalidraw/pull/5832)). Draws on canvas overlay; no binding to RF nodes. |
| Text | Drawing tool | Yes (`features/canvas/components/PlaygroundCanvasToolbar.tsx:112-125`, `features/canvas/nodes/TextNode.tsx`) | **WORKS, DEGRADED** | Duplicate editors; Excalidraw adds container-bound text, font families, rough rendering. App: single sans stack, 20px default (`features/canvas/nodes/TextNode.tsx:160-161`). |
| Image | Drawing tool | Yes — toolbar upload + paste (`app/PlaygroundCanvas.tsx:388-412`, `features/canvas/hooks/useCanvasPaste.ts:59-98`) | **WORKS, DEGRADED** | Two image pipelines: app uploads to server API and stores path/url in node data (`app/PlaygroundCanvas.tsx:390-409`); Excalidraw stores binary `files` map + `fileId` refs ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts)). Persistence schemas diverge. |
| Frame | Drawing tool | Yes — frame node + reparent (`features/canvas/nodes/FrameNode.tsx`, `features/canvas/hooks/useCanvasFrameOps.ts:145-157`) | **CONFLICTS** | Non-isomorphic models: RF `parentId`/`extent` vs Excalidraw `frame` + `children` ids ([element skeleton](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/excalidraw-element-skeleton)). Users would see two incompatible "group" concepts. |
| Embed / embeddable | Drawing tool | No | **CONFLICTS** | Excalidraw embeddables render as DOM iframes on top of canvas ([render props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/), [PR #6691](https://github.com/excalidraw/excalidraw/pull/6691)). Conflicts with this repo's inline-DOM, no-iframe preview direction (`CLAUDE.md:37`). |
| Laser pointer | Drawing tool | No | **WORKS, DEGRADED** | Ephemeral presentation overlay ([TOOL_TYPE.laser](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/common/src/constants.ts), [PR #7109](https://github.com/excalidraw/excalidraw/pull/7109)). Useful for demos; irrelevant to persisted annotation. May steal pointer events from RF interact mode. |
| Eraser | Drawing tool | No | **WORKS, DEGRADED** | Erases Excalidraw elements only ([TOOL_TYPE.eraser](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/common/src/constants.ts)). Cannot erase RF nodes; RF has a free eraser example for its own nodes ([React Flow eraser](https://reactflow.dev/learn/advanced-use/whiteboard)). |
| Magic frame / AI generation | Drawing tool | No — N/A for annotation | **IMPOSSIBLE** | `ExcalidrawMagicFrameElement` + `MagicGenerationData` generate HTML, not live React registry components ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts)). Wrong primitive for this product; set aside. |
| Autoshape (shape recognition) | Drawing tool | No | **WORKS, DEGRADED** | Listed in [TOOL_TYPE.autoshape](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/common/src/constants.ts). Excalidraw-only; no app equivalent. |
| Stroke colour | Element property | Partial — hardcoded default `#1c1917` on shapes (`features/canvas/nodes/ShapeNode.tsx:25-26,44-45`) | **WORKS** | Excalidraw exposes full palette ([DEFAULT_ELEMENT_PROPS](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/common/src/constants.ts)). App has no colour picker UI for annotations. |
| Background / fill colour | Element property | Partial — `fill` field exists, always `transparent` default (`features/canvas/nodes/ShapeNode.tsx:26,46`) | **WORKS** | Excalidraw supports opaque/hachure fills. App doesn't expose fill UI. |
| Fill style (hachure / cross-hatch / solid / zigzag) | Element property | No | **WORKS** | Excalidraw `FillStyle` ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts)). Hand-drawn aesthetic; product de-emphasized rough look (`fe1f6a6`). |
| Stroke width | Element property | Partial — `strokeWidth` default 2, no UI (`features/canvas/nodes/ShapeNode.tsx:27,45`) | **WORKS** | Excalidraw thin/medium/bold presets ([STROKE_WIDTH](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/common/src/constants.ts)). |
| Stroke style (solid / dashed / dotted) | Element property | No on shapes; dashed only on frame border CSS (`features/canvas/nodes/FrameNode.tsx:54`) | **WORKS** | Excalidraw `StrokeStyle` ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts)). |
| Sloppiness / roughness | Element property | No — rough border explicitly removed (`fe1f6a6`, `features/canvas/nodes/ShapeNode.tsx:149-151`) | **WORKS** | Excalidraw `roughness` 0–2 via roughjs ([ROUGHNESS](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/common/src/constants.ts)). Aesthetic mismatch with current product direction. |
| Edge roundness (sharp / round / adaptive) | Element property | Partial — fixed 6px rect radius, 50% ellipse (`features/canvas/nodes/ShapeNode.tsx:133,151`) | **WORKS** | Excalidraw `roundness` + `ROUNDNESS` algorithms ([constants](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/common/src/constants.ts)). |
| Arrow type (sharp / round / elbow) | Element property | No — single straight arrow (`features/canvas/nodes/ShapeNode.tsx:116-124`) | **WORKS, DEGRADED** | Excalidraw `currentItemArrowType` + `elbowed` arrows ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts), [ARROW_TYPE](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/common/src/constants.ts)). |
| Arrowheads (both ends, multiple types) | Element property | No — markerEnd only, one triangle style (`features/canvas/nodes/ShapeNode.tsx:104-124`) | **WORKS** | Excalidraw supports dot/bar/circle/triangle/diamond/cardinality heads ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts)). |
| Opacity | Element property | No on annotation nodes | **WORKS** | Excalidraw element `opacity` 0–100 ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts)). |
| Font family | Element property | No — `--pg-font-sans` only (`features/canvas/nodes/TextNode.tsx:138-139`, `features/canvas/nodes/ShapeNode.tsx:168`) | **WORKS** | Excalidraw fonts: Excalifont, Nunito, Comic Shanns, etc. ([FONT_FAMILY](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/constants)). |
| Font size | Element property | Partial — 20px text, 15px shape labels (`features/canvas/nodes/TextNode.tsx:160`, `features/canvas/nodes/ShapeNode.tsx:161`) | **WORKS** | Excalidraw `FONT_SIZES` sm/md/lg/xl ([constants](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/common/src/constants.ts)). |
| Text align / vertical align | Element property | Partial — shape labels centered; text left/default flow (`features/canvas/nodes/ShapeNode.tsx:161`, `features/canvas/nodes/TextNode.tsx:160`) | **WORKS** | Excalidraw `textAlign` + `verticalAlign` on containers ([element skeleton](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/excalidraw-element-skeleton)). |
| Layers / z-order | Element property | Yes — `zIndex` on RF nodes, context-menu ops (`features/canvas/hooks/useCanvasFrameOps.ts:37-61`, `features/canvas/components/PlaygroundCanvasContextMenu.tsx:48-49`) | **CONFLICTS** | Two z-order spaces: RF `zIndex` vs Excalidraw fractional `index` ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts)). No cross-layer "bring annotation behind component" without explicit policy. |
| Grouping | Element property | Yes — frame grouping via `parentId` (`features/canvas/hooks/useCanvasFrameOps.ts:145-157`) | **CONFLICTS** | Excalidraw `groupIds` ≠ RF frame parent/child. Selecting across layers breaks.group semantics. |
| Alignment & distribution | Element property | Partial — drag alignment guides only (`features/canvas/hooks/useCanvasFrameOps.ts:189-255`, `features/canvas/nodes/HelperLines.tsx:11-35`) | **WORKS, DEGRADED** | Excalidraw has explicit align/distribute actions ([align PR #8522](https://github.com/excalidraw/excalidraw/pull/8522), [distribute #8657](https://github.com/excalidraw/excalidraw/issues/8657)). App: Figma-style guides while dragging, no distribute, no align buttons. Cannot align Excalidraw markup to RF node edges natively. |
| Link attachment on elements | Element property | No | **WORKS** | Excalidraw `link` + `onLinkOpen` ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts), [props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/)). Low value for local-dev canvas. |
| Arrow binding to shapes | Behaviour | No — line arrows are dumb geometry (`features/canvas/nodes/ShapeNode.tsx:116-124`) | **IMPOSSIBLE** (native) / **WORKS, DEGRADED** (proxy) | Binding requires target to be `ExcalidrawBindableElement` in Excalidraw scene ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts), [binding.ts](https://github.com/excalidraw/excalidraw/blob/eb959128/packages/element/src/binding.ts)). `component`/`iteration` nodes are not bindable. Proxy rectangles synced to RF bounds could work — see **The binding question**. |
| Text bound inside container shape | Behaviour | Partial — rect/ellipse `label` is centered overlay, not true container binding (`features/canvas/nodes/ShapeNode.tsx:157-191`) | **WORKS, DEGRADED** | Excalidraw `containerId` on text + `label` on shapes ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts)). App label doesn't resize container or bind arrow endpoints. |
| Multi-point lines / editable midpoints | Behaviour | No | **WORKS** | Excalidraw linear elements store `points[]` edited via mid-point handles ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts)). |
| Elbow arrows | Behaviour | No | **WORKS** | `ExcalidrawElbowArrowElement` with `fixedSegments` ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts)). |
| Locking elements | Behaviour | No | **WORKS** | Excalidraw `locked` + tool lock via `setActiveTool({ locked: true })` ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts), [excalidrawAPI](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api)). RF `nodesDraggable` is global per tool mode (`app/PlaygroundCanvas.tsx:472`). |
| Duplication | Behaviour | No dedicated duplicate for annotation nodes | **WORKS, DEGRADED** | Excalidraw native duplicate. Would not duplicate paired RF+proxy bindings without custom glue. |
| Canvas search | Behaviour | No | **WORKS** | Excalidraw sidebar search tab ([CANVAS_SEARCH_TAB](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/common/src/constants.ts)). Searches Excalidraw elements only. |
| Libraries (reusable shape sets) | Behaviour | No | **WORKS, DEGRADED** | Excalidraw library via `updateLibrary` / `onLibraryChange` ([excalidrawAPI](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api), [props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/)). Separate persistence; registry sidebar is unrelated (`features/registry-sidebar/`). |
| Export PNG / SVG / clipboard | Behaviour | No canvas export | **WORKS, DEGRADED** | Excalidraw `exportToCanvas/Blob/Svg/Clipboard` ([export utils](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/export)). Export captures Excalidraw layer only unless composited with RF DOM (html2canvas-style — not built-in). |
| Copy-paste scene fragments | Behaviour | Partial — image paste only (`features/canvas/canvas-paste.ts:21-36`, `features/canvas/hooks/useCanvasPaste.ts:45-98`) | **CONFLICTS** | Excalidraw owns `application/vnd.excalidraw.clipboard+json` ([MIME_TYPES](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/common/src/constants.ts)). `onPaste` prop can veto ([props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/)); must coordinate with app's paste handler. No copy/paste of RF annotation nodes today. |
| Collaboration | Behaviour | No | **WORKS, DEGRADED** | Not built into package — host must implement ([FAQ](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/faq)). `isCollaborating` + `collaborators` map ([props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/), [LiveCollaborationTrigger](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/live-collaboration-trigger)). Out of scope for solo local-dev playground (`CLAUDE.md`). |
| Grid mode | Behaviour / UI | Partial — Ctrl/Cmd snap-to-grid on RF (`app/PlaygroundCanvas.tsx:149-173,453-454`) | **CONFLICTS** | Excalidraw `gridModeEnabled` ([props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/)). Two grids unless one is disabled; grid sizes differ (app 16px vs Excalidraw default 20px — [DEFAULT_GRID_SIZE](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/common/src/constants.ts)). |
| Zen / view mode | Behaviour / UI | No | **WORKS** | Props `zenModeEnabled`, `viewModeEnabled` ([props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/)). Can hide chrome for presentation. |
| Undo / redo | Behaviour | Yes — app snapshot history, limit 100 (`features/canvas/canvas-flow.tsx:60,83-85,149-165`) | **CONFLICTS** | Excalidraw internal history (`history.clear()` only exposed — [excalidrawAPI](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api)). See **Two undo stacks**. |
| Viewport pan/zoom | Behaviour | Yes — RF viewport persisted (`shared/lib/canvas-persistence.ts:44-45,158-165`, `app/PlaygroundCanvas.tsx:459-467`) | **CONFLICTS** | Must sync RF `{x,y,zoom}` ↔ Excalidraw `{scrollX,scrollY,zoom}` on every change ([onScrollChange](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/), [excalidrawAPI](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api)). Zoom ranges differ (app 0.1–2 `app/PlaygroundCanvas.tsx:52-56` vs Excalidraw 0.1–30 — [MIN_ZOOM/MAX_ZOOM](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/common/src/constants.ts)). |
| `customData` on elements | Behaviour | No | **WORKS** | Hook for storing RF node id on proxy elements ([props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/)). Essential for binding bridge if attempted. |
| Mermaid → diagram import | Behaviour | No | **WORKS, DEGRADED** | Bundled dependency `@excalidraw/mermaid-to-excalidraw` ([npm](https://www.npmjs.com/package/@excalidraw/excalidraw)). Adds weight; niche for this product. |

## The binding question

**Can an Excalidraw arrow anchor to a React Flow `ComponentNode` and follow it when dragged?**

**Not natively.** Excalidraw arrow binding stores `startBinding` / `endBinding` as `FixedPointBinding { elementId, fixedPoint, mode }` pointing at an `ExcalidrawBindableElement` id in the Excalidraw elements map ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts)). Bindable types are: rectangle, diamond, ellipse, text, image, iframe, embeddable, frame, magicframe — not arbitrary DOM/React subtrees ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts)). `ComponentNode` renders live registry components in the DOM (`features/canvas/nodes/ComponentNode.tsx:297-308`); `IterationNode` dynamically imports generated modules (`features/iterations/IterationNode.tsx` — same pattern per prior report). Excalidraw's binding engine (`binding.ts`) never sees these.

When a bound Excalidraw shape moves, `updateBoundElements` adjusts connected arrows ([issue #10701](https://github.com/excalidraw/excalidraw/issues/10701)). That pipeline does not run when a React Flow node moves independently.

### Options investigated

| Option | Verdict | Cost |
|---|---|---|
| **A. Give up binding** | Annotations are free-floating scribbles on a transparent overlay. | Low integration, **low utility** — arrows don't track components through auto-arrange, collapse, or drag. |
| **B. Proxy / ghost Excalidraw shapes** | For each RF node (or selected subset), maintain a synced invisible (or outline) Excalidraw rectangle whose `id` is stable; bind arrows to proxy ids; on RF `onNodeDrag` / resize / auto-arrange, call `updateScene` to move proxies ([excalidrawAPI](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api), `customData.rfNodeId` — [props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/)). | **High.** Must handle: collapse/hidden descendants (`features/canvas/canvas-visibility.ts`), frame reparenting (`features/canvas/hooks/useCanvasFrameOps.ts:145-157`), skeleton removal, viewport scaling, z-order, undo of coupled moves. Binding breaks if proxy and RF drift. |
| **C. Make components Excalidraw embeddables** | Render previews in Excalidraw iframes. | **IMPOSSIBLE** for this product — iframe regression vs inline DOM + Alt element-select (`CLAUDE.md:37`, `features/canvas/hooks/useElementSelection.ts:109-116`). |
| **D. Build binding in React Flow** | Store arrow edges as RF nodes/edges with `sourceHandle`/`targetHandle` pointing at node ids; update on drag. | Medium — no Excalidraw needed; RF already owns the graph. Loses hand-drawn arrow routing/elbow logic unless reimplemented. |

**Conclusion:** Binding is the feature that makes an annotation layer *useful* for a component canvas. Excalidraw does not offer it cross-layer without option B, and option B is expensive, fragile, and still invisible to Excalidraw's own undo stack when RF moves the node.

## Architectural collisions

### Pointer priority

Three competing pointer consumers stack on the same canvas:

1. **Excalidraw tools** (draw, select, erase) — canvas-based hit testing ([StaticCanvas/InteractiveCanvas architecture](https://github.com/excalidraw/excalidraw/tree/master/packages/excalidraw/components/canvases)).
2. **React Flow** — node drag, box select, pan (`app/PlaygroundCanvas.tsx:451-472`).
3. **Live preview inside nodes** — `data-pg-interact-catcher` blocks clicks until double-click interact; disabled under Alt element-select (`features/canvas/nodes/ComponentNode.tsx:303-307`, `styles/playground-global.css:567`).

Typical coexistence pattern: Excalidraw layer toggles `pointer-events: none` when RF select/hand is active, and RF sets `nodesDraggable={false}` / ignores pane events when Excalidraw draw tool is active. That requires a **global tool mode** replacing today's toolbar (`features/canvas/components/PlaygroundCanvasToolbar.tsx`) and Excalidraw's own toolbar (likely hidden via CSS — community pattern in [issue #7583](https://github.com/excalidraw/excalidraw/issues/7583)). Without careful gating, users draw on the overlay when they meant to drag a component, or click through to a preview button when they meant to erase.

`handleKeyboardGlobally` on Excalidraw ([props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/)) collides with app shortcuts (V/H/T/R/O/L, Ctrl+Z, Alt element-select — `app/PlaygroundCanvas.tsx:227-252`, `features/canvas/hooks/useElementSelection.ts:39-40`). Excalidraw shortcut customization is not supported ([issue #7685](https://github.com/excalidraw/excalidraw/issues/7685)).

### Two undo stacks

| Stack | Owner | Trigger | Limit |
|---|---|---|---|
| Canvas snapshots | App `pastRef`/`futureRef` | RF node add/remove/drag, imperative `setNodes` | 100 (`features/canvas/canvas-flow.tsx:60,101-102`) |
| Excalidraw history | Excalidraw internal Store | Excalidraw edits via `captureUpdate` | Opaque; `history.clear()` only ([excalidrawAPI](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api)) |

On **Ctrl+Z** today, only the app stack runs (`app/PlaygroundCanvas.tsx:227-252`). If Excalidraw is focused or `handleKeyboardGlobally` is enabled, Excalidraw may also consume Z ([props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/)).

**Unified history** would require one of:

- Interleaving Excalidraw change events into `CanvasSnapshot` via `onChange` + manual inverse ops (no public undo pop API — only `history.clear()`).
- Disabling Excalidraw internal history and reimplementing undo for all Excalidraw mutations (very high cost).
- **Scope-limited UX:** "Undo canvas layout" vs "Undo annotation" — confusing.

Moving an RF node with a bound proxy arrow (option B) creates a **split undo**: RF drag is one undo step; proxy sync via `updateScene({ captureUpdate: NEVER })` is intentionally not undoable ([excalidrawAPI captureUpdate](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api)) — arrow may undo separately from node.

### Persistence

Current shape persisted to `localStorage` under project-scoped key (`shared/lib/canvas-persistence.ts:38-46,53-55,151-166`):

```
CanvasState { nodes, relations, nodeIdCounter, knownIterations, collapsedNodeIds?, viewport? }
```

Excalidraw expects `{ elements[], appState, files }` via `onChange` / `initialData` ([props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/), [excalidrawAPI](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api)).

**Integration options:**

| Approach | Works with per-project key? | Notes |
|---|---|---|
| Extend `CanvasState` with `excalidraw?: { elements, appState, files }` | Yes — same `getCanvasStorageKey(projectId)` | Bloated JSON; binary files base64-inflates size; migration for existing saves |
| Separate key `${STORAGE_KEY}:excalidraw:${projectId}` | Yes | Cleaner separation; must save/load atomically on unload |
| Excalidraw-only persistence, ignore RF annotations in Excalidraw | Partial | RF shape/text/image nodes remain in `nodes[]`; duplicate/conflicting geometry |

Debounced save every 250ms on node changes (`features/canvas/hooks/useCanvasPersistence.ts:32-47`) does not cover Excalidraw unless `onChange` feeds the same pipeline. `localStorage` quota risk rises with embedded image files (Excalidraw `files` map vs app's server-stored images — `app/PlaygroundCanvas.tsx:390-409`).

### Z-order

React Flow uses explicit `zIndex` on nodes with context-menu reorder (`features/canvas/hooks/useCanvasFrameOps.ts:37-61`). Excalidraw uses paint order / fractional `index` ([types](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts)).

In a stacked overlay model:

- If Excalidraw is **on top**, annotations always occlude live previews — good for markup, bad for interacting with previews.
- If Excalidraw is **below**, annotations disappear behind component cards — useless.

Partial mitigation: per-element pointer-events and z-index bands (annotations always above frames but below selected node). No Excalidraw API for "pin this arrow above foreign DOM." Requires architectural choice and custom compositing.

## Gap analysis vs. React Flow

| Excalidraw offers | App has today? | Can React Flow do it? | Free or Pro? | Effort |
|---|---|---|---|---|
| Freedraw / pencil | No | Yes — Pro **example** converts strokes to custom nodes ([whiteboard guide](https://reactflow.dev/learn/advanced-use/whiteboard), [freehand example](https://reactflow.dev/examples/whiteboard/freehand-draw)) | Example source: **Pro** (Starter **$169/mo** — [reactflow.dev/pro](https://reactflow.dev/pro)). Library `perfect-freehand`: **MIT**, already used by Excalidraw ([npm](https://www.npmjs.com/package/perfect-freehand)) | **Low–medium** without Pro: implement `useCanvasDrawTool`-style hook + `perfect-freehand` path → `shape` or `freedraw` node type. Pro subscription buys the worked example + support, not the algorithm. |
| Lasso selection | No | Yes — free example ([lasso example](https://reactflow.dev/examples/whiteboard/lasso-selection)) | **Free** (MIT `@xyflow/react`) | **Low** — port example `Lasso` component |
| Eraser | No | Yes — free example ([whiteboard guide](https://reactflow.dev/learn/advanced-use/whiteboard)) | **Free** | **Low–medium** — collision detect against node bounds |
| Rectangle draw | Yes (`useCanvasDrawTool.ts`) | Yes — free example ([whiteboard guide](https://reactflow.dev/learn/advanced-use/whiteboard)) | **Free** | **Done** |
| Diamond shape | No | Yes — new `shape: "diamond"` node | **Free** | **Low** |
| Arrow binding to nodes | No | **Yes, natively** — edges connect `source`/`target` node ids; move node → edge follows | **Free** (`@xyflow/react` edges) | **Medium** — add annotation edge type; still won't bind to *internal DOM* elements (Alt-select), only node boxes |
| Elbow / routed arrows | No | Partial — custom edge types (`@xyflow/react` edgeTypes) | **Free** | **Medium–high** |
| Multi-point editable lines | No | Partial — custom edge with waypoints | **Free** | **Medium** |
| Hand-drawn rough rendering | No (removed `fe1f6a6`) | Yes — `roughjs` or SVG filters in node render | **Free** (`roughjs` is OSS) | **Low** if wanted — product signal says **don't** |
| Fill styles / stroke styles / opacity | No UI | Yes — data on `ShapeNodeData` + property panel | **Free** | **Low–medium** per property |
| Text containers | Partial (label overlay) | Yes — extend `ShapeNode` or compound node | **Free** | **Low** |
| Frame / grouping | Yes | Yes — parentId pattern already used (`features/canvas/hooks/useCanvasFrameOps.ts:145-157`) | **Free** | **Done** |
| Align / distribute | Guides only | Partial — manual layout helpers; no built-in distribute | **Free** | **Medium** for button-driven align |
| Image upload | Yes | Yes — image node exists | **Free** | **Done** |
| Export PNG/SVG | No | Partial — DOM/screenshot of RF pane; no built-in | **Free** (browser APIs) | **Medium** |
| Libraries | No | Possible — custom sidebar store | **Free** | **High** |
| Laser pointer | No | Possible — transient canvas overlay | **Free** | **Low** |
| Collaboration | No | Not built-in either | N/A | **High** for either stack |
| Canvas search | No | Possible — filter `nodes` by label/type | **Free** | **Low–medium** |

React Flow's own whiteboard guide recommends **tldraw or Excalidraw** for "a more complete whiteboard solution" ([whiteboard guide](https://reactflow.dev/learn/advanced-use/whiteboard)) — implicit acknowledgment that RF examples are building blocks, not a full sketch stack.

## Alternatives

### tldraw

[tldraw license](https://tldraw.dev/community/license) / [full LICENSE.md](https://raw.githubusercontent.com/tldraw/tldraw/main/LICENSE.md):

- **Default license:** use permitted in **Development Environments** only; **not** in Production Environments without trial/commercial/hobby license + license key.
- **Development Environment** defined as internal dev/test/staging not accessible to end users ([LICENSE.md](https://raw.githubusercontent.com/tldraw/tldraw/main/LICENSE.md)).
- **Hobby license:** requires **"made with tldraw" watermark** on canvas ([license page](https://tldraw.dev/community/license)).
- **Production** requires valid license key; SDK validates client-side ([license page](https://tldraw.dev/community/license)).
- Source-available, **not** permissive OSS ([license page](https://tldraw.dev/community/license)).

**Calculus for this repo:** `design-playground` is local-dev-only, never CI/prod (`CLAUDE.md`, `package.json:5`). Embedded in the host's Vite dev server, it likely qualifies as a Development Environment under tldraw's definition. If the host app is ever deployed with tldraw embedded, a production license would be required. Watermark requirement applies under hobby license only.

**vs Excalidraw for coexistence:** Same fundamental binding/DOM problem — tldraw is also a canvas/scene-graph editor, not a live React node host. Would replace Excalidraw's annotation role with similar overlay complexity plus license overhead. React Flow docs name it alongside Excalidraw ([whiteboard guide](https://reactflow.dev/learn/advanced-use/whiteboard)).

### Build it on React Flow directly

Extend existing annotation nodes rather than embed a second editor:

1. **Freehand** — `perfect-freehand` + new `freedraw` node type (same approach as RF Pro example, no subscription required for the library — [freehand example deps](https://reactflow.dev/examples/whiteboard/freehand-draw)).
2. **Eraser / lasso** — port free React Flow whiteboard examples ([whiteboard guide](https://reactflow.dev/learn/advanced-use/whiteboard)).
3. **Arrow binding** — RF edges with `source`/`target` pointing at any node id; survives drag natively.
4. **Property panel** — stroke/fill/opacity/dash on `ShapeNodeData` (fields partially exist — `features/canvas/nodes/ShapeNode.tsx:14-18`).
5. **Rough style** — only if product wants it back (currently **no** — `fe1f6a6`).

**Pros:** Single undo stack (`features/canvas/canvas-flow.tsx`), single persistence schema (`shared/lib/canvas-persistence.ts`), native z-order, binding to component **bounding boxes**, no ~47 MB dep ([npm](https://www.npmjs.com/package/@excalidraw/excalidraw)). **Cons:** No Excalidraw-grade sketch UX, elbow arrows, libraries, or hand-drawn aesthetic without sustained in-house work.

### Do nothing

Current annotation set covers basic markup. Iteration/component workflows are the product center; annotations are secondary. **Lowest cost, no binding gap.**

## Recommendation

**Do not build an Excalidraw coexistence layer.** The integration tax (dual scenes, dual undo, pointer arbitration, ~47 MB nested install, viewport sync, persistence fork) is disproportionate for a local-dev playground that already removed the sketch aesthetic and provides rect/ellipse/line/text/image/frame tools. The decisive gap — **arrows that stick to component nodes** — cannot work without a fragile proxy bridge, while React Flow edges solve it natively.

If annotation investment is warranted, **extend React Flow in-place**: add freehand via MIT `perfect-freehand`, eraser/lasso from free RF examples, and optional RF edges for bindable arrows. Skip React Flow Pro unless you want the pre-built example source; skip Excalidraw and tldraw unless requirements expand to full whiteboard (libraries, collaboration, sketch export) and the team accepts overlay architecture cost.

## Open questions

1. **Product:** Is arrow-to-component binding a hard requirement, or are floating annotations acceptable? This single answer determines whether any overlay library is viable.
2. **Aesthetic:** Does anyone still want hand-drawn rough rendering after `fe1f6a6`, or was that an explicit rejection of the Excalidraw look?
3. **Export:** Is canvas PNG/SVG export needed for user workflows, or is screenshot-per-node (`data-screenshot-target` on nodes — `features/canvas/nodes/ShapeNode.tsx:88`) sufficient?
4. **Excalidraw maintainers:** Is there an official pattern for transparent DOM overlays synchronized to scene transforms *without* embeddable iframes? Docs show `onScrollChange` + render props but no foreign-node binding ([props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/)).
5. **Bundle budget:** Is ~47 MB unpacked nested acceptable for a dev-only tool users run locally (`package.json:5`)? Qualitative impact: slower `bun install` under `src/app/playground/node_modules/`, larger Vite dev prebundle — not fatal locally, but felt on every fresh setup.
6. **tldraw:** If the host app ever ships playground UI outside dev, does tldraw's production license/watermark terms rule it out entirely ([LICENSE.md](https://raw.githubusercontent.com/tldraw/tldraw/main/LICENSE.md))?

---

## Sources

### External

- Excalidraw props / API: [docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/), [excalidrawAPI](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api), [element skeleton](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/excalidraw-element-skeleton), [export utils](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/export), [constants](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/constants), [FAQ](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/faq), [installation](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/installation)
- Excalidraw source: [packages/element/src/types.ts](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/element/src/types.ts), [packages/common/src/constants.ts](https://raw.githubusercontent.com/excalidraw/excalidraw/master/packages/common/src/constants.ts), [binding.ts](https://github.com/excalidraw/excalidraw/blob/eb959128/packages/element/src/binding.ts)
- Excalidraw GitHub: [PR #5832 shortcuts](https://github.com/excalidraw/excalidraw/pull/5832), [PR #7109 laser](https://github.com/excalidraw/excalidraw/pull/7109), [PR #8522 align](https://github.com/excalidraw/excalidraw/pull/8522), [issue #7583 custom toolbar](https://github.com/excalidraw/excalidraw/issues/7583), [issue #7685 shortcuts](https://github.com/excalidraw/excalidraw/issues/7685), [issue #8657 distribute](https://github.com/excalidraw/excalidraw/issues/8657), [issue #10701 binding bugs](https://github.com/excalidraw/excalidraw/issues/10701), [PR #6691 embeddables](https://github.com/excalidraw/excalidraw/pull/6691)
- React Flow: [whiteboard guide](https://reactflow.dev/learn/advanced-use/whiteboard), [freehand example](https://reactflow.dev/examples/whiteboard/freehand-draw), [lasso example](https://reactflow.dev/examples/whiteboard/lasso-selection), [Pro pricing](https://reactflow.dev/pro)
- tldraw: [community license](https://tldraw.dev/community/license), [LICENSE.md](https://raw.githubusercontent.com/tldraw/tldraw/main/LICENSE.md)
- npm: [@excalidraw/excalidraw](https://www.npmjs.com/package/@excalidraw/excalidraw), [perfect-freehand](https://www.npmjs.com/package/perfect-freehand)

### Repo (`file:line`)

- `app/PlaygroundCanvas.tsx:52-56,145-173,227-252,388-412,451-472,459-467`
- `app/usePlaygroundCanvasController.ts:94`
- `features/canvas/canvas-flow.tsx:60,83-85,101-102,149-165`
- `features/canvas/canvas-paste.ts:21-36`
- `features/canvas/components/PlaygroundCanvasContextMenu.tsx:48-49`
- `features/canvas/components/PlaygroundCanvasToolbar.tsx:71-138`
- `features/canvas/components/ShapeToolGroup.tsx:18-33`
- `features/canvas/hooks/useCanvasDrawTool.ts:28-32,65-69`
- `features/canvas/hooks/useCanvasFrameOps.ts:37-61,145-157,189-255`
- `features/canvas/hooks/useCanvasPaste.ts:45-98`
- `features/canvas/hooks/useCanvasPersistence.ts:32-47`
- `features/canvas/hooks/useElementSelection.ts:39-40,109-116`
- `features/canvas/nodes/ComponentNode.tsx:303-307`
- `features/canvas/nodes/FrameNode.tsx:54`
- `features/canvas/nodes/HelperLines.tsx:11-35`
- `features/canvas/nodes/ShapeNode.tsx:14-18,25-27,44-46,82-128,131-152,157-191`
- `features/canvas/nodes/TextNode.tsx:138-139,160-161`
- `shared/lib/canvas-persistence.ts:38-46,53-55,151-166`
- `styles/playground-global.css:567`
- `package.json:5,14,24-28`
- `CLAUDE.md:37`
- git `fe1f6a6` — ShapeNode rough border removal
