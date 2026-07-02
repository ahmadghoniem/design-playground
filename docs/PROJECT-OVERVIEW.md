# design-playground — Project Overview

> A-to-Z engineering onboarding doc. This file is descriptive; the authoritative,
> enforced conventions live in `CLAUDE.md` at the repo root. Where the two differ,
> `CLAUDE.md` wins. Everything below is grounded in the actual source.

---

## 1. What this is (outcome-first)

`design-playground` is a **local-dev-only** design canvas that drops into a host
React app (the host used in development is **Rewynd**). A solo builder drags the
host app's real components onto an infinite canvas and uses an agent CLI
(**Claude Code** by default) to generate AI-driven layout/style variations
("iterations") of those components, of arbitrary HTML pages, and of on-canvas JSX.

Key facts that shape the whole codebase:

- **Never built in CI/prod.** It runs *only* inside the host's Vite dev server.
- **Zero dependency diff for the host.** Its deps install *nested* under
  `<host>/src/app/playground/node_modules/`. `react`, `react-dom`, `tailwindcss`,
  and `vite` are `peerDependencies` resolved up to the host's single copy.
- **Frontend:** React + `react-router-dom` v7, Tailwind v4, state via `zustand`,
  canvas via `@xyflow/react`. Single-player only.
- **Backend:** a **Hono** app under `server/`, mounted *into* the host's Vite dev
  server (no second process) via `server/vite-plugin.ts`.
- **No root `tsconfig.json`.** The host compiles the TS. Module-not-found errors
  for `react`/`vite` when typechecking this package in isolation are environmental,
  not real bugs.

---

## 2. A-to-Z runtime flow

### 2.1 How it is served — the `/playground` clean URL

The host wires `designPlaygroundPlugin()` (`server/vite-plugin.ts:17`) into its
`vite.config.ts` plugins. In `configureServer`, the plugin installs a single
connect middleware that does two things per request:

1. **API pass-through.** If the pathname is `/playground/api` or starts with
   `/playground/api/`, the request is handed to the embedded Hono app via
   `getRequestListener(createPlaygroundServer().fetch)` from `@hono/node-server`
   (`server/vite-plugin.ts:25-34`). `getRequestListener` is required because
   Vite's `server.middlewares` is connect/Node `(req,res)`, whereas Hono speaks
   the Web `fetch` API — the adapter bridges them even under Bun.
2. **Clean-URL rewrite.** For document GET/HEAD requests to `/playground` or any
   deep link beneath it (e.g. `/playground/iterations/:slug`), it *internally*
   rewrites `req.url` to `/playground.html` + the remaining path
   (`server/vite-plugin.ts:43-50`). The browser URL stays clean; Vite reads and
   transforms `playground.html`. Everything else falls through via `next()` to the
   host's own pages / Vite module graph. The Hono app is a catch-all (404s
   anything it sees), which is exactly why it must only be shown `/playground/api/*`.

The matching host-side requirement: the react-router `basename` must be
`/playground` (see below), and — when live-linking — Vite's `server.fs.allow` must
include the repo path (see §6).

### 2.2 Frontend boot

- `playground.html` is the MPA entry; its script is **`dev-entry.tsx`** (the
  tooling-pinned react-router mount entry, kept at repo root by convention).
- `dev-entry.tsx` calls `createRoot(...).render(...)` with a
  `<BrowserRouter basename="/playground">` wrapping `<PlaygroundLayout>` and two
  routes (`dev-entry.tsx:9-18`):
  - `/` → `PlaygroundPage` (`app/page.tsx`)
  - `/iterations/:slug` → `PlaygroundIterationIsolatedPage`
    (`iterations/IterationIsolatedPage.tsx`) — a full-screen isolated render of a
    single iteration file.
- `app/layout.tsx` (`PlaygroundLayout`) wraps the page shell; `app/loading.tsx`
  is the loading state.
- `app/page.tsx` (`PlaygroundPage`) fetches `GET /playground/api/project-id` to
  obtain a stable per-project id, then renders `PlaygroundClient`
  (`app/PlaygroundClient.tsx`). The projectId namespaces all `localStorage`/canvas
  persistence keys so multiple host projects don't collide.
- `app/PlaygroundClient.tsx` is the top composition shell: it owns sidebar
  visibility, the Discovery and Skills-catalog modals, the "Add"/"Add All"
  component-onboarding flows (HMR-resilient via `sessionStorage`), and mounts
  `PlaygroundHeader`, `PlaygroundSidebar`, and `PlaygroundCanvas` inside a
  `ReactFlowProvider` + `CanvasFlowProvider`.

