# Shell and layout

The app shell: the Library, the RightPanel, the Canvas between them, the CanvasToolbar
and ZoomControls, and the change-history log.

## Settled

- **One canvas.** v1 is a single board. There is no workspace concept and no branch
  picker — the branch chip is a read-only label (see `branch-model.md`). The board is
  what is on the canvas, not a per-branch fixture. No tab strip, pill switcher, or
  stash/restore. Parallel explorations on the current branch live as nodes (iteration
  files). The tabbed-workspace experiment was built and then removed: a first version
  cannot ship while the tab model is still being designed.

- **No header.** The shell is one full-height row — Library, Canvas, and RightPanel fill
  the viewport top to bottom with no strip above them. The old header's controls
  relocated:
  - **Project name** → the Library head, as `rewynd` (no leading slash — it is a project,
    not a path), replacing the word "Project".
  - **Preview light/dark toggle** → the CanvasToolbar, bottom group below undo/redo.
  - **Model settings entry** → a row inside the ModelPicker (see `composer.md`).
  - **Clear all** → removed outright. Destructive and canvas-scoped.

- **Two panels, both collapsible.** Left is the Library; right is the RightPanel. *Why:*
  the layer tree and the design controls need to be visible together — picking an element
  in the tree and immediately styling it is the core loop. Folding everything into one
  panel costs that.
  - **Both panels are 280px**, written once as one value.
  - **Both panels collapse.** The column goes to 0, the head survives as a floating
    **CollapsedPill**, and the canvas grows into the space, carrying the CanvasToolbar rail
    with it. *Why:* never lost, only put away. On the RightPanel the tabs stay live on the
    pill, so picking one reopens that view.
  - **Library** — two folds, **Layers** and **Primitives**. Variables moved to the
    RightPanel entirely. Fold bodies are owned elsewhere (`library-layers.md`,
    `library-primitives.md`); this file specifies the container only.
  - **RightPanel** — tabs are **Design** and **Agents**, sitting at the head's far edge
    with the collapse control on the inner edge. The Design tab's folds are **Styles** and
    **Variables**. Bodies are owned elsewhere (`design-styles.md`, `design-variables.md`,
    `agents-tab.md`); this file specifies the container only.
  - **Accordion scrolling** — the fold stack fills the panel, open folds scroll inside
    themselves, every fold header stays on screen. The whole column does not scroll.
  - **FoldSearch takes over the fold's own header** — the title becomes the field, the
    magnifier becomes ✕, closing restores the title and clears the query. There is no
    separate search row.
  - **The per-fold footer helper line is deleted.** "Drag any item onto the canvas"
    restates what the drag handles already say.

- **One Composer, two placements.** On the canvas floor, or at the bottom of the Agents tab
  when that tab is showing. The Composer's own control shape is `composer.md`'s subject;
  only placement belongs here.

