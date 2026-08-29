# Pickup — prototype changes awaiting a spec home

Working notes for the uncommitted prototype work on `chore/cleanup-preliminary`. Everything
below lives in `.claude/prototype/` only; no product code changed.

**How to use this.** `AGENTS.md` holds the rule that governs the sync: *a delta needs both
sides* — before recording "X was A, now B", A has to already be written down in a spec, doc,
or the code. A change measured against a prototype draft is prototype history, not a spec
delta. So this file sorts the work by **what the specs already say**, not by feature:

- **§A** reverses a line a spec already settles. These are decisions, and each needs an
  explicit rewrite of that line — not a quiet edit.
- **§B** answers a question a spec already parks under Open.
- **§C** is surface no spec covers. New Settled candidates.
- **§D** is prototype mechanism. It must not reach a spec.
- **§E** is the reasoning behind the choices, so whoever writes the spec has the *why*.
- **§F** is what is still undecided.

The specs read their "As the code is today" sections from `master`. Prototype work fits none
of the three sections — it can only enter as a new **Settled** line or a new **Open**
question.

---

## §A — Reverses a settled line

### A1. The Composer's box is now a shell with a nested card

`composer.md` settles:

> **Top-to-bottom layout:** context row, attachments, input, then a **flat footer** — no
> divider, no tint.

The prototype has none of that shape. The box is a **shell** carrying a washed ground; the
composing area (attachments, input, footer) is a **card** nested inside it with its own
hairline and a concentric radius; and the ground shows above and below the card as two
strips. The line you read between card and strip is the card's own border turning up into
its corners.

Three clauses of one settled line are contradicted: the context row is gone, there is a
divider, and there is a tint. The footer itself is still flat.

Anchors: `src/app.css` `.chat-dock .chat-box` / `.chat-dock .composer-body`,
`src/partials/composer.html` `.composer-body`.

### A2. The context row is gone; its content is a bottom strip

`composer.md` settles:

> **The context row shows only when the Composer is on the canvas floor.** Inside the
> Agents tab the RunHeader already states Worktree and Branch, so repeating them is noise.

The row itself no longer exists. Worktree and Branch are now plain text in a strip **below**
the card, alongside a diff stat (see C1). The placement rule survives and was deliberately
honoured — the strip is gated to the canvas floor, and the Agents tab gets the diff on its
RunHeader instead — but the surface the rule describes is gone, so the line needs rewriting
rather than keeping.

Anchors: `src/partials/composer.html` `.composer-strip`, `src/partials/design-agents.html`
`.act-meta`.

### A3. ComposerMode is deleted

`composer.md` settles:

> **ComposerMode is Edit or Explore**, Explore asking for several iterations from one prompt.

Removed from the prototype. The premise: the model can read intent from the prompt and route
itself, defaulting to **3 iterations** when the user names no number.

This is the largest product claim in the whole diff and the one to be most careful about.
Dropping the control also removed the only surface where the iteration count was correctable
— inference now has no visibility and no override. `composer.md`'s "As the code is today"
records ComposerMode as **built** on `master`, so this is a deletion of working behaviour,
not of a plan.

### A4. Variables moved back to the left, as Tokens

`shell-and-layout.md:33` settles:

> **Library** — two folds, **Layers** and **Primitives**. Variables moved to the RightPanel
> entirely.

The prototype moves it straight back: the Library now has **three** folds — Layers,
Primitives, **Tokens** — and the fold carries its Colors, Radius, Typography and Icons
sub-folds intact.

This one reverses a documented past migration, so the spec should record *why the reversal*,
not just the new position. Flagged by the user as provisional ("for now").

Knock-on: `design-variables.md`'s own scope line reads *"The **Variables** fold of the
RightPanel's Design tab"* — the whole file's subject moves to the Library. Its Settled body
(groups, row anatomy, `UNDEF` treatment, one-scheme swatches, no count header) is unaffected
and carries across as-is.

Anchors: `src/partials/library.html`, `src/components/library.js`.

### A5. There is no Styles fold

`design-styles.md` settles:

> **Six sections inside the Styles fold, in this order:** Spacing, Typography, Colour, Border
> & shape, Effects, Layout. Rest folded away.

