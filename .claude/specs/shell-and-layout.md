# Shell and layout

The app shell: header, the left sidebar container, the right panel, the canvas toolbar and
view-controls, and the change-history log.

---

## Settled

- **Two panels.** Left is the three-tab sidebar container; right is its own thing, carrying both
  the design controls and the chat transcript. *Why:* the layer tree and the design controls need
  to be visible together — picking an element in the tree and immediately styling it is the core
  loop. Folding everything into one panel costs that.
  - **Left = the three-tab sidebar container** — 280px, docked, no collapse; segmented
    Layers / Primitives / Tokens, each with its own per-tab search and a footer helper line. W3C
    tree-nav conventions apply to the Layers tab. The tabs' own contents (tree affordances,
    primitive rows, token rows) are each their own spec (`sidebar-layers.md`,
    `sidebar-primitives.md`, `sidebar-tokens.md`); this file only specifies the container.
  - **Right = the design panel *and* the chat** — the design controls plus the chat transcript **as
    a tab in the same right panel** (design | transcript). The floating chat *input* stays
    bottom-centre over the canvas; only the transcript is docked right. *Why:* typing and reading
    have different homes — you type where your eyes are, you read history where panels live. A
    floating transcript covers the canvas you're trying to look at; a docked input makes you leave
    the canvas to ask a question. The chat composer's own control shape (worktree control + branch
    label, project control dropped) is `branch-model.md`'s decision — only the fact that the
    transcript lives as a tab in this panel belongs here.

