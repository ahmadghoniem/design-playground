# Task 15 — Deepen `nodes/IterationNode.tsx` (872 LOC)

**Type:** deepening · **Risk:** medium · **Depends on:** run **after Task 09** (removes stage wiring) · **Blast radius:** internal

## The problem

A single React component (`IterationNode`, `memo`-wrapped) of 872 lines with **31 hooks**. It owns: the iteration preview iframe, the **adoption flow** (the node "owns the full adoption flow via events + API calls"), screenshot capture, the iterate-again action, registry-id resolution, and (until Task 09) stage canonical wiring. One component, no internal seams.

## Pre-req: Task 09

Task 09 removes the stage canonical wiring (lines ~95–108, ~749). Run 09 first so you deepen less code. If 09 hasn't run, do **not** extract the stage logic here — leave it for 09.

## Dependency classification

- Adoption / screenshot / iterate: **local-API** (`fetch('/playground/api/...')`) + DOM events.
- Registry-id resolution, filename parsing: **in-process** pure.

## Target seams

1. **`hooks/useIterationAdoption`** — the adoption flow: the event wiring + API calls that promote an iteration into the source tree. Interface: `{ adopt(), isAdopting, ... }`. This is the deep one — it currently spreads across event listeners and fetch calls inside the component.
2. **`hooks/useIterationScreenshot`** — screenshot capture for the node (pairs with `lib/captureAndSaveScreenshot.ts`). Interface: `capture()`.
3. **`lib/iteration-filename.ts`** — pure parsing helpers (the registry-id / kebab / iteration-number derivation around line ~472, e.g. `"PricingCard.iteration-3" → registryId`). Pure functions, tested directly. (Some of this may overlap `registry.tsx`'s `registryIdToPascalCase` — reuse, don't duplicate.)
4. **`IterationNode.tsx` becomes presentation + composition** — renders the iframe/preview and the action chips, delegating adoption/screenshot/iterate to the hooks. Target: under ~400 LOC.

## Method

- Extract the pure filename helpers first, then the screenshot hook, then the adoption hook (most entangled). The component should lose `fetch` calls to the hooks.

## Extraction gate (run after each new file)

Logic moved into `hooks/` or `lib/` from `nodes/` changes import depth. Fix every carried import **to the end of the moved block** (Operating Rule 1 — don't stop partway), then:
```
git grep -nE "from '\.\.?/(lib|nodes|prompts|hooks|components|server|ui|registry|skills|data)" -- hooks/useIterationAdoption.ts hooks/useIterationScreenshot.ts lib/iteration-filename.ts
```
Every hit must resolve. `IterationNode.tsx` must **import** the hooks/helpers (no leftover copy) and shrink. Keep the adoption API contract and `Name.iteration-N.tsx` scheme intact (deepening recipe 7).

## Verification

- Generate iterations, then on an iteration node: **Adopt** it → source file is updated, node reflects adopted state (the adoption flow). **Iterate again** from it → spawns child iterations. Screenshot capture still fires where used.
- The iteration preview iframe renders and selects elements as before.
- Post-Task-09: no "Set as canonical" UI, no stage references.

## Done when

`IterationNode.tsx` is presentation composing `useIterationAdoption` / `useIterationScreenshot` and pure filename helpers, with no inline `fetch` tangle, behaviour unchanged.

## Do NOT

- Do not alter the adoption API contract or the iteration filename scheme (`Name.iteration-N.tsx`) — the scanner in Task 10 and `registry.tsx` depend on it.