### 2.3 How the frontend talks to the backend

All client fetches are hardcoded to **`/playground/api/...`** across the `.tsx`
files (a deliberate invariant — keep server paths in sync). Those requests are
caught by the vite-plugin middleware (§2.1) and routed into Hono.

`server/index.ts` defines the server topology:

- `createPlaygroundRouter()` (`server/index.ts:40`) creates a `Hono` and mounts
  every route module at `/` (each module registers its own handlers under
  `/api/...`).
- `createPlaygroundServer()` (`server/index.ts:69`) creates the root app, adds
  `cors()` and `bodyLimit({ maxSize: 50MB })`, and mounts the router at
  `/playground`. So the full served path is `/playground/api/...`. The 50 MB limit
  exists because image/screenshot uploads are **base64 in JSON**, not multipart.
- A standalone entry (`server/index.ts:78-92`) runs only when the module is
  executed directly (`node server/index.ts`), listening on `PORT` (default 4319)
  via lazily-imported `@hono/node-server`'s `serve()`. This is rarely used.

---

## 3. Directory structure

```
design-playground/
├── playground.html                 # MPA entry (rewritten target of /playground)
├── dev-entry.tsx                   # react-router mount entry (root-pinned)
├── registry.tsx                    # component registry + iteration-prompt builders (root-pinned)
├── playground-tailwind-entry.css   # Vite/Tailwind build entry (root-pinned)
├── setup.mjs                       # Bun-based nested installer
├── link.mjs                        # live-link the repo into host(s) via junctions
├── bunfig.toml                     # [install] peer = false
├── package.json                    # nested deps + peerDependencies
│
├── app/                            # SHELL composition files
│   ├── page.tsx  layout.tsx  loading.tsx
│   ├── PlaygroundClient.tsx        # top shell, onboarding flows, modals
│   ├── PlaygroundCanvas.tsx        # React Flow canvas + generation orchestration
│   └── PlaygroundHeader.tsx
│
├── components/                     # LEAF UI, grouped by <type>/
│   ├── canvas/                     # sidebar, presence, draw layer, highlight, shape tools
│   │   └── sidebar/                # ComponentPreviewCard, TreeNode, discovery sync…
│   ├── chat/                       # DockedChatBar + chat icons
│   ├── modals/                     # Discovery, DesignSystem, ModelSettings, Skills, Shortcuts
│   │   └── design-system/          # section components + useDesignSystemCli hook
│
├── nodes/                          # React Flow node types
│   ├── ComponentNode.tsx  IterationNode.tsx  SkeletonIterationNode.tsx
│   ├── ImageNode.tsx  TextNode.tsx  ShapeNode.tsx  FrameNode.tsx  DragGhostNode.tsx
│   ├── ComponentErrorBoundary.tsx  oncanvas-loader.ts
│   └── shared/                     # HelperLines, IterateDialog(+parts), overlays, labels…
│       └── iterate-dialog/         # dropdowns, icons, parts, useIterateDialogState
│
├── canvas-components/              # AI-WRITTEN on-canvas JSX components (.gitkeep stub)
│
├── hooks/                          # canvas/UX hooks (selection, drag-to-iterate, skills…)
│
├── lib/                            # stateless helpers (see §3.1)
│   └── providers/                  # provider/agent subsystem (see §4)
│
├── stores/                         # zustand stores (see §3.2)
│
├── server/                         # Hono backend
│   ├── index.ts  vite-plugin.ts
│   ├── routes/*.ts                 # one module per API area (see §5)
│   └── lib/                        # hono-helpers, claude-jsonl, generation lockfile/watcher/timer
│
├── prompts/                        # prompt builders (one .prompt.ts per generation kind)
├── skills/                         # bundled "skills" (SKILL.md + references) + index.ts
├── iterations/                     # iteration index/tree + isolated page (runtime data lands here)
├── ui/                             # shadcn-style primitives + inline-reference engine
├── styles/                         # playground-global.css
├── data/                           # mock-data (e.g. *.mockData.ts written by analyze)
├── evals/                          # discovery eval harness (judge + structural checks)
├── docs/                           # *.mdc reference docs (this file lives here)
└── refactor/                       # in-flight "deepen module" refactor batch notes
```

### 3.1 `lib/` highlights

