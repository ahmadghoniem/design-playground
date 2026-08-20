@AGENTS.md

Guidance for working in this repository.

## What this is

`design-playground` is a **local-dev-only** design canvas that embeds into a host React app. You drag components onto an infinite canvas and use Claude Code (`claude`) to generate AI layout and style iterations. It runs only in the host's dev server, never in CI or prod.

The package is **dropped into a host project** at `src/app/playground/` (or `app/playground/`). Its dependencies install **nested** under that directory's own `node_modules/` so the host's `package.json` and lockfile are never touched. `react`, `react-dom`, `tailwindcss`, and `vite` are `peerDependencies` provided by the host.

## Where things are written down

- `.claude/specs/` — the source of truth for the product, one file per feature. Each has the same three sections: **Settled** → **As the code is today** → **Open**.
- `.claude/prototype/` — the Alpine.js mock. `npm run serve` in that directory serves it on :3456. It is a design reference, not shipping code.
- `.claude/research/` — a frozen archive. The one live file is `agent-subscriptions-and-acp.md`, open research on how the app should drive an Agent.
- `.claude/WORKFLOW.md` — how we work.
- `CONTEXT.md` — interface vocabulary. It carries `_Avoid_` lists; names on them (including "sidebar" and "panel") stay out of new code, filenames, and specs.

## Directory layout (feature-based)

Client code is organized by **feature**, not by layer. Cross-feature imports use the package-root alias `@pg/` (e.g. `@pg/shared/lib/constants`).

- `app/` — composition shell: `PlaygroundClient`, `PlaygroundCanvas`, `PlaygroundHeader`, `PlaygroundSidebar`, `ModelSettingsModal`, and cross-feature glue (`useChatSubmit`, `build-chat-prompt`). `dev-entry.tsx` at root is the mount entry.
- `features/<name>/` — `canvas`, `registry-sidebar`, `iterations`, `generation` (owns `prompts/` and `prompt-builders.ts`), `chat`. **Features never import other features** — cross-feature composition lives in `app/`; anything shared is promoted to `shared/`.
- `shared/` — `shared/ui/` (shadcn primitives + cross-feature components), `shared/lib/` (used by 2+ features or by the server), `shared/stores/` (cross-feature zustand).
- `server/` — **imports client code via relative paths, not `@pg/`**, so `bun server/index.ts` resolves standalone without a bundler.
- Root-pinned (do not move): `dev-entry.tsx`, `registry.tsx`, `registry-types.ts`, `setup.mjs`, `bunfig.toml`, `knip.json`, `tsconfig.json`. Content dirs stay put: `iterations/`, `skills/`, `assets/`, `styles/`.
- Generated, do not hand-edit: `discovered-registry.json` (the component manifest) and `discovered-registry.gen.tsx`. **Nothing writes the manifest today** — the static-analysis scan was removed to be redesigned, so the registry is whatever the committed manifest holds.
- `playground.html` lives in the **host** app; the Vite plugin rewrites `/playground` to it.

The alias is defined in the package-root `tsconfig.json` (`@pg/* → ./*`, plus `@/* → ../../*` for host imports) and registered for Vite by a `config()` hook in `server/vite-plugin.ts`. The host must add `"@pg/*": ["./src/app/playground/*"]` to its own `tsconfig.app.json` paths. **No barrel files** — deep-import instead. Boundaries are enforced by `.dependency-cruiser.cjs`: run `bun run check:boundaries` or `bun run check:architecture`. Plain `bunx dependency-cruiser` without `--ts-config` is a false pass — it can't resolve `@pg/`.

## Architecture

