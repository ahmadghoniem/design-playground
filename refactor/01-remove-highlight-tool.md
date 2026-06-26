# Task 01 — Remove the Highlighter tool from the draw tools

**Type:** cleanup · **Risk:** low · **Depends on:** none · **Blast radius:** 2 files

## Goal

Remove the **Highlighter** draw sub-tool and its `H` keyboard shortcut. After this task the draw/shape flyout offers Pen, Rectangle, Ellipse, Line/arrow — no Highlighter — and pressing `H` does nothing.

## Context — the highlighter is already vestigial

The highlighter is **not** a real pen kind anymore. Verified state of the tree:

- `lib/draw-types.ts` — `DrawPenKind` is already **`'pen'` only**. `DRAW_PEN_PRESETS` has only `pen`. There is no `'highlight'` member to remove from the type, and **no draw-layer rendering branch** (`components/canvas/PlaygroundCanvasDrawLayer.tsx` contains zero `highlight` references).
- `lib/keybindings.ts` — contains **nothing** about draw/pen/highlight. Do **not** look here.
- The highlighter survives in exactly **two** places, both passing the string `'highlight'` where the type expects `'pen'` (an unsound cast / dead argument):
  1. `components/canvas/ShapeToolGroup.tsx` — a `SUB_TOOLS` entry + bespoke amber styling + a `'highlight' as DrawPenKind` cast.
  2. `PlaygroundCanvas.tsx` — the `H` keyboard shortcut handler calling `toggleDrawPenKind('highlight')`.

So this is a pure UI + dead-shortcut removal. No type change, no store change, no draw-layer change.

## Step-by-step

### 1. `components/canvas/ShapeToolGroup.tsx`
- Remove the `SUB_TOOLS` entry for `kind: 'highlight'` (line ~20, the `Highlighter` row).
- Remove the **amber styling branches** in the sub-tool button `className` (lines ~114–122) that special-case `tool.kind === 'highlight'`. With highlight gone they collapse to the plain `bg-stone-100` / hover styling — simplify, leave no dead ternary.
- Remove the now-unused `Highlighter` import from `lucide-react` (line 4).
- **Fix the divider index.** Line ~109 inserts the draw/shape divider at `i === 2`. After removing one draw tool the array is `[pen, rect, ellipse, line]`, so the divider between the last draw tool and the first shape tool moves to **`i === 1`**. Update it.

### 2. `PlaygroundCanvas.tsx`
- Remove the `H` shortcut branch (lines ~5382–5384):
  ```ts
  if (e.key === 'h' || e.key === 'H') { ...; toggleDrawPenKind('highlight'); }
  ```
  Delete the whole branch (including its `preventDefault`/guard lines).
- Update the comment at line ~5358 (`// Tool shortcuts: V select, P pen, H highlighter, ...`) — drop the `H highlighter` mention.
- Update the comment at line ~5525 (`{/* Shape tools — pen, highlighter, rectangle, ... */}`) — drop "highlighter".
- **Check `toggleDrawPenKind`** (defined ~line 5336, typed `(kind: DrawPenKind) => void`). After removing the `H` branch its only caller is `toggleDrawPenKind('pen')` (line ~5379). Leave the function as-is — it is still used for pen.

### 3. Sweep
- `git grep -in "highlight"` → the only remaining hits must be unrelated: `components/canvas/ElementHighlight.tsx`, `useElementSelection`, "Element selection highlights" (line ~5568). **These are element-selection overlays, not the draw tool — leave them.**
- No edits to `lib/draw-types.ts`, `lib/playground-draw-store.ts`, `lib/keybindings.ts`, or the draw layer.

## Verification

- Host `bun dev`, open `/playground`.
- Open the Shapes flyout → Pen, divider, Rectangle / Ellipse / Line. **No Highlighter.**
- Press `H` on the canvas → nothing happens.
- Press `P` → pen activates; draw a stroke → works.
- `git grep -in "highlight"` → only `ElementHighlight` / element-selection matches remain.

## Done when

Highlighter is gone from the flyout and the keyboard, no dead amber branches, the divider sits correctly between Pen and Rectangle, and no unrelated highlight (element-selection) code was touched.

## Do NOT

- Do not touch `components/canvas/ElementHighlight.tsx` or any element-**selection** highlight — unrelated to the draw tool.
- Do not edit `lib/keybindings.ts` (the `H` shortcut is **not** there).
- Do not change Pen/Rectangle/Ellipse/Line behaviour or the `DrawPenKind` type (already `'pen'`-only).
