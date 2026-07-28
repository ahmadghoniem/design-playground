# Handoff — `chore/cleanup` architecture review + fixes (2026-07-26)

**Audience:** any model/human reviewing this branch next (e.g. Opus 5).
**Session scope:** review the uncommitted work on `chore/cleanup` against the
architecture roadmap plan, then apply the improvements the review produced,
then run a second defect sweep over the files the first review didn't cover
and fix what was verified real. **Nothing is committed** — everything
described here is staged/working-tree state on `chore/cleanup`.

## Source-of-truth documents

- Plan reviewed against: `~/.cursor/plans/architecture_improvement_roadmap_82cd8295.plan.md`
  (Phases 0–4: finish LLM-discovery teardown → fix seams → land static
  discovery + registry HMR → deepen god modules → guardrails)
- Discovery design: `.claude/plans/2-discovery-engine.md`
- Runtime truth: `CLAUDE.md` (AGENTS.md is a thin pointer to it — that's intentional)

## Review verdict (before fixes)

Phases 0, 1, 3, 4 landed faithfully. Phase 2 landed the static-discovery
*engine* (`server/lib/static-discovery/`), the registry HMR split, and the
reactive sidebar — but **not** the "one scan → one manifest → one codegen"
wiring: `scanRenderTree` output never reaches `writeManifest`/`regenerateModule`.
That wiring is the next architecture bet, deliberately not half-built in this
session (it needs prop/exportKind inference decisions).

## What was fixed and WHY

### 1. dependency-cruiser false negative (the most important fix)

`@pg/*` aliased imports are **not resolved to file paths** by the cruiser's
resolver — they stay as literal `@pg/...` module names. Every boundary rule
matched only resolved paths (`^features/`), so cross-feature imports via
`@pg/features/X` (the repo convention!) were invisible. `check:boundaries`
passed while an actual violation existed.

- Fix: every rule in `.dependency-cruiser.cjs` now has an **alias-form twin**
  (`no-feature-to-feature-alias`, `shared-no-features-or-app-alias`,
  `server-no-alias`). The `$1` group backreference excludes same-feature
  `@pg/features/X` → `@pg/features/X` imports.
- **Verified by canary**: a temp file `features/canvas/__boundary-canary.ts`
  importing `@pg/features/generation/prompt-builders` made the check fail with
  `no-feature-to-feature-alias`, then was deleted. Don't remove the alias
  rules thinking they're redundant — they are the *only* enforcement for
  `@pg/` imports.

### 2. The violation the broken rule was hiding

`features/iterations/useIterationAdoption.ts` imported
`@pg/features/generation/prompt-builders` (feature → feature). Adoption is an
iterations concern with exactly one consumer, so:

- `generateAdoptPrompt` + the adopt prompt template moved to
  **`features/iterations/adopt-prompt.ts`** (template + builder in one file).
- `features/generation/prompts/adopt.prompt.ts` deleted.
- The generic `fillTemplate` moved from `features/generation/prompts/utility.ts`
  (deleted) to **`shared/lib/fill-template.ts`** — it's now used by two
  features, which is the documented bar for `shared/`.
- Also removed the stale `Pick<GenerationStartPayload, "model" | "provider">`
  cast in `useIterationAdoption` — `getClaudeCodeFields()` returns neither
  field; the spread on the start event added nothing and was dropped
  (kept on the fetch body where it matters).

### 3. `useStaticScan.ts` was UTF-16 LE without BOM

Git saw it as **binary**; esbuild/Vite would mangle it. Note: the editor Write
tool *preserved* the UTF-16 encoding on rewrite — the fix required an explicit
byte-level conversion (PowerShell `ReadAllText(Unicode)` → `WriteAllText(UTF8)`).
If this file ever shows as `Bin` in `git diff` again, that's the cause.
Also dropped the hook's dead `enabled` param (was always `true`).

### 4. Registry HMR ordering bug

`registry.tsx`'s hot-update handler notified subscribers **before** rebuilding
`flatRegistry`, so a listener calling `resolveRegistryItem` synchronously saw
the stale map. `setRegistry` now rebuilds the flat lookup first, then notifies.
(`rebuildFlat` helper deleted; the accept callback is just `setRegistry`.)

### 5. Deduplication ("deepen, don't relocate")

- **`app/useChatSubmit.ts`**: one `postGenerate()` helper replaces three
  near-identical fetch/parse/emit blocks (edit / targeted explore / freeform);
  one `resolveSkillPrompt()` replaces two copies; one `getPromptNodes` closure.
  Dead `scanForIterations` param deleted (declared, passed by the controller,
  never used — it's live in `useGenerationLifecycle`, which keeps it).
- **`features/generation/prompt-builders.ts`**: private
  `buildIterationArtifacts()` replaces the 4× copied
  names/numbers/saves-block/sections code; all four builders now use
  `resolveRegistryItem` (no more raw `flatRegistry[id]` inconsistency).
- **`app/usePlaygroundCanvasController.ts`**: now calls `useReactFlow()` itself
  (it's under the same provider), dropping `getViewport`/`fitView`/
  `screenToFlowPosition` from its 26-field param surface.
- **`useGenerationCoordination.types.ts`** deleted; the params interface lives
  in the hook. The cross-feature boundary type stays in
  `shared/lib/generation-coordination.ts` — that one is load-bearing, keep it.
- **`registry-tree.ts` → `registry-children.ts`**, function renamed
  `buildRegistryChildrenMap` — ends the name collision with the unrelated
  `buildChildrenMap` in `features/canvas/canvas-relations.ts`.
- **`build-chat-prompt.ts`**: freeform raw/non-raw duplicate template branches
  collapsed to one call.
- **`server/routes/discover.ts`**: passes the already-read `HostConfig` into
  `scanRenderTree(hostRoot, cfg)` instead of parsing the host config twice.

### 6. Round-2 defect fixes (files the first review didn't cover)

- **`server/routes/generate.ts`**: spawn-failure and outer catch blocks now
  call `emitGenerationDone()` — without it a failed spawn left SSE
  subscribers hanging (close/error handlers already emitted it).
- **`server/routes/iterations.ts`**: `regenerateIndex()` used only the
  canonical `ITERATIONS_DIR` while `GET /api/iterations` merges all layout
  dirs (`resolveIterationsDirs`). It now uses the same scan; because the
  index file always lives in the canonical dir, `IterationFile` gained a
  `dir` field and the generated imports compute **relative specifiers**
  (`path.relative` from the canonical dir) instead of assuming `./`.
- **`useCanvasPersistence`**: saves are trailing-debounced (250ms) — React
  Flow updates `nodes` every drag frame and the effect was serializing the
  whole canvas to localStorage continuously. Unload is still covered by the
  existing `beforeunload` handler.
- **`useIterationAdoption`**: `handleAdoptConfirm` now guards on
  `isGlobalGenerating` (the param existed but was unused; the button's
  disabled state is event-driven and resets on reload).
- **`PlaygroundHeader`**: dead `sidebarVisible`/`onToggleSidebar` props removed
  (still used by the canvas — verified).
- **`server/index.ts`**: stale "Next.js/Express port" comments rewritten.

## Findings REJECTED after verification (don't re-fix these)

The round-2 subagent report had errors — every claim was verified by reading
code before acting:

1. **"MultiEdit parsing misses file paths"** — WRONG. Claude Code's MultiEdit
   input is `{ file_path, edits[] }` with a top-level `file_path`;
   `server/lib/claude-jsonl.ts` is correct.
2. **"Toolbar delete skips knownIterations after reload"** — WRONG.
   `deleteElements` flows through the controller's `handleNodesChange`, which
   removes iteration keys on any `remove` change. The persisted `onDelete` in
   node data is a harmless redundant path (functions are silently dropped by
   JSON.stringify).

Process note: the subagent's search tooling silently missed `features/skills/`
(glob/grep returned empty for files that exist). Verify with `Test-Path` /
direct reads when a search result seems too clean.

## Known open items (deliberate, NOT regressions)

1. **Skills catalog backend is missing — the real "critical".**
   `features/skills/SkillsCatalogModal.tsx` POSTs to
   `/playground/api/skills/add|update|remove|preview`; `server/routes/skills.ts`
   only serves `GET /api/skills`. Git history (`git log -S "skills/add"`)
   shows those routes **never existed** — the UI was built against a
   `skills`-CLI backend that was never written. Browse/URL tabs fail with a
   toast; Installed list works. Building it = spawning `npx skills` +
   GitHub preview fetch server-side. Feature work; do it deliberately.
2. **Phase-2 pipeline wiring**: scan → `writeManifest` → `regenerateModule`
   with overlay exclusion enforced at codegen. Everything exists on both
   sides of the gap; the blocker is prop/exportKind inference for scanned
   components.
3. **Next bets after that** (from the discovery plan): TypeChecker pass
   (Preview.js-style), JSX stamp behind an HMR cost measurement, sidebar
   layers UI consuming the `tree` field the API already returns.
4. **Triage-level notes**: lockfile removed before killed PID fully exits
   (`generation-lockfile.ts`); canvas clear doesn't delete uploaded images;
   `GET /api/skills` masks errors as `{ skills: [] }` + 500; `useSkills`
   cache/in-flight race; bare tsconfig `extends` skipped in `host-config.ts`;
   swallowed iteration-module load error in `IterationNode`'s retry loop.

## Explicit non-goals (do not reintroduce)

No LLM component scan; no runtime fiber enrichment in v1; never write to host
source (JSX stamp is a Vite transform output only); never live-mount overlay
primitives; no multi-provider seam / iframes / penpal / Babel pass; don't
further split `useGenerationLifecycle` / `useGenerationCoordination` /
`DockedChatBar` (reviewed as genuinely deep/cohesive).

## Verification status

- `bun run check:boundaries` — **passes** (289 modules), and the alias rules
  were proven to fire via the canary test.
- `bunx knip` — only pre-existing triage items (host `@/` imports in the
  generated registry are expected; the `discovered-registry.ts` manifest API
  is "unused" only until the Phase-2 wiring lands).
- Host typecheck **not run** (needs the host app; `npx tsc -p tsconfig.app.json
  --noEmit` from Rewynd with the `@pg/*` path mapping — see CLAUDE.md).
- No runtime smoke test was performed; the dev server wasn't started.

## TL;DR

Reviewed the big cleanup branch against its plan: 4 of 5 phases done right,
one half-done (scan engine built, not yet wired to the registry). Found and
fixed: a boundary checker that couldn't see the imports it was supposed to
police (proved the fix with a canary), one real boundary violation, a file in
the wrong text encoding that git thought was binary, an HMR ordering bug,
missing SSE completion on failed spawns, an iterations index that ignored
alternate directories, localStorage writes on every drag frame, and a pile of
copy-pasted code collapsed into shared helpers. Rejected two false findings
from the review subagents after checking the code myself. Biggest known gap:
the skills catalog UI calls four server routes that were never built.
