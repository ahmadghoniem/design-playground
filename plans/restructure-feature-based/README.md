# Feature-Based Restructure (client) — Migration Plan

Goal: reorganize the **client** code from layer-based directories (`hooks/`, `lib/`, `components/`, `stores/`, `nodes/`, `prompts/`) into encapsulated feature modules (`features/*`) with an explicit `shared/` layer. A package path alias `@pg/` keeps imports flat and makes file moves cheap. The `server/` directory layout stays intact — only import-path strings change, plus one new hook in the Vite plugin.

## Decisions

- **Alias is `@pg/`, never `@/`.** `@/` is owned by the **host** app: `dev-entry.tsx` (`@/index.css`), `registry.tsx` (`@/features/...`, `@/components/ui/button`), and every generated `iterations/*.iteration-*.tsx` rely on the host's `@/ → host-src` alias. Those imports must **never** be rewritten.
- **New package-level `tsconfig.json`** with `paths`: `"@pg/*": ["./*"]` **and** `"@/*": ["../../*"]`. The `@/` mapping is editor-only: a nested tsconfig captures playground files away from the host's `tsconfig.app.json` in VS Code, so host-facing `@/` imports would go red without it. When this repo is standalone (no host above), that mapping dangles harmlessly. This tsconfig is for IntelliSense and Bun's resolver; the host still compiles the TS.
- **Vite registration**: new `config()` hook in `server/vite-plugin.ts` (it currently has only `configureServer`) returning `resolve.alias` in **array form** — `[{ find: /^@pg\//, replacement: <abs package root>/ }]` — so it appends to, never clobbers, the host's alias config. Derive the package root from `import.meta.url`.
- **Server files use `@pg/` too.** Consequence: standalone mode is now **`bun server/index.ts`** (Bun honors tsconfig `paths`; plain `node` does not). Update the docstring in `server/index.ts` and CLAUDE.md. **Revert path**: if plain-node standalone is ever needed again, convert server imports back to relative (`../../shared/lib/x`) — nothing else server-side depends on the alias.
- **8 feature modules**: `canvas`, `discovery`, `iterations`, `generation` (owns all of `prompts/` — 13 `*.prompt.ts` + `shared-sections.ts` + `utility.ts` → `features/generation/prompts/`), `chat`, `design-system`, `skills`, `providers` (`lib/providers/*` → `features/providers/`).
- **Shared layer**: `shared/ui/` (base primitives, currently `components/ui/*`), `shared/lib/` (utilities used by 2+ features), `shared/stores/` (cross-feature state).
- **Known pre-assignments** (fix current shared-layer violations before feature moves):
  - `stores/model-settings-store` → `shared/stores/` (7+ importers across areas; `lib/generation-body.ts` imports it today)
  - `stores/preview-color-scheme-store` → `shared/stores/` (app shell + iterations page)
  - `components/ui/inline-reference/` → `shared/ui/` (`lib/impeccable-skill.ts` imports it today)
  - `stores/interactive-node-store` → `features/canvas/`
  - `stores/iframe-error-store` → `features/iterations/`
- **Placement rule for everything unmapped** (41 flat `lib/` files, 24 `hooks/`, etc.): before moving a file, grep its importers. Imported by exactly one feature → that feature's directory. Imported by 2+ features → `shared/`. Server-imported client libs (`lib/constants`, `lib/providers`, `lib/resolve-playground-dir`, `lib/design-md-helpers`, …) count server routes as a consumer — if a lib file is used by the server plus any feature, it belongs in `shared/lib/`.

## Do-not-touch list

