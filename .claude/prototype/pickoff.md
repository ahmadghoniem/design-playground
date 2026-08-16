# pickoff.md — prototype UI/UX changes to sync into specs

This file logs the UI/UX changes made to the Alpine + Pines prototype (`.claude/prototype/`)
in the "prototype change list" pass, so they can later be reflected into `.claude/specs/`
and cross-checked against `CONTEXT.md`'s glossary. **This is a notation file, not the spec.**

Legend: each entry says *what changed*, *why*, and the **spec file / glossary term** it should
sync into. `CONTEXT.md` terms in **bold**.

---

## Pass 3 — NAMING REFACTOR (prototype → CONTEXT.md glossary)

Behavior-preserving rename only. Old → new:

| Old | New | Glossary term |
|-----|-----|---------------|
| `src/partials/sidebar.html` | `src/partials/library.html` | **Library** |
| `src/components/sidebar.js` | `src/components/library.js` | **Library** |
| `sidebar()` / `registerSidebar` | `library()` / `registerLibrary` | **Library** |
| `.side`, `.side-head`, `.side-search`, `.side-body`, `.side-foot` | `.library`, `.library-head`, `.library-search`, `.library-body`, `.library-foot` | **Library** |
| `src/partials/right-panel.html` | `src/partials/design-agents.html` | **DesignAgents** |
| `src/components/panel.js` | `src/components/design-agents.js` | **DesignAgents** |
| `panel()` / `registerPanel` | `designAgents()` / `registerDesignAgents` | **DesignAgents** |
| `.rpanel`, `.rp-body`, `.rp-head` | `.design-agents`, `.design-agents-body`, `.design-agents-head` | **DesignAgents** |
| (inline in `canvas.html`) | `src/partials/canvas-toolbar.html` | **CanvasToolbar** |
| `.tool-rail`, `#loc-tools` | `.canvas-toolbar`, `#loc-canvas-toolbar` | **CanvasToolbar** |
| (inline in `canvas.html`) | `src/partials/zoom-controls.html` | **ZoomControls** |
| `.view-pill` | `.zoom-controls` | **ZoomControls** |
| `.vb-group` | `.viewport-selector` | **ViewportSelector** |
| Hardcoded help popover rows | `helpItems` loop in `zoom-controls.html` | **ZoomControls** help popover |

**Not extracted:** `node.html` — six canvas nodes differ too much (label/index, ViewportSelector presence, adopt rail, fail face, text handles, image thumb) for one partial without a contrived data model.

---

## A. Window / shell chrome

- **A1 — Removed `app-frame-top`.** Deleted the fake OS window strip (traffic-light dots,
  "playground" title, `◐ agent idle` status pill) and all `agentStatus` store wiring. The
  prototype is a screenshot of the app, not of an OS window; the idle-status pill implied a
  runtime signal we don't model. → `shell-and-layout.md`.
- **A2 — Widened the editorial `.page`.** Raised the `max-width` cap and trimmed side padding so
  the mock canvas sits close to real canvas width and **ZoomControls** stay visible beside the
  **Composer**. → `shell-and-layout.md`.
- **A3 — Removed the Library toggle from `CanvasToolbar`.** The **Library** does not collapse
  (per `CONTEXT.md`: "Always present — it does not collapse"). Dropped the Library-toggle button
  and its separator from the tool rail, plus `toggleSidebar()`. → `shell-and-layout.md`, **CanvasToolbar**, **Library**.

## B. Canvas nodes vs DesignAgents

- **B1 — Two-zone selection-gated node chrome (matches real IterationNode / ComponentNode / ImageNode).**
  Top bar: always-visible label (`NodeLabel` rule — muted `#A8A29E`, accent on select; iterations show
  `Name | #N`; adopted iterations also show a green **Adopted** pill). **ViewportSelector** (Auto / Desktop /
  Mobile icons) sits top-right and is `opacity:0; pointer-events:none` until the node is selected. Frame gets
  `ring-2` `#0B99FF` on select (green `#4ade80` when adopted; emerald on the image node). Right-side vertical
  round toolbar (`absolute top-0 left-full`, GitMerge adopt + Trash2 delete on **iteration** nodes only;
  component / text / reference nodes get delete only) is likewise selection-gated. Failed nodes: delete only
  (no viewport, no adopt); failure reason on the card face (no status badge). → `design-panel.md`,
  `branch-model.md`, **ViewportSelector**.
- **B2 — Removed viewport controls + Keep/adopt bar from the Design tab.** They live on the nodes
  now (B1), so the **Design** tab is pure style properties for the current selection. → `design-panel.md`.
- **B3 — Removed the keep helper line** (`.kn` under the old design keep bar, and the per-kind
  `KEEP.txt` strings). The whole keep strip went with B2. → `design-panel.md`.
- **B4 — Removed the always-on combined `.node-tools` bar.** Earlier B1 put viewport + Adopt/Keep in
  a persistent second bar on the card; that drifted from the real app. Replaced by the two-zone
  chrome above (top-right viewport + right rail). → `design-panel.md`.

## C. Design tab controls

- **C1 — Number fields: steppers → horizontal scrub.** Replaced the −/+ steppers with a
  drag-left/right scrub on the value (Figma/Framer style). Value readout and the dirty (changed-
  from-default) state are kept. → `design-panel.md`.

## D. Composer

- **D1 — Model picker moved to the input row, left of Send.** → `branch-model.md`, **Composer**.
- **D2 — Removed the perched model button** above the pill (old `.ccc-left`). Edit/Explore stays a
  slim mode control; no empty perch left behind. → **Composer**, **ComposerMode**.
- **D3/D4 — Annotations control on the Composer left, with the dot-meter gimmick.** A
  `MousePointerClick`-style cursor with an arc of dots around the tip, recreated as inline SVG.
  The dots act as a meter: `filled = min(annotationCount, dotCount)`; 0 = all muted, each
  annotation lights one dot. Clicking simulates adding annotations (context into the prompt), the
  v0 / Magic Patterns / Onlook "select-into-prompt" family. → new **Composer** annotations
  affordance (spec addition).
- **D5 — Fallback dashed-rect icon not used** (preferred SVG built cleanly). Noted so it isn't re-proposed.
- **Permissions pill (Codex-style).** To the **right of the annotations icon**, an approval-mode
  pill ("✋ Ask for approval") opening a small menu (Ask for approval / Auto / Full access / Read
  only), mirroring the Codex composer. Simulated/static, clickable. → new **Composer** permissions
  affordance (spec addition).
- **D6 — Full continuum wired.** **Transcript** tab renamed **Agents**. The **Composer** is one
  control in two placements sharing one state (an Alpine `chat` store): minified on the canvas
  floor, or embedded at the bottom of the **Agents** tab when expanded. Expanding hides the floor
  Composer, switches the right panel to **Agents**, and keeps the same thread above the embedded
  Composer (Figma/Recraft continuum). → `shell-and-layout.md`, **Composer**, **Agents**, **DesignAgents**.

## E. Removed (no replacement this pass)

- **E1 — Simulate strip gone.** Deleted the `simulate: agent running / dirty working tree` row and
  its `simRun` / `simDirty` / status-pill wiring. → drop from any spec that still encodes it.
- **E2 — Footer "Prototype only — no real files…" removed** from the editorial page.
- **E3 — Branch/dirty/stash UX not expanded.** Per decision, the branch modal is **kept static**:
  the simulate drivers are gone but the modal remains as a clickable example, with a couple of
  selectable branches. Same treatment for the branch/worktree context pills and the model picker —
  static but clickable to switch between preset options. Git-workflow specs are **not** deepened
  this pass. → `branch-model.md` (leave as-is; revisit later).

## F. Editorial page (below the mockup)

- **F1 — UI-decision checklist → compact horizontal layout** (less vertical height).
- **F2 — Spec-map folds: title + filename on one row** (file on the right), longer description
  underneath when open.
- **F3 — Library footer helper hint aligned** to the width of the control bar / left column it sits under.

## H. Second-pass canvas + panel refinements

- **H1 — Text node → plain text.** Restyled `.text-node` to match real `TextNode.tsx`: ~20px black
  sans on a transparent background — no amber note box, italic, or border. Node label kept; no
  editable-pill affordance. → `agent-vocabulary.md`, **TextNode**.
- **H2 — Adopt button hidden on component nodes.** Removed the disabled keep/adopt rail button from
  the original `PriceCard` component node; adopt (GitMerge) renders on iteration nodes only (disabled
  during in-flight adopt/generation). Adopted state is shown via the green **Adopted** pill on the label
  row plus green frame ring and the keep button's **Kept** (green) state — not a separate "adopted" badge
  chip. Delete stays on all nodes. → `design-panel.md`, **ComponentNode**, **IterationNode**.
- **H3 — Element-inspection crumb: tag or component name, never utility classes.** Alt-click hotspots
  now use `p`, `h2`, `Button` (nested component demo) instead of class-laden selectors. Design-panel
  crumb renders `PriceCard.<data-el>` — mirrors `element-context.ts` (`displayName = getReactComponentName(el) || tagName`). → `design-panel.md`, **element-context**.
- **H4 — Canvas pan without scrollbar.** `.canvas-wrap` clips with `overflow: hidden` (no scrollbar).
  Panning applies `transform: translate(panX, panY)` to `.board`: Hand tool left-drag, or middle-mouse
  drag regardless of tool. Select-tool left-click still selects nodes. → `shell-and-layout.md`.
- **H5 — Help button width matches CanvasToolbar.** `.help-btn` set to 48×48px to align with
  `.canvas-toolbar` (8px padding + 32px button + 8px padding). → `shell-and-layout.md`.
