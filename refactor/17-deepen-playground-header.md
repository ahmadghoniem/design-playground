# Task 17 — Deepen `PlaygroundHeader.tsx` (846 LOC)

**Type:** deepening · **Risk:** medium · **Depends on:** coordinate with Task 06 (moves this file) and Task 09 (removes flow play/adopt) · **Blast radius:** internal

## The problem

The header owns: presence bubbles (`PresenceBubble`, `resolveBubbleDisplayName`), an **"Open in …" launcher** (`OpenInTarget = 'finder' | 'cursor' | 'antigravity' | 'codex' | 'github-desktop'`, `TARGET_LABELS`, default-target persistence via `OPEN_IN_DEFAULT_KEY`), project-context resolution (`ProjectContext`), icon helpers (`ICON_SRC`), and — until Task 09 — flow play/adopt wiring. 23 hooks in one component.

## Pre-reqs

- **Task 09** removes `FlowAdoptPayload`/`FlowPlayPayload` usage (lines ~14, ~125, ~133). Do 09 first.
- **Task 06** moves this file into `app/`. If 06 runs first, apply this task at the new path. Coordinate so you don't both edit `PlaygroundHeader.tsx` simultaneously — prefer 06 → 09 → 17.

## Dependency classification

- "Open in" launcher: **local-API** (`fetch('/playground/api/open-in')` → `server/routes/open-in.ts`). One adapter → keep direct fetch behind a hook.
- Presence: **in-process** (display-name resolution is pure).
- Project context: **local-API** read.

## Target seams

1. **`hooks/useOpenIn`** — the launcher: target list, `TARGET_LABELS`, default-target persistence (`OPEN_IN_DEFAULT_KEY` in localStorage), and the `fetch` to `/playground/api/open-in`. Interface: `{ targets, defaultTarget, setDefault(t), openIn(t) }`. Deep: hides persistence + I/O behind a small surface.
2. **`lib/presence-display-name.ts`** — `resolveBubbleDisplayName(model, provider)` as a **pure function** (note: a near-identical `resolveCanvasBubbleDisplayName` exists in `PlaygroundCanvas.tsx` ~line 320 — **unify them into one shared helper** and have both call sites use it; this is a real duplication to collapse).
3. **`components/PlaygroundHeaderPresence.tsx`** (or under `app/`) — the presence-bubble row component, given the bubble list.
4. **`hooks/useProjectContext`** — project-context resolution if it has its own fetch/state.
5. **`PlaygroundHeader.tsx` becomes layout** composing these. Target: under ~350 LOC.

## Method

- Unify the duplicated display-name resolver first (shared pure fn) — that removes a cross-file duplication and is a clean test target. Then extract `useOpenIn`, then presence row.

## Extraction gate (run after each new file)

If Task 06 ran first, this file lives in `app/`, so blocks moved into `hooks/`/`lib/`/`components/` change depth relative to `app/PlaygroundHeader.tsx` (e.g. `'../lib/x'` from `app/` → `'../lib/x'` from `hooks/`; recompute, don't assume). Fix every carried import **to the end of the moved block** (Operating Rule 1 — don't stop partway), then:
```
git grep -nE "from '\.\.?/(lib|nodes|prompts|hooks|components|server|ui|registry|skills|data)" -- hooks/useOpenIn.ts hooks/useProjectContext.ts lib/presence-display-name.ts
```
Every hit must resolve. The header must **import** the new modules (no leftover copy) and shrink, and the shared display-name helper must have **one** definition (both header and canvas import it — no second copy).

## Verification

- Header renders presence bubbles with correct display names (matching the canvas presence layer — now from the same helper).
- "Open in" menu lists Finder/Cursor/Antigravity/Codex/GitHub Desktop, remembers the chosen default across reloads (`OPEN_IN_DEFAULT_KEY`), and launching hits `/playground/api/open-in`.
- Post-Task-09: no flow play/adopt controls.

## Done when

Open-in is a deep hook, the presence display-name helper is shared (de-duplicated with the canvas), presence is its own component, and header behaviour is unchanged.

## Do NOT

- Do not change the `/playground/api/open-in` contract.
- Do not leave two copies of the display-name resolver — unifying them is part of this task.
