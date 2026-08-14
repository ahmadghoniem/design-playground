# Spec-sync plan — bringing `.claude/specs/` up to the prototype

**Goal.** Make `.claude/specs/` describe the UI/UX the prototype actually demonstrates. The prototype
has no backend wired in, so this pass syncs **shape, vocabulary and interaction** only — nothing about
generation mechanics, discovery, or git execution changes here.

**Source of record.** `.claude/prototype/pickoff.md` — sections A–P plus the SPEC-SYNC LEDGER. Every
item below cites its pickoff ref. Where this plan and pickoff disagree, pickoff is right and this plan
is stale.

**Shape of each spec file** (do not invent a new format): `Settled` → `As the code is today` →
`Open → ROADMAP` → `Context absorbed`. Prototype decisions land in **Settled**. Anything the prototype
raised but did not answer lands in **Open**. `As the code is today` is about the *real* codebase and
must not start describing the prototype.

**One rule for this pass:** the prototype is a design artifact, not an implementation. A spec bullet
should state the decision and the reason, never "as in `composer.html`".

---

## 0. Decision gate — blocks §1 and §7

Two entry pages now exist and only one of them can become the spec:

| | `index.html` | `variant-agent-right.html` |
|---|---|---|
| Composer | floats bottom-centre over the canvas | pinned to the bottom of the right rail |
| Right panel | Design \| Agents tabs, 306px | agent only, 380px, no tabs |
| Design controls | always one click away | **absent** |
| Cost | the composer covers canvas you are looking at | you lose the style panel entirely, or it needs a new home |

`shell-and-layout.md`'s current Settled section explicitly argues for the first shape ("you type where
your eyes are, you read history where panels live"). If the variant wins, that argument is superseded
and has to be replaced with a stated reason, not silently dropped.

**Nothing in §1 or §7 gets written until this is picked.** Everything else in this plan is
layout-independent and can proceed immediately.

---

## 1. `shell-and-layout.md` — the largest edit

### Rewrite these Settled bullets

| Bullet today | Becomes | Ref |
|---|---|---|
| "Header carries a preview light/dark toggle" (whole bullet) | **There is no header.** The shell is one full-height row: Library, canvas, right panel | L2 |
| Theme table row "Toggle: header Sun/Moon" | Toggle lives in the **CanvasToolbar**, bottom group below undo/redo | N4 (reverses M1) |
| "As the code is today: Header already matches the settled shape" | Rewrite — the header exists in code and is being deleted; the Sun/Moon button is what survives, relocated | L2, N4 |
| Canvas toolbar bullet | Add the theme toggle to the rail's described order; keep the ~32px/16px sizing target, which the prototype follows | N4 |
| "Help & Resources `?` button" | Promote from a pointer-at-`image.png` to settled contents (below) | I4, M5, O2 |

### Add these Settled bullets

- **Every header control got a better home, or was deleted.** Record the four outcomes with reasons,
  because each is a general principle, not a one-off: preview toggle → CanvasToolbar (it is a canvas
  concern); model settings → a row **inside** the model picker (settings belong to the control they
  configure); skills → the Composer's `/` picker (you reach for a skill while writing a prompt);
  **Clear all → deleted outright** (destructive, canvas-scoped, and a header is the wrong place for
  either) — its future home, if any, is a canvas right-click. (L2, L3, L5)
- **Refresh variations is not rebuilt.** It is a manual patch over an iteration-scan reliability gap.
  Recording *why* it is gone matters more than the removal — see §9, ACP. (assessment)
- **Help & Resources popover — settled contents.** Docs ↗, Keyboard shortcuts, Give feedback,
  Contact us ↗, divider, What's new (2 entries, date right-aligned), View all. "Submit a prompt" and
  "Discord community" are dropped. 196px wide, accent-filled to match the `?` trigger and the
  composer's send button — **the popover and its trigger are one object and must read as one
  surface.** The trigger's own tooltip is suppressed while it is open. (I4, M5, O2)
- **Project name lives in the Library head**, replacing the word "Project". No `+` button — the
  Library is fed by discovery, so there is nothing to add by hand. (L2, K6)
- **Canvas panning is middle-mouse drag or Hand-tool left-drag.** No scrollbars; the board moves by
  `transform: translate`. (H4)

### Move to Open