- **H6 — Zoom-to-selection icon.** Swapped the frame-corners-around-square glyph for a magnifier +
  crosshair (expand-to-fit style). → `shell-and-layout.md`.
- **H7 — Removed Agents-panel History overview.** Deleted `#loc-hist` block and `.hist`/`.hrow` CSS.
  **Explicitly excluded from specs** (not wanted). → note only.
- **H8 — Removed Layers node-count badge.** Dropped `.cnt` span, CSS, and `count` field from
  `layers.js`. **Explicitly excluded from specs** (not wanted). → note only.
- **H9 — Image tool → upload icon.** Replaced landscape/picture glyph with up-arrow-into-tray;
  tooltip/aria now say "Upload image or GIF". → `shell-and-layout.md`.

## I. Pass 3 chunk 1 — regressions + small UI

- **I1 — `loadPartials()` nested partial fix (Composer regression).** `loadPartials()` now loops:
  after each injection pass it re-scans for `[data-partial]` until none remain, so nested slots inside
  `canvas.html` (`.chat-dock`) and `design-agents.html` (`.agents-composer`) resolve and the Composer
  renders in both placements. → `shell-and-layout.md`, **Composer**.
- **I2 — Canvas pan (see corrected H4).** Pointer-driven `translate` on `.board`; grab/grabbing cursor
  while panning. → `shell-and-layout.md`.
- **I3 — Node status/kind vocabulary aligned to real nodes.** Removed prototype-only kind chips
  (`component`, `iteration N`, `text`, `reference`) and status badges (`original`, `editable`, `failed`
  pill). Kept: `NodeLabel` only (component name; `Name | #N` for iterations; image label selection-gated);
  green **Adopted** pill on adopted iterations; named failure content on the fail-card face. Text node:
  no label bar (matches `TextNode.tsx`). → `design-panel.md`, `agent-vocabulary.md`.
- **I4 — Help popover trimmed.** Removed **Discord community** and **Submit a prompt** rows (and
  matching entries in `helpMenu.js`). → `shell-and-layout.md`.
- **I5 — Text-node corner handles.** Selected text node: `outline: 2px #1e9bff` plus four 14px white
  corner squares (`border: 2px solid #1e9bff`), centered on corners via ±50% translate — replaces the
  old box-shadow ring. → `agent-vocabulary.md`, **TextNode**.

### Explicitly excluded from specs

These prototype elements were removed or never added because they are **not** in the target specs:

- Agents tab **History overview** (H7) — timeline rows with `+2`/`~1` deltas under the thread.
- Layers tree **node-count badge** (H8) — e.g. the `4` next to Pricing.
- Text node **editable pill** affordance (H1) — real `TextNode` is plain text; inline edit on
  double-click is canvas behaviour, not a visible pill chrome.
- Kind/status **badge chips** (I3) — `original`, `editable`, `component`, `iteration N`, `text`,
  `reference`, and the failed **badge** pill; real nodes use `NodeLabel` + adopted pill + fail-card
  content instead.

## J. Pass 3 — Composer redesign + token/theme fixes

- **J1 — Worktree selector removed (branch-basis only).** The app runs on a branch basis; the user
  picks the worktree by launching the app there. Removed the `wt-pill` dropdown, `ctx-menu`, and
  `pickWorktree` / `WORKTREES` switching. Context row shows a read-only worktree label (`wt-readonly`,
  no chevron). Branch pill kept as-is. → `branch-model.md` must **drop** the worktree selector.
- **J2 — Composer Codex-style footer row.** Context row (read-only worktree + branch + Edit/Explore)
  on top; labeled **Attachments** section; input area in the middle; dedicated **footer** bar
  (border-top, sunk background) with inspect + permissions on the left, model picker + Send on the
  right. → `branch-model.md`, **Composer**.
- **J3 — Attachments as a deliberate section.** Tag chips (`chat-tags`) sit under an "Attachments"
  header inside the composer — not loose floating chips. → **Composer**.
- **J4 — Expand button reflects actual placement.** Added `isComposerEmbedded` getter (`expanded &&
  rightTab === 'agents'`). Expand/collapse button label and icon derive from placement, not raw
  `expanded`. Switching right tab away from Agents resets `expanded` via `ui.setRightTab()`. →
  `shell-and-layout.md`, **Composer**, **Agents**.
- **J5 — Onlooks StateCursor icon.** Replaced the dot-meter annotations cursor with Onlooks
  **StateCursor** inline SVG; numeric badge on the button preserves annotation count. → **Composer**
  annotations affordance.
- **J6 — Tokens tab neutral, no copy.** Token name is plain left-aligned sans text (not mono, not
  right-aligned). Removed mono value readout and click-to-copy (`copyToken`). Row = swatch + name;
  UNDEF flagging kept. → `sidebar-tokens.md` must **drop** click-to-copy.
- **J7 — Tokens tab light scrollbar.** `.library-body` scrollbar styled (webkit + `scrollbar-color`)
  for a subtle light treatment consistent with the prototype palette.
- **J8 — Editorial page toggle does not theme the app mock.** Wrapped editorial chrome in
  `.editorial-shell`; `data-theme` is set on that shell (not `document.documentElement`). `.app` has
  `color-scheme: light` always. In-app preview toggle (header Sun/Moon → `.app-theme.dark`) unchanged.
  → `shell-and-layout.md`.

### Spec-sync TODO (pass 3)

- **`branch-model.md`:** remove worktree selector; document read-only current-checkout label; Composer
  footer layout (Codex-style).
- **`sidebar-tokens.md`:** remove click-to-copy token rows; neutral name styling (swatch + plain name).

## K. Pass 4 — de-shell, composer polish, tooltips

- **K1 — De-shell: `index.html` is the app.** Removed editorial `.strip`, `.page` / `.mast`, `.app-frame`, `.editorial-shell`, and the inline `spec-fold` partial. `<body>` is just `<div class="app">` + partial slots (header, library, canvas, design-agents). `.app` is `position: fixed; inset: 0` — full viewport, no outer border/radius/shadow. Light `--pgc-*` tokens unchanged. Editorial CSS (`.strip`, `.mast`, `.page`, `.specwrap`, etc.) kept in `app.css` for the standalone spec-map page. → `shell-and-layout.md`.
- **K2 — Spec map moved to `spec-map.html`.** Same head/importmap as `index.html`; body keeps `.editorial-shell` + `editorialTheme()` + `spec-fold` partial. `src/data/specMap.js` untouched. `previewTheme()` (header Sun/Moon) unrelated — still themes previews + Tokens tab only. → notation only.
- **K3 — Composer: no Attachments header.** Dropped `.composer-section-head` "Attachments" label; chips still gated by `$store.chat.tags.length` (matches real `DockedChatBar.tsx` — chips with no header). → **Composer**.
- **K4 — Typeable auto-growing textarea.** Static placeholder div → `<textarea x-model="$store.chat.draft">` with `growInput()` in `composer()` (max 120px, then scroll; light scrollbar like `.library-body`). `draft` on shared `chat` store keeps both placements in sync. → **Composer**.
- **K5 — Flat footer, round bottom corners.** Removed `.composer-footer` `border-top` and `background: #f5f5f4` — one continuous surface like Codex. Footer gets `border-radius: 0 0 20px 20px` so bottom corners of `.chat-box` show through. **Do not** add `overflow: hidden` to `.chat-box` — `.ctx-menu.up` popovers overflow upward. → **Composer**.
- **K6 — Library `+` removed.** Deleted `.add-btn` from `.library-head` (icon + "Project" label only). Real `PlaygroundSidebar.tsx` header has no add control; prototype Library stays docked/non-collapsing. → **Library**.
- **K7 — Alpine `x-tip` tooltips.** New `src/components/tooltip.js` (`registerTooltip()`): one body-appended element, `fixed` positioning, 4px offset, viewport clamp, 700ms open delay / 300ms skip-delay (Radix defaults from `shared/ui/tooltip.tsx`), 150ms fade + scale + 2px slide. Styling: white bg, `#1c1917` text, 8px radius, `shadow-md`, 12px font (product uses 14px). All ~55 native `title=` / `:title=` in partials converted; `aria-label` kept. Side modifiers per region (toolbar `.right`, header `.bottom`, zoom/composer-footer `.top`, node rail `.right`). Null/empty expression → no tip. → `shell-and-layout.md`, **tooltip** affordance.
- **K7a — `x-tip` values are JS expressions.** A static label must be quoted inside the attribute: `x-tip.top="'Zoom in'"`, not `x-tip.top="Zoom in"`. Unquoted labels are evaluated by Alpine and throw (`Zoom in` is a syntax error; `Auto` is an undefined identifier), so no tip renders. Bare identifiers/calls stay unquoted when they really are expressions — `x-tip.bottom="title"`, `x-tip.right="adoptLabel('iter')"`, `x-tip.top="$store.chat.annotations + ' annotations'"`. The tooltip element mounts on `<body>` (outside `.app`), so `.pg-tip` sets the app's sans stack explicitly rather than inheriting the editorial `--ui` font.

## L. Pass 5 — editorial layer + header removed, model/effort picker, shadcn tooltip, / skill picker

