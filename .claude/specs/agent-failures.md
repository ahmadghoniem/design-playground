# Agent failures

The design-judgment prompt additions: named, recoverable failures shown on a failed card's face, and
the fix order that resolves them without a re-roll.

---

## Settled

- **Recoverable failures get stable names.** A failure that names itself is one the agent can
  recover from on its own instead of re-rolling. Failed cards show the name on their face. "Make it
  good" is not checkable; "did you produce three identical cards" is a yes or no.

- **The named-failure list:**
  - Three identical cards
  - Gradient hero
  - Every section centred
  - Iconless "Get Started"
  - Decorative blobs
  - Uniform weight with no focal point
  - Unmotivated purple/blue gradients
  - Invented metrics
  - Motion on everything

- **The fix order:** structure → hierarchy → grid → typography → contrast/tokens → component states
  → imagery → motion. Each step invalidates the ones below it — fixing typography before structure is
  settled means redoing the typography pass once structure changes, so the order is load-bearing, not
  a checklist convenience.

## As the code is today

- **No failure-name vocabulary or fix-order guidance exists in any prompt today.** The closest
  existing quality gate is `getQualityChecklist()` in `features/generation/prompts/
  shared-sections.ts`, and it's a mechanical checklist — props interface unchanged, no relative
  imports left unrewritten, all imports resolve, metadata comment present, filename convention
  matches the export, styling constraint met, tree manifest updated, `@sourceIteration` set when
  derived — with no design-judgment content. It checks whether the agent followed instructions, not
  whether the result looks designed. The named-failure list and fix order are new prompt content, not
  an extension of this checklist.

- **No failure-state concept exists on a canvas card.** `ComponentNode.tsx` and `IterationNode.tsx`
  render normal and generating states; there is no failed-with-a-named-reason state and no UI slot
  for a name on the card face. "Failed cards show the name on their face" is new canvas UI, not a
  change to existing node rendering.

- **This is new agent-facing surface, not a code refactor.** Unlike `agent-vocabulary.md`, which has
  existing functions to extend (`claude-jsonl.ts`, `prompt-builders.ts`), this spec's settled content
  has no partial implementation anywhere in the tree to reconcile against — it is text to be written
  into a prompt, plus a small piece of card UI, both starting from zero.

## Open → ROADMAP

- **Which failure names actually get shown, and the meaning table the agent reads.** The framing is
  settled (stable names, shown on the card face); the mechanism is not — whether every name in the
  settled list is a distinct detectable failure mode or some collapse into one shown name, and the
  table that tells the agent what each name means well enough to recognize and fix it, are both open.

## Context absorbed (sources below were folded in, then retired in this docs restructure)

- `spec.md` §5 "Prompt additions" — the named-failure list, fix order, and "recoverable failures get
  stable names" framing absorbed in full (this file's slice of §5; the vocabulary/commit-
  message/delivery slice is `agent-vocabulary.md`).
- `journey.md` "From studying Loora" → "Design judgment (prompt additions)" — the same two settled
  bullets (named-failure list, fix order) with their "why," consistent with `spec.md` §5.
- `features/generation/prompts/shared-sections.ts` read directly (`getQualityChecklist()`) to confirm
  no existing overlap with design-judgment content.