- **Providers:** `lib/providers/` — `registry.ts`, `claude-code.ts`,
  `spawn-agent.ts`, `types.ts`, `index.ts` (see §4).
- **Canvas:** `canvas-flow.tsx` (React Flow context provider keyed by storageKey),
  `canvas-persistence.ts` (localStorage canvas state), `iteration-scan.ts`
  (where newly generated iterations land on canvas), `draw-*.ts` (annotation
  strokes/hit-testing/types), `drag-ghost-grid.ts`.
- **Prompts/generation glue:** `generation-body.ts` (`getProviderFields()` —
  injects provider/model/effort into request bodies), `html-prompts.ts`,
  `jsx-prompts.ts`, `element-context.ts`, `iframe-selection-bridge.ts`.
- **Design system:** `design-md-helpers.ts`, `parse-design-md.ts`,
  `run-design-md-cli.ts` (wraps the `@google/design.md` CLI).
- **Resolvers:** `resolve-playground-dir.ts` (locate `src/app/playground` vs
  `app/playground`, list candidate dirs), `resolve-agent-model.ts`,
  `model-catalog.ts`, `constants.ts` (event names, storage keys, filename
  patterns; re-exports `DEFAULT_PROVIDER_ID`).
- **Skills:** `impeccable-skill.ts`, `featured-skills.ts`.
- **Host integration:** `host-gitignore.mjs`, `sync-host-gitignore.ts`.

### 3.2 `stores/` (zustand)

- `design-system-store.ts` — design-system modal/CLI state.
- `dev-mode-store.ts` — dev-mode toggle.
- `interactive-node-store.ts` — which node is currently "interactive"
  (pointer events passed into the live preview) — tiny store at
  `stores/interactive-node-store.ts:8`.
- `keybinding-store.ts` — user keybinding overrides (pairs with `lib/keybindings.ts`).
- `model-settings-store.ts` — selected model / enabled models / effort.
- `playground-draw-store.ts` — annotation/draw tool state.
- `preview-color-scheme-store.ts` — per-canvas light/dark override.

---

## 4. Provider / agent subsystem

The agent CLI is abstracted behind a small provider interface so the same spawn
machinery serves Claude Code, Cursor, and Codex.

- **`lib/providers/types.ts`** defines `ProviderId`, `ProviderConfig`
  (`id`, `displayName`, `binary`, `versionFlag`, `notFoundMessage`,
  `fallbackModels`, `defaultEnabledModels`, `buildAgentArgs`, `buildModelListArgs`)
  and `AgentSpawnOptions` (`model`, `effort`, `maxBudgetUsd`, `maxTurns`,
  `claudeDetailedStdout`).
- **`lib/providers/claude-code.ts`** is the concrete Claude Code config. Its
  `buildAgentArgs` (`claude-code.ts:4`) starts from
  `['-p', '--dangerously-skip-permissions', '--verbose']` and adds
  `--output-format stream-json --include-partial-messages` when
  `claudeDetailedStdout` is set (otherwise `--output-format text`), plus optional
  `--model/--effort/--max-budget-usd/--max-turns`. binary is `claude`;
  not-found message points to `npm install -g @anthropic-ai/claude-code`. Claude
  Code has no `models list` subcommand, so `buildModelListArgs` returns `null` and
  `/api/models` serves `CLAUDE_FALLBACK_MODELS` from `lib/model-catalog.ts`.
- **`lib/providers/registry.ts`** holds the `PROVIDERS` map. Per `CLAUDE.md`, the
  UI is gated by a `SHOW_ALL_PROVIDERS` flag: `getVisibleProviders()` /
  `getVisibleProviderIds()` return only Claude Code (`registry.ts:30-37`), and
  `DEFAULT_PROVIDER_ID` is `'claude-code'` (`registry.ts:8`). Cursor/Codex remain
  implemented but hidden; flip the flag to surface them. **Never hardcode
  provider-id literals** — use `DEFAULT_PROVIDER_ID`.
- **`lib/providers/spawn-agent.ts`** is the thin spawn wrapper. `spawnAgent(id,
  opts, cwd)` (`spawn-agent.ts:12`) looks up the config, builds args, and
  `spawn(config.binary, args, { cwd, stdio: ['pipe','pipe','pipe'], env: {
  ...process.env } })`. **The spawned agent inherits the dev server's
  `process.env`** — which is why a stale `ANTHROPIC_BASE_URL` / `HTTP(S)_PROXY` in
  the terminal that started the dev server can break generation (the discover
  route specifically detects connection-refused signatures and prints that hint —
  `discover.ts:35-47`). Also exports `getProviderNotFoundMessage` and
  `getProviderDisplayName`.