- **L1 — Editorial layer deleted.** Removed `spec-map.html`, `spec-fold.html`, `spec.js`, `specMap.js`, and all editorial CSS (`editorial-shell`, `.strip`, `.page`, `.mast`, `.specwrap`, `.check-list`, `.foot`, editorial custom properties). **Why:** `.claude/specs/` is the single source of truth; `spec-map.html` was a competing in-prototype spec surface. `index.html` is now the only page.
- **L2 — Header deleted; controls relocated.** Removed `header.html` and `.pg-header`. `/rewynd` → **Library** `.library-head` (10px/600/0.08em tracking, path literal, muted). Preview Sun/Moon → **CanvasToolbar** bottom group (`x-data="previewTheme()"`, `x-tip.right="title"`). Skills wrench → **`/` skill picker** in Composer (no header button). Model settings → **model picker** “Model settings” row → `modelSettingsModal`. **Clear all removed** — destructive, canvas-scoped; future home is canvas right-click “Clear canvas” (not built).
- **L3 — Codex-style model + effort picker.** Trigger pill: agent mark + model + dimmed effort + chevron. Menu: Model › and Effort › rows open side submenus (`left: 100%`, flip to `right: 100%` on overflow); ✓ on current option; divider; Model settings; dimmed Reset to default ↺ → `resetModelDefaults()`. Effort values `low | medium | high | max` from `shared/lib/agent-config.ts` (default `high`). Store: `effort`, `setEffort`, `effortLabel`, `resetModelDefaults`.
- **L4 — Tooltip → shadcn Base UI inverted pill.** `#1c1917` bg / `#fff` text, 6px radius, 12px text, 10px rotated arrow per `data-side`, no shadow, 8px slide-in (150ms), 700ms open / 300ms skip. **Differs from product `shared/ui/tooltip.tsx`** (white `bg-pg-popover`, `shadow-md`, `rounded-lg`, `text-sm`, no arrow) — **spec-sync item**.
- **L5 — `/` skill picker.** Mirrors `impeccable-skill-picker.tsx` type scale: Skills heading, rows with label + description, impeccable badge + › sub-list, `+ Add a skill…` footer → Skills modal (Installed/Browse tabs, search, mock install/remove). Real app mounts picker with `showAddSkillButton={false}` — footer row is a **proposed change**. Inserts plain-text `/<skill-id> ` tokens (not contenteditable mention pills).
- **L6 — `.app` shell.** `grid-template-rows: 1fr`; `.app-body` fills viewport height.

## M. Pass 6 — tooltip placement/shortcuts/accent, help restore, primitives cleanup, real layers data

- **M1 — Preview theme toggle removed from CanvasToolbar.** Deleted the Sun/Moon button, its `previewTheme()` wrapper, and the separator above it. Removed `theme.js` / `registerTheme()` — no consumer left. **`.app-theme` / `.app-theme.dark` CSS blocks and the Tokens-tab `.app-theme` wrapper are kept**; dark token preview currently has no entry point (open question in pickoff).
- **M2 — Tooltip boundary positioning.** `x-tip` walks up from the trigger for `closest([data-tip-boundary])`; the boundary rect drives placement along the offset axis, the trigger rect centres along the other. Added `data-tip-boundary` on `.canvas-toolbar`, `.zoom-controls`, and `.help-wrap`. Composer footer tooltips unchanged (no boundary).
- **M3 — Keyboard shortcut hints split from label.** Optional `data-tip-key` on the trigger renders a dimmed unbracketed second span (`.pg-tip-key`). CanvasToolbar: Select/V, Hand/H, Shapes/R, Text/T — parenthesised suffixes removed from labels.
- **M4 — Accent token unification.** New `--pgc-accent`, `--pgc-accent-hover`, `--pgc-accent-fg` (composer send-button colours). Shared by `.send`, `.help-btn`, `.help-pop`, `.pg-tip`, `.pg-tip-arrow`.
- **M5 — Help button back to 36×36px.** Reverted from the mistaken 48px match to CanvasToolbar outer width. Added `x-tip.top="'Help and resources'"`; `aria-label` kept. Popover contents unchanged.
- **M6 — Primitives tab cleanup.** Removed `.cva-flag` badge (cva still drives expandability). Removed `overlay: true` from Dialog/Sheet — dropped `.overlay` row class, `.ban` icon, and portal tooltip; ordinary draggable rows.
- **M7 — Layers tab real demo tree.** Replaced `layers.js` with a static Rewynd app render tree. Row anatomy: indent guides (1px vertical rules per ancestor), chevron on parents (rotates on expand), six kind icons (layout/layers/box/chart/table/primitive), `dim` label styling, **`count` badge** (instance count — `4`, `×n` — distinct from the child-count badge removed in H8), **`conditional` `?` chip** with `x-tip.right="May not render"`, row actions on hover/selected (focus crosshair + 6-dot drag handle). `DownloadAsCSV` selected. Search placeholder `Search layers`; ancestry-preserving filter. Collapsing `PerformanceDashboard` hides `EquityCurveChart`'s children.

## N. Pass 7 — help-popover x-for, annotation tips, tooltip offset, theme restore, layers badges out, chevron hit area

- **N1 — `x-for` single-root rule (help popover).** Alpine `x-for` requires exactly one root element inside `<template>`; sibling roots silently drop all but the first. The help popover loop had `<a>` + `<button>` siblings — only link rows (Docs, Contact us) rendered; button rows (Keyboard shortcuts, Give feedback) were missing. Fixed with a layout-neutral `.hp-row { display: contents }` wrapper. Same fix applied to Tokens tab `group.rows` loop (two `.tok-row` siblings merged into one row with `:class="{ undef: row.undef }"`).
- **N2 — Annotation button two tooltip states.** `chat` store getter `annotationsTipLabel` (and matching `annotationsAriaLabel`): `annotations === 0` → explain affordance (`Annotate elements — click parts of a preview to add them to your prompt`); `annotations > 0` → action label (`Disable annotations`). Both Composer placements bind `x-tip.top` / `:aria-label` to the getters; numeric `.annot-badge` unchanged.
- **N3 — Tooltip offset 8px.** `tooltip.js` placement gap raised from 4px to **8px**; boundary logic, centring, and viewport clamp unchanged.
- **N4 — Theme switch back on CanvasToolbar (reverses M1).** Restored `theme.js` (`previewTheme()` + `registerTheme()`), `proto.js` / `main.js` wiring, Sun/Moon button at toolbar bottom below undo/redo (`.rail-sep`, `x-data="previewTheme()"`, `x-tip.right="title"`). `.app-theme.dark` toggle on preview surfaces + Tokens tab has a trigger again.
- **N5 — Layers badges removed.** Dropped `conditional` / `count` fields from `layers.js`, badge markup in `library.html`, and `.cnt-badge` / `.cond-badge` CSS. Aligns with H8 — **badges on layer rows are settled: not wanted**.
- **N6 — Chevron hit area 24×24.** Layer-tree expand chevron: glyph stays 8px; clickable `.tw` button is `24×24` grid-centred; `.tw-spacer` reserves same width, non-clickable; `@click.stop` on chevron so row select is not swallowed.

## O. Pass 8 — rich tooltip, help popover polish

- **O1 — Rich tooltip variant.** `tooltip.js` gained optional `data-tip-desc` and `data-tip-art`
  attributes, re-read on every show (state can change between shows). With a description present the
  pill takes `.pg-tip-rich`: stacked title (12.5px) + dimmed description (11px, `rgba(255,255,255,.55)`)
  + a 168×64 inline-SVG artifact on `#1c1917`, `max-width: 200px`, wraps. Without one it is the
  unchanged single-line pill. **A tooltip earns the rich shape only when it is teaching something the
  label cannot say** — otherwise it is a pill.
- **O2 — Help popover.** Width 226 → **196px**. What's-new rows are flex with the date pushed right
  (`margin-left: auto`) instead of trailing the title. Changelog entries replaced with two that would
  plausibly ship in *this* app (`Model & effort picker`, `Alt-click element inspection`) — a mock
  changelog naming another product's features is a tell. Trigger tooltip suppressed while the popover
  is open (`helpOpen ? '' : 'Help and resources'`). `.help-pop` shadow softened to
  `0 10px 24px rgba(0,0,0,.18)` and `x-transition.opacity` replaced with a plain `x-transition` —
  both surfaces already declared `var(--pgc-accent)`, so the perceived colour difference came from
  the heavy halo and a possible non-1 resting opacity, not the fill.

## P. Pass 9 — agent-right layout variant, tooltip corrections, model pill morph