- **Header carries a preview light/dark toggle (`previewSchemeClass`), not a chrome toggle.** It
  flips `.dark`/`.light` on the preview root (the canvas's `.playground-main-view` scope, or a
  standalone iteration's `.app-theme` scope); chrome never re-themes.

- **Chrome is always light.** `--pg-*` tokens, defined once on `:root`, never take a dark variant,
  and nothing applies `prefers-color-scheme` to chrome. Two separate theme concepts, kept apart:

  | Concept | What it themes | Toggle | Where it lives |
  |---|---|---|---|
  | Chrome (`--pg-*`) | sidebar, header, toolbars, menus | none — fixed light | `:root` in `styles/playground-global.css` |
  | Preview (`.app-theme` + `.dark`/`.light`) | component previews only | header Sun/Moon button | `usePreviewColorSchemeStore` (zustand, persisted) |

  *Why:* the playground's own chrome stays neutral so it doesn't compete with the canvas.
  Previews inherit the **host's** own tokens unmodified — `.app-theme` defines no color tokens of
  its own — so the preview toggle only ever adds/swaps a `.dark`/`.light` class for the host's own
  `.dark { ... }` rules to key off, never the playground's.

- **Canvas toolbar layout — supersedes the current code.** Today undo/redo sit in the
  view-controls pill and there is no zoom-to-selection; that shape does not get rebuilt.
  - **`PlaygroundCanvasToolbar`** is the vertical rail immediately beside the sidebar. It gains
    **undo/redo moved down from the view-controls pill, with a separator above them**, below the
    existing tools (sidebar toggle, Select, Hand, Shapes, Text, Image).
  - **`PlaygroundCanvasViewControls`** is the bottom-left pill: **zoom-out · `100%` · zoom-in ·
    `│` separator · zoom-to-selection** — no undo/redo.
  - **~32px buttons, 16px icons** (current shipped size is bigger — see As the code is today).
  - **Help & Resources `?` button** sits immediately to the *left* of the pill, opening a popover
    (`image.png` is the reference starting point — see Open).
  - **Toolbar position — beside the sidebar.** This supersedes an earlier "docks right" placement
    from an early round of feedback, and separately supersedes what's actually on
    `feat/layers-sidebar` today (the toolbar there sits on the canvas's right edge, per that
    branch's own code comment) — neither of those shapes gets rebuilt.

- **The history log.** Append-only: time, agent-written message, "the three numbers" (as recorded
  in `journey.md` — the three counts a generation run touches). Read-only; click an entry to scroll
  the canvas to whatever it changed. Lives beside the iteration files, not instead of them — delete
  the log and the canvas still works, because the iteration files remain the source of truth.

- **Preview containment.** Point each overlay primitive's portal at the preview card, **and** make
  the card itself a positioning boundary — both halves or neither. *Why this shape, not a frame per
  preview:* a frame kills alt-click element selection, a feature already in use, so containment has
  to go through the DOM (a portal `container` target) rather than an iframe boundary.
  **Unverified — has to be seen in a browser, not confirmed by reading code.**

- Overlay/portal primitives (Dialog, Sheet, Popover, …) stay **listed in the registry but never
  mounted live** — not a decision this file makes, but restated here because both the toolbar and
  preview containment above depend on it holding: a mounted overlay's `position: fixed` backdrop
  would otherwise cover the whole viewport regardless of portal placement.

## As the code is today

- **Header already matches the settled shape.** `app/PlaygroundHeader.tsx` on `master` wires
  `usePreviewColorSchemeStore`'s `scheme`/`toggle` to a Sun/Moon button exactly as described above
  — this part of the decision is already built, not aspirational.
- **Sidebar container does not match yet, and contradicts the "no collapse" call.** `master`'s
  current `app/PlaygroundSidebar.tsx` is a single flat "Components" list (via
  `useRegistryItems`/`RegistryDragRow`), not the three-tab container — the tab container exists
  only on `feat/layers-sidebar` (detail owned by `sidebar-layers.md`). Master's current sidebar is
  also collapsible: it takes an `onCollapse` prop and renders a `ChevronLeft`/"Collapse sidebar"
  button, directly contradicting "docked, no collapse." `feat/layers-sidebar`'s three-tab sidebar
  has already dropped this — its own code comment reads "Always visible — there is deliberately no
  collapse or toggle affordance anywhere."
- **Toolbar/view-controls: confirmed by reading both components directly on `master`.**
  `features/canvas/components/PlaygroundCanvasToolbar.tsx` is already the left-edge vertical rail
  (`absolute left-6 top-1/2`), in order: sidebar toggle, a separator, Select, Hand, the shape-tool
  group, Text, Image — no undo/redo. `PlaygroundCanvasViewControls.tsx` is already the bottom-left
  pill (`absolute left-6 bottom-6`): zoom-out, a live `Math.round(zoom * 100)%` readout, zoom-in, a
  separator, then Undo and Redo — no zoom-to-selection. This is exactly the current-code shape the
  settled decision above supersedes.
  - Toolbar left-edge placement already matches "beside the sidebar" on `master` — nothing needs
    to move for that half of the decision. `feat/layers-sidebar`'s right-edge placement is the
    shape being superseded, not `master`'s.
  - Current button size is `w-9 h-9` (36px) with `w-[18px] h-[18px]` (18px) icons in both
    components — bigger than the ~32px/16px target.
- **History log does not exist in any form.** No append-only log, no history component, nothing
  recording agent messages against canvas changes anywhere in the codebase — confirmed by search.
- **Preview containment is not built or verified.** `styles/playground-global.css` already defines
  the chrome/preview token split described above (`--pg-*` on `:root`; `.app-theme` resets only
  `--spacing` and font, defining no color tokens), but nothing currently wires a Radix (or Base UI)
  portal `container` prop to a preview card.
- **Two-theme split is already real in CSS.** `styles/playground-global.css` defines `--pg-*` on
  `:root` for chrome and scopes previews under `.app-theme`, matching the table above exactly.

## Open → ROADMAP

- **Help & Resources popover contents.** `image.png` (Docs, Keyboard shortcuts, Give feedback,
  Submit a prompt, Contact us, Discord community, a "What's new" list, "View all") is a reference
  starting point, not a locked spec — what the button actually shows on click is still to settle.
- **Preview containment, in a browser.** Both halves of the mechanism (portal `container` trapping
  a `position: fixed` child; the card behaving as a CSS positioning boundary for it) are unverified
  against real overlay content.
- The exact end-to-end **git workflow** the branch label / worktree control implies is tracked in
  `branch-model.md`, not repeated here.

## Context absorbed (sources below were folded in, then retired in this docs restructure)

`.claude/plans/cozy-hatching-ember.md` (A4, `shell-and-layout.md` bullet) is this spec's authority.
`spec.md` §6 (Shell and history) is absorbed in full above, with two exceptions carried elsewhere
on purpose: its "chat bar carries the git branch, alongside project and where the agent runs" line
is `branch-model.md`'s decision now (project control dropped; worktree control replaces
"where the agent runs") and isn't restated here; and its "after an undo, pan to an off-screen node"
line is not restated as settled — `.claude/nice-to-haves.md` is its only home per the docs-restructure
plan (A4b), not this spec or `.claude/ROADMAP.md`. `journey.md`'s "History", "Canvas", "Product
shape", and "UI decisions — locked" sections supplied the arguments folded in above (two panels
because the layer tree and design controls must stay visible together; the chat input/transcript
split because typing and reading have different homes; chrome stays neutral so it doesn't compete
with the canvas; toolbar carries undo/redo while view-controls carries zoom + zoom-to-selection).
`.claude/plans/1-diagnosis-and-cleanup.md` ("Layout" section) supplied the toolbar-beside-the-sidebar
supersession (over both an earlier "docks right" placement and `feat/layers-sidebar`'s actual
right-edge code) and the note behind the ~32px/16px control-sizing target. `styles/playground-global.css`
was read directly for the `--pg-*` chrome tokens and the `.app-theme` preview boundary.
`shared/stores/preview-color-scheme-store.ts`, `app/PlaygroundHeader.tsx`, `app/PlaygroundSidebar.tsx`,
`features/canvas/components/PlaygroundCanvasToolbar.tsx`, and
`features/canvas/components/PlaygroundCanvasViewControls.tsx` were read directly on `master`;
`app/PlaygroundSidebar.tsx` was also read on `feat/layers-sidebar` via `git show` for the
collapse/toggle and toolbar-position contradictions noted above. `image.png` was viewed directly
for the Help & Resources reference content, recorded as an open starting point per `ROADMAP.md`'s
A5 "still to settle" note, not as settled.
