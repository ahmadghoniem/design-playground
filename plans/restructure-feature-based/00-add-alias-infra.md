Stack: React 19 + Vite + Hono, TypeScript. Embedded package compiled by the HOST's Vite (no local vite.config, no tsconfig today). Relative imports, no alias yet.

TASK: Add a `@/` path alias that maps to the package root, wired so it works BOTH in the editor/type-checker AND at bundle time inside the host's Vite — without requiring any host-side config change.

--- Part 1: tsconfig for editor/types ---

Create `tsconfig.json` at the package root with exactly this content:
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] },
    "noEmit": true,
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ESNext",
    "skipLibCheck": true,
    "allowImportingTsExtensions": true
  },
  "include": ["app", "features", "shared", "server", "nodes", "hooks", "lib", "components", "stores", "prompts", "*.tsx", "*.ts"]
}
Note: this file is for editor/tooling resolution only (noEmit); the host still compiles the actual build. Keep the `include` broad so it covers both the current and post-move directories.

--- Part 2: inject the alias into the host's Vite at mount time ---

Edit `server/vite-plugin.ts`:
- Add a `config()` hook to the returned Plugin object (alongside the existing `name` and `configureServer`) that registers the alias so the host's Vite resolves `@/...` to this package's root.
- Compute the package root at runtime from the module's own location (this file lives at `<pkgRoot>/server/vite-plugin.ts`, so pkgRoot is its parent's parent). Use:
  `import { fileURLToPath } from 'node:url';` and `import path from 'node:path';`
  `const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');`
- The `config` hook must return a partial Vite config merging the alias without clobbering existing aliases:
  `config() { return { resolve: { alias: { '@': pkgRoot } } }; }`
- Do NOT modify the existing `configureServer` middleware logic at all.

CONSTRAINTS:
- Do NOT change any other server file or any client file. This plan only adds the alias plumbing.
- Do NOT convert any imports yet — that is the next plan.
- Keep `@hono/node-server` and all existing imports/behavior intact.
- The alias key is exactly `@` (so `@/lib/utils` → `<pkgRoot>/lib/utils`).

VERIFY:
- `test -f tsconfig.json && grep -n '"@/\*"' tsconfig.json` shows the paths mapping.
- `grep -n "resolve: { alias" server/vite-plugin.ts` (or `alias: { '@'`) shows the injected alias.
- `grep -n "fileURLToPath\|pkgRoot" server/vite-plugin.ts` shows the root computed from import.meta.url.
- `grep -n "configureServer" server/vite-plugin.ts` still present (existing behavior untouched).
