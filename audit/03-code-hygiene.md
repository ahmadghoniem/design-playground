# 03 — Code Hygiene: inline SVGs, constants, Next.js remnants, orphans

## 1. Inline SVG icons in TSX — 28 hand-rolled icons across 13 files

There IS an icon system: `lucide-react` is imported in **28 files**, and
`components/ui/playground-nav-icons.tsx` exists as a dedicated icon home (holding only 2
icons). The anti-pattern is real: dozens of icons are hand-authored inline instead.

### Offenders by count

| File | Inline icons | Notes |
|---|---|---|
| `components/ui/chat-bits.tsx` | **6** (L20, 47, 70, 90, 112, 237) | `BracketIcon`, `FrameIcon`, `EditIcon`, `ExploreIcon`, `SendArrowIcon`, raw SVG in `IterationCountDragger` — biggest cluster |
| `components/canvas/PlaygroundCanvasContextMenu.tsx` | **4** (L144, 168, 192, 216) | custom "corner" glyphs; file *already imports lucide* (L2) — mixes both |
| `components/canvas/PlaygroundCanvasToolbar.tsx` | **3** (L72, 107, 129) | incl. cursor/pointer glyph |
| `components/ui/playground-nav-icons.tsx` | 2 (L2, 25) | the *intended* home — fine as a pattern |
| `components/chat/chat-icons.tsx` | 2 (L5, L35) | `ImageRefIcon` duplicates lucide `ImageIcon` |
| `nodes/shared/iterate-dialog/icons.tsx` | 2 (L1, L10) | **both are duplicates** (below) |
| `nodes/ComponentNode.tsx` | 2 (L441, 508) | play-button triangle |
| `nodes/IterationNode.tsx` | 2 (L410, 468) | **same** play-button triangle — copy-paste |
| `nodes/shared/SizeButtons.tsx` | 1 (L23) | inline "Auto" icon ≈ lucide `Scan`/`Maximize` |
| `nodes/ImageNode.tsx` | 1 (L107) | imports lucide `ImageIcon` yet hand-draws an SVG too |
| `components/ui/impeccable-skill-picker.tsx` | 1 | imports lucide `Plus` + one inline SVG |

### Exact duplications (best quick wins)

1. `VariationStackIcon` (`iterate-dialog/icons.tsx:1`) — **identical path**
   (`d="M15.6 3.396…"`) to the raw SVG in `IterationCountDragger`
   (`chat-bits.tsx:244-254`). Same icon authored twice.
2. `ArrowUpIcon` (`icons.tsx:10`) ≡ `SendArrowIcon` (`chat-bits.tsx:112`) — same
   up-arrow, different viewBox.
3. Play triangle `M10 8 L16 12 L10 16 Z` copy-pasted in `ComponentNode.tsx:517` and
   `IterationNode.tsx:477`.
4. `FrameIcon` (`chat-bits.tsx:47`) reimplements lucide `Frame` (already imported in
   `PlaygroundCanvasContextMenu.tsx`).

### NOT the anti-pattern (leave alone)

- `nodes/shared/DrawStrokePaths.tsx`, `PlaygroundCanvasDrawLayer.tsx:197` — render user
  freehand strokes, not icons.
- `nodes/ShapeNode.tsx:102` — actual canvas shapes / arrowhead markers.
- `components/ui/inline-reference/dom-engine.ts:1` — DOM pill markup, not an icon.

**Fix pattern:** delete the 4 duplicate sets; swap lucide-equivalents (`Frame`,
`ImageIcon`, `Scan`, `ArrowUp`, `Play`); move the genuinely-custom glyphs (Explore
dot-grid, VariationStack, Bracket, corner glyphs) into `components/ui/playground-nav-icons.tsx`
so there is one icon home. Removes ~10 of 28 outright, centralizes the rest.

## 2. `lib/constants.ts` (807 lines, ~130 exports) — the magic-number assessment

**Legit and valuable (~70%, keep):** event-name strings (L11-71), localStorage keys
(L80-116), regex patterns (L461-528), gitignore markers (L484-493), `SIZE_CONFIG` (L245)
— multi-consumer or must-stay-in-sync values.

**Over-extraction / dead (call-outs):**