- The forced-light preview asymmetry, with the finding attached: declaring a full light token block on
  `.light` makes a light island inside a `.dark` host resolve correctly for **token-based** components,
  because custom properties inherit from the nearest declaring ancestor. Only `dark:` **utility
  variants** stay broken (`&:is(.dark *)` has no nearest-ancestor semantics). This is a correction to
  `preview-color-scheme-store.ts`'s "cannot be fully undone in pure CSS" comment, which is half wrong.
  Worth doing; not done. (ledger, cross-cutting)

---

## 2. `branch-model.md`

| Bullet today | Becomes | Ref |
|---|---|---|
| "The worktree control **is** where the agent runs" — a selector defaulting to the current checkout | **The worktree is read-only.** No selector. The app runs on a branch basis; you choose a worktree by launching the app in it. The composer shows which worktree you are in as a plain labelled chip | J1 |
| "Decision for v1: forward-looking selector" | Delete. The reasoning survives in Open (worktree-per-session orchestration); the *control* does not | J1 |
| — (new) | **The chip is named, not described.** It carries the worktree's directory name (`rewynd`), because a git worktree **is** a directory. `current checkout` named a state and answered the wrong question | P4 |
| "Model, Edit/Explore, and skills stay as they are today" | Superseded by the new `composer.md` (§5) — replace with a pointer | J2, K5 |

Everything about branch **naming**, staging scope, and the phase-1 flow is unchanged and correct.

---

## 3. `sidebar-tokens.md`

| Bullet | Change | Ref |
|---|---|---|
| Click-to-copy token rows | **Removed.** A row is a swatch and a plain name | J6 |
| Token name styling | Plain left-aligned sans — neutral, not code-focused | J6 |

Undefined tokens still render struck-through and unpickable — unchanged, and the prototype shows it.

## 4. `sidebar-primitives.md`

| Bullet | Change | Ref |
|---|---|---|
| `cva` badge beside primitive labels | **Removed.** The `cva` flag still decides which rows expand into variant/size chips; it is not surfaced as a badge | M6 |
| Dialog / Sheet disabled "overlay" state | **Removed** — greyed rows, ban icon and portal-warning tooltip all go. They are ordinary rows | M6 |

> **Keep the underlying rule, which did not change:** overlay/portal primitives stay listed and are
> never mounted live (`CLAUDE.md` gotcha). Pass 6 removed the *warning UI*, not the constraint. Say so
> explicitly, or someone will read the removal as permission.

## 5. `sidebar-layers.md`

| Bullet | Change | Ref |
|---|---|---|
| Node-count badge (and later instance-count / conditional chips) | **All removed. Settled: no badges on layer rows** — rejected twice | H8, N5 |
| Row anatomy | Indent guides as real 1px rules per ancestor; chevron on parents only; six kind icons (layout/layers/box/chart/table/primitive); dimmed rows for components that render no markup of their own | M7 |
| Chevron target | **24×24 minimum**, `@click.stop` so it never steals row selection | N6 |
| Demo/reference tree | A realistic app render tree, not a toy `Pricing`/`PriceCard` pair | M7 |

---

## 6. `design-panel.md`

| Bullet | Change | Ref |
|---|---|---|
| — (new) | **Number fields are drag-scrubs, not steppers.** Horizontal drag on the value; the value shows dirty state | C1 |
| Viewport controls | They live **on the node**, not in the panel. The Design panel is style properties only | B2, B3 |
| Signage line | Keep, but the breadcrumb is `PriceCard.p` — **html tag or component name, never utility classes**; a nested React component name wins over the tag name | H3 |
| Row/section measurements (absorbed from TailwindEditor) | Unchanged — the prototype follows them | — |

Everything about class-name editing, token-aware colour, breakpoint mapping and write-back is
untouched. The prototype demonstrates none of it (no backend), so this spec stays mostly as-is.

---

## 7. NEW — `canvas-nodes.md`

Node chrome has accumulated more settled design than any single existing spec owns, and it is
currently smeared across `design-panel.md` and `agent-vocabulary.md`. Give it a file.

**Settled:**
- **Two-zone, selection-gated chrome.** A label row on top (NodeLabel left, ViewportSelector right)
  and a vertical rounded toolbar on the node's right edge. Chrome appears with selection/hover, not
  permanently. (B1, B4)
