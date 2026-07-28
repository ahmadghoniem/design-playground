# TASK: Complete Excalidraw annotation-feature inventory, scored for a coexistence layer — report only

Stack: TypeScript + React 19 + Vite (host-compiled), `@xyflow/react` ^12.11.0.
Repo: `design-playground`, branch `chore/cleanup`. Windows host — use Git Bash for shell.

## BACKGROUND — read this first

You (a previous run) produced `tasks/excalidraw-vs-reactflow-report.md`, which concluded Excalidraw
**cannot replace** React Flow here, because `ComponentNode` and `IterationNode` mount live React
trees inline in the DOM and Excalidraw renders to `<canvas>`. That conclusion was verified and
accepted. **Do not re-litigate it.**

The decision now is the **coexistence** path your report named as the realistic option: React Flow
keeps the live component/iteration nodes; Excalidraw (or something like it) provides a richer
**annotation layer** on top.

This task is to make that decision concrete with a complete feature inventory.

## OBJECTIVE

Produce `tasks/excalidraw-annotation-inventory-report.md` answering three questions:

1. **What are ALL of Excalidraw's annotation features?** Exhaustive, not a highlight reel.
2. **For each: would it work in a coexistence layer over React Flow, and what would it cost?**
3. **What does Excalidraw offer that this app doesn't have today — and can React Flow provide it
   instead**, without adopting Excalidraw at all?

**Read-only. The report is the only file you create.** No source edits, no installs.

## WHAT THIS APP HAS TODAY — verified, use as the baseline

Annotation-capable pieces (`features/canvas/`):

| Tool | Where | Notes |
|---|---|---|
| Rectangle (`R`), Ellipse (`O`), Line/Arrow (`L`) | `components/ShapeToolGroup.tsx:18-33`, `nodes/ShapeNode.tsx` | `ShapeNodeData { shape, stroke, strokeWidth, fill }`. Arrow is a `<line>` + `<path>` marker. |
| Text | `components/PlaygroundCanvasToolbar.tsx:120`, `nodes/TextNode.tsx` | |
| Image | `PlaygroundCanvasToolbar.tsx:133`, `nodes/ImageNode.tsx` | base64 in JSON |
| Frame | `nodes/FrameNode.tsx`, `hooks/useCanvasFrameOps.ts` | grouping + reparenting |
| Select / Hand tools | `PlaygroundCanvasToolbar.tsx:77,94` | |
| Snap + helper lines | `nodes/HelperLines.tsx` | snapping is Ctrl/Cmd-held |
| Undo/redo | `canvas-flow.tsx` | app-owned history, `HISTORY_LIMIT = 100` |

A recent commit (`fe1f6a6`) **removed** `ShapeNode`'s hand-drawn "rough" border — relevant to how
much the sketch aesthetic is actually wanted.

## WHAT I ALREADY FOUND — verify, don't rediscover

