# Refactor Tasks — design-playground

A batch of self-contained refactor briefs for autonomous coding agents (run so far on DeepSeek V4 Pro and Qwen 3.7 Max). Each file is one task. Each task is written to be picked up **cold** — no shared memory with the others beyond this README. The operating rules below were hardened from real agent failures on earlier batches and apply to whichever model runs the task.

## Read this first (every agent)

This repo is `design-playground`: a **local-dev-only** design canvas that embeds into a host React app's Vite dev server. It is never built in CI/prod. See `CLAUDE.md` at the repo root for architecture, route conventions, and gotchas — **read it before touching anything**.

Key facts that affect every task:

- **No root `tsconfig.json`.** The host compiles the TS. `react`, `react-dom`, `tailwindcss`, `vite` are `peerDependencies` and resolve only inside a host app. So `Cannot find module 'react'` / `'vite'` errors when typechecking in isolation are **environmental, not real** — do not "fix" them.
- **Client fetch paths are hardcoded** to `/playground/api/...` across `.tsx` files. If you move a file, the string paths do not change — but keep server route paths in sync if you touch them.
- **Bun, not npm.** Commands use `bun`. There is no standalone dev script — the playground runs inside the host's `bun dev`.
- The word **"flow"** is overloaded. `@xyflow/react` ("React Flow") is the canvas engine and is **core** — never touch it. The **signup-Flow feature** (Task 09) is a separate demo feature: `FlowSimulator`, `StageNode`, `MockDataPanel`, `lib/flows/`. Read Task 09 carefully to tell them apart.

## Shared vocabulary (use these terms exactly)

These tasks use the **deep-module** vocabulary. Use the words precisely; do not substitute "component", "service", "layer", or "boundary".

- **Module** — anything with an interface and an implementation (a function, a file, a folder-slice). Scale-agnostic.
- **Interface** — everything a caller must know to use the module: the type signature *plus* invariants, ordering constraints, error modes, required config.
- **Deep module** — small interface, lots of behaviour behind it. The goal.
- **Shallow module** — interface nearly as complex as the implementation; a pass-through. The thing we remove.
- **Seam** — the place where you can swap behaviour without editing in that place; where the interface lives.
- **Leverage** — what callers gain from depth (capability per unit of interface learned).
- **Locality** — what maintainers gain from depth (change/bugs/knowledge concentrate in one place).
- **Deletion test** — imagine deleting a module. If complexity *vanishes*, it was a pass-through (delete it). If complexity *reappears across N callers*, it was earning its keep (keep it, maybe deepen it).

## Operating rules (read before EVERY task)

These exist because earlier agents on this repo failed in three specific ways. Do not repeat them.

1. **Chase the symbol across the whole repo — do not stop at the files the task names, and do not stop partway through a file.** When a task says "remove X", `git grep -n "X"` first, edit **every** hit, and re-run the grep until it returns only intended survivors. A task naming 2 files does not mean only 2 files change. A prior agent narrowed a type in one file but left a now-invalid call in another file the task didn't name — a compile error. The task's "Files that will change" list is a **minimum**, not the boundary.
   - **This rule applies *within* a file too.** When you move a file and re-depth its relative imports (`./lib/…` → `../lib/…`), fix **every** import to the **end of the file**, not just the top import block. A prior agent re-depthed the first ~40 import lines of a large moved file and abandoned the remaining ~30 — the tail resolved into a non-existent dir. Imports also hide *below* the top block (lazy `import()`, mid-file `export … from`, re-exports). After any move, run the **orphaned-import gate**: `git grep -nE "from '\./(lib|nodes|prompts|hooks|components|server|ui|registry|skills|data)" -- <moved-dir-or-file>` — every hit is either a genuine same-dir sibling or a missed re-depth. It must contain *only* real siblings.
2. **Do not over-delete. Remove only what is in scope; preserve unrelated code sharing the same block.** If a `useEffect`/function/cleanup block does two things and only one is in scope, keep the other. A prior agent deleted a whole unmount-cleanup effect to remove one timer and silently dropped an unrelated timer's cleanup. When in doubt, narrow the block, don't delete it.
3. **Finish the non-code side-channels.** A move/delete is not done until config catches up: `.gitignore`, `playground.html`/Vite wiring, `CLAUDE.md`, generated barrels. A prior agent deleted a file but left a now-dangling `.gitignore` negation. Each task lists its side-channel items — treat them as required, not optional.

**Definition of done for every task:** the named verification passes **and** the task's "zero-grep gate" (a specific `git grep` that must return nothing) is empty **and** no unrelated behaviour changed.

## How to work a deepening task (Tasks 10–18)

These split god-modules into deep modules. The recipe:

