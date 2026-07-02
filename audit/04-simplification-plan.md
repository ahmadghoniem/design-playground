# 04 — Simplification Plan

> **Status (2026-07-02): executed.** S1 done in full. S2 decisions: evals purged
> (to be rebuilt properly later), dev mode removed (gated buttons now always visible),
> presence bubbles removed (incl. dead CSS + orphaned `agent-preview` SSE pipeline),
> docs kept for now, draw tool + skills catalog kept. S3 done (icons consolidated into
> `playground-nav-icons.tsx`; `chat-icons.tsx` + `iterate-dialog/icons.tsx` deleted).
> Prompts de-Next-ified (framework-agnostic rewording, export surface unchanged).
> S4 done: 8 dead constants deleted (`ARRANGE_VERTICAL_GAP`, `ARRANGE_GROUP_GAP`,
> `ITERATION_HORIZONTAL/VERTICAL_*`, `POST_GENERATION_ARRANGE_DELAY`, `SKELETON_ARRANGE_DELAY`,
> `STYLING_MODE_OPTIONS`, `DRAG_OVERLAY_PADDING_X/Y`); 12 single-consumer `ARRANGE_*` values
> inlined into `canvas-auto-arrange.ts`; `ARRANGE_FITVIEW_DELAY`/`COPIED_FEEDBACK_DURATION`
> inlined at call sites; orphaned `flowPaddingFromScreen` helper deleted.
> S5 done: `IterateDialogParts.tsx` shim folded into `iterate-dialog/parts` (3 importers
> repointed), no-op `app/layout.tsx` inlined into `dev-entry.tsx` (CSS imports moved).
> Kept in constants.ts (multi-consumer, contra the audit's guess): `ARRANGE_HORIZONTAL_GAP`
> (4 consumers), `POST_GENERATION_SCAN_DELAY` (2 consumers).

The actionable list. Grouped into batches ordered by risk: each batch is one review +
one commit. "Gate" = the grep that must return nothing before committing (same discipline
as the old `refactor/` batches).

Legend: 🟢 safe delete · 🟡 decide first · 🔴 keep

---

## Batch S1 — Zero-risk deletions (no behavior change possible)

| # | Action | Paths |
|---|---|---|
| 1 | 🟢 Delete orphaned component | `components/BrowseShell.tsx` |
| 2 | 🟢 Delete orphaned Next.js leftover | `app/loading.tsx` |
| 3 | 🟢 Delete dead highlight CSS block + stale comment | `styles/playground-global.css:413-423`, fix comment `:397` |
| 4 | 🟢 Delete dead constant | `STYLING_MODE_OPTIONS` in `lib/constants.ts:295` (keep `DEFAULT_STYLING_MODE` + type) |
| 5 | 🟢 Delete `= 0` constants, inline the zero | `DRAG_OVERLAY_PADDING_X/_Y` in `lib/constants.ts:604-605` |
| 6 | 🟢 Strike stale README cleanup section (items already done) | `README.md:199-212` |
| 7 | 🟢 Strip remaining `"use client"` directives (11 files) | see `03-code-hygiene.md` §3 list |
| 8 | 🟢 Fix stale comments claiming `'use client'` is prepended | `lib/jsx-utils.ts:24-45` |
| 9 | 🟢 Delete dead server handler | `screenshot.ts` GET @ `server/routes/screenshot.ts:25` |

**Gate:** `git grep -n "BrowseShell\|STYLING_MODE_OPTIONS\|DRAG_OVERLAY_PADDING\|use client"` → only intended survivors (prompt/doc strings).

## Batch S2 — Feature decisions (🟡 pick before executing)

These are working features. Decide want/don't-want; each row lists the full removal surface.

| Feature | What it does | Removal surface if cut |
|---|---|---|
| **`evals/` harness** | manual CLI eval of the discovery prompt (LLM judge). No UI/runtime reachability, no working script. | delete `evals/` (6 files). Nothing else references it. |
| **Dev mode** | hidden right-click toggle on header sliders button revealing extra buttons (Clear all/Eraser…) | `stores/dev-mode-store.ts`; wiring in `app/PlaygroundHeader.tsx:15,67-68,228-242,254-264,384-415`; `DEV_MODE_STORAGE_KEY` in `lib/constants.ts:95`. Decide fate of "Clear all" (always-visible vs gone). |
| **Presence bubbles** | fake-presence cursors/bubbles — odd for a **single-player** app | `hooks/usePresenceBubbles.ts`, `hooks/useCanvasPresenceBubbles.ts`, `components/canvas/CanvasPresenceLayer.tsx`, `components/canvas/PlaygroundHeaderPresence.tsx`, call sites in `PlaygroundHeader.tsx` + `PlaygroundCanvas.tsx` |
| **`docs/` folder** | human-facing docs; nothing imports them | prune freely EXCEPT `docs/iterations/guide.mdc` (named in 5 generation prompt strings — keep it or fold its content into the prompts and then delete) |
| **Draw tool** (if unwanted) | freehand pen + shapes on canvas | `useCanvasDrawTool`, `playground-draw-store.ts`, `PlaygroundCanvasDrawLayer.tsx`, `DrawStrokePaths.tsx`, `ShapeToolGroup.tsx`, `lib/draw-types.ts`, related CSS |
| **Skills catalog** (if unwanted) | skills CRUD modal + iterate-dialog skill picker | `server/routes/skills.ts`, `useSkills`, `useImpeccableSkillPicker`, `SkillsCatalogModal.tsx`, `impeccable-*` UI, `lib/featured-skills.ts`, `lib/impeccable-skill.ts`, `skills/` folder |

🔴 **Do NOT delete:** `prompts/` (backbone of all generation — every module imported),
any of the 13 server route modules, any of the 7 stores / 32 hooks *unless* their parent
feature above is cut.

## Batch S3 — Icon consolidation

1. Delete duplicates, keep one copy:
   - `VariationStackIcon` (`nodes/shared/iterate-dialog/icons.tsx:1`) ↔ raw SVG in `IterationCountDragger` (`components/ui/chat-bits.tsx:244-254`)
   - `ArrowUpIcon` (`icons.tsx:10`) ↔ `SendArrowIcon` (`chat-bits.tsx:112`)
   - play triangle in `nodes/ComponentNode.tsx:517` ↔ `nodes/IterationNode.tsx:477`
2. Replace with lucide equivalents: `FrameIcon`→`Frame`, `ImageRefIcon`→`ImageIcon`,
   SizeButtons "Auto"→`Scan`/`Maximize`, arrows→`ArrowUp`, play→`Play`.
3. Move remaining genuinely-custom glyphs (Explore dot-grid, VariationStack, Bracket,
   context-menu corner glyphs, toolbar cursor) into `components/ui/playground-nav-icons.tsx`.
4. Leave alone: `DrawStrokePaths.tsx`, `PlaygroundCanvasDrawLayer.tsx`, `ShapeNode.tsx`
   (real drawings, not icons), `inline-reference/dom-engine.ts` (DOM pill markup).

**Gate:** `git grep -n "<svg" -- '*.tsx'` hits only: nav-icons file, draw/shape renderers.

## Batch S4 — Constants right-sizing

1. Move the `ARRANGE_*` family (`lib/constants.ts:159-207`) into
   `lib/canvas-auto-arrange.ts` (its only consumer).
2. Inline single-use timing constants (L351-369: `ARRANGE_FITVIEW_DELAY`,
   `COPIED_FEEDBACK_DURATION`, …) at their call sites, or move next to them.
3. Keep: event names, storage keys, regexes, gitignore markers, `SIZE_CONFIG`.

**Gate:** `git grep -n "ARRANGE_" -- lib/constants.ts` → empty.

## Batch S5 — Structural tidy (optional, do last)

1. Fold `nodes/shared/IterateDialogParts.tsx` into `nodes/shared/iterate-dialog/`
   (repoint `useAvailableModels` importers: `DockedChatBar.tsx:15`,
   `ModelSettingsModal.tsx:10`, `hooks/useModelCycle.ts:5`).
2. Inline the no-op `app/layout.tsx` into `dev-entry.tsx`.
3. Fix the dangling `../assets/cursor-icon.svg` import in `hooks/useOpenIn.ts`
   (asset missing since `055acbd`) — restore the asset or drop the import.
4. Consider consolidating `usePresenceBubbles` + `useCanvasPresenceBubbles`
   (if presence survives Batch S2).
5. Update `lib/jsx-prompts.ts:58` ("keep the 'use client' directive") for Vite.

## Verification (applies to every batch)

No standalone build exists. Per `CLAUDE.md`:
1. `git grep` gates above (the real check).
2. Host app `bun dev` → open `/playground` → exercise the touched surface
   (canvas loads, iterate dialog opens, chat submits, sidebar tree renders).
3. `bunx tsc --noEmit` from the host if available; `react`/`vite` module-not-found
   errors in isolation are environmental, not real.