- **Frontend**: React, rendered by the host's Vite dev server. `dev-entry.tsx` mounts `<PlaygroundClient />` via `createRoot`. Tailwind v4, `zustand`, `@xyflow/react`. Single-player. **No router** — there are no routes and no deep links; don't add one back for a "standalone iteration page".
- **Backend**: a **Hono** app under `server/`, mounted into the host's Vite dev server (no second process).
  - `server/index.ts` — `createPlaygroundRouter()`, `createPlaygroundServer()` (`cors()` + `bodyLimit(50MB)`, routes under `/playground`), and a standalone `serve()` on `PORT` (default 4319).
  - `server/vite-plugin.ts` — bridges Hono into Vite's connect middleware via `getRequestListener(app.fetch)` from `@hono/node-server`. Required even under Bun, because Vite's `server.middlewares` is connect/Node `(req,res)`.
  - `server/routes/*.ts` — one module per API area, each exporting a `xxxRoutes()` factory. Handlers register at `/api/...`; served path is `/playground/api/...`.
- **Component registry**: `registry.tsx` is `export const registry = discoveredRegistry` — the manifest is the only source of components. The list is flat; nesting is a leaf's `parentId`. Overlay primitives are listed but never mounted live.
- **Element selection**: previews render **inline in the same document** (React DOM). Alt+hover/click is plain DOM traversal — `features/canvas/hooks/useElementSelection.ts` + `shared/lib/element-context.ts`, with chrome filtered via `EXCLUDE_SELECTORS`. **No iframes, no RPC bridge, no `penpal`.** Preview nodes use a transparent `data-pg-interact-catcher` div to block links/buttons until double-click enters interact mode.
- **Generation event stream**: `shared/lib/generation-events.ts` is a typed event bus. Iteration detection parses `tool_use`/`tool_result` from the `claude` stream-json output in `server/lib/claude-jsonl.ts`. The client's `scanForIterations` on generation-complete catches files written via `Bash` instead of `Write`/`Edit`, and is the only scan trigger. Server SSE uses its own `sseGenerationEvents` emitter in `server/routes/generate.ts`.
- **No window CustomEvents.** Cross-module signals go through a callback, a `shared/stores/` zustand store, or the `generation-events` bus. Don't reintroduce one.
- **Playground root** is the host-relative directory this package lives in, resolved server-side by `resolvePlaygroundDirRelative()` and baked into the client bundle as `__PG_RELATIVE_ROOT__` by a Vite `define`. `shared/lib/playground-paths.ts` reads it at module load; **PlaygroundPaths** builds every host-relative path from it, so callers never hardcode the root.
- **Chrome vs. shell**: the code still renders `PlaygroundHeader`; `shell-and-layout.md` specifies a single full-height row with no header, both flanks collapsing to a floating CollapsedPill. `DELETE /playground/api/generate` is live server-side with no client caller — wire it to a stop control if you want cancellation back.

## Route conventions (Hono)

- `await readJson(c)` for bodies (`server/lib/hono-helpers.ts`, returns `null` on missing/invalid); `c.req.query('X')`; `c.req.header('x')`.
- `return c.json(o, n)`; empty responses `c.body(null, n)`; custom headers `c.header(k, v)` then `return c.body(...)`.
- **Streaming**: SSE uses `streamSSE` (`generate.ts`); client-disconnect cleanup is `stream.onAbort(...)`.
- **Spawn-driven handlers** (generate POST): wrap the child-process `close`/`error` events in `new Promise<Response>((resolve) => {...})` and `return await` it.

## Setup & running

- **This project standardizes on Bun.** `setup.mjs` requires `bun` in PATH. `node setup.mjs --untrack` stops tracking already-committed playground files.
- `bunfig.toml` sets `[install] peer = false` — this is what keeps `react`/`react-dom`/`tailwindcss`/`vite` out of the nested `node_modules` so they resolve up to the host's single copy. Bun installs peerDependencies by default, so it must stay.
- Run: start the **host's** Vite dev server (`bun dev`), open `/playground`. This package has no dev script of its own.
- Standalone API only (rare): `bun server/index.ts` → `http://localhost:4319/playground/api/...`. Use **Bun, not `node`** — the guard is `import.meta.main`.

