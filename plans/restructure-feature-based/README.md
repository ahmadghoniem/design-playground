# Feature-based restructure (Option 1)

Goal: reorganize the **client** code from layer-based (`hooks/`, `lib/`, `components/`,
`stores/`, `nodes/`) into feature-based (`features/*`) over an explicit `shared/` layer,
using a `@/` path alias so imports stay flat. **`server/` is left untouched.**

## Decisions (locked)

- **Imports:** add a `@/` alias. `@/` maps to the package root. Wired via a package
  `tsconfig.json` (paths, for editor/types) **and** injected into the host's Vite config
  by the existing `server/vite-plugin.ts` at mount time — no host edits required.
- **Server:** `server/` (routes + lib + index + vite-plugin) stays where it is. Only the
  vite-plugin gains the alias injection.
- **Feature set (8):** `canvas` (incl. draw tool + canvas node primitives), `discovery`,
  `iterations`, `generation` (split out from iterations), `chat`, `design-system`,
  `skills`, `providers` (its own feature).
- **Shared layer:** explicit `shared/` — `shared/ui/` (shadcn primitives), `shared/lib/`
  (anything used by 2+ features or framework-generic), `shared/stores/` (cross-feature state).
- **Nodes:** split by feature — `IterationNode`/`SkeletonIterationNode` → iterations;
  the rest (Component/Image/Text/Shape/Frame/DragGhost + `nodes/shared/*`) → canvas.
- **Prompts:** all 16 `*.prompt.ts` + `shared-sections.ts` + `utility.ts` → `features/generation/prompts/`.
- **Stores:** split into owning features; only truly cross-feature ones go to `shared/stores/`.

## The placement rule

> A module used by exactly one feature lives in that feature. A module imported by two or
> more features moves up to `shared/`. Features never import from each other — only from
> `shared/` (and `app/` composes features). `app/` composes features.

## Important: server imports client files

`server/routes/*` and `server/lib/*` import ~9 client modules by relative path
(`../../lib/constants`, `../../lib/providers`, `../../lib/design-md-helpers`,
`../../lib/run-design-md-cli`, `../../lib/parse-design-md`, `../../lib/props-fetchers.server`,
`../../lib/resolve-playground-dir`, `../../lib/sync-host-gitignore`, `../../prompts/discovery.prompt`,
`../../prompts/discovery-analyze.prompt`). Since these files MOVE, the server's import lines
must follow them.

**Resolution (decided):** server's files, structure, and logic stay exactly as-is. The ONLY
server edits allowed are (a) plan 00's alias injection in `vite-plugin.ts`, and (b) rewriting
the import *specifier strings* in server files that point at moved client files, changing
`../../lib/x` → `@/shared/lib/x` (or `@/features/<f>/x`). No server logic, no new server files,
no server file moves. The `@/` alias resolves in server too (same tsconfig + Vite), so this works.

## Target tree

```
tsconfig.json              # NEW — paths: { "@/*": ["./*"] }
app/                       # composition shell: PlaygroundClient, PlaygroundHeader, page
features/
  canvas/                  # PlaygroundCanvas + canvas hooks/lib/nodes + draw tool
  discovery/               # DiscoveryModal, sidebar, registry-tree
  iterations/              # IterationNode, IterateDialog, scan/adoption
  generation/              # generation coordination/lifecycle + prompts
  chat/                    # DockedChatBar, chat hooks, model-settings
  design-system/           # DesignSystemModal + design-md pipeline
  skills/                  # SkillsCatalogModal + skill picker/helpers
  providers/               # lib/providers/* + resolve-agent-model
shared/
  ui/                      # shadcn primitives (from components/ui)
  lib/                     # cross-feature helpers (generation-body, prompts builders, model-catalog…)
  stores/                  # preview-color-scheme-store (cross-feature)
server/                    # UNCHANGED except vite-plugin alias injection
```

## Sequencing (why this order)

Because every import becomes a `@/`-absolute path, we decouple "move files" from "fix import
depth". Do the mechanical codemod once, then each feature move is just `git mv` + a
find/replace of one path prefix.

| Plan | What | Risk | Suggested model |
|------|------|------|-----------------|
| 00 | Add `@/` alias infra (tsconfig + vite-plugin injection) | med | strong |
| 01 | Codemod ALL relative imports → `@/` absolute, repo-wide | high (mechanical, broad) | strong |
| 02 | Create `shared/` (move `components/ui`→`shared/ui`, shared `lib/`→`shared/lib`, shared stores) | med | strong |
| 03 | `features/providers` | low | any |
| 04 | `features/generation` (+ prompts) | med | mid |
| 05 | `features/iterations` | med | mid |
| 06 | `features/chat` | med | mid |
| 07 | `features/discovery` | med | mid |
| 08 | `features/design-system` | low | mid |
| 09 | `features/skills` | low | mid |
| 10 | `features/canvas` (largest; also nodes) | high | strong |
| 11 | Final sweep: verify no stale paths, no cross-feature imports, boot the app | — | strong |

Run strictly in order — every plan after 01 assumes `@/`-absolute imports already exist.
After each plan, `git status` + the plan's grep VERIFY before starting the next.

## Global constraints for every plan

- Use `git mv` (not delete+create) so history follows the file.
- After moving a file, every reference to its old `@/<old>` path — anywhere in the repo,
  including `server/` if it imports client code (it shouldn't) — must be updated to the new
  `@/<new>` path. Grep-verify zero stale references.
- Do NOT touch `server/routes/*`, `server/lib/*`, `server/index.ts` LOGIC or structure. The
  only server edits allowed are: (a) plan 00's alias injection in `server/vite-plugin.ts`, and
  (b) rewriting import *specifier strings* in server files that reference a moved client file
  (`../../lib/x` → `@/shared/lib/x` or `@/features/<f>/x`). Nothing else in server changes.
- Do NOT change any runtime behavior, JSX, or logic — this is a pure move + import rewrite.
- No new dependencies.