- **No kind or status badge chips.** `original`, `editable`, `component`, `iteration N`, `text`,
  `reference` and the failed pill are all removed — the NodeLabel, the green **Adopted** pill and the
  fail card's own content already carry the meaning. (I3)
- **Adopt is hidden on component nodes**, not disabled. It renders on iteration nodes only. (H2)
- **The failure card stays on the canvas** showing the reason (`token not in host`), the offending
  detail, and a retry action — a failed generation is visible, not hidden. Cross-ref
  `agent-failures.md` for which failures are named. (I3)
- **Text nodes are plain text**, ~20px, no background; selection shows an outline and four corner
  handles. **No freeform drag-resize** on component and iteration nodes. (H1, I5, `6cef11a`)
- **The rail's delete button is per-node**; there is no canvas-wide clear. (L2)

**Consequence to record in `agent-vocabulary.md`:** its Settled bullet says "the prompt builder and
the canvas badge both read the same object." **The canvas badge no longer exists** (I3). The shared
vocabulary object is still right — it is what keeps prompt labels honest — but it now has one
consumer, and the bullet's argument needs restating rather than deleting.

---

## 8. NEW — `composer.md`

The Composer is the densest surface in the product and currently has no owner: `branch-model.md`
specifies two of its chips, `shell-and-layout.md` specifies where it floats, and nothing specifies the
rest.

**Settled:**
- **Layout, top to bottom:** context row (worktree chip, branch chip, Edit/Explore segment) → bare
  attachment chips → input → **flat footer**. The footer has no divider and no tint — it is not a
  separate surface, it is the bottom of the input box. (J2, K5)
- **No "Attachments" label.** Bare chips. (K3)
- **Footer contents:** annotations toggle and approval-mode pill left; model+effort picker and send
  right. (J2, K5, L3)
- **One picker for model and effort**, effort rendered dimmed after the model name; the picker
  contains a Model row, an Effort row, **Model settings**, and Reset to default. (L3)
- **The model pill morphs to the picker's width on open** and shrinks back on close, so trigger and
  popover read as one surface. Its tooltip is `Select model` and is suppressed while open. (P5, P6)
- **`/` opens the skill picker** in the input: a flat skill list, a nested sub-list for grouped skills
  with a `‹ back` header, and an `+ Add a skill…` row that opens the skills catalog. **This row is a
  proposal** — the real app mounts the picker with `showAddSkillButton={false}`; enabling it is the
  whole change. (L5)
- **The annotations button teaches when unused and acts when used** — rich tooltip (title, dim
  description, small artifact) at zero; plain `Disable annotations` once on. (O1, P2)
- **The Composer is one object with two placements**, not two composers. Same draft, same thread,
  same state; expanding relocates it. (D6)

**Open → ROADMAP:**
- **Attachment → citation morph.** Chips leave the attachment bar as they are cited in the prompt;
  when the last one is consumed the bar disappears. Four sub-decisions are settled: a citation is an
  **atomic pill**; **deleting it returns the chip to the bar**; the agent receives the citation
  **inline** in the prompt; **the bar returns on a new attachment**. What is **not** settled is the
  matching strategy — deterministic explicit citation (predictable, cannot resolve "this component")
  versus a small fast model (handles natural phrasing, can be wrong). Reversibility makes the model
  path safer than it first looked. Also note that the atomic-pill primitive is shared with the `/`
  skill picker and `@` node tags — one primitive, three producers. (pickoff FUTURE)
- **Approval mode is UI-only today** — the server hardcodes `--dangerously-skip-permissions`. The pill
  cannot become real without a permission round-trip; see §9. (J2)

---

## 9. NEW — `agent-panel.md`

Owns the right panel's agent side: the run header (title, worktree + branch meta, progress), the
**timeline** of tool events, and the **thread** of prompt bubble + Thought/Read/Wrote steps.
`agent-vocabulary.md` keeps ownership of *how the agent speaks*; this file owns *how that is laid out*.

Blocked on §0 for the container question only — the internal shape is layout-independent.

**Add to Open (and to `.claude/ROADMAP.md`) — ACP:**
Adopting the Agent Client Protocol would change three settled mechanics, so it is recorded as an open
option with its consequences rather than as a decision:
- `session/update` replaces hand-parsing `stream-json` in `claude-jsonl.ts` — this touches
  `agent-vocabulary.md`'s "Delivery: parse the output stream we already read" bullet. Do **not** edit
  that bullet; annotate it as under review.