React Flow has an official whiteboard guide
([reactflow.dev/learn/advanced-use/whiteboard](https://reactflow.dev/learn/advanced-use/whiteboard)):

- **Freehand drawing — React Flow *Pro* (paid).** Drawings become custom nodes.
- **Lasso selection — free.**
- **Eraser tool — free.** Collision detection against nodes/edges.
- **Rectangle drawing — free.**
- The guide itself recommends **tldraw** and **Excalidraw** for comprehensive whiteboard needs.

**Confirm the Pro/free split** — it is the single most decision-relevant fact here, and pricing
pages change. Also check whether the freehand example is reproducible from open-source primitives
(e.g. `perfect-freehand`) without a Pro licence, and what that would take.

**Also evaluate `tldraw`** as a third option, since React Flow's own docs name it alongside
Excalidraw. Note its licence terms specifically — tldraw has a non-standard licence with a
watermark/commercial clause. That matters: this package is local-dev-only and never shipped to
production, which may change the calculus. State the licence facts; don't guess at their legal
effect.

## THE INVENTORY — required coverage

Enumerate every Excalidraw annotation capability. At minimum, confirm and classify:

**Drawing tools:** freedraw/pencil, rectangle, diamond, ellipse, arrow, line, text, image, frame,
embed, laser pointer, eraser, "magic frame"/AI features (note and set aside).

**Element properties:** stroke colour, background/fill colour, fill style (hachure / cross-hatch /
solid), stroke width, stroke style (solid / dashed / dotted), sloppiness (the hand-drawn roughness
levels), edges (sharp / round), arrowheads (both ends, types), opacity, font family, font size,
text align, layers/z-order, grouping, alignment & distribution, link attachment.

**Behaviours:** arrow **binding** to elements (arrows that stay attached when a shape moves), text
bound *inside* a container shape, multi-point lines/curves with editable midpoints, elbow arrows,
locking, duplication, canvas search, libraries (reusable shape sets), export (PNG/SVG/clipboard),
copy-paste of scene fragments, collaboration primitives.

For each, verify against the real docs or source — **not** blog summaries.
Cite a URL per claim.

## SCORING — the part that matters most

For each feature, place it in one of four buckets **for the coexistence architecture**:

- **WORKS** — functions normally in an annotation layer over React Flow; nothing special needed.
- **WORKS, DEGRADED** — functions, but loses something. Say precisely what.
- **CONFLICTS** — collides with something React Flow or the app already owns (undo/redo history,
  selection, pointer priority, z-order between the canvas and live DOM nodes, persistence). Name
  the collision.
- **IMPOSSIBLE** — cannot work in this architecture. Say why.

**The hardest question, answer it explicitly:** can an Excalidraw annotation *bind to or visually
anchor onto* a React Flow node — e.g. an arrow pointing at a `ComponentNode` that follows it when
dragged? Excalidraw's arrow binding works against Excalidraw elements. If component nodes are not
Excalidraw elements, what happens? Options to investigate: proxy/ghost elements mirroring node
bounds into the Excalidraw scene, or giving up binding entirely. This determines whether the
annotation layer is genuinely useful or just a transparency people scribble on.

Also cover, concretely:
- **Pointer priority** — who receives a click: an Excalidraw tool, a React Flow node, or a live
  preview inside a node (which has its own `data-pg-interact-catcher` gating and Alt element-select).
- **Two undo stacks** — Excalidraw has its own history; the app has `pastRef`/`futureRef`. What
  happens on Ctrl+Z, and what would a unified history require?
- **Persistence** — the app stores `CanvasState` in `localStorage`
  (`shared/lib/canvas-persistence.ts`). Where would Excalidraw scene elements live, and does that
  work with the existing per-project storage key?
- **Bundle/dependency cost** — this package installs deps **nested** so the host's lockfile is never
  touched; `react`/`react-dom`/`tailwindcss`/`vite` are peerDependencies. Report package size and
  peer requirements. Local-dev-only, so size is a real but not fatal concern — say how real.

## REPORT FORMAT

`tasks/excalidraw-annotation-inventory-report.md`:

```markdown
# Excalidraw annotation features — coexistence inventory

## Summary
<3–5 sentences: is the annotation layer worth it, and what's the biggest obstacle>

## Full feature inventory
| Feature | Category | This app today | Coexistence verdict | Notes |
(one row per feature; verdict = WORKS / WORKS, DEGRADED / CONFLICTS / IMPOSSIBLE)

## The binding question
<can annotations anchor to React Flow nodes — evidence and options>

## Architectural collisions
### Pointer priority
### Two undo stacks
### Persistence
### Z-order

## Gap analysis vs. React Flow
| Excalidraw offers | App has today? | Can React Flow do it? | Free or Pro? | Effort |

## Alternatives
### tldraw
### Build it on React Flow directly
### Do nothing

## Recommendation
<one paragraph, and say plainly if the answer is "not worth it">

## Open questions
```

## HARD RULES

- **Read-only.** No source edits, no `npm/bun install`.
- A URL for every Excalidraw/tldraw/React Flow claim; a `file:line` for every claim about this repo.
- Do not pad the inventory — if a feature is irrelevant to annotation, say so in one line and move on.
- If your honest conclusion is that the coexistence layer isn't worth building, **say that first**,
  in the Summary. A well-argued "no" is a good outcome.
- Distinguish "Excalidraw can't" from "would cost X". The second is more useful.