| Constant(s) | Problem |
|---|---|
| `STYLING_MODE_OPTIONS` (L295) | **Dead.** Zero usages (verified). Own comment says "for future UI dropdown" — speculative. (`DEFAULT_STYLING_MODE` L292 and the type ARE used.) |
| `DRAG_OVERLAY_PADDING_X` / `_Y` (L604-605) | Both literally `= 0`. Named zeroes feeding one padding calc — pure indirection. |
| `ARRANGE_*` family (L159-207, ~15 constants) | Consumed only by `lib/canvas-auto-arrange.ts`. Global-file indirection for a single algorithm's tuning numbers — inline them back into that module. |
| Animation-delay block (L351-369) incl. `ARRANGE_FITVIEW_DELAY` (L357), `COPIED_FEEDBACK_DURATION` (L369) | Mostly single-use magic-number wrappers (≤2 usages each). |

Other `export const` clusters (`lib/model-catalog.ts`, `lib/keybindings.ts`,
`lib/draw-types.ts`, `lib/featured-skills.ts`, `lib/impeccable-skill.ts`,
`inline-reference/dom-engine.ts:33-41`, `prompts/shared-sections.ts`,
`server/lib/claude-jsonl.ts`, `server/lib/generation-timer.ts`) are domain-scoped and fine.

## 3. `"use client"` and Next.js remnants

### 11 files still carry the directive (removal pass missed them; verified)

1. `components/BrowseShell.tsx:1` (orphan anyway — delete the file)
2. `components/canvas/PlaygroundCanvasDrawLayer.tsx:1`
3. `components/ui/accordion.tsx:1`
4. `components/ui/alert-dialog.tsx:1`
5. `components/ui/dialog.tsx:1`
6. `components/ui/dropdown-menu.tsx:1`
7. `components/ui/inline-reference.tsx:1`
8. `components/ui/inline-reference/context.tsx:1`
9. `components/ui/sonner.tsx:1`
10. `components/ui/tooltip.tsx:1`
11. `lib/canvas-flow.tsx:1`

Harmless under Vite, but exactly the remnants to strip (mostly shadcn primitives).

### Stale `use client` references in comments/prompts

- `lib/jsx-utils.ts:24,28,29,45` — doc-comments claim the code prepends `'use client'`;
  it no longer does (`const clientDirective = "\n\n"` at L46). Fix the comments.
- `lib/jsx-prompts.ts:58` — prompt tells the model *"Keep the 'use client' directive"* —
  a Next-ism baked into a generation prompt; update for Vite.
- String content only (fine or intentional): `prompts/discovery-analyze.prompt.ts:34`,
  `docs/adding-components.mdc:16,58`, `docs/iterations/guide.mdc:43`.

### Other Next.js-isms

- `app/layout.tsx` — no-op `<>{children}</>` wrapper (vestigial RootLayout); could be
  inlined into `dev-entry.tsx`.
- `app/loading.tsx` — **orphan**; Next loading-suspense convention, never imported
  (verified — only named as an expected-filename string in `evals/`).
- Prompt strings mentioning `next/image`, `next/link`, `metadata`, etc.
  (`prompts/edit.prompt.ts:35`, `jsx-iteration*.prompt.ts:29`, `create-page.prompt.ts:27`,
  `docs/iterations/guide.mdc:46`) — some intentionally say "don't use these"; review wording.
- No `NextPage` / `getStaticProps` / `next/router` in real code. Good.

## 4. Component structure & orphans

Structure is clean (`app/` shell, `components/{canvas,chat,modals,ui}`, `nodes/`+`nodes/shared/`,
`lib/`, `stores/`, `hooks/`, `server/`, `prompts/`, `evals/`). No `components/flow/` —
ReactFlow wiring lives in `lib/canvas-flow.tsx` + `app/PlaygroundCanvas.tsx`.

**Orphans (verified):**
- `components/BrowseShell.tsx` — zero imports anywhere. Delete.
- `app/loading.tsx` — never imported. Delete.

**Half-finished refactor to consolidate:** two parallel iterate-dialog structures —
flat `nodes/shared/IterateDialog.tsx` + `IterateDialogParts.tsx` (still imported:
`useAvailableModels` pulled from `IterateDialogParts` by `DockedChatBar.tsx:15`,
`ModelSettingsModal.tsx:10`, `hooks/useModelCycle.ts:5`) alongside the newer
`nodes/shared/iterate-dialog/` folder (`parts.tsx`, `dropdowns.tsx`, `icons.tsx`,
`useIterateDialogState.ts`). Fold `IterateDialogParts.tsx` into the folder.