- **P1 — NEW: `variant-agent-right.html`, a second entry page.** A layout to compare against the
  current one, in the shape used by Aside / Gemini-in-Sheets / Comet: **the canvas owns the window and
  a single right rail is the whole agent surface** — run header, scrolling thread, Composer pinned to
  its bottom. Nothing floats over the canvas. The Library stays on the left. **There is no Design tab
  and no tab strip in this variant** — that is the question it exists to answer: does losing the
  always-available style panel cost more than the floating Composer does.
  - Selected by `<body data-layout="agent-right">`, read once into `$store.ui.layout`. No runtime
    toggle — the page decides. `index.html` is unchanged.
  - `.chat-dock` renders only under `layout === 'canvas-dock'`; the Composer's expand/collapse button
    only renders there too, since in the rail the Composer has nowhere else to be.
  - Rail is **380px** (vs. the Design panel's 306px) — it carries a thread and a Composer.
  - `.rail-composer` has **no top border**. The Composer's own rounded box is the boundary; a second
    hairline above it reads as a seam. Same reasoning as the flat composer footer (J2/K5).
- **P2 — The rich tooltip is for the empty state only.** `annotations > 0` → plain
  `Disable annotations`, no description, no artifact. The rich shape teaches an unused affordance;
  once the mode is on, the button only needs its verb. `annotationsTipArt` is now a bound getter
  rather than a hardcoded attribute.
- **P3 — Worktree and branch chips lose their tooltips.** Both already show their own name as visible
  text and their icon (folder / ⑂) says what kind of thing it is. **A tooltip that restates visible
  text is noise** — general rule.
- **P4 — The worktree is named, not described.** `CURRENT_WORKTREE` was `current checkout`, which
  names a *state* rather than telling you *which* worktree you are in. Now the directory name
  (`rewynd`), because a git worktree **is** a directory. Reads correctly beside the branch chip:
  folder `rewynd`, branch `master` — two different facts, neither implying the other.
- **P5 — Model pill tooltip is `Select model`,** and is suppressed while the picker is open (same
  `menu === 'model' ? '' : …` pattern as the help button). It named both dimensions before
  (`Model and effort`); the effort row is inside the picker, so the trigger only has to name the
  thing you are about to open.
- **P6 — The model pill morphs to the picker's width.** On open the button's `min-width` animates to
  the measured menu width (`.18s`), chevron pushed to the far right, so trigger and popover read as
  one surface; it shrinks back on close. Codex behaviour. The menu is already right-aligned to the
  wrapper, so at equal widths the two align on both edges.

## Q. Pass 10 — the agent rail becomes a layer, gooey tooltip connector

- **Q1 — The rail is a layer behind the canvas, not a column beside it (replaces P1's grid).** The
  rail is pinned to the right edge at a fixed 380px with `z-index: 0`; the canvas is an opaque
  floating panel above it (12px radius, drop shadow, hairline ring). Opening the agent **translates**
  the canvas left by the rail's width; closing translates it back until the rail is completely
  covered. **The canvas never resizes and nothing inside it reflows** — that is the whole point of
  the layering, and it is what makes the half-covered mid-slide state (rail's left portion tucked
  under the canvas edge) the correct picture rather than a glitch.
  - Consequence, accepted deliberately: because the canvas translates rather than shrinks, ~380px of
    it slides out of the stage on the left and is clipped. On an infinite pannable board that costs
    nothing and it is what makes the motion read as a panel sliding. The alternative — shrinking the
    canvas's width — reflows the board on every open/close and was rejected for that reason.
  - Fully covered is the **"just the app" state**: no playground chrome over the preview.
  - Modals now clip to the canvas layer (`.scrim` is `absolute; inset: 0` inside `.canvas-wrap`).
    Correct for a floating canvas — a canvas-scoped dialog should not escape the canvas.
- **Q2 — Tooltip connector is a gooey blob, not a triangular arrow.** An SVG filter
  (`feGaussianBlur` → high-contrast `feColorMatrix` alpha ramp, `feBlend` back over the source)
  merges a 16px circle into the pill through a concave fillet. The filter applies to a **shape-only
  layer** (`.pg-tip-surface` → `.pg-tip-body` + `.pg-tip-blob`); text is painted above it, unfiltered,
  because the filter melts anything inside it and would destroy type. The blob protrudes 8px past the
  pill with 8px of overlap — the overlap is what produces the fillet instead of a dot beside a box.
  Placement offset raised 8 → **14** so the visual gap is measured from the blob's tip.
- **Q3 — `.pg-tip-visible` had to become `.pg-tip.pg-tip-visible`.** The per-side entry transforms are
  `.pg-tip[data-side="…"]` — (0,2,0) — and were outranking the (0,1,0) visible rule, so bottom / left
  / right tooltips never settled and sat permanently 8px off in their entry direction. Invisible while
  the connector was a centred triangle; with a blob that aims at the trigger it is not. **Attribute
  selectors outrank plain classes — a state class that has to win must match the same weight.**

## R. Pass 11 — goo config widget, tooltip↔trigger connection, goo lab, layer-motion fix

- **R1 — The canvas layer moves by its right edge, not by `translate` (corrects Q1).** Translating
  the whole layer slid its leftmost 380px out of `.stage`'s `overflow: hidden` — **taking the
  CanvasToolbar and the zoom/help controls with it**, because they are absolutely positioned to the
  canvas's left edge. Q1's claim that translate "costs nothing on an infinite board" was true for the
  board and false for everything pinned to its edges. Animating `right` keeps both edges on screen;
  the rail is still overlapped for the whole transition, which is the look. **General rule: a layer
  that carries edge-pinned chrome cannot be moved by translate.**
- **R2 — Every number in the gooey effect is runtime-tunable.** `Alpine.store('goo')` holds blur,
  alpha slope, alpha intercept, blob size / reach / overlap, tooltip offset, anchor on+size, and an
  `enabled` switch; `apply()` writes the SVG filter primitives directly and publishes the geometry as
  CSS custom properties on `:root`, so **no value is defined in two places** — CSS reads properties,
  JS reads the store. Persisted to `localStorage`, shared across pages. `asCss()` emits the current
  settings as pasteable filter + property declarations: **a tuning widget has to end in something
  transferable, or it is a toy.**
- **R3 — The tooltip connects to what it came from.** An anchor circle joins the pill and the blob
  inside the filtered layer, so the goo merges all three into one shape. **The anchor point resolves a
  standing conflict between two rules:** a tooltip must not cover the surface it belongs to (M3), and
  it must read as growing out of its trigger. So it anchors at the **boundary's** near edge on the
  **trigger's** centre line — the connection emerges from the toolbar's edge, level with the exact
  button being hovered. With no `[data-tip-boundary]` the boundary is the trigger, so the same code
  path anchors to the trigger's own edge.
- **R4 — `variant-goo-lab.html`, a page for judging the effect.** Two independently shaped, draggable
  blobs (circle / square / rounded / pill / rect, with width, height, radius), a live **edge-to-edge
  gap readout**, and a sweep slider that walks B along the centre line. The gap number is the point:
  it answers *at what separation does the merge stop reading as a connection* precisely, instead of
  by eye. The CanvasToolbar is mounted on the page because it is the only trigger with a
  `data-tip-boundary`, so it is the only honest test of R3.
- **R5 — `index.html` stays the clean reference.** The goo panel mounts on the variant and the lab
  only. Keeping one page free of dev instrumentation is what makes it usable for judging the design.

## S. Pass 12 — one sidebar width, frosted rail, canvas corners, MorphingTabs node

- **S1 — Both sidebars are the same width, and the number is written once.** `--pg-rail-w: 272px`
  on `.app-agent-right` feeds the grid column, the rail's own width, and `.shifted`'s `right`
  offset. Before this the width lived in three places as two different numbers (280 / 380 / 380),
  which is how the left and right rails drifted apart in the first place. **Equal side rails is a
  composition decision, not a coincidence** — the canvas is the subject and the two rails frame it;
  unequal frames read as one of them being more important.
- **S2 — The canvas rounds only the corners that face the rail, and only while the rail is open.**
  `border-radius: 0 22px 22px 0` on `.shifted`, `0` when closed, transitioned together with `right`.
  A rounded corner needs something behind it: closed, the canvas is flush to the stage edge and the
  radius would just chip a hole in it; open, the rail sits behind and the curve reads as a card edge.
  The left edge butts the Library and stays square for the same reason.
- **S3 — The rail is frosted, and it is the layer *behind* the canvas that gets frosted.** A dimmed
  translucent off-white plus `backdrop-filter` blur. This is what the layered shell (Q1/R1) was for —
  the depth was structural but invisible while both layers were flat opaque white. Two consequences
  that are easy to miss: `backdrop-filter` over a flat colour blurs nothing, so `.stage` needed a
  low-contrast wash for the frost to have something to pick up; and **any opaque child defeats it**,
  so `.rail-head` and `.rail-composer` had to drop their `--pgc-bg` fill.
- **S4 — The morphing tab is built on the existing goo filter, not on beui's bezier path.** The
  reference (`beui.dev/components/blocks/morphing-tabs`) animates an SVG `d` attribute under spring
  physics. The prototype merges a sliding pill rectangle with the panel rectangle through `#pg-goo`.
  Same read, a fraction of the code, and — the actual reason — it puts a **second surface under the
  goo panel's live controls**, so tuning is judged against two shapes instead of one. The pill/panel
  overlap derives from `--goo-blob-overlap`, so the neck tunes with everything else. *(Pass 12 first
  built this as a component preview node on the board — superseded by T1, which moves it to the
  canvas itself. The technique is unchanged; only what it is attached to changed.)*
- **S5 — The two-layer split is the whole trick, and it is now used in three places.** A filtered
  shape-only layer, with text and hit targets painted above it unfiltered (tooltip pill, goo lab,
  MorphingTabs). Backgrounds on the filtered layer and text inside it both destroy the merge. Worth
  stating as a rule because every future use of the effect has to obey it.

## T. Pass 13 — the canvas is tabbed workspaces, composer context by placement

- **T1 — A tab is a workspace, not a component (corrects S4's placement).** Pass 12 put the morphing
  tabs on the board as a component you drag in; that read them as UI to preview. They are **the
  canvas's own workspace switcher** — one tab per page, per component, per direction being explored,
  and switching tabs switches which board you are looking at. **Why it has to be a morph and not a
  highlighted label:** the selected tab and the board surface are one continuous shape, so the tab
  is not a label pointing at the canvas, it *is* the canvas folded up into a handle. That is the
  whole argument for the effect existing here at all.
- **T2 — `.canvas-wrap` is three layers, and which one carries the filter is the design.** A
  shape-only `.canvas-goo` (the board surface rectangle + the active tab's pill, merged by
  `#pg-goo`), the `.canvas-tabstrip` above it, and `.canvas-face` holding the dot grid and `.board`.
  **The dot grid moved onto `.canvas-face` as `background-image` with no base colour** — the fill
  now comes from the gooed surface underneath, which is what lets the board and the tab be one
  shape. `--ct-h` is the single definition of the strip height, read by the strip, the surface's
  top, the face's top, and the CanvasToolbar's offset.
- **T3 — The canvas gains a field.** `.canvas-wrap`'s own background is now `--ct-field` (`#292524`,
  the same dark the tooltip pill uses) and is visible only in the strip band. One inverted-chrome
  language rather than two, and the light board reads as a surface resting on it.
- **T4 — Empty tabs show an empty state.** Without it the tabs look decorative; the empty state is
  what makes "each tab is a separate workspace" legible on a mock with no backend.
- **T5 — The composer's context row depends on where the composer is.** The worktree chip and the
  branch picker show only when the composer is **docked on the canvas** (`isComposerDocked`). Inside
  an agent panel the rail head already states both, so repeating them spends the narrowest column on
  screen on duplicated chrome. This is placement-driven, not layout-driven: `index.html`'s docked
  composer keeps them and drops them when it expands into Agents; the agent-right rail never shows
  them.
- **T6 — Rail width settled at 300px.** 272 (S1) was too narrow. Both sidebars still share
  `--pg-rail-w`, and the pass-12 composer tightenings that 272 had forced (smaller permissions pill,
  reduced footer gap) were **removed rather than kept** — a crutch for a width that no longer exists
  is just drift. The model-name ellipsis stays: it is a correctness guard at any width.

## U. Pass 14 — the design stack becomes the app; Styles/Variables right panel

- **U1 — `index.html` *is* the design-stack shell; `variant-design-stack.html` is deleted.** The two
  pages were never separate code — both loaded the same three partials and differed only by
  `data-layout` and an `.app-design-stack` class flipping `x-show` branches. The merge is therefore
  two attributes on `index.html` plus the removal of the duplicate page and its `variant-nav.js`
  entry. **The `layout !== 'design-stack'` branches stay**, because `variant-agent-right.html`
  renders through them and is still the other candidate in the §0 entry-page question. They become
  deletable the moment that is settled — not before.
  - A control diff between the two pages found exactly **two** genuine losses, both carried over:
    the Composer's size-up button (gate widened from `layout === 'canvas-dock'` to
    `layout !== 'agent-right'`) and the Library footer hint. Everything else in the "missing" column
    was a *relocation*: Design|Agents tabs → `stack-tab`s, Layers/Primitives seg-tabs → folds,
    the Tokens tab → the right panel's Variables › Colors, the Library search → per-fold search.
    **Diffing the two pages' visible controls before merging is what made the union safe** — reading
    the markup alone would have missed the size-up gate, which is three files away from the shell.
- **U2 — The right panel's folds are `Styles` and `Variables`** (`Properties` renamed). "Properties"
  named the mechanism; **Styles** names what the user is changing.
- **U3 — Styles carries the full six sections**, adopted verbatim from the pre-merge Design tab:
  Spacing, Typography, Colour, Border & shape, Effects, Layout. The stack copy had only three.
  The `id="loc-*"` anchors are **dropped from the stack copy** — both branches sit in the DOM at once
  under `x-show`, so keeping them would duplicate ids.
- **U4 — Colour rows read name-first, and the swatch is a working picker.** The row is
  `name` (left, `flex: 1`) then the control (right), reversing swatch-first. Rows are grouped under
  the Tokens-tab headers (Base / Surfaces / Actions / Neutrals / Charts / Sidebar / Custom); Radius
  keeps its own sub-fold rather than becoming a colour group. A group hides its label when search
  filters all its rows out. **The pick writes the custom property inline onto every `.app-theme`
  element**, which outranks both `:root` and the `.dark` block — so one pick repaints the swatch and
  the canvas previews together, with no second source of truth. `UNDEF` tokens keep the dashed amber
  marker and get **no** picker: there is no value to pick.
- **U5 — Both flanks collapse, Wonder-style.** The flank gives up its grid column
  (`--left-w` / `--right-w` → 0), goes `position: absolute`, and **its head survives as a floating
  rounded pill** — the panel is put away, never lost. The canvas grows into the vacated space and
  carries the toolbar rail left with it; the rail drops to `top: 66px` when the left pill is there so
  they stack instead of colliding. The right pill keeps its tabs live, so picking one reopens the
  panel on that view.
- **U6 — A flank's collapse control belongs on its inner edge, facing the canvas** — trailing on the
  left panel, leading on the right. Trailing-corner placement on both reads correct on the left and
  backwards on the right. The Design|Agents tabs take the far edge (`margin-left: auto`) so the
  control and the tabs are never crowded together.
- **U7 — Search takes over the fold's own header; it does not open a row beneath it.** The title is
  replaced by the input in place and the magnifier becomes an ✕ that restores the header and
  **clears the query** — a closed search must not leave an invisible filter behind. Opening also
  forces the fold open and focuses the field. Applies to every fold with a collapsing header:
  Layers, Primitives, Variables. The `.fold-search` row is gone.
- **U8 — The Icons fold names the set in use and lets you swap it; it has no search.** It sits
  inside the right panel's `Variables` fold, beside Colors, Radius and Type. `lucide` is
  a *choice*, not a fixed fact, so the fold carries a picker (lucide / hugeicons / phosphor / tabler
  / heroicons) and the preview list re-renders from the chosen pack. Searching six sample glyphs was
  answering a question nobody asked.
- **U9 — Fold stacks fill the panel and scroll inside themselves (accordion), instead of the panel
  scrolling as one page.** `.fold-stack` is a full-height flex column; an open fold takes
  `flex: 1 1 0` and its body scrolls internally. **Every fold header therefore stays on screen** —
  before this, expanding Styles pushed the Variables header out of view entirely and the only way
  back was scrolling. Verified: with both open the two split the panel; collapsing Styles returns
  Variables to the top; reopening pushes it back down. Applies to both flanks — it is one
  `.fold-stack` class, and scoping it to one side would have been the odd choice.
- **U10 — Tooltips go back to the plain inverted pill with a rotated-square arrow (retires Q2, R2,
  R3 for tooltips).** The gooey blob connector, its anchor circle, and the tooltip's read of
  `Alpine.store('goo')` are all removed; the offset is a plain 8px constant again. `goo.js` and
  `goo-panel.html` stay for the variants that still mount the tuning panel — **the effect is retired
  from the tooltip, not deleted from the prototype.**
- **U12 — The permissions pill becomes a one-word chip, tinted by blast radius.**
  `✋ Ask for approval` (131px) → `✋ Ask` (67px), a 64px saving in a footer that also carries
  annotations, model+effort and send. Built on the research below.
  - **The chip's word and the menu row's word are the same word.** Labels shortened at the source
    (`Ask` / `Auto` / `Full` / `Read`) rather than abbreviating only in the chip — OpenAI shipped
    drift between its own pill and menu copy and users filed confusion reports over it. The sentence
    that explains each mode moves to `hint`, which is now the chip's tooltip *and* its accessible
    name, so it is reachable without opening the menu.
  - **Tint is redundant with the word, never the only signal** (WCAG 1.4.1, failure F81): safe →
    muted, gate → ink, part → amber, open → orange, ascending by blast radius. Suppressed while the
    menu is open, matching the help button and model pill (O2, P5).
  - **`Auto` and `Full` stay separate states.** Every shipping tool surveyed keeps reviewed-autonomy
    and no-review apart; merging them to save width would have removed the one distinction the
    industry has converged on.
- **U11 — The Library footer hint is deleted.** "Drag any item onto the canvas" restates what the
  drag handles already say. (Briefly rescued in the merge as a genuine index-only control, then cut
  on sight — carrying something over is not the same as wanting it.)


## V. Pass 15 — one page, 280px flanks, the picker learns about agents

- **V1 — Every variant page is deleted; `index.html` is the prototype.** `variant-agent-right`,
  `variant-flanks`, `variant-single-sidebar`, `variant-a-floating` and `variant-c-bezel` are gone,
  and with them the layout-branching that existed only to serve them. **This settles the entry-page
  question that U1 was waiting on** — the design stack won, so the alternate branches are not
  parked, they are deleted. What fell out with them, none of it load-bearing: the workspace tab
  strip and its board store, the gooey filter and its tuning panel (the tooltip stopped using it at
  U10 and nothing else did), the legacy Design|Agents tab bar, the left sidebar's segmented
  tab row and its search field, the flank-card and layered-rail stylesheets. **~410 lines of CSS
  and seven files.** One shape means one code path: there is no `data-layout` attribute, no layout
  store field, and no conditional in any partial.
  - **Note for the spec:** `shell-and-layout.md` and `ROADMAP.md` both pointed at
    `.claude/prototype/variant-*.html` as the home of the frozen tab/pill experiments. Both now
    point at §T of this file instead.
- **V2 — Both flanks are 280px, and the number is written once.** `--pg-flank-w: 280px` feeds both
  grid columns. This also **aligns the prototype to the spec** rather than the other way round —
  `shell-and-layout.md` already specified 280px for the left sidebar; the right panel was 306 for no
  stated reason and the agent-right rail had drifted to 300 (S1 → T6). Equal flanks is a composition
  decision: the canvas is the subject and the two frame it.
- **V3 — Tabbed workspaces are deferred, and the strip is removed rather than parked.** A first
  version cannot ship while the tab model is still being designed, so `shell-and-layout.md`'s
  "one canvas, no tab strip" stands and T1/T2/T3/T4 are **not** a spec change. Deleted rather than
  left behind a flag, because a parked feature in the mock reads as a decided one.
- **V4 — The model picker groups models under the coding agent that runs them.** The app will offer
  several agents (Claude Code, Cursor, Codex, Antigravity), so the group heading names the agent and
  the rows do not repeat it: under **Claude Code** the row is `Opus 5`, never `Claude Opus 5`. A
  search field sits at the top of the list, focused on open; a group whose rows all filter out
  disappears heading and all.
  - **Every model carries its own default effort, shown dimmed on its row** — the same dim the
    trigger pill uses, so the two read as one fact in two places. **Picking a model applies that
    model's default**, and the effort picker's checkmark moves with it, so the common case costs
    one click instead of two.
  - **The closed trigger always names the model.** Cursor shipped a picker where the trigger showed
    only the effort word for the default model and spent three months answering bug reports about
    it. The effort is an addition to the model name, never a substitute for it.
  - **This is a picture of a menu, not a request for a provider abstraction.** `CLAUDE.md` is
    explicit that the product must not pre-build a provider registry for agents that do not exist
    yet — that layer was deleted once already. Drawing four agents in a mock picker does not
    reopen it.
- **V9 — The effort ladder is a shared vocabulary; the levels on offer are per model.** A
  flagship exposes five (`minimal / low / medium / high / max`), a fast model two. **The effort
  picker is therefore rebuilt from the chosen model**, not filtered from one fixed list — showing
  a level the model cannot honour is offering a control that does nothing. The ladder itself stays
  global and ordered, so `High` means the same rung wherever it appears.
  - This is also what makes switching models safe. Because picking a model applies *its* default
    (V4), **an override can never survive into a model that does not support it**: Opus 5 at
    `Minimal` → Composer 2.5 lands on `Low`, the only sensible value, with no invalid state in
    between. The alternative — carrying the override across and clamping it — is where Codex's two
    open effort bugs come from.
  - **Spec note:** the model catalogue is therefore `{ id, label, efforts[], defaultEffort }` per
    model, not a global effort enum plus a flat model list.
- **V5 — "Reset to default" becomes "Reset effort to default", scoped to the current model.** It
  reset model *and* effort to a hardcoded pair, which stops meaning anything once each model owns a
  default. Now it returns the effort to the current model's default and is **disabled while it
  already is** — dimmed rather than hidden, because a row that appears and disappears moves every
  row under it. Its accessible name states the scope in full. Researched;
  see `research-model-picker.md`.
- **V6 — The approval-mode menu's explanations are one line each.** `Sign off before each change` /
  `Edits and safe commands run` / `Runs everything, no prompts` / `Look, never write`. They wrapped
  to two lines in the menu's width, which turned a four-item list into a paragraph stack. The chip's
  word is unchanged (U12).
- **V7 — The project name loses its slash: `/rewynd` → `rewynd`.** The slash implied a path when the
  thing being named is a project.
- **V8 — Overlay primitives are *deferred*, not settled-no.** M6 removed the disabled treatment from
  Dialog / Sheet and made them ordinary rows, which contradicts a rule the specs hold in two places
  (`sidebar-primitives.md` describes the `Ban` icon + `draggable={false}` + portal tooltip;
  `shell-and-layout.md` settles "listed in the registry but never mounted live"). The prototype is
  drawing the **target** state — once preview containment works, they are ordinary rows. Record it
  as blocked on containment, **not** as a decision that they stay disabled forever.
- **V10 — The composer's context row is a status readout, not a switcher.** The branch chip was a
  real picker (a listbox over a catalogue of branches, each with its own title, dirty flag and
  canvas contents). It is now a plain read-only label beside the worktree, which was already
  read-only. **This follows from workspaces being deferred (V3):** switching boards was the only
  thing the picker was for, so with no workspace concept the control has no job left. You change
  branch with git, and the row reports where you are.
  - **The catalogue went with it.** Branch entries carried a `scene` that swapped the whole board
    (`explore` / `host` / an empty state) and a `tags` set that replaced the composer's attachments
    on every pick. Deleting the picker without deleting that would have left a board fixture keyed
    to a value nothing can change. The board is now simply what is on the canvas, and the empty
    state is gone with the branch that was the only way to reach it.
  - **Branch *creation* goes too, and with it every other git mechanic.** The keep-an-iteration
    modal — proposed branch name, the numbered branch/apply/stage/commit plan, the dirty-tree
    warning and its stash button — is deleted, along with the dirty indicator on the chip. Nothing
    in the mock now writes a branch, stages, commits or stashes. **The git flow is specified
    already (`branch-model.md`); drawing a mock of it settles nothing and invites re-litigating a
    flow that is not in question.**
  - **The Keep button stays, and does nothing.** Its presence, its per-node states and the `Kept`
    end state are node-chrome decisions (H2, I3) that outlive the git flow, so the control keeps
    its design and loses its action, exactly as the delete button already had.
- **V11 — Zoom-to-selection is removed from the view-controls pill.** It reads as a control invented
  to fill the space after a separator rather than one anyone reaches for; zoom in, zoom out and the
  percentage readout are the pill. This is a genuine spec delta — `shell-and-layout.md` specifies
  the pill as *"zoom-out · 100% · zoom-in · │ separator · zoom-to-selection"*.

## G. Specs sync — TODO (not done this pass)

Reflect the above into `.claude/specs/` (esp. `shell-and-layout.md`, `design-panel.md`,
`branch-model.md`). The canonical `.claude/specs/` files were **left untouched** and are the real
sync target — this file is the only record of the deltas. (The prototype's own in-page spec map
was deleted in L1 so there is exactly one spec source; anything it said that is not captured in
these sections is gone.) **Do not** deepen git-workflow (branch/stash/dirty-tree) specs in this pass.

---

# SPEC-SYNC LEDGER — every decision this session that contradicts `.claude/specs/`

Consolidated so the sync pass has one list to work from instead of re-reading sections A–V.
Each row is a decision already built in the prototype that the named spec still describes
differently. **The specs are stale wherever this table disagrees with them.**

Two rules for what earns a row. **A delta needs both sides:** if the "Was" column is not
actually in a spec file, the row is prototype history, not a spec change, and recording it
would smuggle a decision nobody made into the spec. And **the vocabulary here is the
product's, not the prototype's** — these rows get rewritten as React specs, so the mechanism
that produced them stays in the pass log above.

## `shell-and-layout.md`

| Decision | Was | Now | Ref |
|---|---|---|---|
| **The header is deleted entirely** | Header with project name + 5 icon buttons | **No header at all.** The shell is one full-height row: sidebar, canvas and right panel fill the viewport from top to bottom, with no strip above them | L2 |
| Project name | `/rewynd` in the header | **`rewynd`** in the **Library** head, replacing the word "Project". No leading slash — it is a project, not a path | L2, V7 |
| Preview light/dark switch | Header Sun/Moon | **CanvasToolbar**, bottom group below undo/redo | N4 (reverses M1) |
| Skills catalog entry point | Header wrench button | The Composer's **`/` picker**, via an `+ Add a skill…` row | L2, L5 |
| Model settings entry point | Header sliders button | A **row inside the model picker** | L2, L3 |
| **Clear all** | Header eraser → confirm dialog | **Removed outright.** Destructive and canvas-scoped; future home is a canvas right-click "Clear canvas" | L2 |
| Editorial page around the mock | Mock embedded in a documentation page | **Deleted.** `index.html` is the app, full-viewport | K1, L1 |
| In-prototype spec map | `spec-fold` / `specMap.js` describing each region | **Deleted.** `.claude/specs/` is the single source of truth | L1 |
| Canvas panning | (unspecified) | Middle-mouse drag, or Hand tool left-drag. **No scrollbar** — the board is translated, not scrolled | H4 |
| Help `?` button | 48×48 (matched to CanvasToolbar outer width) | **36×36**, accent-filled | M5 |
| Help popover contents | included "Submit a prompt" + "Discord community" | Those two removed; everything else kept | I4 |
| Tooltips | native `title=` | A custom pill: inverted accent fill, 6px radius, 12px text, arrow, dimmed unbracketed shortcut, positioned **outside** the surface it belongs to | K7, M2, M3, N3 |
| Tooltip content | one shape for everything | **Two shapes.** Plain pill by default; a **rich** variant (title + dimmed description + small artifact) only where the tooltip has to *teach* an affordance the label cannot state. Rich is for the unused state; once the mode is on, the plain verb | O1, P2 |
| Tooltips on labelled chips | — | **None.** A tooltip that restates visible text is noise (worktree chip, branch chip) | P3 |
| Tooltip while its popover is open | — | **Suppressed** — the trigger's tooltip hides whenever the surface it opens is showing (help button, model pill) | O2, P5 |
| **Right panel** | Design \| Agents tabs | **A `Styles` + `Variables` fold stack.** The tabs sit at the head's far edge, the collapse control on the inner edge. This is the only shell — the alternate layouts are deleted, not parked | U1, U2, U6, V1 |
| **The Tokens tab** | One of the left sidebar's three tabs (Layers / Primitives / Tokens) | **Moved to the right panel** as `Variables`, whose sub-folds are Colors, Radius, Type and Icons. The left sidebar keeps two folds, **Layers and Primitives**. *This is the largest single disagreement with the spec's "three-tab sidebar container"* | U1, U4 |
| **Design controls** | Six sections: Spacing, Typography, Colour, Border, Effects, Layout | Unchanged — the same six, now inside the `Styles` fold rather than loose in a tab | U3 |
| **Colour/token rows** | swatch left, name right | **Name left, control right**, grouped under the Tokens-tab headers, swatch doubles as a live colour picker that repaints the previews. `UNDEF` rows keep the dashed marker and get no picker | U4 |
| **Panel collapse** | Left sidebar is "docked, no collapse" | **Both flanks collapse Wonder-style**: the column goes to 0, the head survives as a floating pill, the canvas grows into the space and carries the toolbar rail with it. Never lost, only put away | U5 |
| Fold search | a row inserted under the header | **Takes over the header itself** — title becomes the field, magnifier becomes ✕, closing clears the query | U7 |
| Icons fold | search + add-package | **A set picker** (lucide / hugeicons / phosphor / tabler / heroicons). No search. Lives as a sub-fold of the right panel's `Variables`, not in the left sidebar | U8 |
| Panel scrolling | the whole column scrolls | **Accordion**: the fold stack fills the panel, open folds scroll inside themselves, every header stays on screen | U9 |
| Library footer hint | A per-tab "footer helper line" | **Deleted.** "Drag any item onto the canvas" restates what the drag handles already say | U11 |
| Panel widths | Left sidebar 280px; right panel unspecified | **Both flanks 280px**, written once as one value. The prototype had drifted to 306 (and 300 on the deleted rail); this aligns it *to* the spec | V2 |
| **Canvas workspaces** | One canvas, one board. No tab strip | **Unchanged — deferred.** The tabbed-workspace experiment (T1–T4) is removed from the prototype rather than parked: a first version cannot ship while the tab model is still being designed | V3 |
| **"The branch picker *is* the workspace"** | Checkout another branch and the board and its thread come with it | **There is no workspace concept and no picker.** With workspaces deferred, switching boards was the picker's only job, so the branch chip is a read-only label. The board is what is on the canvas, not a per-branch fixture | V10 |
| **Zoom-to-selection** | The view-controls pill is zoom-out · `100%` · zoom-in · separator · zoom-to-selection | **Removed.** The pill is zoom-out, the percentage readout, zoom-in. The control reads as one invented to fill space after a separator rather than one anyone reaches for | V11 |
| Composer context row | Worktree chip + branch picker always shown | **Shown only when the composer is docked on the canvas.** Inside an agent panel the rail head already states both | T5 |
| Tooltip connector | CSS triangle arrow | **A plain inverted pill with a rotated-square arrow.** The gooey blob connector (Q2/R2/R3) is retired, and with the last page that mounted its tuning panel deleted, the effect is gone from the prototype entirely | U10 (reverses Q2, R2, R3), V1 |

## `branch-model.md`

| Decision | Was | Now | Ref |
|---|---|---|---|
| **Worktree selector** | A dropdown to switch worktrees | **Removed.** The app runs on a **branch basis**; you pick a worktree by launching the app there. Context row shows a **read-only** current-worktree label | J1 |
| **Branch picker** | A control for choosing which branch you are on | **Also read-only.** Both chips in the context row report; neither switches. You change branch with git, and the app follows | V10 |
| **Git surface in the prototype** | Branch creation, staging scope, commit message, dirty-tree stop and its one-click stash | **None of it is mocked.** The keep-an-iteration modal and the dirty indicator are deleted. This is a **scope decision about the prototype, not a change to the flow** — `branch-model.md` keeps every one of those mechanics; the mock simply stops drawing them, because a picture of an already-specified flow settles nothing | V10 |
| Composer layout | model picker on the input row | Codex-style: context row on top, attachments, input, then a **flat footer** (no divider, no tint) with annotate + permissions left, model + send right | J2, K5 |
| **Permissions control** | `✋ Ask for approval` pill, 131px | **One-word chip, 67px**, tinted by blast radius (redundantly with the word, never colour alone). Chip and menu carry the *same* word; the explaining sentence is the tooltip and the accessible name. `Auto` and `Full` stay separate states | U12 |
| Attachments | labelled "Attachments" section | **No header label** — bare chips, matching the real `DockedChatBar` | K3 |
| **Effort levels** | One fixed list of effort values for every model | **Per model.** The ladder (`minimal / low / medium / high / max`) is a shared, ordered vocabulary; each model declares the subset it supports and the picker is rebuilt from the chosen model. Catalogue shape is `{ id, label, efforts[], defaultEffort }` per model, not a global enum | V9 |
| **Model picker** | A flat list of Claude models; effort a separate submenu | **Grouped by the coding agent that runs the model** (Claude Code / Cursor / Codex / Antigravity), heading names the agent so rows do not repeat it. Each row carries **that model's own default effort, dimmed**; picking a model applies it and moves the effort checkmark. Search field at the top, focused on open. The closed trigger always names the model — the effort word is an addition to it, never a substitute | V4 |
| **Reset to default** | Resets model *and* effort to a hardcoded pair | **"Reset effort to default"** — returns the effort to the *current model's* default, disabled (dimmed, not hidden) while it already is. Naming the scope is the point: with a per-model default there are two candidate defaults it could mean | V5 |
| Approval-mode explanations | — | **One line each.** They wrapped to two in the menu's width, which turned a four-item list into a paragraph stack | V6 |
| Git surface for v1 | Branch flow, worktree control, stash/dirty-tree handling | **Minimal.** Branch label + read-only worktree label only; the picker, stash and dirty-tree work stay parked — matching this spec's own Open section | J1, (confirmation) |

## `sidebar-tokens.md`

| Decision | Was | Now | Ref |
|---|---|---|---|
| **Click-to-copy token rows** | Copy the token value on click | **Removed.** Row is swatch + plain name only | J6 |
| Token name styling | mono, right-aligned, code-focused | Plain left-aligned sans — neutral, not code-focused | J6 |

## `sidebar-primitives.md`

| Decision | Was | Now | Ref |
|---|---|---|---|
| `cva` badge beside primitive labels | shown | **Removed.** The `cva` flag still decides which rows expand into variant/size chips; it just is not surfaced as a badge | M6 |
| Dialog / Sheet "overlay" disabled state | greyed rows + `Ban` icon + `draggable={false}` + portal warning tooltip | **Ordinary rows in the prototype — but this is the *target*, not a decision to sync yet.** The disabled treatment exists because preview containment is not built; `shell-and-layout.md` separately settles "listed but never mounted live". **Blocked on containment landing**, and explicitly *not* a decision that overlay primitives stay disabled forever | M6, V8 |

## `sidebar-layers.md`

| Decision | Was | Now | Ref |
|---|---|---|---|
| **Badges on layer rows** | node-count badge; later instance-count (`4`, `×n`) and conditional `?` chips | **All removed — treat as settled: no badges on layer rows.** Rejected twice (H8, then N5) | H8, N5 |
| Row anatomy | label + depth padding | Indent guides as real 1px rules per ancestor, chevron on parents only, six kind icons, dimmed rows for components that render no markup of their own (e.g. providers) | M7 |
| Demo data | `Pricing`/`PriceCard` toy tree | A realistic app render tree | M7 |
| Chevron target | icon-sized | **24×24 minimum**, `@click.stop` so it does not steal row selection. General rule for icon-only controls in dense rows | N6 |

## `design-panel.md` / `agent-vocabulary.md`

| Decision | Was | Now | Ref |
|---|---|---|---|
| Node chrome | persistent bars on the card | **Two-zone, selection-gated**: label row on top (+ ViewportSelector top-right), vertical round toolbar on the right | B1, B4 |
| Adopt on component nodes | disabled button | **Hidden.** Adopt renders on iteration nodes only | H2 |
| Kind / status badge chips | `original`, `editable`, `component`, `iteration N`, `text`, `reference`, failed pill | **All removed.** `NodeLabel` + green **Adopted** pill + fail-card content carry the meaning | I3 |
| Text node | note-like box | Plain ~20px black text, no background; selection shows an outline + four corner handles | H1, I5 |
| Element-inspection crumb | `PriceCard.p.text-xs` | `PriceCard.p` — **html tag or component name, never utility classes**; nested React component names win over tag names | H3 |
| Number fields | −/+ steppers | Horizontal drag-scrub on the value | C1 |

## Cross-cutting product decisions (not prototype-only)

- **`--max-budget-usd` is not exposed.** Removed from the settings modal, the request body, and
  `buildAgentArgs`. `--effort` stays. Both flags are real in the CLI; this is a product choice.
  Recorded in `CLAUDE.md`.
- **Claude Code is the only agent CLI *today*, as a maintenance choice — not an architectural
  commitment.** More agents are planned. Do not pre-build a provider registry; keep CLI knowledge in
  `shared/lib/agent-config.ts` and process concerns in `server/lib/spawn-agent.ts` so adding an agent
  stays contained. Recorded in `CLAUDE.md` + `AGENTS.md`.
- **Forced-light preview is fixable and currently is not fixed.** `preview-color-scheme-store.ts`
  says forcing light "cannot be fully undone in pure CSS". Half of that is avoidable: CSS custom
  properties inherit from the *nearest* declaring ancestor, so declaring a full light token block on
  `.light` (mirroring `:root`, which shadcn never needs because it only ever themes the document
  root) would make a light island inside a `.dark` host resolve correctly for **token-based**
  components. Only components styled with `dark:` **utility variants** stay broken, because
  `@custom-variant dark (&:is(.dark *))` matches any descendant of any `.dark` ancestor and CSS has
  no nearest-ancestor selector. Worth doing; not done.
- **ACP (Agent Client Protocol) is a live option, not a hypothetical.** Its value here is the event
  model, not provider-neutrality: `session/update` replaces hand-parsing `stream-json` in
  `claude-jsonl.ts`, `session/request_permission` makes the composer's permission pill real (today we
  hardcode `--dangerously-skip-permissions`), `fs/write_text_file` means *we* perform the writes and
  therefore know exactly which iteration files landed — which would delete both the belt-and-braces
  rescan and the "refresh variations" button. Blocking unknown: whether the adapter authenticates off
  the existing Claude Code subscription or demands an API key.

