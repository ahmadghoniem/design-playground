# Task 08 — Relocate Zustand stores out of `lib/` into `stores/`

**Type:** restructure · **Risk:** medium · **Depends on:** none · **Blast radius:** ~30 import sites

## Goal

`lib/` mixes pure helpers (path resolvers, prompt builders, parsers) with **Zustand stores** (stateful singletons). Separate the two: move the stores into a dedicated `stores/` directory so `lib/` is purely stateless helpers and the stateful seams are discoverable in one place.

## The stores and their EXACT importers (verified)

This is the complete edit set per Operating Rule 1 — re-grep to confirm, but every importer below must be repointed. **Missing one does not fail the build loudly if a barrel hides it — so use the zero-grep gate at the end.**

| Store file | Importers to repoint |
|------|-----|
| `lib/design-system-store.ts` | `components/modals/DesignSystemModal.tsx` |
| `lib/dev-mode-store.ts` | `PlaygroundHeader.tsx` |
| `lib/interactive-node-store.ts` | `nodes/ComponentNode.tsx`, `nodes/IterationNode.tsx`, `nodes/StageNode.tsx`*, `PlaygroundCanvas.tsx` |
| `lib/keybinding-store.ts` | `components/modals/KeyboardShortcutsModal.tsx` |
| `lib/model-settings-store.ts` | `components/canvas/PlaygroundSidebar.tsx`, `components/chat/DockedChatBar.tsx`, `components/modals/DesignSystemModal.tsx`, `components/modals/ModelSettingsModal.tsx`, `hooks/useModelCycle.ts`, `nodes/shared/IterateDialog.tsx`, `nodes/shared/IterateDialogParts.tsx` |
| `lib/playground-draw-store.ts` | `PlaygroundCanvas.tsx` |
| `lib/preview-color-scheme-store.ts` | `iterations/[slug]/page.tsx`†, `PlaygroundClient.tsx`, `PlaygroundHeader.tsx` |
| `lib/flow-mocks-store.ts` | **see Task 09 coupling below** |

\* `nodes/StageNode.tsx` is deleted by **Task 09**. If 09 ran first, this importer is gone — skip it.
† `iterations/[slug]/page.tsx` is renamed by **Task 07**. If 07 ran first, repoint at its new path (`iterations/IterationIsolatedPage.tsx`).

(Confirm the full set: `git grep -ln "from 'zustand'" -- lib` should list exactly these 8 files; `git grep -n "lib/.*-store'"` lists every importer.)

## Note on Task 09 coupling

`lib/flow-mocks-store.ts` belongs to the **signup-Flow feature** that **Task 09 excises**. If Task 09 runs first, this store is already deleted — skip it here. If Task 08 runs first, move it like the others; Task 09 will delete it from `stores/` instead of `lib/`. Coordinate so you don't both touch it.

## Step-by-step

1. Create `stores/`.
2. `git mv` each store file from `lib/` into `stores/` (preserve history). Keep filenames identical.
3. **Fix imports inside each moved store** — their own relative paths to other `lib/` helpers gain a `../lib/` prefix (e.g. `./constants` → `../lib/constants`). Some stores import sibling stores (`flow-mocks-store` ↔ `flows/types`); update those to the new sibling location.
   - ⚠️ **Re-depth EVERY import in the moved file, top to bottom — not just the first import block.** A prior agent on the previous batch re-depthed the first ~40 import lines of a moved file and silently abandoned the rest; the tail of the file kept pointing at the old depth and resolved into a non-existent dir. Imports can also appear *below* the top block (lazy `import()`, a mid-file `export … from`, a re-export). Scroll to the **end** of each moved file and fix every relative specifier — then run the orphaned-import gate below to prove none were missed. Operating Rule 1 applies *within* a file, not only across files.
4. **Fix every importer.** For each store, `git grep -ln "lib/<store-name>"` and rewrite `'.../lib/<store>'` → `'.../stores/<store>'`. Watch relative depth: a file in `nodes/` importing `../lib/model-settings-store` becomes `../stores/model-settings-store`; a file in `components/modals/` importing `../../lib/...` becomes `../../stores/...`.
5. **Decide on a barrel.** Optional: add `stores/index.ts` re-exporting each store for shorter imports — only if it doesn't create circular-import risk with `lib/`. If unsure, skip the barrel; direct file imports are fine.
6. **Update `CLAUDE.md`** — the "Shared logic: `lib/`" architecture bullet currently lists stores implicitly. Add a one-line note that Zustand stores live in `stores/`, and `lib/` is stateless helpers. (Minor edit; keep it accurate.)

## Zero-grep gate (must return nothing)

```
git grep -n "lib/[a-z-]*-store'"        # no importer still points at lib/<store>
git grep -n "from 'zustand'" -- lib     # no store file left in lib/
git grep -n "from '\.\./lib/.*-store'\|from '\./lib/.*-store'"
git grep -n "from '\./" -- stores/      # ORPHAN gate: a moved file's own imports left at the old depth
```
The first three: empty. This is the real guard — a missed importer compiles fine only if a barrel masks it, so the grep is mandatory, not the build.

The fourth (**orphaned-import gate**) catches the mid-file-stop failure from the last batch. After the move, a file in `stores/` may only `from './X'` when `X` is **another store** (a real sibling). Every hit must be a store-to-store import; **any `from './constants'`, `from './flows/types'`, `from './providers/…'` etc. is a missed re-depth** that should now read `../lib/…`. If the grep returns a non-store hit, you stopped partway — fix it. (If you added the optional `stores/index.ts` barrel, its `./` re-exports of sibling stores are also legitimate.)

## Verification

- `git grep -n "lib/.*-store'"` and `git grep -n "from 'zustand'" -- lib` → both empty.
- Host `bun dev`, open `/playground`. Exercise store-backed surfaces: model settings (model picker), draw tool (pen stroke persists), preview color scheme toggle, keybindings. State behaves identically — these are module-level singletons, so an incorrect path will hard-fail the import, not silently mis-behave.
- No duplicate store instances: each store is still a single module imported by all callers (a store accidentally imported from two different paths would create two singletons — the grep in the first bullet guards against this).

## Done when

All 8 (or 7, post-Task-09) stores live under `stores/`, `lib/` holds no Zustand `create()` modules, every importer resolves, and stateful surfaces work unchanged.

## Do NOT

- Do not merge or rename stores — this is a move, not a redesign. (Deepening individual stores is out of scope.)
- Do not create two import paths to the same store (singleton hazard).
