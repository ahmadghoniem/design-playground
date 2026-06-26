# Task 10 — Deepen `PlaygroundCanvas.tsx` (5848 LOC god-module)

**Type:** deepening · **Risk:** high · **Depends on:** run **after Task 09** (excision shrinks it) · **Blast radius:** mostly internal

## The problem

`PlaygroundCanvas.tsx` is a 5848-line module with **~135 hooks** in one component. It owns: React Flow wiring, canvas persistence, the whole **generation lifecycle** (start → SSE → poll fallback → complete → reconcile → resume-after-reload → timeout), **iteration scanning** (HTML / on-canvas JSX / React variants, tree-aware positioning), **drag-to-iterate**, **chat submit + queue**, **paste** (image/JSX/HTML/URL), **keyboard handling**, draw/shape rubber-band, and a presence layer. The interface (props) is tiny; the implementation is enormous and **everything is entangled through shared refs and closures**. This is the opposite of deep: one module, no internal seams, untestable except through the full canvas.

The goal is **not** "split into smaller files." It is: pull coherent responsibilities behind **small interfaces** (mostly custom hooks and pure modules) so each can be reasoned about and tested on its own, and so the top-level component becomes an assembler.

## Execution discipline (this task is large — agents have failed it by stopping early)

- **One seam per commit. Stop and verify after each.** Do not attempt multiple extractions in one pass. Extract seam → run the verification for that seam → commit → next. A half-finished extraction left in place is worse than none.
- **Parity, not improvement.** This is a pure refactor. Do not rename props, change defaults, "tidy" behaviour, or drop any feature while moving it. If you find a bug, leave it and note it — do not fix it inside the move.
- **Replace, don't layer (and prove it).** After each extraction the parent file must be **smaller** by roughly the moved block. If `PlaygroundCanvas.tsx`'s line count didn't drop, you layered instead of replaced — revert and redo. Do not keep a copy of moved logic in the parent.
- **If you cannot exercise a seam's verification, do not extract it.** Skip it and report, rather than extracting blind. Partial, verified progress is the goal — not a complete-but-untested rewrite.
- **Shared refs are the trap.** Many blocks read/write the same `useRef`s and closures. Pulling a block into a hook means passing those as params/return values — not reaching back into the parent. If an extraction would require the hook to mutate a parent ref directly, the seam is wrong; leave it for a later pass.
- **Do not finish-by-deleting.** If time or context runs short, stop at the last verified seam. Never delete remaining un-extracted logic to "clean up."

## Dependency classification

Almost everything here is **in-process** (React state, refs, in-memory node arrays) or **local-API** (`fetch('/playground/api/...')`). There is no true-external dependency. So most extractions are plain hook/function extractions tested in-process; the API calls can stay as direct `fetch` calls behind each hook's interface (one adapter today → no port needed yet; see README seam discipline).

## Target seams (extract in this order — earlier ones de-risk later ones)

Each becomes a custom hook (`hooks/`) or pure module (`lib/`). The component calls them; it does not inline their bodies.

1. **`lib/canvas-persistence` is already partly extracted** — finish the job. Move any remaining load/save/scope-key logic out of the component into it. Interface: `loadCanvasState(scopeKey)`, `saveCanvasState(scopeKey, state)`, `GenerationInfo` types. (Lines ~436–442 note prior moves.)

2. **`hooks/useGenerationLifecycle`** — the single biggest win. Absorb: generation start dispatch, skeleton creation, the SSE subscription (lines ~1599–1639), the poll fallback (~1574), `handleGenerationComplete`, the reconcile effect (~667–727), resume-after-reload (~1639–1663), the generation timer + orphan-skeleton safety timeout (~628–665), and `generationInfo` ref management.
   - **Interface (small):** `const gen = useGenerationLifecycle({ nodes, setNodes, ... });` exposing `gen.isGenerating`, `gen.start(payload)`, `gen.cancel()`, and emitting iteration nodes via a callback. Hide all the SSE/poll/timer machinery behind it.
   - **Test surface:** drive `start()` with a fake event source / fetch and assert the emitted iteration nodes — without mounting React Flow.