## Prototype-only simplifications the specs should NOT adopt

These exist because the mock is Alpine + a plain `<textarea>`, not React:

- Skill insertion writes a plain `/<skill-id> ` text token. The real app renders a **mention pill**
  via its contenteditable input.
- The `/` picker only opens when the `/` is at the end of the draft. The real one is caret-aware.
- The tooltip arrow is pinned to the pill's centre, so a viewport-clamped tooltip's arrow can drift
  off its trigger. Radix repositions the arrow independently.
- The Skills modal and the Model-settings modal are placeholders, not ports of
  `SkillsCatalogModal.tsx` / `ModelSettingsModal.tsx`.
- **`+ Add a skill…` in the `/` picker is a proposal, not existing behaviour** — the real app mounts
  the picker with `showAddSkillButton={false}`. The row already exists in
  `impeccable-skill-picker.tsx`; enabling it is the whole change.

## Which spec owns what

Every decision above needs exactly one home. Existing files cover most of it; four surfaces have
accumulated more settled design than any current spec owns, so the sync pass creates them. Each new
file follows the shape the others already use: **Settled → As the code is today → Open → ROADMAP →
Context absorbed**, where `As the code is today` describes the *real* codebase and never the mock.

- **`composer.md`** — the densest surface in the product and currently ownerless: `branch-model.md`
  specifies two of its chips, `shell-and-layout.md` specifies where it sits, nothing specifies the
  rest. Owns the top-to-bottom layout, the flat footer, the model/effort picker, the `/` skill
  picker, the annotations button, and the one-object-two-placements rule.
