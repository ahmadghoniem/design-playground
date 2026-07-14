# CLAUDE.md

Guidance for working in this repository.

## What this is

`design-playground` is a **local-dev-only** design canvas that embeds into a host React app. You drag components onto an infinite canvas and use the Claude Code CLI to generate AI layout and style variations. **Claude Code (`claude-code`) is the only provider.** It is never built in CI/prod — it runs only in the host's dev server.

The package is designed to be **dropped into a host project** at `src/app/playground/` (or `app/playground/`). Its dependencies install **nested** under `src/app/playground/node_modules/` so the host's `package.json` and lockfile are never touched. `react`, `react-dom`, `tailwindcss`, and `vite` are `peerDependencies` provided by the host.

## Directory layout (feature-based)

Client code is organized by **feature**, not by layer. Cross-feature imports use the package-root alias `@pg/` (e.g. `@pg/shared/lib/constants`, `@pg/features/canvas/canvas-flow`).

- `app/` — composition shell: `PlaygroundClient`, `PlaygroundCanvas`, `PlaygroundHeader`, `PlaygroundSidebar`, `ModelSettingsModal`, and cross-feature glue (`useChatSubmit`). This is where features are wired together. (There is no `page.tsx`; `dev-entry.tsx` at root is the mount entry.)
- `features/<name>/` — one dir per feature: `canvas` (canvas shell hooks, `nodes/`, `components/`, flow state), `discovery`, `iterations`, `generation` (owns `prompts/` — all `*.prompt.ts` templates, `shared-sections.ts`, `utility.ts`, `iterations-guide.mdc`), `chat`, `skills`. **Features never import other features** — cross-feature composition lives in `app/`; anything shared is promoted to `shared/`.
- `shared/` — `shared/ui/` (shadcn primitives + cross-feature components), `shared/lib/` (utilities used by 2+ features or by the server, incl. `providers/`, the iframe bridge, `generation-events`), `shared/stores/` (cross-feature zustand: `model-settings-store`, `preview-color-scheme-store`, `interactive-node-store`).
- `server/` — unchanged in structure (see Backend below). **Server files import client code via relative paths, not `@pg/`** (so `bun server/index.ts` standalone resolves without a bundler); the alias is a client-only convenience.
- Root-pinned (do not move): `dev-entry.tsx`, `registry.tsx`, `setup.mjs`, `bunfig.toml`, `knip.json`, `tsconfig.json`. Content/generated dirs stay put: `iterations/`, `skills/` (skill markdown), `assets/`, `styles/`.
- `docs/` — human/agent documentation and plans only; nothing under `docs/` is loaded by the playground at runtime.