The fold wrapper is gone. The six sections sit directly in the Design tab, each keeping its
own independent collapsibility. With Variables also gone (A4), the Design tab now has **no
top-level folds at all** — it is the breadcrumb followed by the sections.

The section list, order, and rest-folded rule are all unchanged. Only the container is.

Anchors: `src/partials/design-agents.html`.

---

## §B — Answers a spec's Open question

### B1. The write-back mechanism

`design-styles.md` parks this under **Open**:

> **The write-back mechanism.** Candidate shape: an override slot, `className={cn("p-4",
> editParam)}`, live while dragging and flattened on save. Not decided — unproven, and it
> blocks the panel.

The prototype commits to exactly that candidate and gives it a control. Panel edits ride as a
second argument to `cn()` while you work; **Apply** flattens them into the literal string
inside the double quotes, letting `cn()`'s merge dedupe conflicting utilities.

Design decisions layered on top:

- **Apply is per-element.** One badge, one element, one write — each element has its own
  `className`, so each Apply is its own edit to its own line.
- **No agent is involved.** This was mis-specced during the session as a send-to-composer
  action and corrected: the change doesn't need an agent to implement it.
- **After Apply** the pills clear and the applied state becomes the element's new baseline.
- **Undo** counts Apply as a step on the canvas undo stack.

What this does **not** answer — both stay Open in `design-styles.md`, and neither is touched
by the prototype:

- **Reading a `className` the panel doesn't understand.** A real shadcn component's class
  string is a runtime expression, not a literal. The prototype has literal strings only.
- **Alt-click gives a DOM node; editing needs a JSX attribute.** No source mapping exists.
  The prototype's three elements are hardcoded, so it never has to locate anything.

The spec also notes a read-side class parser is required regardless, since `tailwind-merge`
only covers the write side. Still true; still unbuilt.

---

## §C — New surface, no spec covers it

### C1. The Composer reports how much has changed

The bottom strip shows `+56,466` / `−2,809` beside Worktree and Branch.

`branch-model.md` owns Worktree and Branch and settles them as **read-only labels** that
"report and never switch" — but says nothing about reporting the *size* of the change. "The
Composer reports how much has changed, not only where" is a new claim, and it belongs in
`branch-model.md` with the git state rather than in `composer.md` with the layout.

Two figures rather than a net one, deliberately: a single number can't say whether a run
mostly added or mostly deleted, which is the thing you glance at the strip to learn.

### C2. The RunHeader gains the same figures

`agents-tab.md:9` settles the RunHeader as *"title, Worktree, Branch, a progress indicator,
and a one-line summary."* The diff stat is now a sixth item. Added so that gating the
Composer's strip out of the Agents tab doesn't lose the information.

### C3. The bottom strip is collapsible

The user decides whether the worktree/branch/diff line is visible at all. The control is the
**line between the card and the strip** — hover it for a tooltip, click to fold; the same
edge brings it back, so the control is never orphaned by its own action. Persists for the
session.

Nothing in `composer.md` or `shell-and-layout.md` covers Composer-internal collapse.

### C4. The Composer asks questions inline

A **top strip**, same material as the bottom one, rendering an AskUserQuestion turn: a title,
radio options, a `Question N of 3` counter, and Skip. Answering advances; after the last one
the strip holds a single `Answered · N of 3` row.

The eventual resting state of this strip is a **task list** — rows with status markers, the
active row carrying a counter and a chevron that expands the rest. That model is settled but
**not built**; only the question state exists.

Canvas-floor only. Nothing in `composer.md` covers a question surface, and `agents-tab.md`
has no question event in its timeline.

### C5. The Composer is resizable

A corner grip at the box's **top-left**: drag to set width and height, double-click to reset.
Quiet until the Composer is hovered.

No spec covers Composer sizing. Note this cuts against the grain of `canvas-nodes.md:24` —
*"No freeform drag-resize on component or iteration nodes"* — which is a different surface,
but if drag-resize becomes something the product does, the two specs should agree on where
it's allowed and why the Composer is the exception.

### C6. Style values are per-element

`design-styles.md` never says whether a control's value is scoped to the selection. The
prototype found the answer the hard way: with one global set, scrubbing the card's padding
and then selecting the Button showed the Button already wearing `p-6`, marked as changed, on
a control nobody touched.