- **`canvas-nodes.md`** — node chrome, currently smeared across `design-panel.md` and
  `agent-vocabulary.md`. Owns the two-zone selection-gated chrome, the no-badges rule, Adopt
  visibility, the failure card, and text-node behaviour.
- **`ui-conventions.md`** — cross-cutting rules that were each decided once and then re-litigated:
  tooltip shape and timing, the two tooltip shapes, tooltip suppression while a surface is open,
  popover-and-trigger-as-one-object, the 24×24 dense-row hit area, accent discipline, and the
  shared elevation recipe below.
- **`agent-panel.md`** — the right panel's agent side: run header, the timeline of tool events, and
  the thread. `agent-vocabulary.md` keeps ownership of *how the agent speaks*; this file owns *how
  that is laid out*.

**The shared elevation recipe.** One card surface — white fill, a 1px border, a soft low shadow,
rounded corners — used by the panels, the collapsed pills, the canvas toolbar and the zoom pill
alike. This is load-bearing rather than cosmetic: sharing the surface is what makes a collapsed
panel's pill read as *the panel folded up* rather than as a separate control. A collapsed affordance
that looks like new chrome has failed at its one job.

**How to check the sync landed.** Grep the specs for text it supersedes — `header`, `Clear all`,
`current checkout`, `click-to-copy`, `cva` badge, `count badge`, `worktree control`,
`variant-*.html` — and confirm every hit is gone or explicitly framed as superseded. Each decision
lands in exactly one file, with cross-references instead of restatement.

