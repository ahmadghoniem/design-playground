# Execution Batches

How to work the refactor tasks in **related groups**, two-ish at a time, so each batch is a single review + commit unit. Run batches top to bottom — later batches assume earlier ones landed. Within a batch, do the tasks in the listed order.

Each batch lists: the tasks, why they're grouped, the dependency reason for its position, and **how to commit** (one commit or split). After a batch, run every task's zero-grep gate and verification before committing.

> **Commit hygiene (reviewer note).** Agents pre-stage their work: a `git mv` or `git rm` lands in the **index** before you review. So when you commit a batch, first run `git status` and check the **staged** set — do not use a narrow `git add <path>` that silently inherits already-staged renames/deletes into an unrelated commit (this happened once: a store-move rename rode into a docs commit). Either `git reset` to unstage everything and re-add deliberately, or `git add -A` and commit the whole batch as one intended unit. Verify `git show --stat HEAD` after committing.

---

## Batch A — Quick wins (01–05) ✅ DONE

Already implemented and reviewed. Committed as four commits:
- `refactor(canvas): remove highlighter draw tool` (01)
- `refactor(discovery): drop auto-scan on first playground visit` (02)
- `refactor(skills): move skill-bubble helpers from lib to ui` (03)
- `chore: untrack canvas-components stub + drop orphaned PricingCard` (04 + 05)

Reference for how a batch closes out.

---

## Batch B — Restructure moves (06 + 07) ✅ DONE

Landed as `5f47a65 refactor(structure): relocate shell files to app/ and rename iteration route` (DeepSeek; review fixed 32 imports it left un-re-depthed in `PlaygroundCanvas`/`PlaygroundClient`).


**Tasks:** 06 (move shell files out of root) → 07 (rename `iterations/[slug]/` route).
**Why grouped:** both are pure file relocations and both touch `dev-entry.tsx`'s import block. Doing them together means one rewrite of `dev-entry.tsx` and one mental model ("we are moving files, fixing relative imports").
**Order:** 06 first (establishes `app/`), then 07 (rename within `iterations/`). 07's `[slug]` page imports may shift again if 06 moved its siblings — do 06's `dev-entry` rewrite, then 07's.
**Position:** first restructure batch. Must precede Batch C (stores reference `iterations/[slug]` and shell paths) and Batch G's Task 17 (depends on 06).
**Commit:** **one commit** — `refactor(structure): relocate shell files to app/ and rename iteration route`. They're a single coherent "tidy the file tree" change; the diff is almost entirely moves + import-path fixes.
**Gate before commit:** both tasks' zero-grep gates empty; `/playground` boots and `/playground/iterations/:slug` renders.

---

## Batch C — Store relocation (08) ✅ DONE

Landed as `0caf51f refactor(stores): move zustand stores out of lib into stores/` (Qwen 3.7 Max; reviewed defect-free — all 26 importers repointed at correct depth, even one the spec table missed).


