# Task 05 — Remove the orphaned `examples/PricingCard.tsx`

**Type:** cleanup · **Risk:** low · **Depends on:** none · **Blast radius:** 1 file (+ comment touch-ups)

## Goal

Delete `examples/PricingCard.tsx`. It is not reachable on the canvas — the registry ships empty — so it is an orphan example, not a seeded demo.

## Evidence it is an orphan (verify before deleting)

- `registry.tsx` exports `registry` containing only an empty `pages` group. `PricingCard` is **not** registered. `flatRegistry` is therefore empty of it.
- `git grep -n "PricingCard"` shows it appears only in:
  - `examples/PricingCard.tsx` (the file itself),
  - **comments / docstrings** in `iterations/[slug]/page.tsx`, `nodes/IterationNode.tsx`, `lib/captureAndSaveScreenshot.ts` (used as an illustrative filename like `"PricingCard.iteration-3.png"`),
  - no actual `import` of the component anywhere.
- There is no code path that mounts `examples/PricingCard` onto the canvas.

> Re-run `git grep -n "PricingCard"` and `git grep -rn "examples/"` yourself first. If you find a **real import** (not a comment, not a doc string), STOP — it is not an orphan; report the finding instead of deleting.

## Step-by-step

1. Confirm no real import (see above).
2. Delete `examples/PricingCard.tsx`.
3. If `examples/` is now empty, delete the empty `examples/` directory too.
4. **Comment hygiene (optional but preferred):** the comments in `IterationNode.tsx`, `captureAndSaveScreenshot.ts`, and the `[slug]` page use `"PricingCard"` purely as an illustrative example string. They are not broken by the deletion. Leave them, or swap the example name to a neutral placeholder like `"ExampleCard"` if you want zero references — but do **not** change any logic, only comment text.

## Verification

- `git grep -n "PricingCard"` → only (optionally) comment/doc strings remain; no imports, no JSX usage.
- `examples/` directory is gone (or intentionally kept if it holds other files — it does not today).
- Playground still loads; canvas starts empty exactly as before (it already did — PricingCard was never shown).

## Done when

`examples/PricingCard.tsx` is deleted, no real references remain, and the canvas behaves identically (it was already empty on first load).

## Note for the owner

The owner's assumption was: "a component you get to see on the canvas when you first use the playground." That is **not** what it did — the canvas starts empty and PricingCard was never wired into the registry. So removing it changes nothing the user could see. If a "try-it-first seeded component" experience is actually wanted, that is a **new feature**, not this task.