## Prototype build traps → `papercuts.md`

The Alpine/Tailwind failure modes this prototype taught us (silent `x-for` root dropping,
unquoted tooltip expressions, abspos grid children, focusing through `x-show`, upward
submenus) live in **`.claude/prototype/papercuts.md`**. They are notes for whoever next
edits the mock, **not spec content** — none of them survive the port to React.

---

# FUTURE — attachment→composer citation morph (not built, design not settled)

**The idea.** Attachments start as chips in the composer's attachment bar. As the user writes and
*cites* one, that chip leaves the bar and becomes an inline reference inside the prompt text. When
the last chip has been cited, the attachment bar — header and all — **disappears**, because
everything it held now lives in the sentence.

Worked example. Attached: `image1`, `image2`, `component1`. The user types:

> use this component

…and `component1` is consumed: removed from the attachment bar, written into the composer as an
inline citation carrying its context. Same for `image1` and `image2` as they get referred to. The
bar shrinks chip by chip and then is gone.

**Why it is worth building.** The attachment bar and the prompt currently say the same thing twice —
the chips are context, the sentence is context, and the user has to hold the mapping in their head.
Morphing collapses the two into one artifact and makes "what exactly is this prompt made of"
readable in a single line. It also removes a whole class of mistake: attaching something and never
referring to it, or referring to something that was never attached.