- `session/request_permission` is what would make the approval pill real.
- `fs/write_text_file` means the client performs the writes and therefore knows exactly which
  iteration files landed — which deletes both the belt-and-braces rescan **and** the refresh-variations
  button (§1).
- **Blocking unknown:** whether the adapter authenticates off the existing Claude Code subscription or
  demands an API key. Everything above is contingent on that.

---

## 10. NEW — `ui-conventions.md`

Cross-cutting rules that now exist and have no home. Small file, high value — each of these was
decided once and then re-litigated.

- **Tooltips.** Custom pill, inverted accent fill, 6px radius, 12px text, 700ms open / 300ms
  skip-delay. Shortcuts are **dimmed and unbracketed**, never in parentheses. (K7, M2, M3)
- **The connector is a gooey blob, not a triangle.** A circle merged into the pill through a concave
  fillet, via an SVG goo filter on a shape-only layer with the text painted above it unfiltered.
  Protrudes 8px with 8px of overlap — the overlap is what makes it a fillet instead of a dot. (Q2)
- **Tooltips clear their surface.** Placement is measured from the nearest `[data-tip-boundary]`
  ancestor, so a tooltip on a toolbar button sits outside the *toolbar*, not on it — while still
  centring on the trigger. Offset 8px. (M3, N3)
- **Two tooltip shapes.** Plain by default. **Rich** (title + dimmed description + small artifact)
  only where the tooltip has to teach an affordance the label cannot state — and only in the state
  where the user has not used it yet. (O1, P2)
- **No tooltip on a control that already shows its own label.** Restating visible text is noise. (P3)
- **A trigger's tooltip is suppressed while the surface it opens is showing.** (O2, P5)
- **A popover and its trigger are one object** and share a fill; if they read as different colours,
  suspect shadow weight and unsettled transition opacity before suspecting the token. (M4, O2)
- **Icon-only controls in dense rows get a 24×24 minimum hit area**, glyph size unchanged, with
  `@click.stop` so they do not steal the row's own click. (N6)
- **Accent** (`--pgc-accent`) is the composer's send button, the help `?` button and its popover, and
  the tooltip fill — one accent, used sparingly, never as decoration. (M4)
- **Colours never live in TS.** They belong in the `--pg-*` token layer; a colour in a `.ts` file
  cannot respond to theming. (`CLAUDE.md`, restated because it keeps happening)

---

## 11. Not touched by this pass

- `discovery-engine.md` — the prototype has no discovery surface. Unaffected.
- `agent-failures.md` — unaffected except the one cross-ref from §7.
- `00-cleanup-preliminary.md` — a status document, not a design spec.
- **Git workflow depth.** Branch/stash/dirty-tree mechanics stay exactly as `branch-model.md` has
  them. The prototype's branch modal is a mock of a flow that is already specified; it is not evidence
  for changing it.
- **`--max-budget-usd` removal and the multi-agent positioning** are already recorded in `CLAUDE.md`
  and `AGENTS.md`. They are product decisions, not spec-file content — do not duplicate them here.

---

## 12. Sequence

1. **§0 decision.** Pick a layout. Everything else is unblocked already.
2. **Existing-file edits** (§1–§6) — these are corrections to stale text and can go in one pass.
3. **New files** (§7–§10) — each is new prose, so they are the slow part; write them in the order
   `composer.md` → `canvas-nodes.md` → `ui-conventions.md` → `agent-panel.md`, since the first two are
   the ones other specs will start pointing at.
4. **ROADMAP entries** — ACP, the `.light` token block, the citation-morph matching strategy.
5. **Retire the ledger.** Once §1–§10 land, delete the SPEC-SYNC LEDGER from `pickoff.md` and leave a
   line saying the specs now carry it — otherwise it becomes a second source of truth, which is the
   exact failure that got `spec-map.html` deleted.

## 13. How to check it landed

- Grep the specs for text this plan supersedes: `header`, `Clear all`, `current checkout`,
  `click-to-copy`, `cva` badge, `count badge`, `worktree control`. Each hit should either be gone or
  be explicitly framed as superseded.
- Every prototype decision in pickoff A–P appears in exactly one spec file. No decision in two files;
  cross-refs instead.
- No spec file's `As the code is today` section describes the prototype.
