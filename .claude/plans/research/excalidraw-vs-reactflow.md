# TASK: Can Excalidraw replace React Flow as this project's canvas? — research, report only

Stack: TypeScript + React 19 + Vite (host-compiled), Hono server, `@xyflow/react` ^12.11.0.
Repo: `design-playground`, branch `chore/cleanup`. Windows host — use Git Bash for shell.

## OBJECTIVE

Answer one question with evidence: **could Excalidraw replace `@xyflow/react` as the canvas layer
of this playground, and what would it cost or break?**

**You produce a report. You do not change any source file.** One deliverable:
`tasks/excalidraw-vs-reactflow-report.md`. No edits, no experiments committed, no dependencies
installed.

Another agent is concurrently editing `app/`, `features/generation/`, `features/iterations/`,
`shared/ui/` and `server/`. **Read only. If you write to a source file you will collide with
in-flight work.**

## CONTEXT HANDOVER — what I already know

I've read the following; you don't need to rediscover the basics, but **verify anything you rely
on** rather than trusting this summary.

### What the canvas actually does
`app/PlaygroundCanvas.tsx:58-66` registers seven node types:

```ts
const nodeTypes = {
  component: ComponentNode,     // renders a LIVE host React component
  iteration: IterationNode,     // renders a LIVE generated .tsx via dynamic import
  skeleton: SkeletonIterationNode,
  image: ImageNode,
  text: TextNode,
  shape: ShapeNode,             // annotation shapes (rect/ellipse/arrow)
  frame: FrameNode,
};
```

**The crux of the question is the first two.** `ComponentNode` and `IterationNode` mount *real React
components from the host app* inline in the same DOM document — that is this product's entire
premise. They are not pictures of components; they are the components, interactive, themeable, and
inspectable.

Corroborating facts I verified:
- `CLAUDE.md` "Element selection": previews render **inline in the same document (React DOM), not in
  iframes**. Alt+hover/click walks the real DOM (`features/canvas/hooks/useElementSelection.ts`,
  `shared/lib/element-context.ts`). There is deliberately **no iframe** and no `penpal` — both were
  removed.
- Preview nodes use a transparent `data-pg-interact-catcher` div to block clicks until double-click
  enters interact mode.
- `ViewportButtons` (`shared/ui/ViewportButtons.tsx`) rescales a preview to Auto/Desktop/Mobile.

### Where canvas state lives
- `features/canvas/canvas-flow.tsx` — flow state, plus undo/redo history in `pastRef`/`futureRef`
  with `HISTORY_LIMIT = 100`, and mirrored `canUndo`/`canRedo` state.
- `shared/lib/canvas-persistence.ts` — `CanvasState { nodes, relations, nodeIdCounter,
  knownIterations, collapsedNodeIds?, viewport? }`, JSON-serialised to `localStorage` per project.
- `features/canvas/canvas-relations.ts` — parent/child edges are **not** React Flow `Edge[]`; they
  are a separate `CanvasRelation[]` model. Read the comment at `canvas-flow.tsx:6` for why.
- `features/canvas/canvas-visibility.ts` — `computeVisibleNodes`, collapse/expand of descendants.
- `features/canvas/canvas-auto-arrange.ts` + `hooks/useCanvasAutoArrange.ts` — layout.

### The React Flow APIs actually in use
Grep these; don't assume. Known: `ReactFlowProvider`, `useReactFlow` (`zoomIn`, `zoomOut`,
`fitView`, `updateNodeData`, `screenToFlowPosition`), `useViewport`, `<Background>` with
`BackgroundVariant.Dots`, `NodeResizer`/resize handles, selection box, `nodeTypes`, `minZoom`/
`maxZoom`, `defaultViewport`, `proOptions`.

### A constraint that shapes everything
`CLAUDE.md`: React Flow instantiates node components from `nodeTypes` with only `{ id, data, … }` —
**they cannot receive callbacks**, and functions can't go in `data` because nodes are JSON-serialised
to `localStorage`. That's why a handful of cross-module signals travel on `window` CustomEvents.
Any replacement must be assessed against this same constraint.

### My prior, which you should try to falsify
Excalidraw renders its scene to an **HTML `<canvas>` element**. This playground's core feature is
mounting live React components in the DOM at canvas coordinates. Those look incompatible: you cannot
rasterise a live, interactive, inspectable React tree into a `<canvas>` and keep Alt-select,
interact mode, or theme inheritance.

**Do not just confirm this.** Actively investigate the escape hatches:
- Excalidraw's **embeddable / iframe element** type — what can it host, and does it require an
  iframe? (Note: iframes were deliberately removed from this project; an iframe-based answer is a
  real regression, not a neutral tradeoff — say so if that's where it lands.)
- Rendering React in a **DOM overlay** positioned over the Excalidraw canvas, synced to its scroll/
  zoom state. Is that a supported pattern, and does Excalidraw expose the scene transform needed?
- Whether `@excalidraw/excalidraw` can be used **headlessly** for just the annotation-shape layer
  while React Flow keeps the component nodes — i.e. not a replacement but a coexistence.

## WHAT TO INVESTIGATE

1. **Excalidraw's actual API surface.** Is `@excalidraw/excalidraw` designed to be embedded and
   driven programmatically? What does it expose for scene state, viewport transform, custom
   elements? Check the real docs/repo, not blog summaries. Note bundle size and peer deps —
   this package's premise is **zero dependency diff for the host**, deps install nested, and
   `react`/`react-dom`/`tailwindcss`/`vite` are peerDependencies.
2. **The live-preview question**, above. This is decisive; spend most of your effort here.
3. **Feature-by-feature parity table** against what's in use today: custom node types, per-node
   resize, selection + multi-select, snap/guides, pan/zoom + programmatic `fitView`/`zoomIn`,
   viewport persistence, parent/child relations and collapse, drag-and-drop from the sidebar
   (`useCanvasDragDrop.ts`), frames, and undo/redo (noting the playground already owns its own
   history — does Excalidraw's conflict?).
4. **What Excalidraw would be better at**, honestly: freehand annotation, arrows, text, the
   hand-drawn aesthetic, multiplayer. Note that `ShapeNode`'s hand-drawn "rough" border was recently
   *removed* — find that commit and see whether the intent argues for or against.
5. **Migration cost**, if it's viable at all: which files change, what the persisted-state migration
   looks like, what breaks for existing saved canvases.

## REPORT FORMAT

Write `tasks/excalidraw-vs-reactflow-report.md`:

```markdown
# Excalidraw as a React Flow replacement — findings

## Verdict
<Viable / Viable with major caveats / Not viable> — one paragraph, leading with the decisive reason.

## The decisive constraint
<the live-React-preview question, with evidence from both codebases>

## Parity table
| Capability | React Flow (in use) | Excalidraw | Gap |

## Escape hatches examined
<embeddable elements, DOM overlay, coexistence — what each would actually require>

## What Excalidraw would be better at
<honest list; don't strawman it>

## If we did it anyway
<migration outline, files touched, persisted-state migration, what breaks>

## Open questions
<what you could not determine and what would settle it>
```

## HARD RULES

- **Read-only.** The report is the only file you create. Do not install `@excalidraw/excalidraw`.
- Cite `file:line` for every claim about this repo, and a URL for every claim about Excalidraw.
- If the answer is "no", say so plainly in the first paragraph — don't bury it under a survey.
- Distinguish "Excalidraw can't do this" from "Excalidraw can do this but it would cost X". Those are
  different findings and the second one is more useful.
- Don't recommend a rewrite of anything outside the canvas layer.
