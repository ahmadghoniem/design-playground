# Session summary — `chore/cleanup` review + follow-ups

**Branch:** `chore/cleanup` (uncommitted unless you commit separately)  
**Audience:** next reviewing agent (e.g. Opus)  
**Companion artifacts:** `handoff-cleanup-review-2026-07-26.md`, `handoff-before-after.html`, `codebase-end-to-end.html`, `qa-shadcn-tailwind.html`, `handoff-shadcn-first-playground.md`

---

## Product direction locked this session

Pivot toward a **ShadcnUI-first** playground: left layers/project rail, **right Tailwind class inspector** (main bet), chat as a side panel later. Hard constraints unchanged: zero host lockfile churn, Claude Code only, no LLM discovery, overlays listed never live-mounted, never write host source for stamps.

---

## What shipped in code (this conversation)

### Architecture / guardrails
- Fixed dependency-cruiser **false negative** for `@pg/` imports (alias-form twin rules). Proven with a canary violation, then removed.
- Moved adopt prompt into `features/iterations/adopt-prompt.ts` (killed feature→feature import).
- `fillTemplate` → `shared/lib/fill-template.ts`; deleted generation `utility.ts` / `adopt.prompt.ts`.
- Merged/deleted thin `useGenerationCoordination.types.ts`.
- Renamed `registry-tree` → `registry-children` / `buildRegistryChildrenMap`.
- UTF-8 fix for `useStaticScan.ts` (was UTF-16 binary to git).
- Registry HMR: rebuild `flatRegistry` **before** notifying listeners.
- Deduped `useChatSubmit` (`postGenerate`, `resolveSkillPrompt`), `prompt-builders` (`buildIterationArtifacts`), freeform prompt branches.
- Narrowed `usePlaygroundCanvasController` (calls `useReactFlow` itself).
- `discover` route passes `HostConfig` into `scanRenderTree` (no double read).
- SSE: `emitGenerationDone()` on spawn/outer catch failures.
- Iterations index regenerates from **all** layout dirs + relative import specifiers.
- Debounced canvas persistence (250ms).
- Adopt hook guards on `isGlobalGenerating`.
- Removed dead header props; cleaned stale `server/index.ts` comments.

### Playground root (Vite-only)
- Vite plugin injects `__PG_RELATIVE_ROOT__` via `define`.
- Client: `hydratePlaygroundRelativeRoot()` — **no HTTP**.
- **Deleted** `server/routes/playground-root.ts` and its mount (user is always under Vite).

### UX / naming cleanups
- Fixed `FrameHoverHint` stuck tooltip (hide on `pointerdown` + window `pointermove`).
- Removed **max turns** from UI, `ClaudeCodeOptions`, spawn args, generate body.
- Renamed (PascalCase): `ComponentPreviewCard` → **`RegistryDragRow`**; `SizeButtons` → **`PreviewViewportButtons`**.
- Dropped re-exports: `GenerationCoordination` from hook file; `CanvasRelation` from `canvas-relations` (import type from `@pg/shared/lib/canvas-persistence`).
- Renamed preview click catcher: `data-iframe-overlay` → **`data-pg-interact-catcher`** (`ComponentNode`, `IterationNode`, `playground-global.css`, `CLAUDE.md`). Not an iframe — transparent full-card shield until double-click interact; disabled under Alt element-select.
- Deleted `shared/lib/model-icons.ts` (fake per-model lookup). Claude mark is CSS-only: `.claude-agent-mark` in `playground-global.css` (uses `assets/claude-icon-white.svg`). Dropped dead flip-animation CSS (`bubble-face--next` / `is-switching`). Chat + settings just use the class — no `modelIcon` prop.

### Verification
- `bun run check:boundaries` — passing after these changes (alias rules active).

---

## Still open (do not assume done)