### How the server spawns and streams the agent

Routes spawn the agent, write the prompt to `stdin`, then `stdin.end()`, and
consume `stdout`/`stderr`. Three streaming conventions are used (per `CLAUDE.md`):

- **SSE** (`streamSSE` from `hono/streaming`) — `generate.ts`'s
  `GET /api/generate?action=events` streams `iteration-added` / `agent-preview` /
  `done` events from a module-level `generationEvents` EventEmitter; cleanup on
  client disconnect is `stream.onAbort(...)` (`generate.ts:446-493`).
- **text/plain streaming** (`streamText`) — `design.ts` streams agent stdout live
  for `design/setup`, `design/generate-from-codebase`, and
  `design/generate-preview-showcase`.
- **Spawn-driven request/response** — discover POST and generate POST wrap the
  child's `close`/`error` events in `new Promise<Response>((resolve) => {...})`
  and `return await` it (`discover.ts:243`, `generate.ts:116-396`).

Module-level state (process handles, `isScanning`/`isGenerating`, the
`generationEvents` emitter, and lockfiles for HMR-survival) lives at module scope,
unaffected by the HTTP layer. Lockfile recovery kills orphaned scan/generation
processes left over from an HMR reload (`discover.ts:126-148`,
`server/lib/generation-lockfile.ts`).

---

## 5. Backend routes (`server/routes/*.ts`)

Every module exports an `xxxRoutes()` factory returning a Hono sub-app; handlers
register at `/api/...`, served at `/playground/api/...`. Full inventory:

| Module | Routes | Purpose |
|---|---|---|
| `project-id.ts` | `GET /api/project-id` | Stable per-project id (basename(cwd)+hash) used to namespace persistence. |
| `discover.ts` | `GET/POST/DELETE /api/discover`, `POST/DELETE /api/discover/analyze` | AI component discovery scan + per-component analysis (see §6.2). |
| `generate.ts` | `POST/DELETE/GET /api/generate` | Start/cancel generation; `GET?action=events|status|download-chat`. The core AI-iteration engine. |
| `design.ts` | `…/design/{diff,export,file,generate-from-codebase,generate-preview-showcase,lint,preview-showcase,setup,spec,status}` | Design-system (DESIGN.md) lifecycle (see §6.5). |
| `iterations.ts` | `GET/POST/DELETE /api/iterations` | Read/scan/delete iteration files; maintains `index.json` + `tree.json` (parent→child lineage). |
| `oncanvas-components.ts` | `GET/POST/PUT/DELETE /api/oncanvas-components` | CRUD for AI-written on-canvas JSX components under `canvas-components/` and the `index.ts` barrel. |
| `html-pages.ts` | `GET/POST/PUT/DELETE /api/html-pages` | CRUD for generated standalone HTML pages. |
| `pages.ts` | `DELETE /api/pages` | Delete a generated page. |
| `images.ts` | `GET/POST/DELETE /api/images` | Image nodes (base64 JSON in/out). |
| `screenshot.ts` | `GET/POST /api/screenshot` | Save/serve node screenshots (used as visual references in prompts). |
| `models.ts` | `GET /api/models` | Serve the model catalog (fallback list for Claude Code). |
| `skills.ts` | `GET /api/skills` | Enumerate bundled skills from `skills/`. |
| `open-in.ts` | `GET/POST /api/open-in` | "Open in editor/Finder/GitHub Desktop" for a file. |

Server-side helpers under `server/lib/`: `hono-helpers.ts` (`readJson<T>(c)` →
parsed body or `null`), `claude-jsonl.ts` (parse Claude stream-json into live
assistant-text previews + error extraction), `generation-lockfile.ts`,
`generation-file-watcher.ts` (watch for newly-written iteration files →
`iteration-added` events), `generation-timer.ts` (hard generation timeout).

---

## 6. Features (each grounded in code)

### 6.1 Infinite canvas (React Flow)
`app/PlaygroundCanvas.tsx` renders `<ReactFlow>` with custom node types
(`nodes/*`): `ComponentNode` (live host component preview), `IterationNode`
(a generated variation in an iframe), `SkeletonIterationNode` (placeholder while
generating), `ImageNode`, `TextNode`, `ShapeNode`, `FrameNode`, `DragGhostNode`.
Canvas chrome: `Controls`, `Background`, `MiniMap`. State persists to
`localStorage` via `lib/canvas-persistence.ts`, keyed by projectId through
`CanvasFlowProvider` (`lib/canvas-flow.tsx`).