**The unsolved part is the matching.** Deciding that "this component" means `component1` is the
crux, and there are two families of answer:

- **Deterministic.** Explicit citation only — `@` mention, click-a-chip-to-insert, or typing the
  chip's name. Predictable, instant, no cost, no failure mode. But it cannot resolve natural phrasing
  like "this component" or "the second screenshot", which is exactly the wording people reach for.
- **A small fast model.** Resolve references as the user types. Handles natural phrasing, but needs
  to be fast enough to feel like an editor rather than a request, and it can be wrong — which means
  it needs a visible, cheap undo, because silently consuming the wrong attachment is worse than not
  consuming any.

A likely resolution is both: deterministic explicit citation as the guaranteed path, with model-based
resolution as an *offer* — the chip highlights and the user confirms rather than the editor mutating
the prompt on its own. That keeps a wrong guess to a declined suggestion instead of a corrupted
prompt. **Not decided.**

**Decided (answers to the four open questions):**

1. **A citation is an atomic pill.** It is not editable prose. Backspace at its trailing edge deletes
   the whole pill, and the caret never lands inside it. This is the same object the `/` skill picker
   should eventually insert (see the prototype-only note about the plain-text `/<skill-id>` token) —
   one mention-pill primitive serves attachments, skills and `@` node tags.
2. **Deleting a citation returns its chip to the attachment bar.** The morph is reversible in both
   directions, which is what makes it safe to do automatically: a wrong consumption costs one
   backspace and the chip is back where it was. If the bar had already vanished it reappears.
3. **The agent receives the citation inline.** The prompt string carries the reference in place — the
   sentence *is* the payload, not a sentence plus a side-channel list. This is the whole point of the
   morph: one artifact, readable in one line, with no second structure to keep in sync. (Binary
   attachments still travel as base64 in the request body; what goes inline is the *reference*, so the
   model sees where in the sentence each image or component belongs.)
4. **The bar returns on a new attachment.** It is bound to "chips not yet cited", so it is present
   exactly when that set is non-empty, and empty is what makes it disappear. Nothing special happens
   on the transition back.

Still open: the matching strategy (deterministic vs. small model), unchanged by the above. Note that
answer 2 makes the model-based path meaningfully safer — a wrong guess is one keystroke from undone —
so "auto-consume with cheap undo" is now a more credible option than it was.

---

# RESEARCH — a more concise permissions picker (Pass 14; shipped as U12)

The Codex-style pill ("✋ Ask for approval", 18 characters) is the widest thing in a 300px composer
footer that also has to carry annotations, model+effort and send. Researched across 16 shipping
agent tools via Exa. Findings that constrain the redesign:

- **Three is the modal state count** for the composer-visible risk axis (Codex CLI, Cursor Run
  Modes, Copilot, Zed, Devin Desktop all land on 3). Claude Code's full picker reaches 5–6.
- **"Auto" is never collapsed into "Full access."** Universal across every tool that has both —
  Codex, Claude Code, Copilot, Cursor, Devin all keep the reviewed-autonomy state and the
  no-review state separately named and separately gated. **Do not merge them to save width.**
- **Read-only/plan splits ~50/50** between living inside the permission control (Codex, Claude
  Code) and being a separate task-type selector (Cursor, Windsurf, Devin, Zed).
- **No shipping precedent** was found for icon-only, single-letter chips, a bare colour dot, an
  inline segmented toggle, or folding permissions into the model picker. Every tool with both a
  model picker and a permission control keeps them independently visible.
- **A colour-only indicator fails WCAG 1.4.1** (failure technique F81) — any colour cue needs a
  redundant shape or word.
- **Real precedent does exist** for moving the *fine-grained* dial into settings (Windsurf, Zed,
  Cursor) — but in every case a coarser mode stayed visible at the point of use. Nothing found
  removes all signal from the composer.
- Two documented incidents (PocketOS/Cursor 2026-04, Replit/SaaStr 2025-07) show the mitigations
  that actually worked were **structural** — hard-coded destructive-action circuit breakers,
  dev/prod separation, rollback — not better labelling. **A concise control must not become the
  only safeguard.**

**Shipped as U12:** a one-word tinted chip (131px → 67px), colour redundant with the text, opening
the existing menu. Keeps a legible word at rest — which every GUI tool surveyed does. All four
states kept, since read-only splits ~50/50 across the industry and we have no separate task-type
control to move it into.

*(The pass-14 comparison table and its cited URLs were written to a session scratchpad that
no longer exists; the findings above are the surviving record.)*

---

## Prototype simplifications worth knowing

- "One Composer" is implemented as one shared `chat` store rendered in two placements gated by
  `x-show` on `isComposerEmbedded`; only one is visible at a time, so it reads as a single relocating
  Composer.
- Annotation count, permission mode, branch, worktree (read-only string) and model are simulated client state — no
  real files, agents, or git are touched.