## Conventions

- Match the surrounding code's style: small focused modules, explicit error handling with `console.error` + JSON error bodies.
- Binary uploads (images/screenshots) are **base64 in JSON**, not multipart — hence the 50MB body limit.
- **New UI/logic goes in its feature dir**, or `shared/` if 2+ features (or the server) need it. shadcn primitives live in `shared/ui/` and are added by hand (there is no shadcn `components.json`). Cross-feature imports use `@pg/...`; same-directory imports stay relative.
- **Constants belong next to their consumer.** `shared/lib/constants.ts` is only for values two or more modules must agree on. A value read by exactly one file goes in that file as a module-scope `const`. Colors belong in the CSS token layer (`--pg-*` in `styles/playground-global.css`, mapped through `@theme inline` in `styles/playground-tailwind-entry.css`) — a color in a `.ts` file can't respond to theming.
- Client fetch paths are hardcoded to `/playground/api/...` across `.tsx` files — keep server paths in sync.
- Don't add anything to the host's `package.json` — zero dependency diff for the host is the whole value prop.

## Agent

Claude Code (`claude`) is the only Agent wired today; Cursor and Codex are planned. Single-agent is a maintenance choice, **not** an architectural commitment.

- Do **not** pre-build a provider registry, a `ProviderId` union, or config indirection for agents that don't exist yet — that abstraction was deleted once and re-adding it speculatively is the mistake.
- Two seams carry everything: CLI-shaped knowledge (binary name, arg building, model catalog, not-found message) lives in `shared/lib/agent-config.ts` (pure, client-safe); process concerns live in `server/lib/spawn-agent.ts` (server-only). Adding a second agent should mean touching those two files plus a picker. When agent-specific knowledge leaks outside them — a hardcoded `claude` string, a Claude-only flag, a stream-format assumption — pull it back in as part of whatever change you're already making.
- Flags passed: `-p`, `--dangerously-skip-permissions`, `--verbose`, `--output-format` (`stream-json` + `--include-partial-messages`, or `text`), `--model`, `--effort`. **`--max-budget-usd` is deliberately not exposed.** Don't reintroduce it.
- **Skills belong to the Agent.** The app lists them and inserts a `/<name>` token; it never loads a skill's body or offers to install one. A slash token is only resolved by the CLI when it is the **first** thing in the prompt — see `composer.md`.

## Typechecking

The package-root `tsconfig.json` exists **only** for the `@pg/`/`@/` aliases; it sets `noEmit` and the host compiles the TS. Locally, `react`/`vite` resolve only in a host, so module-not-found errors for those are environmental. For a *real* typecheck, run it from the host with the host's app tsconfig after adding `"@pg/*": ["./src/app/playground/*"]` to its `paths`: `npx tsc -p tsconfig.app.json --noEmit`. Do **not** trust the host's `type-check` npm script — Rewynd's is a solution-style tsconfig without `--build`, so it silently checks zero files and always "passes".

## Base UI

`shared/ui/`'s `alert-dialog`, `dialog`, `tooltip`, and `button`'s `asChild` run on `@base-ui/react`. Base UI's names differ from Radix and the difference is load-bearing: `Backdrop` not `Overlay`, `Popup` not `Content`, a required `Positioner` wrapper for tooltips, `data-open`/`data-closed` not `data-[state=open|closed]`, and `useRender` / a `render` prop instead of `asChild`.

This matters for the registry: overlay primitives (`Dialog`, `Popover`, `Tooltip`, `Sheet`, `DropdownMenu`, …) portal into `document.body` with `position: fixed`. Rendered live as a Library preview or a canvas node — especially forced `open: true` — the portaled overlay **escapes the card's containment and covers the whole viewport**, reading as if the component opened itself and hijacked the canvas. Don't let the discovery flow adopt a Dialog/Sheet-shaped component until there's a real containment story (a scoped portal `container`).