Now: **one set of values per selected element**, lazily created from the defaults, keyed by
the breadcrumb path (`PriceCard`, `PriceCard.Button`). "Changed" means changed from *that
element's* baseline, so a freshly-selected element is always clean.

Consequence worth specifying: there is no longer any global "everything I've touched across
this component" view. Nothing needed one yet.

### C7. Pending edits are shown beside the selection's name

On the Design tab's breadcrumb row: the name, then one pill per pending class
(`rounded-2xl`, `p-6`), then a `›` Apply button. Pills are green for *staged, not yet
written*; they clear on Apply.

**This belongs in the panel, not on the canvas.** It was built on the canvas first — a badge
pinned to the selected element — and moved after review. The panel is better: the pills sit
next to the name they belong to, they don't cover the design being judged, and they don't
have to fight the preview frame's clipping. Worth recording so it isn't re-proposed.

---

## §D — Prototype mechanism, do not sync

- **The seam lab** (`src/components/seam-lab.js`, `src/partials/seam-lab.html`, and its
  wiring in `index.html` / `main.js` / `proto.js`) is a dev scratch dial for comparing
  variants. It writes CSS custom properties onto `:root` and two behavioural flags onto an
  Alpine store; the stylesheet declares its own fallbacks, so pulling the widget leaves the
  design standing. It has no product equivalent.
- **`--nest-inset`, `--mp-*`** and the SVG-mask channel technique behind the ModelPicker's
  seam. The seam's *shape* is settled in `composer.md`; how the prototype draws it is not.
  The existing source comment already says so.
- **Alpine specifics** — store shapes, `data-partial` loading, `x-if`/`x-show` choices,
  scope chains. React equivalents share none of this.
- **Hex values** — `--pgc-wash`, `--pgc-add`, `--pgc-del`, `--pgc-pending`. What syncs is
  that these are *token-layer* concerns; the numbers are the prototype's.
- **Renames** — `.branch-lbl` → `.act-branch`, `.chat-ctx .gl` → `.gl`.

---

## §E — Decisions and their reasoning

Kept because the reasoning is the part that doesn't survive a diff.

| Decision | Why |
|---|---|
| Strip below the input, not pills above it | The old row said three unrelated things in three visual weights, implying three kinds of thing when only one was interactive. One weight, one job. |
| Two figures for the diff, not a net number | A net number can't distinguish a run that mostly added from one that mostly deleted. |
| Answering advances rather than batching | The counter already promises a sequence; a static mock breaks that promise immediately, and advancing stress-tests the composer's top edge moving between questions of different lengths. |
| The boundary line is the collapse control | A chevron on the strip disappears with the strip. The card's bottom edge is always there, so the same target works in both directions. |
| Apply is per-element | A button on one element's badge that silently commits two other elements is discovered only by having it happen to you. |
| Per-element values, not a separate change list | A separate list makes the badge honest while the panel keeps lying — two answers to "what did I change here", six inches apart. |
| Pills in the panel, not on the canvas | See C7. |
| One pill per class, plain text | Chosen over per-category grouping; the alternative is kept behind a lab dial rather than discarded. |
| Nesting scoped to the canvas floor | The nesting exists to seat the strips, and the strips are canvas-floor only. Elsewhere the box is one flat card. |

---

## §F — Still undecided

1. **Which question layout.** *Full* (title, options, separate footer with counter and Skip,
   plus an ×) versus *Condensed* (counter and Skip on the title row, no ×). Both are built
   and switchable from the lab; neither is settled.
2. **Which pill mode.** One pill per class, plain text, versus one pill per category with an
   icon that expands on hover. Both built, on a lab dial.
3. **Whether pills carry an icon alongside the class text.** The reference frames show both;
   the current build is text-only.
4. **The task-list state of the top strip.** Modelled but not built.
5. **Whether the Agents tab gets a question surface.** The top strip is gated to the canvas
   floor; nothing renders a question in the run timeline.
6. **The final `--nest-inset` value.** Currently 2px, on a 0–8px slider.
7. **Iteration count without ComposerMode.** Inference with a default of 3 is the premise; it
   has no visibility and no override today. Watch it in use before settling A3.