| Item | Notes |
|------|--------|
| Skills catalog mutate APIs | UI calls `POST …/add|update|remove|preview`; server only has `GET /api/skills` |
| Phase-2 scan → manifest → codegen | Engine exists; does not yet `writeManifest` / `regenerateModule` |
| JSX stamp | Planned Vite transform only — **not implemented** |
| TypeChecker pass / layers UI / Tailwind inspector | Planned product work |
| Lean prompts / inline `fill-template` | Agreed — see **Address later** below |
| Lifecycle / coordination docs-as-debt only | Behavior is live; cleanup/naming clarity deferred — see below |
| `inline-reference/parts.tsx` split or reunify | Agreed; not done |

---

## Address later (context for follow-up work)

### Prompts & `fill-template`

**Why four explore prompts today?**
- From source component
- From an existing iteration
- Same two, but scoped to an Alt-selected element
- Plus separate templates for edit, freeform, and adopt → folder feels fat

**Leaner approach (do this later):**
- One explore template with flags (`fromIteration`, `elementSelections`) assembled in `prompt-builders.ts`
- Delete duplicate template files once shared sections cover the differences
- Keep adopt with iterations (already moved to `features/iterations/adopt-prompt.ts`)

**`fill-template.ts`:** too thin as a solo file (~8 lines). Inline `{{key}}` replace next to the builders, or a private helper in `prompt-builders.ts` / `adopt-prompt.ts` — do **not** keep a dedicated module.

### Lifecycle & coordination (SSE, mutex) — plain English

These are **working now**; keep this as orientation when touching generation, don’t “fix” unless breaking.

| Piece | Job |
|-------|-----|
| **Coordination** (`useGenerationCoordination`) | “Is something generating?”, what was requested, latest nodes list. Shared blackboard so scan + lifecycle + chat don’t fight. |
| **Mutex / scan lock** | Only one “look for new iteration files” pass at a time; if another ask arrives mid-scan, queue one more. Prevents double-placing the same card. |
| **Lifecycle** (`useGenerationLifecycle`) | On start: drop skeleton cards; subscribe to progress; on complete/error: final scan + cleanup. |
| **SSE** | Server watches Claude’s tool stream, pushes “file written” events; browser updates without waiting for the whole job. |

**Two buses (intentional):** server SSE ≠ client `generationEvents` (start/complete/error inside the React app). Different jobs, similar names on purpose after rename — don’t merge them casually.

---

## Clarifications for reviewers

### JSX stamp (planned — illustrative, not in repo)
Vite would rewrite served host JSX so each element carries origin:

```tsx
// Host source on disk (unchanged in git):
export function Button({ children }: Props) {
  return <button className="…">{children}</button>
}

// What the browser receives after a Vite transform (example):
export function Button({ children }: Props) {
  return (
    <button
      data-pg-src="src/components/ui/button.tsx:46:19"
      className="…"
    >
      {children}
    </button>
  )
}
```

Selection becomes `el.getAttribute('data-pg-src')`. Yes — that stamp is on the **actual element** (e.g. the button), not a wrapper file comment.

### Canvas visibility — **used now**
`computeVisibleNodes` runs in `PlaygroundCanvas` today. Collapsing an iteration parent hides descendants via `collapsedNodeIds` + relations (chevron on iteration nodes with children). Also used by auto-arrange. Future layers UI can reuse the same graph ideas for a **source** tree; the collapse behavior itself is live.

### `data-pg-interact-catcher` (renamed from `data-iframe-overlay`)
Transparent full-card click catcher while not in “interact” mode (double-click to interact). Blocks links/buttons so canvas drag/select works. CSS disables it in Alt element-select mode. Previews are **inline React** in the same document — hence Radix portals escape to `document.body`.

---

## Suggested review focus

1. Vite `define` for `__PG_RELATIVE_ROOT__` + deletion of playground-root route — any host that wasn’t under this plugin would break (accepted: always Vite).
2. Alias-form dep-cruiser rules — keep them; without them `@pg/` cross-feature imports are invisible.
3. Rename blast radius: `RegistryDragRow`, `PreviewViewportButtons`, `data-pg-interact-catcher`.
4. Do **not** re-fix MultiEdit JSONL or “toolbar delete skips knownIterations” — previously verified false.
