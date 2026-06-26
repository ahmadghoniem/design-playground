# Host Linking Guide

How to **live-link** the shared `design-playground` repo into a host app, so edits to the repo HMR into every linked host instantly — no copy step, no `watch.mjs` delay.

## TL;DR

From inside the repo:

```bash
node link.mjs ../Rewynd          # link (creates the junctions)
node link.mjs --status ../Rewynd # inspect current state
node link.mjs --unlink ../Rewynd # remove the link (repo untouched)
```

Then add **one** thing to the host's `vite.config.ts` (see [Host wiring](#host-wiring)) and start the dev server. That's it.

## Why a bare folder symlink does NOT work (read this)

The obvious move — symlink `HostApp/src/app/playground` → the repo — fails, and understanding why is the whole point of `link.mjs`:

- **Node/Vite resolve modules from a file's REAL path, not the symlink location** (this is `preserveSymlinks: false`, the default). So a playground file's imports resolve relative to the *repo*, not the host.
- The repo keeps its own deps nested in `node_modules/` — those resolve fine from the real repo path.
- But `react`, `react-dom`, `tailwindcss`, and `vite` are **peerDependencies** — intentionally *not* nested. In copy-mode they resolve UP the host tree to the host's single copy. Through a bare symlink the "up" walk climbs the *repo's* tree, where they don't exist → `Can't resolve 'tailwindcss'`, then a cascade.
- The tempting fix, `resolve.preserveSymlinks: true`, **breaks pnpm hosts**: pnpm's non-flat `node_modules` relies on Vite following its internal symlinks to real paths. Turning that off makes the host's *own* packages fail to resolve (`Could not resolve "@radix-ui/..."`).

The two requirements directly conflict — there is no single `preserveSymlinks` setting that satisfies both.

## How `link.mjs` fixes it

`link.mjs` does two things:

1. **Mounts the repo** as a directory junction (Windows) / symlink (POSIX) at `HostApp/src/app/playground`.
2. **Bridges the peer deps one level deep**: it injects junctions into the *repo's own* `node_modules/` for each peerDependency, pointing at the host's copies:
   ```
   design-playground/node_modules/react       → HostApp/node_modules/react
   design-playground/node_modules/react-dom    → HostApp/node_modules/react-dom
   design-playground/node_modules/tailwindcss  → HostApp/node_modules/tailwindcss
   design-playground/node_modules/vite         → HostApp/node_modules/vite
   ```

Now every consumer — including deeply nested transitive deps that declare `react` as a peer — resolves UP to `node_modules/<peer>` and lands on the **host's single copy** (React stays a singleton, no "invalid hook call"). This needs **no `preserveSymlinks`**, so the host's own pnpm/npm resolution is left completely alone.

> This is why the old "every transitive dep would need its own symlink" worry was wrong: N consumers share the same 4 junctions at one `node_modules` level.

## Prerequisites

1. **Repo cloned somewhere stable** (e.g. `~/Documents/GitHub/design-playground`). Don't move it after linking — junction targets are absolute.
2. **Nested deps installed in the repo** — once, from inside it: `bun install` (or `node setup.mjs`).
3. **Host deps installed** — the host must have `react`, `react-dom`, `tailwindcss`, and `vite` in its `node_modules` (it does if its own app builds).
4. **`designPlaygroundPlugin()` + `server.fs.allow` in the host `vite.config.ts`** — see below.

## Windows note

`link.mjs` uses **directory junctions** (`fs.symlinkSync(..., 'junction')`), which need **no Developer Mode and no elevation** (same-volume only — fine for local dev). You do not need `mklink` or admin.

## Host wiring

### `vite.config.ts` — plugin + allow the real path

```ts
import { existsSync, realpathSync } from "fs"
import { resolve } from "path"
import { designPlaygroundPlugin } from "./src/app/playground/server/vite-plugin"

// The mount is a junction to the repo, so Vite resolves served files to a real
// path OUTSIDE the host root. Allow that real path. In copy/snapshot mode the
// real path == the mount (inside root), so this is a harmless no-op.
const playgroundMount = resolve(__dirname, "./src/app/playground")
const playgroundReal = existsSync(playgroundMount)
  ? realpathSync(playgroundMount)
  : playgroundMount

export default defineConfig({
  plugins: [react(), tailwindcss(), designPlaygroundPlugin()],
  server: {
    // Required: without this Vite serves dev-entry.tsx RAW (404 / un-transpiled),
    // which surfaces as "missing ) after argument list" from leaked TS syntax.
    // Do NOT add resolve.preserveSymlinks — it breaks pnpm hosts (see above).
    fs: { allow: [".", playgroundReal] },
  },
})
```

> **Why `realpathSync`, not the mount path?** Vite checks `fs.allow` against the file's *real* path. If you allow the junction path instead of its target, Vite still denies the load and serves the `.tsx` untransformed — the `!` and other TS syntax then reach the browser as a `SyntaxError`.

### `playground.html` at the host root

The repo ships `playground.html` (MPA entry) with `<script src="/src/app/playground/dev-entry.tsx">`. The plugin rewrites `/playground` → `/playground.html` internally; no host routing changes needed.

### React Router `basename`

The host's `<BrowserRouter basename="/playground">` must match the clean URL the plugin serves at.

## Verification

```bash
bun dev   # or: pnpm exec vite / npm run dev
# open http://localhost:<port>/playground
```

Expected: the canvas loads. Quick sanity checks if it doesn't:

- `node link.mjs --status ../Host` — mount should say `LINKED`, all peers `linked → host`.
- A 404 / raw-TS `SyntaxError` on `dev-entry.tsx` → `server.fs.allow` is missing the **real** path (use `realpathSync`).
- `Can't resolve 'tailwindcss'` → a peer junction is missing (re-run `node link.mjs`), or the host lacks that dep.
- `Could not resolve "@radix-ui/..."` from the host's *own* code → someone set `preserveSymlinks: true`; remove it.

## Unlinking

```bash
node link.mjs --unlink ../Rewynd
```

Removes the peer-dep junctions and replaces the mount junction with an empty dir (the host path is gitignored). Re-run `node link.mjs` to repopulate.

## Alternative: copy-based sync (no longer shipped)

Before `link.mjs`, the repo shipped a `watch.mjs` file-copy watcher that mirrored saved files into a *real* `src/app/playground/` folder in the host (`fs.watch` + `fs.cpSync`). It had a ~100ms delay but needed no junctions and no host-side `fs.allow`.

It was **removed** in favour of `link.mjs` (true live link, zero delay, real HMR) to keep one maintained path. If you ever hit a setup where junctions can't be used — a host on a **different drive/volume** (junctions are same-volume only), or a CI/snapshot where you want a self-contained copy — the copy approach is trivial to reconstruct: watch the repo, `cpSync` changed files into the host's playground dir (ignoring `node_modules`, `.git`, `data`), and let the host HMR pick them up. No peer-dep bridging is needed in that mode because the copied files live inside the host tree and resolve peers up the host normally.

## Related

- [`cli-installer.md`](./cli-installer.md) — publish the playground as an `npx design-playground init` CLI for machines that don't have the repo.
