# Task 03 — Remove `lib/skill-icons.ts` (assess: deepen vs delete)

**Type:** cleanup · **Risk:** low · **Depends on:** none · **Blast radius:** 3 files

## Goal

The owner flagged `lib/skill-icons.ts` as redundant. Confirm and act: either **delete** it (if its callers don't need it) or **inline** it at its two call sites (if they do). Net result: the `lib/skill-icons.ts` module no longer exists.

## Context

`lib/skill-icons.ts` (58 LOC) exports three things:
- `getSkillBubbleColor(skillId)` — deterministic pastel color from a string hash.
- `getSkillBubbleStyle(skillId, size)` — inline `CSSProperties` for a 3D pastel bubble.
- `PASTEL_COLORS` (module-private).

Consumed by exactly two files:
- `components/modals/SkillsCatalogModal.tsx`
- `ui/impeccable-skill-picker.tsx`

`git grep -n "skill-icons\|getSkillBubble" -- '*.ts' '*.tsx'` confirms only those two import it.

## Decision procedure (apply the deletion test)

1. **Read both call sites.** Determine whether the rendered skill bubble has a real fallback need (a skill with no custom icon URL still needs *some* visual).
2. **If both call sites can use a skill's provided icon and never need the pastel fallback** → the module is truly redundant. **Delete `lib/skill-icons.ts`** and remove the fallback rendering at both call sites (replace with the icon the skill already provides, or a neutral default already present elsewhere).
3. **If the pastel fallback is still needed** (i.e. some skills genuinely have no icon) → the module is *not* redundant as behaviour, only as a separate file. **Inline** `getSkillBubbleStyle` into whichever of the two call sites is the primary one, or — if both need it — keep the behaviour but fold it into the nearest existing shared UI module (e.g. `ui/` skill-picker helpers) so it stops being a standalone `lib/` file. Then delete `lib/skill-icons.ts`.

> Prefer option 2 only if you can verify the fallback is dead. If unsure, take option 3 (inline) — it removes the file the owner flagged without risking a missing-icon regression.

## Step-by-step (option 3, the safe default)

1. Move `getSkillBubbleColor` / `getSkillBubbleStyle` / `PASTEL_COLORS` into the consumer that owns skill-bubble rendering (likely `ui/impeccable-skill-picker.tsx`, or a small local helper next to it).
2. Update the other consumer to import from the new location.
3. Delete `lib/skill-icons.ts`.
4. `git grep -n "skill-icons"` → zero hits.

## Verification

- Open the Skills Catalog modal and the impeccable skill picker. Skill bubbles still render (with icons and/or pastel fallbacks exactly as before).
- `git grep -n "skill-icons"` returns nothing.
- No TypeScript errors at the two former call sites (ignore environmental `react` resolution errors per the README).

## Done when

`lib/skill-icons.ts` is gone, both skill-bubble surfaces render identically to before, and there are no dangling imports.
