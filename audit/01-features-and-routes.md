# 01 — Features & Routes

## 1. `evals/` — orphaned dev-only eval harness → **strong delete candidate**

**What it is:** a CLI-only, LLM-as-judge quality harness for the *discovery* prompt.
It is **not** a client route, **not** a server route, **not** a panel. Nothing in
`app/`, `server/`, `components/`, `hooks/`, or `nodes/` imports it.

Files:
- `evals/discovery.eval.ts` — main harness. Snapshots `discovery.json`, runs the real
  `discoveryPrompt()` through the production `spawnAgent(...)`, scores output with an LLM judge.
- `evals/judge.ts` + `evals/judge.prompt.ts` — the judge.
- `evals/structural-checks.ts` — deterministic checks (kebab ids, schema shape).
- `evals/file-inventory.ts` — walks the repo for ground-truth inventory.
- `evals/README.md`

**Reachability: none.**
- Zero imports from app/server code (verified: `git grep "from .*evals"` outside `evals/` → nothing).
- Its own README says run `bun run eval:discovery`, but **`package.json` has no `scripts` field at all** —
  even the documented invocation is dead. Only a manual `bunx tsx evals/discovery.eval.ts` works.
- Side effect of deleting: `evals/file-inventory.ts` and `structural-checks.ts` reference
  `app/loading.tsx` as an expected filename — deleting evals also removes the last references
  to that orphan.

**Verdict:** it was a prompt-tuning QA tool. Keep only if you plan to iterate on the
discovery prompt with measured evals; otherwise delete the folder.

## 2. `prompts/` — the backbone of generation → **keep (do not delete)**

**What it is:** NOT a UI "prompt library". It's the internal library of prompt-builder
functions that every AI feature uses. There is no `/prompts` route and no prompts panel.

All 16 modules are imported:

| Prompt module | Consumer |
|---|---|
| `iteration.prompt.ts`, `iteration-from-iteration.prompt.ts`, `adopt.prompt.ts`, `element-iteration.prompt.ts`, `shared-sections.ts` | `registry.tsx:4-20` |
| `create-page.prompt.ts` | `hooks/useCanvasCreatePage.ts:20` |
| `freeform-reference.prompt.ts`, `edit.prompt.ts` | `hooks/useChatSubmit.ts:22-23` |
| `html-*.prompt.ts` (3 files) | `lib/html-prompts.ts:6-8` |
| `jsx-*.prompt.ts` (2 files) | `lib/jsx-prompts.ts:6-7` |
| `discovery.prompt.ts`, `discovery-analyze.prompt.ts` | `server/routes/discover.ts:11-12` |
| `utility.ts` (`fillTemplate`) | ~9 of the prompt files |

**Verdict:** load-bearing. Deleting anything here breaks generation/iteration/discovery.
Individual prompt files only become deletable if you cut the *feature* that consumes them
(e.g. cut create-page → delete `create-page.prompt.ts`).

## 3. `docs/` — human/agent-facing only → **mostly deletable, one caveat**

- There is **no `/docs` route** and no server route serving docs.
- **No application code reads/parses/imports anything under `docs/`.** The only code
  references are 5 prompt-string literals that tell the *spawned agent* to
  `Read the generation guide: src/app/playground/docs/iterations/guide.mdc`:
  - `prompts/iteration.prompt.ts:37`
  - `prompts/element-iteration.prompt.ts:44`, `:136`
  - `prompts/iteration-from-iteration.prompt.ts:43`
  - `prompts/freeform-reference.prompt.ts:21`
- Everything else (`docs/PROJECT-OVERVIEW.md`/`.html`, `AGENT-DESIGN-FRAMEWORK`,
  `docs/ui/`, `docs/conventions/`, `docs/canvas/`, `docs/generation/`) is referenced by nothing.

**Verdict:** `docs/iterations/guide.mdc` is *soft* load-bearing — the generation agent is
instructed to read it, so deleting it degrades generation quality without breaking code.
Keep that file (or fold its content into the prompts). The rest of `docs/` is prunable at will.

## 4. Server routes — all 13 modules alive

Mounted in `server/index.ts:43-55` at `/playground/api/...`. No fully dead module.

| Module | Purpose | Main client callers |
|---|---|---|
| `design.ts` | Design-system CLI: init/status/generate/lint/diff/export + preview showcase | `useDesignSystemCli.ts`, `PlaygroundSidebar.tsx:100`, `useSidebarDiscoverySync.ts:76` |
| `discover.ts` | Read/write `discovery.json`; spawn agent to scan host codebase | `PlaygroundClient.tsx:204,265,364,477`, `DiscoveryModal.tsx:195,229,277` |
| `generate.ts` | Core AI generation: start run, SSE status, cancel | `useChatSubmit`, `useGenerationLifecycle`, `useDragToIterate`, `useIterationAdoption`, `IterateDialog.tsx:553`, more |
| `html-pages.ts` | CRUD for HTML page frames | 10+ callers (drag-drop, paste, create-page, scan, nodes, sidebar) |
| `images.ts` | Persist/list/delete image nodes | `PlaygroundCanvas.tsx:641`, `ImageNode.tsx:67`, canvas hooks |
| `iterations.ts` | CRUD for iteration variants | `IterationNode.tsx:342`, `IterateDialog.tsx:287`, canvas hooks |
| `models.ts` | List available agent models | `model-settings-store.ts:165`, `lib/providers/claude-code.ts:33` |
| `oncanvas-components.ts` | CRUD for JSX on-canvas components | nodes, sidebar, canvas hooks |
| `open-in.ts` | Project context + open-file-in-editor | `useProjectContext.ts`, `useOpenIn.ts` |
| `pages.ts` | DELETE-only: remove a registry page (edits `registry.tsx`, rm's the page dir) | `PlaygroundSidebar.tsx:193` |
| `project-id.ts` | Stable per-project id | `app/page.tsx:18` |
| `screenshot.ts` | Capture/save canvas screenshots | `lib/captureAndSaveScreenshot.ts:97` (POST only) |
| `skills.ts` | Skills catalog CRUD + preview | `useSkills.ts`, `SkillsCatalogModal.tsx:145-278`, iterate-dialog |

**Dead handler:** `screenshot.ts` GET @ line 25 — no client ever calls GET; only POST is used.

## 5. Client routes — just two

Route table: `dev-entry.tsx:9-18` (`BrowserRouter basename="/playground"`).

1. **`/`** → `app/page.tsx:34` → `PlaygroundClient` — the whole canvas app
   (React Flow canvas, sidebar, header, chat dock, all modals).
2. **`/iterations/:slug`** → `iterations/IterationIsolatedPage.tsx` — renders one
   iteration/component full-screen via `flatRegistry`.

Not routes: `app/layout.tsx` (no-op `<>{children}</>` wrapper), `app/loading.tsx`
(**orphan** — never imported; Next.js convention leftover), `registry.tsx` (component/page
registry rendered inside the canvas; also the file `server/routes/pages.ts` edits).

Modals reachable from `/`: `DiscoveryModal`, `DesignSystemModal`, `SkillsCatalogModal`,
`ModelSettingsModal`, `KeyboardShortcutsModal`.
