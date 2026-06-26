# CLAUDE.md

Guidance for working in this repository.

## What this is

`design-playground` is a **local-dev-only** design canvas that embeds into a host React app. You drag components onto an infinite canvas and use an agent CLI to generate AI layout and style variations. **Claude Code is the default and only provider shown in the UI**; Cursor and Codex remain fully implemented but are hidden behind the `SHOW_ALL_PROVIDERS` flag in `lib/providers/registry.ts` (flip to `true` to surface them). It is never built in CI/prod — it runs only in the host's dev server.

The package is designed to be **dropped into a host project** at `src/app/playground/` (or `app/playground/`). Its dependencies install **nested** under `src/app/playground/node_modules/` so the host's `package.json` and lockfile are never touched. `react`, `react-dom`, `tailwindcss`, and `vite` are `peerDependencies` provided by the host.

## Architecture

- **Frontend**: React + `react-router-dom` v7, rendered by the host's Vite dev server. Entry is `page.tsx`; `layout.tsx` wraps it. Tailwind v4. State via `zustand`. Canvas via `@xyflow/react`. Single-player only (solo builders). Served at the clean URL `/playground` — `server/vite-plugin.ts` rewrites `/playground` (and deep links) to the `playground.html` entry; the host's `dev-entry.tsx` react-router `basename` must be `/playground` to match.
- **Backend**: a **Hono** app under `server/`, mounted into the host's Vite dev server (no second process).
  - `server/index.ts` — `createPlaygroundRouter()` (mounts all route modules), `createPlaygroundServer()` (root app with `cors()` + `bodyLimit(50MB)`, routes under `/playground`), and a standalone `serve()` entry on `PORT` (default 4319).
  - `server/vite-plugin.ts` — `designPlaygroundPlugin()` bridges Hono into Vite's connect middleware via `getRequestListener(app.fetch)` from `@hono/node-server`. Vite's `server.middlewares` is connect/Node `(req,res)`, so this adapter is required for the embedded path even under Bun.
  - `server/routes/*.ts` — one module per API area, each exporting a `xxxRoutes()` factory returning a `Hono` sub-app. Handlers register at `/api/...`; served path is `/playground/api/...`.
  - `server/lib/hono-helpers.ts` — `readJson<T>(c)` parses a JSON body, returning `null` on missing/invalid input (mirrors the old Express `req.body ?? null`).
- **Shared logic**: `lib/` (stateless helpers: provider configs, telemetry, design-md helpers, path resolvers). Zustand stores live in `stores/`. Server routes import from `lib/` and pass `c.req.raw` (a native Web `Request`) to helpers like `isLocalRequest` / `captureFromRequest`.

## Route conventions (Hono)

- `req.body` → `await readJson(c)`; `req.query.X` → `c.req.query('X')`; `req.headers.x` → `c.req.header('x')`.
- `res.status(n).json(o)` → `return c.json(o, n)`; empty responses → `c.body(null, n)`.
- Custom headers → `c.header(k, v)` then `return c.body(...)`.
- **Streaming**: text/plain agent output uses `streamText` from `hono/streaming` (`design.ts`); SSE uses `streamSSE` (`generate.ts`). Client-disconnect cleanup is `stream.onAbort(...)`.
- **Callback/spawn-driven handlers** (discover, generate POST): wrap the child-process `close`/`error` events in `new Promise<Response>((resolve) => {...})` and `return await` it.
- Module-level state (process handles, caches, `generationEvents` EventEmitter, lockfile recovery) is plain Node and lives at module scope — unaffected by the HTTP layer.

## Setup & running

- **This project standardizes on Bun.** `setup.mjs` requires `bun` in PATH and runs a bare `bun install` for the nested install. `node setup.mjs --untrack` stops tracking already-committed playground files.
- `bunfig.toml` sets `[install] peer = false` — this is what keeps `react`/`react-dom`/`tailwindcss`/`vite` out of the nested `node_modules` so they resolve up to the host's single copy (Bun installs peerDependencies by default, so this must stay). It replaces the old `.npmrc` `legacy-peer-deps` flag.
- Run: start the **host's** Vite dev server (`bun dev`); open `/playground`. The playground has no standalone dev script of its own.
- Standalone API only (rare): `node server/index.ts` → `http://localhost:4319/playground/api/...`.
- The design-system "Setup" feature (`/api/design/setup`) runs `bun add --dev` against the **host** project, so the host is assumed to use Bun too.

## Conventions

- Match the surrounding code's style; this package favors small focused modules and explicit error handling with `console.error` + JSON error bodies.
- Binary uploads (images/screenshots) are **base64 in JSON**, not multipart — hence the 50MB body limit. (PDF-on-canvas support was removed; there is no `pdfjs-dist` dependency or `pdf` node type.)
- **Leaf UI components are grouped under `components/<type>/`** — `modals/`, `chat/`, `canvas/` (plus the pre-existing `flow/`). New leaf components should follow this convention.
- **Shell composition files are grouped under `app/`** — `PlaygroundCanvas`, `PlaygroundClient`, `PlaygroundHeader`, `page`, `layout`, `loading`. Global styles live in `styles/` (`playground-global.css`). Tooling-pinned entry files stay at root: `dev-entry.tsx` (the react-router mount entry) and `registry.tsx` (imported widely across subsystems). `playground-tailwind-entry.css` also stays at root as the Vite/Tailwind build entry.
- **Provider visibility** is gated by `SHOW_ALL_PROVIDERS` in `lib/providers/registry.ts`; UI surfaces use `getVisibleProviders()`/`getVisibleProviderIds()`, and `DEFAULT_PROVIDER_ID` (re-exported from `lib/constants.ts`) is `claude-code`. Don't hardcode provider-id literals — use `DEFAULT_PROVIDER_ID`.
- Local-only endpoints (`providers`) gate on `isLocalRequest(c.req.raw)`.
- There is **no root `tsconfig.json`** — the host compiles the TS. When typechecking locally, `react`/`vite` resolve only in a host (they're peerDependencies), so module-not-found errors for those are environmental, not real.

## Gotchas

- Don't add anything to the host's `package.json` — the whole value prop is zero dependency diff for the host.
- Keep `@hono/node-server`: the Vite-plugin embedding needs `getRequestListener` regardless of runtime/package manager.
- Client fetch paths are hardcoded to `/playground/api/...` across `.tsx` files — keep server paths in sync.