The alias is defined in the package-root `tsconfig.json` (`@pg/* → ./*`, plus `@/* → ../../*` for editor IntelliSense of host imports) and registered for Vite at runtime by a `config()` hook in `server/vite-plugin.ts`. The host must add `"@pg/*": ["./src/app/playground/*"]` to its own `tsconfig.app.json` paths for host-side typechecking. **No barrel files** — features expose no `index.ts` re-export hubs; deep-import instead. Boundaries are enforced by `.dependency-cruiser.cjs` (run via a throwaway `bunx`/scratch install with `typescript@5.x` pinned — plain `bunx dependency-cruiser` is a false pass because it can't resolve `@pg/`; see `docs/plans/restructure-feature-based/README.md`).

## Architecture

- **Frontend**: React + `react-router-dom` v7, rendered by the host's Vite dev server. Entry is `dev-entry.tsx` (it mounts the react-router tree and imports global CSS). Tailwind v4. State via `zustand`. Canvas via `@xyflow/react`. Single-player only (solo builders). Served at the clean URL `/playground` — `server/vite-plugin.ts` rewrites `/playground` (and deep links) to the `playground.html` entry; the host's `dev-entry.tsx` react-router `basename` must be `/playground` to match.
- **Backend**: a **Hono** app under `server/`, mounted into the host's Vite dev server (no second process).
  - `server/index.ts` — `createPlaygroundRouter()` (mounts all route modules), `createPlaygroundServer()` (root app with `cors()` + `bodyLimit(50MB)`, routes under `/playground`), and a standalone `serve()` entry on `PORT` (default 4319).
  - `server/vite-plugin.ts` — `designPlaygroundPlugin()` bridges Hono into Vite's connect middleware via `getRequestListener(app.fetch)` from `@hono/node-server`. Vite's `server.middlewares` is connect/Node `(req,res)`, so this adapter is required for the embedded path even under Bun.
  - `server/routes/*.ts` — one module per API area, each exporting a `xxxRoutes()` factory returning a `Hono` sub-app. Handlers register at `/api/...`; served path is `/playground/api/...`.
  - `server/lib/hono-helpers.ts` — `readJson<T>(c)` parses a JSON body, returning `null` on missing/invalid input (mirrors the old Express `req.body ?? null`).
- **Shared logic**: `shared/lib/` (mostly stateless helpers: provider configs, path resolvers) — plus a few stateful subsystems (the penpal iframe bridge and the `generation-events` typed event bus). Cross-feature zustand stores live in `shared/stores/`. Server routes import these via relative paths.
- **Iterate / Explore**: the only iterate entry point is the docked chat bar’s Explore mode (variation count 1–4). The old node-level IterateDialog and drag-to-iterate affordances are removed (`shared/ui/iterate-dialog/parts.tsx` remains only as a shared model-list helper).
- **Element selection & generation events** (added after the postMessage/scaffold era):
  - **Iframe selection RPC** uses **penpal** (nested dep), not raw `postMessage`. `shared/lib/iframe-bridge-types.ts` is the typed parent↔child contract; `shared/lib/iframe-bridge.ts` (parent) and `shared/lib/iframe-bridge-child.ts` (child, injected into the iteration iframe) implement it. Alt+hover/click selection flows through this bridge.
  - **Generation event stream**: `shared/lib/generation-events.ts` is a typed event bus (replaced ad-hoc `window` events). Iteration detection is driven by parsing `tool_use`/`tool_result` from the `claude` stream-json output in `server/lib/claude-jsonl.ts` (Tier 3). The client's final `scanForIterations` on generation-complete is the belt-and-braces catch for files written via `Bash` instead of `Write`/`Edit`.
  - **Iframe console errors (dead path)**: the penpal bridge can forward iframe console/window errors via `onConsoleError`, but no node component registers a handler today — nothing is surfaced in the UI.

## Route conventions (Hono)

- `req.body` → `await readJson(c)`; `req.query.X` → `c.req.query('X')`; `req.headers.x` → `c.req.header('x')`.
- `res.status(n).json(o)` → `return c.json(o, n)`; empty responses → `c.body(null, n)`.
- Custom headers → `c.header(k, v)` then `return c.body(...)`.
- **Streaming**: SSE uses `streamSSE` (`generate.ts`). Client-disconnect cleanup is `stream.onAbort(...)`.
- **Callback/spawn-driven handlers** (discover, generate POST): wrap the child-process `close`/`error` events in `new Promise<Response>((resolve) => {...})` and `return await` it.
- Module-level state (process handles, caches, `generationEvents` EventEmitter, lockfile recovery) is plain Node and lives at module scope — unaffected by the HTTP layer.

## Setup & running

- **This project standardizes on Bun.** `setup.mjs` requires `bun` in PATH and runs a bare `bun install` for the nested install. `node setup.mjs --untrack` stops tracking already-committed playground files.
- `bunfig.toml` sets `[install] peer = false` — this is what keeps `react`/`react-dom`/`tailwindcss`/`vite` out of the nested `node_modules` so they resolve up to the host's single copy (Bun installs peerDependencies by default, so this must stay). It replaces the old `.npmrc` `legacy-peer-deps` flag.
- Run: start the **host's** Vite dev server (`bun dev`); open `/playground`. The playground has no standalone dev script of its own.
- Standalone API only (rare): `bun server/index.ts` → `http://localhost:4319/playground/api/...`. Use **Bun, not `node`** — the guard is `import.meta.main`. (Server files use relative imports, so no alias resolution is needed at runtime either way.)

## Conventions

- Match the surrounding code's style; this package favors small focused modules and explicit error handling with `console.error` + JSON error bodies.
- Binary uploads (images/screenshots) are **base64 in JSON**, not multipart — hence the 50MB body limit. (PDF-on-canvas support was removed; there is no `pdfjs-dist` dependency or `pdf` node type.)
- **New UI/logic goes in its feature dir, or `shared/` if 2+ features (or the server) need it** (see Directory layout). shadcn primitives live in `shared/ui/`; add new ones by hand (there is no shadcn `components.json`). Cross-feature imports use `@pg/...`; same-directory imports stay relative (`./sibling`). Never add a feature `index.ts` barrel.
- **Shell composition files are grouped under `app/`** — `PlaygroundCanvas`, `PlaygroundClient`, `PlaygroundHeader`, `PlaygroundSidebar`, `ModelSettingsModal`. Global styles live in `styles/` (`playground-global.css`, `playground-tailwind-entry.css` — the Vite/Tailwind build entry; not root-pinned). Tooling-pinned entry files stay at root: `dev-entry.tsx` (the react-router mount entry) and `registry.tsx` (imported widely).
- **Providers**: Claude Code only (`ProviderId = 'claude-code'`). Use `DEFAULT_PROVIDER_ID` from `shared/lib/providers/registry.ts` — don't hardcode provider-id literals.
- The package-root `tsconfig.json` exists **only** for the `@pg/`/`@/` aliases (editor + Bun resolution); it sets `noEmit` and the host still compiles the TS. When typechecking locally, `react`/`vite` resolve only in a host (they're peerDependencies), so module-not-found errors for those are environmental, not real. To run a *real* typecheck, do it from the host with the host's app tsconfig — and add `"@pg/*": ["./src/app/playground/*"]` to its `paths` first: `npx tsc -p tsconfig.app.json --noEmit`. Do **not** trust the host's `type-check` npm script for this — Rewynd's is a solution-style tsconfig without `--build`, so it silently checks zero files and always "passes".

## Gotchas

- Don't add anything to the host's `package.json` — the whole value prop is zero dependency diff for the host.
- Keep `@hono/node-server`: the Vite-plugin embedding needs `getRequestListener` regardless of runtime/package manager. Keep `penpal`: it powers the iframe selection RPC — don't reintroduce a hand-rolled `postMessage` bridge.
- Client fetch paths are hardcoded to `/playground/api/...` across `.tsx` files — keep server paths in sync.
- **UI stack is shadcn (base/ui) on top of Radix UI.** This matters for the registry/sidebar: Radix overlay primitives (`Dialog`, `Popover`, `Tooltip`, `Sheet`, `DropdownMenu`, …) render via `Portal` into `document.body` with `position: fixed` overlays. When such a component is rendered live as a sidebar preview or a canvas node (especially forced `open: true`), the portaled overlay **escapes the card's `overflow-hidden`/`transform` containment and covers the whole viewport** — it looks like the component "opened on its own" and hijacked the canvas. Do **not** register modal/dialog-shaped components for live preview until there's a real containment story (e.g. iframe the preview, or pass a scoped Radix portal `container`). `NotesDialog` was removed from `registry.tsx` for this reason.
