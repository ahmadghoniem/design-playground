# Codebase Audit — design-playground (2026-07-02)

A feature-by-feature inspection of the codebase, produced to answer one question:
**what can be deleted or simplified before new features are added?**

Every claim below was produced by a full-repo scan and the high-impact ones were
re-verified by hand (grep + read) on 2026-07-02.

## How to read this

| File | What's in it |
|---|---|
| [01-features-and-routes.md](01-features-and-routes.md) | What `/evals`, `/prompts`, `/docs` actually are; full server-route and client-route inventory; which endpoints are dead |
| [02-state-and-hooks.md](02-state-and-hooks.md) | All 7 zustand stores (incl. `dev-mode-store`), all 32 hooks with their feature clusters, and the exhaustive highlight-tool remnant sweep |
| [03-code-hygiene.md](03-code-hygiene.md) | Inline-SVG-in-TSX offenders + duplicates, `lib/constants.ts` over-extraction assessment, remaining `"use client"` directives and Next.js-isms, orphaned components |
| [04-simplification-plan.md](04-simplification-plan.md) | **The actionable file.** Ranked delete/keep/decide list with exact paths, grouped into safe batches |
| [overview.html](overview.html) | Single-page visual dashboard of all of the above, for skimming in a browser |

## Headline numbers

- **2** client routes total (`/` canvas, `/iterations/:slug` isolated preview)
- **13** server route modules — all alive; **1** dead handler (`screenshot.ts` GET)
- **7** zustand stores — all consumed; `dev-mode-store` is a hidden right-click toggle
- **32** hooks — all consumed, zero orphans, but several die with their feature
- **28** inline SVG icons across **13** files, at least **4** exact duplicates, despite `lucide-react` being used in 28 files
- **11** files still carrying `"use client"` (the removal pass missed them)
- **~130** exported constants in `lib/constants.ts` (807 lines); ~30% is single-use over-extraction, 1 export is outright dead
- **2** orphaned components: `components/BrowseShell.tsx`, `app/loading.tsx`
- **3** highlight-tool leftovers (1 dead CSS block, 1 stale comment, 1 stale README TODO)

## Context: what was already cleaned

The (now-deleted) `refactor/` folder in git history records batches A–I already done:
highlighter draw tool removed, signup-Flow feature excised, stores moved to `stores/`,
shell files moved to `app/`, god-modules split (PlaygroundCanvas 5848→~2900 LOC).
This audit covers what those passes **left behind** plus features never assessed.
