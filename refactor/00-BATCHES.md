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

## Batch E — Chat input stack (13 + 18)

**Tasks:** 13 (deepen `inline-reference`) → 18 (deepen `DockedChatBar`).
**Why grouped:** 18 **consumes** 13 — `DockedChatBar` imports `InlineReference`/`InlineReferenceHandle`. Deepening the engine then its main caller in one batch keeps the shared interface stable across the pair.
**Order:** 13 first (stabilize the `ui/inline-reference` exports), then 18.
**Commit:** **two commits**, reviewed together — `refactor(inline-reference): split DOM engine + context` then `refactor(chat): extract attachments + dock-proximity hooks`. (Two distinct modules; keep history granular but land them in one review.)
**Gate:** contenteditable pills/triggers/caret unchanged (13); attachments + dock behaviour unchanged (18).

---

## Batch F — Iteration surfaces (12 + 15)

**Tasks:** 12 (deepen `IterateDialog`) + 15 (deepen `IterationNode`).
**Why grouped:** both are the node-iteration UI; they share the iteration payload/filename contract and are reviewed best side by side.
**Order:** either; 15 **requires Batch D done** (it drops stage wiring). Do 12 then 15.
**Commit:** **two commits**, one review — `refactor(iterate-dialog): …` and `refactor(iteration-node): …`.
**Gate:** iterate dialog produces correct ghost-grid skeletons (12); adopt/iterate/screenshot flows intact, no stage refs (15).

---

## Batch G — Header + panels (11 + 16 + 17)

**Tasks:** 11 (DesignSystemModal) + 16 (PlaygroundSidebar) + 17 (PlaygroundHeader).
**Why grouped:** three independent chrome-surface deepenings with no interdependencies — a natural "deepen the shell UI" review. (This batch is three, not two; split into 11+16 then 17 if you prefer strictly two at a time.)
**Position:** 17 **requires Batch B (06)** for its new path and **Batch D (09)** for flow removal — so this batch comes after both. 11 and 16 have no prereqs.
**Commit:** **three commits**, one review — one per file.
**Gate:** each modal/panel/header behaves identically; Task 17's display-name helper is de-duplicated with the canvas (don't leave two copies).

---

## Batch H — Server route (14)

**Task:** 14 (deepen `generate.ts`). **Solo** — server-side, independent of all UI batches.
**Position:** anywhere after Batch D (its lockfile/JSONL logic is untouched by the excision, but keeping it after D avoids interleaving server + flow edits). Can run in parallel with E–G in a separate session.
**Commit:** **one commit** — `refactor(server): extract lockfile/watcher/jsonl from generate route`.
**Gate:** SSE contract unchanged; `claude-jsonl` unit-tested; orphan-lock recovery still works.

---

## Batch I — Canvas god-module (10)

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
