# CLI Installer Plan (`npx design-playground init`)

> **Status:** not built yet. This is an executable spec — an agent (or you) can
> follow it end-to-end to ship the installer. It turns the existing copy-paste
> install into a shadcn-style vendoring CLI.

## Goal

Let any host app add the playground with one command:

```bash
npx design-playground@latest init
```

…instead of manually copying the folder. Same model shadcn uses: the CLI
**copies source into the host** (`src/app/playground/`) rather than adding a
runtime dependency. This preserves the package's core invariant — **zero
dependency diff for the host** (deps install nested, `react`/`react-dom`/
`tailwindcss`/`vite` resolve up to the host's single copy; see `CLAUDE.md`).

Non-goal: publishing the playground as an `import`-able npm dependency. That
would pull deps into the host lockfile and break the single-React-copy
guarantee. The CLI vendors source; it does not become a runtime dep.

## What already exists (reuse, don't rebuild)

`setup.mjs` already does ~80% of the work and must be reused, not duplicated:

- Finds the host root (`findProjectRoot`).
- Verifies host prerequisites (`react`/`react-dom`/`tailwindcss`/`vite` present).
- Checks for an agent CLI provider (Claude Code / Cursor / Codex).
- Runs the **nested** `bun install` (reads this folder's `package.json` +
  `bunfig.toml` `peer=false`).
- Wires the host `.gitignore` via `lib/host-gitignore.mjs` (`ensureHostGitignore`).
- Sends one anonymous telemetry event.

The CLI's only genuinely new job is the step that runs **before** all of that:
**fetch the source into the host** (`degit`). After the fetch, it delegates to
the existing setup logic.

## Implementation steps

### 1. Make the package publishable

In `package.json`:

- Remove `"private": true`.
- Set a real `"version"` (start `0.1.0`; the repo currently pins `0.0.0`).
- Add the bin:
  ```jsonc
  "bin": { "design-playground": "./cli.mjs" },
  "files": ["cli.mjs", "setup.mjs", "lib/**", "server/**", "components/**",
            "nodes/**", "hooks/**", "ui/**", "prompts/**", "evals/**",
            "*.tsx", "*.ts", "*.html", "bunfig.toml", "*.md"]
  ```
  > `files` controls what ships to npm. Be generous — the CLI's `init` path uses
  > `degit` against the **git repo** (below), not the npm tarball, so `files`
  > mainly matters if you ever want `npm i -D design-playground` to also carry
  > source. Keep `node_modules`, `.design-playground-version`, and any
  > host-generated `data/*.mockData.ts` out (they're per-host artifacts).

### 2. Refactor `setup.mjs` to export its logic

Today `setup.mjs` runs `main()` on import. Refactor so the CLI can call it
without shelling out:

- Wrap the body in `export async function runSetup({ installDir, hostRoot, untrack } = {})`.
- Keep the `main()` + `main()` call guarded by
  `if (import.meta.url === \`file://\${process.argv[1]}\`)` so
  `node setup.mjs` still works standalone.
- `runSetup` should accept an explicit `installDir` (the freshly-fetched
  `src/app/playground`) so the CLI can point it at the right place.

If a refactor is too invasive, the fallback is `execSync('node setup.mjs', { cwd: installDir })` — but prefer the export.

### 3. Write `cli.mjs`

```
#!/usr/bin/env node
```

Commands:

| Command | Behavior |
|---|---|
| `init` (default) | Scaffold into the host, then run setup. |
| `update` | Re-fetch latest source over the existing folder (preserve host-specific `data/*.mockData.ts` and `.design-playground-version`), then re-run nested install. |
| `init --untrack` | Pass `untrack: true` through to `runSetup` (stops tracking already-committed playground files). |

`init` flow:

1. **Resolve the target dir.** Default `src/app/playground`; fall back to
   `app/playground` if the host has `app/` but no `src/` (mirror the dual path
   in `CLAUDE.md`). Allow `--dir <path>` override.
2. **Refuse to clobber silently.** If the target exists and is non-empty, stop
   and tell the user to run `update` instead (or pass `--force`). Never delete a
   host's existing playground (it may hold gitignored generated artifacts).
3. **Fetch source** with `degit`:
   ```js
   import degit from 'degit';
   await degit('ahmadghoniem/design-playground', { force: true }).clone(targetDir);
   ```
   Add `degit` to the CLI package deps (it's tiny, no git binary needed). Pin to
   a branch/tag via `ahmadghoniem/design-playground#<ref>` when you want
   reproducible installs.
4. **Write `.design-playground-version`** into the target (`{ branch, sha }`) so
   `update` and support can tell which snapshot a host is on. Get the sha from
   the degit clone or a follow-up `git ls-remote`.
5. **Run setup**: `await runSetup({ installDir: targetDir, hostRoot, untrack })`.
6. **Print host wiring** (step 4 below).

### 4. Print the host wiring (the manual bits degit can't do)

After a successful `init`, print exactly these three host-side edits, because
they live in host-owned files the CLI should not silently rewrite:

1. **`vite.config.ts`** — add the plugin:
   ```ts
   import { designPlaygroundPlugin } from './src/app/playground/server/vite-plugin';
   export default defineConfig({ plugins: [react(), designPlaygroundPlugin()] });
   ```
2. **Mount the route** — the playground serves at the clean URL `/playground`
   (the vite plugin rewrites `/playground` → `playground.html`). Ensure the
   host's `dev-entry.tsx` react-router `<BrowserRouter basename="/playground">`
   matches (see `server/vite-plugin.ts` comment).
3. **`playground.html`** — confirm the MPA entry exists at the host root (degit
   brings it in the package; the host just needs Vite to serve it, which the
   plugin handles).

Optionally offer an interactive `--write-vite` that patches `vite.config.ts`
automatically, but default to printing instructions — patching a host's config
is the kind of host-file change that should be opt-in.

### 5. Publish

```bash
npm version 0.1.0
npm publish --access public        # name "design-playground" must be free on npm
```

If the name is taken, scope it (`@ahmadghoniem/design-playground`) and the
command becomes `npx @ahmadghoniem/design-playground init`.

## Verification checklist

- [ ] `npx design-playground@latest init` in a throwaway Vite+React app creates
      `src/app/playground/`, runs the nested `bun install`, and updates
      `.gitignore` — with **no** change to the host `package.json`/lockfile.
- [ ] Visiting `/playground` after adding the plugin renders the canvas.
- [ ] `init` on a host that already has the folder refuses (points to `update`).
- [ ] `update` refreshes source but leaves host-specific
      `data/*.mockData.ts` intact.
- [ ] Works on Windows (degit needs no git binary; `bun` must be in PATH for the
      nested install — surface a clear error if missing, as `setup.mjs` does).

## Notes / gotchas carried over from the package

- The nested install **requires Bun** and `bunfig.toml` `peer=false`; don't swap
  it for npm/pnpm without re-solving the peer-resolution trick.
- Keep client fetch paths (`/playground/api/...`) and server paths in sync — the
  CLI ships both, so this is automatic, but don't rename one side.
- `data/` in the **repo** holds package files (`ai-models.json`, `flows/`).
  `data/*.mockData.ts` in a **host** are generated, host-specific, and gitignored
  — the CLI must never overwrite or publish them.