1. **Extract by seam, not by size.** Don't slice a 900-line file into three 300-line files arbitrarily. Find a coherent responsibility (e.g. "generation lifecycle", "paste handling") and pull it behind one small interface.
2. **The interface is the test surface.** A good extraction is one you could test without reaching past its interface.
3. **Classify dependencies** before extracting: *in-process* (pure compute/in-memory — extract freely), *local-substitutable* (fs, localStorage), *remote-owned* (the Hono API — inject as a port if it varies), *true-external* (none here). Most extractions here are in-process or call the local `/playground/api`.
4. **Replace, don't layer.** When you pull logic out, the original file should *call* the new module — it should not keep a copy. The extraction must make the parent file shrink.
5. **Behaviour must not change.** These are refactors. No feature changes, no UX changes, unless the task says so.
6. **Re-depth every import you carry into the new file, and run the orphaned-import gate.** When you move a block from e.g. `nodes/IterationNode.tsx` into a new `hooks/useIterationAdoption.ts` or a deeper `nodes/shared/iterate-dialog/dropdowns.tsx`, every relative import that came with it changes depth — `'../lib/x'` may become `'../../lib/x'`, `'./Foo'` may become `'../Foo'`. Fix them **all the way to the end of the moved block** (see Operating Rule 1 — agents have stopped partway), then on each new file run `git grep -nE "from '\.\.?/(lib|nodes|prompts|hooks|components|server|ui|registry|skills|data)" -- <new-file>` and confirm every hit resolves to a real path. The parent must now **import** the extracted module (Replace, don't layer) — a copy left behind means you layered.
7. **Keep public exports stable for cross-task consumers.** Some files are imported by another task's target (`ui/inline-reference` → `DockedChatBar`; the iterate-dialog payload → the canvas lifecycle). When you split such a file, re-export the existing public names from the original path so the consumer keeps compiling. The task's "Coordination" note names these — honour it.

## Verification (no standalone build exists)

There is no `bun run build`/`bun test` for this package in isolation. To verify a change:

1. `bunx tsc --noEmit` from a **host** app that mounts the playground, if available; otherwise rely on the host dev server.
2. Start the host's `bun dev`, open `/playground`, and exercise the touched surface manually (the task's **Verification** section lists what to click).
3. `git grep` for every symbol/path you moved or deleted to prove there are no dangling references. This is mandatory for delete/move tasks.

## Execution plan

See **[00-BATCHES.md](00-BATCHES.md)** for how to work these in related groups (two-ish at a time), the dependency order, and what to commit together per batch. Batch A (tasks 01–05) is done.

## Task index

| # | Task | Type | Risk | Depends on |
|---|------|------|------|-----------|
| 01 | Remove the Highlighter tool from `ShapeToolGroup` | cleanup | low | — |
| 02 | Disable auto-scan ("Scanning your project for components") | cleanup | low | — |
| 03 | Remove `lib/skill-icons.ts` (assess: deepen vs delete) | cleanup | low | — |
| 04 | Collapse the `canvas-components/` generated stub | cleanup | low | — |
| 05 | Remove the orphaned `examples/PricingCard.tsx` | cleanup | low | — |
| 06 | Move shell/entry files out of the package root | restructure | medium | — |
| 07 | Rename the Next.js-style `iterations/[slug]/` route | restructure | low | — |
| 08 | Relocate Zustand stores out of `lib/` into `stores/` | restructure | medium | — |
| 09 | Excise the signup-Flow demo feature | excision | high | — |
| 10 | Deepen `PlaygroundCanvas.tsx` (5848 LOC god-module) | deepening | high | 09 (do after) |
| 11 | Deepen `DesignSystemModal.tsx` (1604 LOC) | deepening | medium | — |
| 12 | Deepen `IterateDialog.tsx` (1117 LOC) | deepening | medium | — |
| 13 | Deepen `ui/inline-reference.tsx` (1100 LOC) | deepening | medium | — |
| 14 | Deepen `server/routes/generate.ts` (897 LOC) | deepening | medium | — |
| 15 | Deepen `nodes/IterationNode.tsx` (872 LOC) | deepening | medium | — |
| 16 | Deepen `components/canvas/PlaygroundSidebar.tsx` (868 LOC) | deepening | medium | — |
| 17 | Deepen `PlaygroundHeader.tsx` (846 LOC) | deepening | medium | 06 (coordinate) |
| 18 | Deepen `components/chat/DockedChatBar.tsx` (843 LOC) | deepening | medium | 13 (coordinate) |

## Recommended ordering

1. **Quick wins first** (01–05): independent, low-risk, build momentum and shrink surface area.
2. **Excision next** (09): removes a whole feature, deletes integration points in the big files — do it **before** deepening `PlaygroundCanvas` (10) so you deepen less code.
3. **Restructure** (06–08): mechanical moves; do them when the file set is otherwise stable to avoid rebase churn.
4. **Deepening** (10–18): highest effort. `PlaygroundCanvas` (10) is the anchor; the rest are independent and parallelizable across agents.

## Deferred decisions (NOT tasks — do not action)

- **`lib/featured-skills.ts`** hardcodes 8 featured skills. The owner chose to **keep it as-is for now**. Do not de-hardcode or remove the skills feature.
- Any task marked with a ⚠️ **convention conflict** changes something `CLAUDE.md` documents. Those tasks include the required `CLAUDE.md` edit. Do not skip it.
