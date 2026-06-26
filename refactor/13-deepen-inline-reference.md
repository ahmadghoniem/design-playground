# Task 13 — Deepen `ui/inline-reference.tsx` (1100 LOC)

**Type:** deepening · **Risk:** medium-high (contenteditable is fiddly) · **Depends on:** none · **Blast radius:** internal + `DockedChatBar` (Task 18) is the main consumer

## The problem

This is a **contenteditable rich-input** that renders "@"-style reference pills inside an editable div. It tangles three concerns in one file:
1. A **DOM/pill engine** — raw DOM manipulation: `readSegmentsFromDOM`, `createPillElement`, `updateImpeccablePillElement`, `detectTrigger`, `placeCursorAfter`, and a pile of `data-inline-ref-*` attribute constants.
2. A **React context** (`InlineReferenceContext`, `useInlineReferenceContext`) for trigger state and item selection.
3. The **React component** `InlineReference` (forwardRef with `InlineReferenceHandle`) wiring the two together, plus 34 hooks.

The DOM engine is pure-ish (operates on elements) but is trapped inside the component file, so it can't be tested without rendering.

## Dependency classification

- DOM engine: **in-process**, operates on `HTMLDivElement`/`Node`. Testable with jsdom directly — **this is the seam to extract first**.
- React glue + context: **in-process** React state.

## Target seams

1. **`ui/inline-reference/dom-engine.ts`** — move the pure DOM functions and the `data-*` attribute constants here:
   - `readSegmentsFromDOM(el): Segment[]`
   - `createPillElement(...)`, `updateImpeccablePillElement(...)`
   - `detectTrigger(...)`, `placeCursorAfter(node)`
   - the `PILL_*` / `ZERO_WIDTH_SPACE` constants and `Segment`/`TextSegment`/`ReferenceSegment` types.
   - **Interface:** a small set of functions that take an element + intent and mutate/read it. **Test surface:** jsdom — build a div, call `createPillElement`, assert `readSegmentsFromDOM` round-trips. This is the highest-leverage extraction.
2. **`ui/inline-reference/context.tsx`** — `InlineReferenceContext`, `useInlineReferenceContext`, `InlineReferenceContextValue`, `TriggerState`, `OnSelectItemResult`.
3. **`ui/inline-reference.tsx` stays the component** — `InlineReference` forwardRef + `InlineReferenceHandle`, now calling the dom-engine module and using the context module. Target: well under ~500 LOC.

## Method

- Extract the DOM engine **without changing its logic** — contenteditable behaviour is brittle; a pure move + import is safest. Add jsdom tests around it to lock current behaviour *before* touching anything else.
- Then lift the context out. The component is last and should mostly lose imports, not logic.

## Verification

- In the chat bar (`DockedChatBar`), type `@` → reference suggestions trigger (`detectTrigger`), select one → a pill renders (`createPillElement`), backspace over a pill removes it cleanly, the submitted value serializes pills correctly (`readSegmentsFromDOM`).
- Impeccable command pills (`data-impeccable-command`) still render/clear (`updateImpeccablePillElement`).
- Cursor placement after inserting a pill is correct (`placeCursorAfter`) — no caret jumps.

## Done when

The DOM engine and context are separate, tested modules; `InlineReference` is the thin React shell over them; contenteditable behaviour (pills, triggers, caret, serialization) is byte-for-byte unchanged.

## Coordination

`DockedChatBar` (Task 18) is the primary consumer and imports the handle/types. Coordinate the public exports so Task 18 doesn't break — keep `InlineReference`, `InlineReferenceHandle`, `OnSelectItemResult` exported from `ui/inline-reference.tsx` (re-export from the new submodules if needed).

## Do NOT

- Do not "improve" the contenteditable behaviour while refactoring. Pure move + test-lock only.