Canvas UX features (added incrementally; see `MEMORY.md` "canvas-features-added"):
minimap, snap + helper guides (`nodes/shared/HelperLines.tsx`), frames
(`FrameNode`), undo/redo, copy/paste, and annotation shapes/drawing
(`components/canvas/PlaygroundCanvasDrawLayer.tsx`, `stores/playground-draw-store.ts`,
`lib/draw-*.ts`, `components/canvas/ShapeToolGroup.tsx`).

### 6.2 Component discovery scan
The sidebar's Discovery modal (`components/modals/DiscoveryModal.tsx`) triggers
`POST /api/discover`, which spawns the `claude` CLI with `discoveryPrompt`
(`prompts/discovery.prompt.ts`) to scan the host app and write
`discovery.json`. A hard timeout (`DISCOVERY_TIMEOUT_MS`, default 180 s) fails
fast on unreachable APIs. Already-"added" entries are preserved across re-scans
(`discover.ts:215-222`). `POST /api/discover/analyze` runs a per-component
analysis prompt (`prompts/discovery-analyze.prompt.ts`), optionally injecting a
real props snapshot (`lib/props-fetchers.server.ts`), writes `*.mockData.ts` into
`data/`, registers the component in `registry.tsx`, and promotes any
child-component references into new discovered entries (`discover.ts:512-536`).
`PlaygroundClient` drives single-add, sequential child-analysis, and an HMR-safe
"Add All" queue persisted in `sessionStorage` (`PlaygroundClient.tsx:283-421`).

### 6.3 AI design/layout generation (iterations)
The heart of the app. `app/PlaygroundCanvas.tsx` builds a prompt (via
`registry.tsx` prompt builders + `prompts/*.prompt.ts` + `prompts/shared-sections.ts`)
and POSTs to `/api/generate` with provider/model/effort fields from
`getProviderFields()`. `generate.ts`:
- resolves the playground-relative dir and rewrites path tokens in the prompt;
- optionally prepends a DESIGN.md system-prompt addon when the
  `pg-design-inject=1` cookie is set (`generate.ts:157-164`);
- spawns the agent, writes a chat log under the temp dir, starts a file watcher +
  timeout + lockfile;
- when `claudeDetailedStdout` is on, parses stream-json into a throttled
  live "assistant preview" emitted over SSE so the UI can show what the agent is
  doing in a presence-bubble tooltip (`generate.ts:233-273`, `claude-jsonl.ts`);
- emits `iteration-added` as each iteration file is written, so iterations pop
  onto the canvas progressively; positions them via `lib/iteration-scan.ts`.

Iteration kinds have dedicated prompt builders: `iteration.prompt.ts`,
`iteration-from-iteration.prompt.ts` (chaining a new variation off an existing
one), `element-iteration.prompt.ts` (iterate a selected sub-element),
`jsx-iteration*.prompt.ts`, `html-iteration*.prompt.ts`, `adopt.prompt.ts`,
`edit.prompt.ts`, `freeform-reference.prompt.ts`, `create-page.prompt.ts`.

### 6.4 On-canvas JSX iteration
AI-written JSX components live under `canvas-components/` and are loaded lazily by
`nodes/oncanvas-loader.ts` (`loadOnCanvasComponentModule()` imports the
auto-generated `canvas-components/index` barrel, gracefully returning empties if
it doesn't exist yet). The server CRUD + barrel maintenance is
`server/routes/oncanvas-components.ts`; rendering is `nodes/IterationNode.tsx`.

### 6.5 Design-system modal + DESIGN.md setup
`components/modals/DesignSystemModal.tsx` (+ `design-system/` sections and
`useDesignSystemCli.ts`) front the `design.ts` routes. Flow:
`POST /api/design/setup` runs `bun add --dev @google/design.md` against the
**host** (streamed) and patches host `package.json` scripts;
`generate-from-codebase` asks the agent to author `DESIGN.md` by reading the
host's `globals.css`/tailwind config (strict no-fabrication prompt,
`design.ts:184-261`); `generate-preview-showcase` produces a self-contained HTML
showcase stamped with a front-matter hash; `lint`/`diff`/`export`/`spec`/`status`
wrap the `@google/design.md` CLI (`lib/run-design-md-cli.ts`). The resulting
DESIGN.md can be injected into generation prompts (§6.3).