3. **`lib/iteration-scan`** — the tree-aware scanning + positioning logic (lines ~1045–1574): `findIterationNodeByFilename`, position calc (~1052–1088), and the three scan variants (HTML ~1143, on-canvas JSX ~1252, React ~1362). Make these **pure functions** that take `(nodes, generationInfo, scanResults)` and **return** new nodes/edges to add — no side effects, no `setNodes` inside. This is the most testable extraction; favour it.

4. **`hooks/useDragToIterate`** — there is already a `hooks/useDragToIterate.ts`; the handler at lines ~2089–2348 in the component duplicates/overlaps it. Consolidate so the drag-to-iterate flow lives in the hook, not the component.

5. **`hooks/useChatSubmit`** — the cursor-chat submit handler + queue (lines ~2349–2646, plus the with-target / visualise-plan / freeform branches through ~3770). Interface: `submit(payload)` that internally routes to the right generation. Keep the queueing behaviour behind the interface.

6. **`lib/canvas-paste`** — the paste handler (lines ~3985–4662): image paste, JSX paste, single-line-URL → iframe, HTML paste. Extract as pure-ish handlers returning the node(s) to create from a `ClipboardEvent`/payload, so paste parsing is testable without the DOM clipboard.

7. **`hooks/useCanvasKeyboard`** — keyboard handling effects. Move shortcut wiring into one hook with a clear map of key → action.

8. **Draw/shape rubber-band handlers** (lines ~800–1045) — extract into `hooks/useCanvasDrawTool` (rect/ellipse/line/pen pointer math in flow coords). Pure geometry + a thin pointer-listener shell.

9. **`CanvasPresenceLayer`** (lines ~307–439) is already a sub-component — move it to its own file under `components/canvas/`.

## Method (per seam)

1. Identify the closure/refs the block reads and writes. Make them the hook's **parameters and return value** — do not reach back into the parent via shared mutable refs (that defeats the seam).
2. Move the block out. The component now **calls** the hook/function. The file shrinks by that block — verify it did (replace, don't layer).
3. Where logic is pure (scanning, paste parsing, positioning, geometry), make it a pure function in `lib/` and write a small test that exercises it directly. **The interface is the test surface** — if you can't test it without React Flow, the seam is in the wrong place.
4. Behaviour must not change. Each extraction is a separate commit so a regression bisects cleanly.

## Extraction gate (run after each seam)

If Task 06 ran first this file lives in `app/`, so a block moved into `hooks/`/`lib/`/`components/canvas/` changes import depth — **recompute each carried import, don't assume**. Fix them **to the end of the moved block** (Operating Rule 1 — the batch-B agent stopped ~40 imports in on this very file), then on each new file:
```
git grep -nE "from '\.\.?/(lib|nodes|prompts|hooks|components|server|ui|registry|skills|data)" -- <new-file>
```
Every hit must resolve. The parent must **import** the seam (no leftover copy) and shrink by the moved block — that is the replace-don't-layer proof.

## Verification (exercise every seam after each extraction)

- Generate iterations via the chat bar and via drag-to-iterate → skeletons appear, real iterations replace them progressively (SSE), tree edges connect correctly.
- Reload mid-generation → state resumes (resume-after-reload seam).
- Let a generation hang past the safety timeout → orphan skeletons clean up.
- Paste: an image, a JSX snippet, a URL, an HTML blob → each creates the right node.
- Draw rect/ellipse/line/pen; keyboard shortcuts; minimap; persistence across reload.
- Presence layer still renders.

## Done when

`PlaygroundCanvas.tsx` is an **assembler**: it composes hooks and renders React Flow, with the heavy logic living behind small interfaces in `hooks/` and `lib/`, each independently testable, and canvas behaviour unchanged. Target: the top-level component well under ~800 LOC, with the extracted modules each cohesive and deep.

## Do NOT

- Do not change canvas UX or generation behaviour — pure refactor.
- Do not extract by line-count into arbitrary chunks; extract by responsibility/seam.
- Do not keep a copy of moved logic in the parent (layering). The parent must call the new module.
- Do not touch `@xyflow/react` semantics or `lib/canvas-flow.tsx`.