- **Preview theme lives on the CanvasToolbar, not in a header.** The toggle flips
  `.dark`/`.light` on the preview root (the canvas's `.playground-main-view` scope, or a
  standalone iteration's `.app-theme` scope); chrome never re-themes.

- **Chrome is always light.** `--pg-*` tokens, defined once on `:root`, never take a dark
  variant, and nothing applies `prefers-color-scheme` to chrome. Two separate theme
  concepts, kept apart:

  | Concept | What it themes | Toggle | Where it lives |
  |---|---|---|---|
  | Chrome (`--pg-*`) | panels, toolbars, menus | none — fixed light | `:root` in `styles/playground-global.css` |
  | Preview (`.app-theme` + `.dark`/`.light`) | component previews only | CanvasToolbar Sun/Moon button | `usePreviewColorSchemeStore` (zustand, persisted) |

  **Previews default to light, and dark ships later.** Light is the mode every host theme
  defines, so it is the one that renders correctly with no extra work. Making dark correct
  needs the preview root to declare a full light token block *and* a way to scope
  `dark:` utility variants to the nearest preview root rather than any ancestor — Tailwind's
  `&:is(.dark *)` matches at any depth, and CSS has no nearest-ancestor selector. That is a
  self-contained piece of work for whenever dark previews are worth building; until then the
  toggle ships light-only.

  *Why:* the playground's own chrome stays neutral so it doesn't compete with the canvas.
  Previews inherit the **host's** own tokens unmodified — `.app-theme` defines no color
  tokens of its own — so the preview toggle only ever adds/swaps a `.dark`/`.light` class
  for the host's own `.dark { ... }` rules to key off, never the playground's.

- **CanvasToolbar and ZoomControls.**
  - **`PlaygroundCanvasToolbar`** is the vertical rail beside the Library. Tools in order:
    Select, Hand, Shapes, Text, Image; then a separator; then undo/redo; then a bottom
    group with the preview theme toggle.
  - **`PlaygroundCanvasViewControls`** (ZoomControls) is the bottom-left pill:
    **zoom-out · live percentage · zoom-in** — no separator, no fourth control.
  - **~32px buttons, 16px icons** (current shipped size is bigger — see As the code is
    today).
  - **Help** — the `?` button is **36×36, accent-filled**, immediately left of the pill.
    Its popover drops "Submit a prompt" and "Discord community"; everything else stays.
  - **Toolbar position — beside the Library.** The canvas carries the rail when a panel
    collapses.

- **Canvas panning.** Middle-mouse drag, or Hand tool left-drag. No scrollbar — the board
  is translated, not scrolled.

- **The history log.** Append-only: time, agent-written message, and the three counts a
  generation run touches. Read-only; click
  an entry to scroll the canvas to whatever it changed. Lives beside the iteration files,
  not instead of them — delete the log and the canvas still works, because the iteration
  files remain the source of truth.

- **Preview containment.** Point each overlay primitive's portal at the preview card,
  **and** make the card itself a positioning boundary — both halves or neither. *Why this
  shape, not a frame per preview:* a frame kills alt-click element selection, a feature
  already in use, so containment has to go through the DOM (a portal `container` target)
  rather than an iframe boundary. **Unverified — has to be seen in a browser, not confirmed
  by reading code.**

- Overlay/portal primitives (Dialog, Sheet, Popover, …) stay **listed in the registry but
  never mounted live** — not a decision this file makes, but restated here because both the
  toolbar and preview containment above depend on it holding: a mounted overlay's
  `position: fixed` backdrop would otherwise cover the whole viewport regardless of portal
  placement.

## As the code is today

Read from `master` (`app/`, `features/canvas/components/`).

- **Header still exists — settled shape is not built.** `app/PlaygroundClient.tsx` renders
  `PlaygroundHeader` as a full-width strip above the body. `app/PlaygroundHeader.tsx`
  shows `/{projectName}`, a Sun/Moon preview toggle, a Skills wrench button, and a Model
  settings button opening `ModelSettingsModal`. There is no Clear-all control in the
  current header.
- **No RightPanel.** Nothing in the codebase renders a right column, Design/Agents tabs,
  Styles/Variables folds, or an Agents Thread surface.
- **Library is a single flat list, not the settled fold stack.** `app/PlaygroundSidebar.tsx`
  is a 280px docked overlay with a "Project" label, a standalone search field, and one
  expandable "Components" section — not Layers/Primitives folds, not FoldSearch-in-header,
  and no collapse to a CollapsedPill. The sidebar takes no props; hover-reveal and
  collapse controls were removed earlier, but the settled Wonder-style collapse is also
  not built.
- **Composer placement — canvas floor only.** `features/chat/DockedChatBar.tsx` is a fixed
  bottom-centre pill. It does not mount inside an Agents tab because that tab does not
  exist yet.
- **CanvasToolbar — partial match.** `PlaygroundCanvasToolbar.tsx` is the left-edge
  vertical rail (`absolute left-6 top-1/2`): Select, Hand, shape group, Text, Image. No
  undo/redo, no preview theme toggle, no separator group below tools. White fill, 1px
  border, soft shadow (`rounded-2xl border border-stone-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)]`).
  Buttons are `w-9 h-9` (36px) with `w-[18px] h-[18px]` icons — bigger than the ~32px/16px
  target.
- **ZoomControls — opposite of settled.** `PlaygroundCanvasViewControls.tsx` is the
  bottom-left pill: zoom-out, live percentage, zoom-in, a separator, then Undo and Redo.
  No Help button beside it. Undo/redo belong on the CanvasToolbar in the settled shape,
  not here; zoom-to-selection was never in this component.
- **Canvas panning — partially built.** `PlaygroundCanvas.tsx` sets
  `panOnDrag={activeTool === "hand" ? true : [1]}` — Hand tool left-drag pans; `[1]` is
  middle-mouse drag. The board translates via React Flow; there is no scrollbar pan.
- **History log does not exist.** No append-only log component or API anywhere in the
  codebase.
- **Preview containment is not built or verified.** `styles/playground-global.css` defines
  the chrome/preview token split (`--pg-*` on `:root`; `.app-theme` resets only `--spacing`
  and font), but nothing wires a portal `container` prop to a preview card.
- **Two-theme split is already real in CSS.** Matches the table above; the toggle still
  lives in the header, not the CanvasToolbar.

## Open

- **Help popover contents.** Docs, Keyboard shortcuts, Give feedback, Contact us, and a
  "What's new" list remain as reference starting points — "Submit a prompt" and "Discord
  community" are explicitly out. What the button actually shows on click is still to
  settle.
- **Preview containment, in a browser.** Both halves of the mechanism (portal `container`
  trapping a `position: fixed` child; the card behaving as a CSS positioning boundary for
  it) are unverified against real overlay content.
- The exact end-to-end **git workflow** the branch label / worktree label implies is
  tracked in `branch-model.md`, not repeated here.
