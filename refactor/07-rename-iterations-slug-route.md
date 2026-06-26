# Task 07 — Rename the Next.js-style `iterations/[slug]/` route

**Type:** restructure · **Risk:** low · **Depends on:** none · **Blast radius:** ~3 files

## Goal

This is a **Vite + react-router** app, but `iterations/[slug]/page.tsx` mimics the **Next.js App Router** `[slug]` dynamic-segment folder convention. The folder name is a vestige and misleads readers into thinking file-system routing is in play. Rename it to a Vite-idiomatic path. Behaviour is unchanged.

## Context

- Routing is explicit react-router in `dev-entry.tsx`:
  ```tsx
  <Route path="/iterations/:slug" element={<PlaygroundIterationIsolatedPage />} />
  ```
  The `[slug]` folder name does **nothing** for routing — react-router uses the `path="/iterations/:slug"` string and the imported component. The folder could be named anything.
- The component lives at `iterations/[slug]/page.tsx`, exporting `PlaygroundIterationIsolatedPage`.
- The sibling `iterations/index.ts` is an auto-generated map (`getIterationComponent`) imported by the page via `from '..'`. **Keep `iterations/index.ts` where it is** — it is the iteration-component registry, not part of the route folder.
- `iterations/index.example.ts` is an example of the generated map.

## Target

Rename to a flat, convention-free name. Recommended:

```
iterations/
  index.ts                       # unchanged (generated registry)
  index.example.ts               # unchanged
  IterationIsolatedPage.tsx      # was [slug]/page.tsx
```

(Component already named `PlaygroundIterationIsolatedPage`, so the filename `IterationIsolatedPage.tsx` reads naturally.)

## Step-by-step

1. `git mv "iterations/[slug]/page.tsx" "iterations/IterationIsolatedPage.tsx"`. Remove the now-empty `iterations/[slug]/` directory.
2. The moved file imports:
   - `from '../../registry'` → now `from '../registry'` (one fewer level).
   - `from '..'` (the `iterations/index.ts` map) → now `from '.'` or `from './index'`.
   - `from '../../lib/constants'` → `from '../lib/constants'`.
   - `from '../../lib/preview-color-scheme-store'` → `from '../lib/preview-color-scheme-store'`.
   Fix all relative import depths.
3. Update the importer in `dev-entry.tsx`:
   - `import { PlaygroundIterationIsolatedPage } from './iterations/[slug]/page';`
   - → `import { PlaygroundIterationIsolatedPage } from './iterations/IterationIsolatedPage';`
   - **Leave the `path="/iterations/:slug"` string unchanged** — the URL contract does not change.
4. `git grep -n "\[slug\]"` → zero hits.

## Verification

- Host `bun dev`. Navigate to `/playground/iterations/<someComponentId>` (or trigger an isolated iteration view) → it renders exactly as before.
- The URL `/playground/iterations/:slug` is unchanged; only the file path changed.
- `git grep -rn "\[slug\]"` and `git grep -rn "iterations/\[slug\]"` → nothing.

## Done when

No `[slug]` folder remains, the isolated iteration page renders at the same URL, and `dev-entry.tsx` imports the renamed file.

## Do NOT

- Do not change the route `path` string or the `:slug` param name — that is the public URL, not a file convention.
- Do not move or regenerate `iterations/index.ts` / `index.example.ts`.
