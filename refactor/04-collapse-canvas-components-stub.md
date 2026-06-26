# Task 04 — Stop committing the empty `canvas-components/index.ts` stub

**Type:** cleanup · **Risk:** low · **Depends on:** none · **Blast radius:** 1 file + `.gitignore`

## Goal

`canvas-components/index.ts` is an auto-generated barrel that is **committed empty** even though the runtime loader already tolerates its absence. Stop force-tracking the empty stub. The directory stays as a runtime write-target; the generated index is created on demand, not checked in.

## Context — the actual mechanism (verified)

This is **not** two competing registries. The relationship is a generated barrel + a graceful loader:

- `canvas-components/index.ts` (11 LOC) is an **auto-generated** barrel mapping on-canvas JSX filenames to components. Today it is **empty** (`canvasComponents = {}`).
- `nodes/oncanvas-loader.ts` is the **only module importer**. It does:
  ```ts
  try { return await import('../canvas-components/index'); }
  catch { return { canvasComponents: {}, getOnCanvasComponent: () => undefined }; }
  ```
  → it **already falls back to empty when the module does not exist.**
- `server/routes/oncanvas-components.ts` is the server side that **regenerates** `canvas-components/index.ts` when on-canvas JSX components are written.
- `.gitignore` currently has:
  ```
  canvas-components/*
  !canvas-components/index.ts
  ```
  i.e. the directory's generated `frame-*.tsx` files are ignored, but the empty `index.ts` is **explicitly force-tracked** by the `!` negation.

The redundancy the owner flagged: **committing an empty generated stub that the loader does not need.** On a fresh checkout the stub adds nothing the `catch` branch wouldn't already provide; once the server generates real components it overwrites the stub anyway.

> The other ~12 `canvas-components` references in the codebase are **path strings** (where generated files are written / resolved), not imports of the barrel. Do not touch those — the on-disk path contract must stay intact.

## Step-by-step

1. **Confirm the only barrel importer is the loader.** `git grep -n "from '.*canvas-components/index'\|import('.*canvas-components/index')"` → should be just `nodes/oncanvas-loader.ts`. If anything else imports the barrel **statically** (not via the loader), STOP and report — those would crash on a missing module.
2. **Confirm the server regenerates it.** Read `server/routes/oncanvas-components.ts` and verify it writes `canvas-components/index.ts` when components are added. (This is the contract that makes deleting the committed stub safe.)
3. **Untrack the stub:**
   - Edit `.gitignore`: remove the `!canvas-components/index.ts` negation line. Optionally add `canvas-components/` (the whole dir) so nothing under it is tracked.
   - `git rm --cached canvas-components/index.ts` (untrack without deleting your local working copy).
4. **Keep the directory present for local dev.** The loader's dynamic `import('../canvas-components/index')` needs the path to resolve at runtime once components exist; the server creates the file. To avoid a confusing empty-dir / first-run state, either:
   - leave the local `index.ts` on disk (now gitignored), **or**
   - add a tracked `canvas-components/.gitkeep` so the directory exists on a fresh clone, and let the server generate `index.ts` on first use.
   Prefer the `.gitkeep` option — it documents intent and keeps the empty barrel out of git.
5. **Verify the loader's cold-start path.** With no committed `index.ts`, the dynamic import throws and the `catch` returns the empty map. Confirm that path is intact (do not "simplify" the try/catch away — its absence-tolerance is the whole point).

## Verification

- Fresh clone (or simulate: temporarily move `canvas-components/index.ts` aside) → playground loads, canvas works, no console error from `oncanvas-loader` (the `catch` handles it).
- Generate a JSX iteration on canvas (drag-to-iterate a JSX component) → the server writes `canvas-components/index.ts`, the loader imports it, and the on-canvas component renders.
- `git status` shows `canvas-components/index.ts` is no longer tracked; `.gitignore` no longer force-includes it.

## Done when

The empty barrel stub is no longer committed, the directory still exists for runtime generation (via `.gitkeep`), the loader's absence-tolerant import is unchanged, and on-canvas JSX generation still produces a working, loadable component.

## Do NOT

- Do not delete `nodes/oncanvas-loader.ts` or remove its `try/catch` fallback.
- Do not change the on-disk `canvas-components/` write path used by `server/routes/oncanvas-components.ts`, the prompts, or `lib/resolve-playground-dir.ts`.
- Do not convert the loader's dynamic import to a static import (it would crash when the barrel is absent).