- **Root-pinned files stay at root**: `dev-entry.tsx`, `registry.tsx`, `playground-tailwind-entry.css`, `setup.mjs`, `bunfig.toml`, `knip.json`.
- **Content/generated dirs stay put entirely**: `iterations/` (including `IterationIsolatedPage.tsx` — the dir's path is wired into server constants and generated artifacts), `canvas-components/`, `skills/` (skill content), `assets/`, `styles/`, `docs/`.
- **Host-facing `@/` imports** are never rewritten (dev-entry, registry, generated iteration files).
- **No server logic changes**: `server/routes/*`, `server/lib/*`, `server/index.ts` change only import-path strings (and the vite-plugin gains the `config()` hook).
- Client fetch paths (`/playground/api/...`) untouched.

## Boundary policy

> A module consumed by exactly one feature lives inside that feature. A module imported by 2+ features (or by the server) is promoted to `shared/`. **Features never import other features** — cross-feature composition happens in `app/`. `shared/` never imports from `features/` or `app/`. Enforced mechanically by dependency-cruiser, not prose.

**No barrel files.** Features expose no `index.ts` re-export hubs; consumers deep-import. Rationale:
1. This package is dev-only and never built, so barrels' only effect here is cost: importing one thing through a barrel makes Vite transform every module the barrel re-exports, and editing any file invalidates the barrel and cascades HMR to every consumer of *anything* in that feature.
2. Barrels are the most common source of accidental circular imports; with ESM + zustand stores created at module scope, cycles surface as `undefined` at init, not clean errors.
3. Deep imports keep the true dependency edge visible, which keeps dep-cruiser rules trivial.
4. The curated-public-API benefit is already provided by the boundary rules; barrels can be added later if ever wanted — the reverse is much harder.

## Enforcement

`.dependency-cruiser.cjs` at package root (uses `tsConfig` so `@pg/` resolves): forbid `features/X → features/Y (X≠Y)`, `shared → features|app`, and circular dependencies. Dev-time tool only; **do not add it to package.json**.

**Working command** — plain `bunx dependency-cruiser` is a **false pass**: it cannot see a `typescript` package, so every `@pg/` specifier comes back `couldNotResolve` and the path-based rules match nothing ("no violations" while checking nothing). TypeScript 7.x also doesn't work with dependency-cruiser 18 — pin 5.x. Set up a throwaway install *outside* the repo and run its bin from the repo root:

```
mkdir <somewhere-outside-repo>/depcruise && cd there
bun init -y && bun add dependency-cruiser@18 typescript@5.7.3
cd <repo root>
<somewhere>/depcruise/node_modules/.bin/depcruise --config .dependency-cruiser.cjs --output-type err "{app,features,shared,server}/**/*.{ts,tsx}"
```

Sanity-check that it's really resolving: module count should be ~196, and a deliberately-added `features/X → features/Y` import must be flagged. (dependency-cruiser 18 no longer expands bare directory args — pass the explicit brace-glob.) Every migration stage ends with: dep-cruiser clean + grep for old paths clean.

## Stages

| Stage | Operation | Risk |
|------|------|------|
| 00 | Alias infrastructure: `tsconfig.json`, `config()` hook in `server/vite-plugin.ts`, `.dependency-cruiser.cjs` | Moderate |
| 01 | Convert relative imports to `@pg/...` project-wide (client + server). Same-directory `./sibling` imports stay relative; host `@/` imports untouched | High (mechanical) |
| 02 | Create `shared/{ui,lib,stores}`; move `components/ui/*`, the pre-assigned stores, and every multi-consumer / server-consumed `lib/` file | Moderate |
| 03 | `features/providers` (`lib/providers/*`) | Low |
| 04 | `features/generation` + `prompts/` → `features/generation/prompts/` | Moderate |
| 05 | `features/iterations` (IterationNode, SkeletonIterationNode, IterateDialog, iframe-error-store, adoption flows) | Moderate |
| 06 | `features/chat` (DockedChatBar, chat hooks) | Moderate |
| 07 | `features/discovery` (DiscoveryModal, sidebar/registry tree) | Moderate |
| 08 | `features/design-system` | Low |
| 09 | `features/skills` (SkillsCatalogModal + helpers; the `skills/` content dir stays put) | Low |
| 10 | `features/canvas` (PlaygroundCanvas stays in `app/`; canvas hooks, remaining `nodes/*`, canvas components) — largest | High |
| 11 | Verification: old layer dirs gone, dep-cruiser clean, knip pass, host-run typecheck, `/playground` smoke test, `bun server/index.ts` boots; update CLAUDE.md layout/conventions | — |

Stages run sequentially; every stage after 01 assumes the alias is active. After each move, update **all** references from `@pg/<old>` to `@pg/<new>` and re-run the gates.

## Execution constraints

- Use `git mv` for moves (preserve history); no logic, behavior, or UI changes; no new runtime dependencies.
- After each stage: `bunx dependency-cruiser ...` clean; grep for the stage's old paths returns zero.

## Verification (stage 11 detail)

1. `grep -r "\.\./lib/\|\.\./\.\./lib/\|\.\./prompts/" --include="*.ts*"` → only expected remnants (same-dir relatives).
2. `bunx dependency-cruiser --config .dependency-cruiser.cjs "{app,features,shared,server}/**/*.{ts,tsx}"` → zero violations.
3. knip (config already at `knip.json`) → no new orphans/dead exports introduced by the move.
4. Real typecheck **from the host** (Rewynd): `npx tsc -p tsconfig.app.json --noEmit` — do not trust the host's `type-check` script (checks zero files).
5. Smoke test: host `bun dev`, open `/playground` — canvas renders, discovery modal opens, one generation run streams; `/playground/iterations/:slug` isolated page loads.
6. `bun server/index.ts` boots standalone and serves `/playground/api/...`.
7. Update CLAUDE.md architecture/conventions sections to the new layout.