**Task:** 08 (move 8 Zustand stores `lib/` → `stores/`). **Solo** — it is mechanical but spans ~30 import sites; pairing it would muddy the review.
**Position:** after Batch B (so `iterations/[slug]` → renamed path and shell paths are settled — Task 08's importer table calls this out). Before Batch D only matters for `flow-mocks-store` (see note in Task 08).
**Commit:** **one commit** — `refactor(stores): move zustand stores out of lib into stores/`.
**Gate:** Task 08's three-line zero-grep gate must be empty (a missed importer can hide behind a barrel — the grep is the real check, not the build).

---

## Batch D — Excise the signup-Flow feature (09) ✅ DONE

Landed as `4ffffbe feat(canvas)!: remove signup-flow decompose feature`. Qwen 3.7 Max did the deletes + the easy integration points (constants, server, header) but **stopped before the hard surgical cleanups** (the decompose handler in PlaygroundCanvas, the Decompose chip in ComponentNode, the canonical-stage UI in IterationNode), leaving three files importing deleted modules. A Sonnet sub-agent finished those three files, fixed a garbled tail Qwen left in ComponentNode, and auto-committed; review confirmed both gates zero, React Flow untouched, no orphaned locals/imports.


**Task:** 09 (remove the whole signup-Flow demo). **Solo** and **high-risk**.
**Position:** **before all deepening batches.** It deletes integration points inside `PlaygroundCanvas`, `IterationNode`, `PlaygroundHeader`, `ComponentNode`, `constants` — so doing it first means Batches E–H deepen *less* code, and tasks 10/15/17 (which list 09 as a pre-req) are unblocked.
**Commit:** **one commit** — `feat(canvas)!: remove signup-flow decompose feature`. (One atomic excision; a partial commit would leave a non-compiling tree.)
**Gate:** Task 09's sweep grep returns zero; React Flow provably untouched; playground runs with no flow UI.

---

## Batch E — Chat input stack (13 + 18) ✅ DONE

Landed as two commits (Sonnet sub-agent; reviewed defect-free): `32c58eb refactor(inline-reference): split DOM engine + context` then `a0e484a refactor(chat): extract attachments + dock-proximity hooks`. Review confirmed both extraction gates empty, all relative imports re-depthed and resolving, public exports (`InlineReference`/handle/`OnSelectItemResult`) stable for the `DockedChatBar` consumer, and replace-not-layer (parents import, no duplicate defs). Parent shrinks: inline-reference 1100→873, DockedChatBar 843→694 (both above the task's soft LOC targets — the residue is irreducible contenteditable/React glue, not un-extracted seams).

**Tasks:** 13 (deepen `inline-reference`) → 18 (deepen `DockedChatBar`).
**Why grouped:** 18 **consumes** 13 — `DockedChatBar` imports `InlineReference`/`InlineReferenceHandle`. Deepening the engine then its main caller in one batch keeps the shared interface stable across the pair.
**Order:** 13 first (stabilize the `ui/inline-reference` exports), then 18.
**Commit:** **two commits**, reviewed together — `refactor(inline-reference): split DOM engine + context` then `refactor(chat): extract attachments + dock-proximity hooks`. (Two distinct modules; keep history granular but land them in one review.)
**Gate:** contenteditable pills/triggers/caret unchanged (13); attachments + dock behaviour unchanged (18).

---

## Batch F — Iteration surfaces (12 + 15) ✅ DONE

Landed as two commits (Sonnet sub-agent; reviewed defect-free): `0587cb6 refactor(iterate-dialog): extract dropdowns/icons/grid-math/state` then `aea0fb2 refactor(iteration-node): extract adoption + screenshot hooks`. Review confirmed both extraction gates empty, all imports resolve, submit payload + adoption API contract + `Name.iteration-N.tsx` scheme intact, and `IterateDialogParts.tsx` is a re-export shim covering all 5 consumer imports (replace-not-layer). The agent also removed a **pre-existing corrupt duplicate JSX tail** in `IterationNode.tsx` (a second `export default` with stray top-level markup) that had ridden into `4ffffbe` and went unbuilt since the package is local-dev-only — folded into the Task 15 commit and called out in its message. Parent shrinks: IterateDialog 1117→819, IterationNode 845→670 (both above soft targets — `handleRunWithCursor`/React-Flow-bound geometry couldn't be lifted without context; a future pass could add a `useIterateDialogSubmit` hook).

**Tasks:** 12 (deepen `IterateDialog`) + 15 (deepen `IterationNode`).
**Why grouped:** both are the node-iteration UI; they share the iteration payload/filename contract and are reviewed best side by side.
**Order:** either; 15 **requires Batch D done** (it drops stage wiring). Do 12 then 15.
**Commit:** **two commits**, one review — `refactor(iterate-dialog): …` and `refactor(iteration-node): …`.
**Gate:** iterate dialog produces correct ghost-grid skeletons (12); adopt/iterate/screenshot flows intact, no stage refs (15).

---

## Batch G — Header + panels (11 + 16 + 17) ✅ DONE

Landed as three commits (Sonnet sub-agents; reviewed defect-free): `d859db3 refactor(design-system-modal): split CLI hook + per-section files` (1604→305), `e77a831 refactor(sidebar): extract tree math, cards, discovery-sync; fix node focus` (868→467), `6802043 refactor(header): extract open-in/presence/project hooks, unify display-name` (756→352). Review confirmed: all imports resolve (untracked files need plain `grep`, not `git grep`); no section issues a `fetch` (Task 11); discovery buttons preserved (Task 16); display-name helper has exactly one definition with both header and canvas importing it (Task 17). **Bonus fix in 16:** `FOCUS_NODE_EVENT` was a dead CustomEvent with no listener — double-click "focus node" did nothing. Since the sidebar is inside `<ReactFlowProvider>`, replaced the event bridge with `hooks/useFocusNode.ts` → `useReactFlow().fitView({nodes:[{id}]})` (native API), restoring the feature; constant removed. **Flagged, NOT fixed (pre-existing, out of scope):** `../assets/cursor-icon.svg` is a dangling import (asset missing since `055acbd`), carried forward unchanged into `hooks/useOpenIn.ts` — candidate for a separate cleanup.

**Tasks:** 11 (DesignSystemModal) + 16 (PlaygroundSidebar) + 17 (PlaygroundHeader).
**Why grouped:** three independent chrome-surface deepenings with no interdependencies — a natural "deepen the shell UI" review. (This batch is three, not two; split into 11+16 then 17 if you prefer strictly two at a time.)
**Position:** 17 **requires Batch B (06)** for its new path and **Batch D (09)** for flow removal — so this batch comes after both. 11 and 16 have no prereqs.
**Commit:** **three commits**, one review — one per file.
**Gate:** each modal/panel/header behaves identically; Task 17's display-name helper is de-duplicated with the canvas (don't leave two copies).

---

## Batch H — Server route (14) ✅ DONE

Landed as `12d8eca refactor(server): extract lockfile/watcher/timer/jsonl from generate route` (897→539; Sonnet sub-agent, reviewed defect-free). Four pure/testable Node modules under `server/lib/`: `claude-jsonl.ts` (pure, zero relative imports), `generation-lockfile.ts`, `generation-file-watcher.ts`, `generation-timer.ts`. Review confirmed the SSE contract (`streamSSE`/`writeSSE`/`stream.onAbort`) and module-scope singletons (`generationEvents` EventEmitter, `currentProcess`, lockfile recovery on load) are byte-for-byte unchanged. No test runner exists in the repo, so the pure jsonl helpers were verified by reading rather than a new test file (the task allows this fallback).

**Task:** 14 (deepen `generate.ts`). **Solo** — server-side, independent of all UI batches.
**Position:** anywhere after Batch D (its lockfile/JSONL logic is untouched by the excision, but keeping it after D avoids interleaving server + flow edits). Can run in parallel with E–G in a separate session.
**Commit:** **one commit** — `refactor(server): extract lockfile/watcher/jsonl from generate route`.
**Gate:** SSE contract unchanged; `claude-jsonl` unit-tested; orphan-lock recovery still works.

---

## Batch I — Canvas god-module (10) 🟡 PARTIAL (5 of ~9 seams)

Three verified seams landed first (Sonnet sub-agent, one commit each; 5664→5482 LOC): `8cfdfd7` extract `CanvasPresenceLayer` → `components/canvas/CanvasPresenceLayer.tsx`; `72f2042` finish `lib/canvas-persistence` (`getCanvasStorageKey`, dedupe the storage-key ternary); `f639bf4` extract the pure scan helpers (`isInExpectedBatch`, `getSkeletonIdForFileIteration`, `resolveIterationPosition`, `countBatchIterationNodes`) → `lib/iteration-scan.ts`.

**Two more verified seams landed 2026-06-30 (Opus, one commit each; 5479→5302 LOC):**
- `0b2c19b` **seam 8** — extract `hooks/useCanvasDrawTool.ts` (freehand-ink + drag-to-draw-shape pointer effects). Pure listener-shell: every piece of canvas state it touches is passed in, never reaches back into the parent. Also folded in the pre-existing garbled duplicate-closing-tag tail fix that was sitting unbuilt in the working tree.
- `bf51899` **seam 6** — extract `lib/canvas-paste.ts` (`classifyClipboard` → `PasteIntent`, and `nextFrameNumber`, which was duplicated across the JSX and HTML branches). The handler keeps the I/O orchestration (upload/PUT/insert) because it is entangled with `getNodeId`/`setNodes`/`screenToFlowPosition` — node insertion may stay in the parent per the brief. Both verified by reading (pure functions; no test runner in repo).

**Still deferred — the 4 mutually-entangled stateful seams** (2 generation-lifecycle, the stateful tail of 3 iteration-scan, 4 drag-to-iterate consolidation, 5 chat-submit). These all read **and write** the same 5 coordination refs — `generationInfoRef`, `nodesRef`, `scanContextOverrideRef`, `isGeneratingRef`, `knownIterationsRef` (68 read/write sites in the file as of 2026-06-30) — plus `nodeIdCounterRef`/`getNodeId()` and the `setNodes`/`screenToFlowPosition` closures. Pulling any one into a hook would force the hook to mutate parent refs that other still-in-parent handlers also mutate — the brief's explicit "if a seam needs to mutate a parent ref, the seam is wrong" condition. They need a **prerequisite pass that consolidates ref ownership** (e.g. a single `useGenerationState` that owns generationInfo/nodes/scan refs and exposes typed accessors) before the lifecycle/scan/chat/drag seams can be lifted. Their SSE/poll/reconcile/resume-after-reload/timeout behaviour also can't be verified by reading alone — they need the running host canvas, which the brief requires before extracting (`If you cannot exercise a seam's verification, do not extract it`). Seam 7 (keyboard) is mechanically extractable but its goal is to *consolidate* the scattered `window` keydown listeners into one map; merging independent listeners changes the order handlers observe events, a parity risk that also wants live verification. **Deferred React Flow modernizations** (kept out of the parity refactor): `getNodesBounds()` for the manual frame-bounds `Math.min/max`, and `updateNode`/`updateNodeData` for `setNodes(map)` — see [[reactflow-port-pattern]].

**Post-refactor dead-code audit (batches E–H, 4 parallel agents):** Batch G clean; fixes committed — `4589146 chore(server): remove dead stat/cancellation state` (dead `readNewFileLineTotals`/`combineLineStat` + 4 write-only vars; watcher `onIterationFile` made optional) and `1541818 chore(ui): remove dead code` (4 zero-consumer legacy dropdowns from iterate-dialog/parts.tsx, the never-wired `useChatDockProximity.onExpand`, de-export `PILL_VALUE_ATTR`). **Known issue left as-is (owner decision):** `hooks/useOpenIn.ts` imports `../assets/cursor-icon.svg` which is missing since `055acbd` — `'cursor'` is the default Open-in target, so it needs a real asset/decision, flagged not fixed.

**Task:** 10 (deepen `PlaygroundCanvas.tsx`). **Solo, last, largest.**
**Position:** **last.** It depends on Batch D (09) and benefits from B (06 moved its path) and F (12's payload). Doing it last means the most surrounding code is already settled.
**Commit:** **one commit per extracted seam** (the task mandates stop-and-verify per seam). Land them as a sequence under one review, e.g. `refactor(canvas): extract generation lifecycle`, `… extract iteration-scan`, `… extract paste handling`, etc.
**Gate:** each seam's verification passes before its commit; parent file shrinks per extraction (replace, don't layer).

---

## Dependency summary

```
B (06→07) ──┬─→ C (08)
            ├─→ G:17 (header)
            └─→ I (10, canvas)

D (09) ─────┬─→ F:15 (iteration-node)
            ├─→ G:17
            └─→ I (10)

E:13 ──→ E:18
```

Everything not shown is independent. Suggested session pairing for "two at a time":
**B**, then **C**, then **D**, then **E (13+18)**, **F (12+15)**, **G (11+16, then 17)**, **H (14)**, **I (10)**.
