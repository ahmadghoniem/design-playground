# CLAUDE.md

Guidance for working in this repository.

## What this is

`design-playground` is a **local-dev-only** design canvas that embeds into a host React app. You drag components onto an infinite canvas and use an agent CLI (Cursor / Claude Code / Codex) to generate AI layout and style variations. It is never built in CI/prod — it runs only in the host's dev server.

The package is designed to be **dropped into a host project** at `src/app/playground/` (or `app/playground/`). Its dependencies install **nested** under `src/app/playground/node_modules/` so the host's `package.json` and lockfile are never touched. `react`, `react-dom`, `tailwindcss`, and `vite` are `peerDependencies` provided by the host.

## Architecture

- **Frontend**: React + `react-router-dom` v7, rendered by the host's Vite dev server. Entry is `page.tsx`; `layout.tsx` wraps it. Tailwind v4. State via `zustand`. Canvas via `@xyflow/react`. Single-player only (solo builders).
- **Backend**: a **Hono** app under `server/`, mounted into the host's Vite dev server (no second process).
  - `server/index.ts` — `createPlaygroundRouter()` (mounts all route modules), `createPlaygroundServer()` (root app with `cors()` + `bodyLimit(50MB)`, routes under `/playground`), and a standalone `serve()` entry on `PORT` (default 4319).
  - `server/vite-plugin.ts` — `designPlaygroundPlugin()` bridges Hono into Vite's connect middleware via `getRequestListener(app.fetch)` from `@hono/node-server`. Vite's `server.middlewares` is connect/Node `(req,res)`, so this adapter is required for the embedded path even under Bun.
  - `server/routes/*.ts` — one module per API area, each exporting a `xxxRoutes()` factory returning a `Hono` sub-app. Handlers register at `/api/...`; served path is `/playground/api/...`.
  - `server/lib/hono-helpers.ts` — `readJson<T>(c)` parses a JSON body, returning `null` on missing/invalid input (mirrors the old Express `req.body ?? null`).
- **Shared logic**: `lib/` (provider configs, telemetry, design-md helpers, path resolvers). Server routes import from `lib/` and pass `c.req.raw` (a native Web `Request`) to helpers like `isLocalRequest` / `captureFromRequest`.

## Route conventions (Hono)

- `req.body` → `await readJson(c)`; `req.query.X` → `c.req.query('X')`; `req.headers.x` → `c.req.header('x')`.
- `res.status(n).json(o)` → `return c.json(o, n)`; empty responses → `c.body(null, n)`.
- Custom headers → `c.header(k, v)` then `return c.body(...)`.
- **Streaming**: text/plain agent output uses `streamText` from `hono/streaming` (`design.ts`); SSE uses `streamSSE` (`generate.ts`). Client-disconnect cleanup is `stream.onAbort(...)`.
- **Callback/spawn-driven handlers** (tunnel, discover, generate POST): wrap the child-process `close`/`error` events in `new Promise<Response>((resolve) => {...})` and `return await` it.
- Module-level state (process handles, caches, `generationEvents` EventEmitter, lockfile recovery) is plain Node and lives at module scope — unaffected by the HTTP layer.

## Setup & running

- **This project standardizes on Bun.** `setup.mjs` requires `bun` in PATH and runs a bare `bun install` for the nested install. `node setup.mjs --untrack` stops tracking already-committed playground files.
- `bunfig.toml` sets `[install] peer = false` — this is what keeps `react`/`react-dom`/`tailwindcss`/`vite` out of the nested `node_modules` so they resolve up to the host's single copy (Bun installs peerDependencies by default, so this must stay). It replaces the old `.npmrc` `legacy-peer-deps` flag.
- Run: start the **host's** Vite dev server (`bun dev`); open `/playground`. The playground has no standalone dev script of its own.
- Standalone API only (rare): `node server/index.ts` → `http://localhost:4319/playground/api/...`.
- The design-system "Setup" feature (`/api/design/setup`) runs `bun add --dev` against the **host** project, so the host is assumed to use Bun too.

## Conventions

- Match the surrounding code's style; this package favors small focused modules and explicit error handling with `console.error` + JSON error bodies.
- Binary uploads (images/PDFs/screenshots) are **base64 in JSON**, not multipart — hence the 50MB body limit.
- Local-only endpoints (`telemetry`, `providers`) gate on `isLocalRequest(c.req.raw)`.
- Telemetry is anonymous, dev-only, content-free; see `TELEMETRY.md`. Never log prompts, code, file paths, or names.
- There is **no root `tsconfig.json`** — the host compiles the TS. When typechecking locally, `react`/`vite` resolve only in a host (they're peerDependencies), so module-not-found errors for those are environmental, not real.

## Gotchas

- Don't add anything to the host's `package.json` — the whole value prop is zero dependency diff for the host.
- Keep `@hono/node-server`: the Vite-plugin embedding needs `getRequestListener` regardless of runtime/package manager.
- Client fetch paths are hardcoded to `/playground/api/...` across `.tsx` files — keep server paths in sync.
