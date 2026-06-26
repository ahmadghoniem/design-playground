# Task 06 — Move shell/entry files out of the package root

**Type:** restructure · **Risk:** medium · **Depends on:** none · **Blast radius:** many import sites
**⚠️ Convention conflict:** This contradicts `CLAUDE.md` (current line ~42: "Entry/shell files … stay at the package root"). The owner has explicitly requested the move. **This task includes updating `CLAUDE.md` to match** — do not skip step 5.

## Goal

The package root is cluttered with shell/entry/style files mixed in among directories. Group them so the root reads as a clean manifest of subsystems. Move the shell composition files and global styles into a dedicated `app/` (shell) location; keep only true entry points where tooling requires them.

## Current root-level loose files

```
PlaygroundCanvas.tsx     PlaygroundClient.tsx     PlaygroundHeader.tsx
page.tsx   layout.tsx   loading.tsx   dev-entry.tsx   registry.tsx
playground-global.css    playground-tailwind-entry.css
```

## Pre-computed facts (verified — re-confirm with grep, but this is the current state)

**Exact importers of the movable files** (these are the files that WILL change — a minimum, not the boundary; re-grep per Operating Rule 1):

| Moved file | Imported by |
|---|---|
| `PlaygroundCanvas.tsx` | `PlaygroundClient.tsx` |
| `PlaygroundClient.tsx` | `components/canvas/PlaygroundSidebar.tsx`, `page.tsx` |
| `PlaygroundHeader.tsx` | `PlaygroundClient.tsx` |
| `page.tsx` / `layout.tsx` / `loading.tsx` | `dev-entry.tsx` |
| `playground-global.css` | `layout.tsx`, `nodes/ComponentNode.tsx`, `nodes/IterationNode.tsx` |

Plus each moved file's **own** imports (`./lib/...`, `./nodes/...`, `./prompts/...`) gain a `../` level. That is the bulk of the edits and is internal to each moved file.

## Constraints — what may NOT move (verified)

- **`dev-entry.tsx` — keep at root.** It is the tooling-facing mount entry. `git grep -rn "dev-entry"` to confirm its referencers before assuming; there is **no `playground.html` checked into this repo** (the host owns it), so do not invent one — but if your host has one referencing `dev-entry.tsx`, keep the path stable.
- **`playground-tailwind-entry.css` — keep at root, do NOT move.** Verified: **no `.ts`/`.tsx` imports it.** It is the Tailwind/Vite build entry consumed by host/Vite config outside this repo. Moving it risks a silent style break with no compile error. Leave it at root.
- **`playground-global.css` — safe to move** to `styles/` (only the 3 importers above), but update those 3 imports. Note it may `@import` the tailwind entry — check the CSS file's own `@import` lines and keep them resolvable.
- **`registry.tsx` — keep at root.** Imported widely (`git grep -n "from '.*registry'"` → many hits across `nodes/`, `prompts/`, `iterations/`, `server/`). High-churn; out of scope for this move. Leave it at root.

## Recommended target layout

```
app/
  PlaygroundCanvas.tsx
  PlaygroundClient.tsx
  PlaygroundHeader.tsx
  page.tsx
  layout.tsx
  loading.tsx
styles/
  playground-global.css
  playground-tailwind-entry.css      # only if not pinned by HTML/Vite
dev-entry.tsx                         # stays at root (tooling entry)
registry.tsx                          # stays at root unless you update all importers
```

> If you discover that `page`/`layout`/`loading` follow a host routing convention that requires them at a specific path, keep that convention and move only the three `Playground*` composition files into `app/`. Document whatever you decide in `CLAUDE.md` (step 5).

## Step-by-step

1. **Inventory importers** for each file you intend to move:
   `git grep -n "PlaygroundCanvas\|PlaygroundClient\|PlaygroundHeader\|from './page'\|from './layout'\|from './loading'"`.
2. **Move files** with `git mv` (preserves history) into the target dirs above.
3. **Fix every relative import** — both imports *of* the moved files and imports *within* them (their `../lib/...`, `./nodes/...` paths all gain/lose a `../`). This is the bulk of the work; be exhaustive. A moved file in `app/` reaching `lib/constants` becomes `../lib/constants`.
4. **Update entry wiring**: `dev-entry.tsx` imports `./layout`, `./page`, `./iterations/[slug]/page` — repoint to `./app/layout`, `./app/page`, etc.
5. **Update `CLAUDE.md`** — the "Conventions" bullet that says entry/shell files stay at root. Rewrite it to describe the new `app/` (and `styles/`) layout and which files remain at root (`dev-entry.tsx`, `registry.tsx`) and why.
6. **Update `lib/` doc references / memory** if any code comments name old paths.

## Zero-grep gate (must return nothing)

```
git grep -n "from '\./PlaygroundCanvas'\|from '\./PlaygroundClient'\|from '\./PlaygroundHeader'\|from '\.\./PlaygroundCanvas'\|from '\.\./PlaygroundClient'\|from '\.\./PlaygroundHeader'"
git grep -n "from '\./page'\|from '\./layout'\|from '\./loading'\|from '\.\./playground-global'"
```
Both must be empty (every import now points at `app/` / `styles/`).

## Verification

- Host `bun dev`, open `/playground` → app mounts, canvas renders, header renders, navigation to `/playground/iterations/:slug` still works.
- No 404 on the CSS entry (check the page's network tab / styles apply). `playground-tailwind-entry.css` still loads (you did not move it).
- The `dev-entry.tsx` import block points at the new `app/` paths and the app boots.

## Done when

The root contains directories + only the tooling-pinned entry files; everything imports cleanly; `/playground` renders identically; `CLAUDE.md` reflects the new layout.

## Coordination

This task renames `PlaygroundHeader.tsx`'s path, which **Task 17** also touches. Whoever runs second rebases onto the other. Prefer running 06 **before** 17.

## Do NOT

- Do not move `dev-entry.tsx` or a HTML/Vite-pinned CSS entry without updating the HTML/plugin in the same commit.
- Do not change client `/playground/api/...` fetch strings — those are URLs, not file paths.