### 6.6 Docked chat bar + inline references
`components/chat/DockedChatBar.tsx` is the bottom chat entry for free-form
prompts; `ui/inline-reference/` (`context.tsx`, `dom-engine.ts`) implements
"@-style" inline references to nodes/elements embedded in the prompt. Element
selection inside live previews is bridged via `lib/iframe-selection-bridge.ts`,
`lib/element-context.ts`, and `hooks/useElementSelection.ts`.

### 6.7 Iterate dialog
`nodes/shared/IterateDialog.tsx` (+ `IterateDialogParts.tsx` and
`iterate-dialog/` parts/dropdowns/`useIterateDialogState.ts`) is the per-node UI
for configuring and launching an iteration (model, effort, styling mode, skills,
references). `hooks/useDragToIterate.ts` enables drag-to-iterate gestures.

### 6.8 Skills
Bundled "skills" (reusable design directives) live under `skills/<name>/SKILL.md`
(+ reference markdown), indexed by `skills/index.ts` and surfaced via
`GET /api/skills`, the `SkillsCatalogModal`, `lib/featured-skills.ts`,
`lib/impeccable-skill.ts`, and `ui/impeccable-skill-picker.tsx`. Selected skills
are formatted into prompts by `prompts/shared-sections.ts`.

### 6.9 Model settings, keyboard shortcuts, open-in
`ModelSettingsModal` + `model-settings-store.ts` + `useModelCycle.ts` manage model
selection; `KeyboardShortcutsModal` + `lib/keybindings.ts` +
`stores/keybinding-store.ts` manage shortcuts; `open-in.ts` + `hooks/useOpenIn.ts`
open files in an editor/Finder/GitHub Desktop. (The header/canvas previously had a
"presence" layer rendering fake-multiplayer-style bubbles for in-flight
generations — removed since the app is single-player; skeleton nodes remain the
in-canvas "generating" indicator.)

---

## 7. Setup & running

### 7.1 Nested install (`setup.mjs`)
Standardizes on **Bun**. `node src/app/playground/setup.mjs`:
1. reads *this folder's* `package.json` (the playground owns its deps);
2. finds the host root above it (used only for prerequisite checks + `.gitignore`,
   never written to);
3. verifies host peerDependencies (`react`, `react-dom`, `tailwindcss`, `vite`)
   are present and reports which agent CLIs are installed;
4. runs a bare `bun install` *in the playground folder* so deps land nested under
   `node_modules/`. `bunfig.toml`'s `[install] peer = false` keeps the
   peerDependencies *out* of the nested tree so they resolve up to the host's
   single copy (this replaces the old `.npmrc legacy-peer-deps`).
5. updates the host `.gitignore` (`lib/host-gitignore.mjs`).
`node setup.mjs --untrack` stops tracking already-committed playground files.

### 7.2 Running
Start the **host's** Vite dev server (`bun dev`) and open `/playground`. The
playground has no standalone dev script. Standalone API only (rare):
`node server/index.ts` → `http://localhost:4319/playground/api/...`.

### 7.3 Live-linking (`link.mjs`)
For developing the repo against a host without re-copying, `link.mjs` creates a
directory **junction** (Windows) / symlink (POSIX) from the host's
`src/app/playground` (or `app/playground`) to the repo, *and* injects the host's
peer deps (`react`, `react-dom`, `tailwindcss`, `vite`) as junctions into the
**repo's own** `node_modules/` so transitive consumers resolve up to the host's
single copy (preserving the React singleton). It deliberately does **not** set
`resolve.preserveSymlinks` (that would break pnpm hosts). The one host-side
requirement it checks for: `server.fs.allow` must include the repo path, since the
mount's real path lives outside the host root.
- `node link.mjs ../Rewynd` — link; `--unlink` / `--status` for the others.

### 7.4 Hard rules (from `CLAUDE.md`)
- Never add anything to the host's `package.json`.
- Keep `@hono/node-server` (the embedding needs `getRequestListener`).
- Client fetch paths are hardcoded to `/playground/api/...` — keep server in sync.
- Binary uploads are base64-in-JSON (hence the 50 MB body limit); there is no PDF
  support.
- New leaf UI goes under `components/<type>/`; new shell files under `app/`;
  zustand stores under `stores/`.
