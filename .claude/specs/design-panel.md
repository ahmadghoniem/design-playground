# Design panel

The Figma-shaped right panel that edits Tailwind class names on the alt-clicked element.

---

## Settled

- **Edits class names, never values.** Output is a React file a developer will read and keep;
  inline styles are unacceptable.

- **Rows are labelled in Tailwind's vocabulary, not CSS's** — `tracking`, `leading`, `ring`,
  `space-y`. `ring` has no CSS property behind it (it is stacked box-shadows), so a CSS-named panel
  structurally cannot express it — that's the whole argument for the vocabulary choice, not a
  styling preference. Just the row names in Tailwind vocabulary; no per-row hover explanation of
  what each utility really is.

- **Colour is token-aware.** The colour control offers the host's semantic tokens, and shows
  mapped-but-undefined tokens struck through and unpickable rather than silently absent.

- **Breakpoint follows the per-component viewport, not a panel-wide mode.** This supersedes
  `spec.md` §3's "pick `md` once; every control then reads and writes `md:`-prefixed classes." That
  shape does not get rebuilt. The active breakpoint is instead implied by the component's own
  `ViewportButtons` pick (Auto / Desktop / Mobile → `ComponentSize`):
  - **Auto → base** (unprefixed classes).
  - **Mobile → base / `sm`.**
  - **Desktop → `md` / `lg` and up.**

  Tailwind is mobile-first, so a value set at a viewport applies at that width and up. The panel
  shows the cascade — what's inherited from a smaller breakpoint — and writes at the active prefix.
  This is an initial version; the exact prefix set per viewport is → ROADMAP to audit further.

- **Six sections, in this order:** Spacing, Typography, Colour, Border, Effects, Layout. Rest
  folded away.

- **Target = the alt-clicked element, with a breadcrumb to the root.** A signage line states what
  is being edited: *original — edits create a copy* / *iteration — editing in place* / *adopted —
  this is what is in source*. The selection label itself is the element's name only — no extra
  annotation folded into the label.

- **A read-side class parser is required regardless of the write-back mechanism.** It produces
  `{property: value}` from a class string, breakpoint-aware. This is the read side of the panel;
  `tailwind-merge` only covers the write side, so nothing in the current dependency set gives us
  this for free.

## As the code is today

- No design or properties panel exists at all. No class parsing, no class writing. Everything above
  is new surface.
- The panel's breakpoint driver already exists and is live: `shared/ui/ViewportButtons.tsx` renders
  three icon buttons — Auto (`Maximize`), Desktop (`Monitor`), Mobile (`Smartphone`) — mapping to
  `ComponentSize` values `'default' | 'laptop' | 'mobile'`. `shared/lib/constants.ts` also defines a
  fourth `ComponentSize` value, `'tablet'`, with its own `SIZE_CONFIG` entry (`768×1024`), but no
  button currently wires it up — the panel's breakpoint mapping has three live viewport states to
  key off, not four.
- Token-aware colour depends on host theme parsing that exists but isn't on `master`: on
  `feat/layers-sidebar`, host-config reading and Tailwind token parsing found that the test host
  (Rewynd) maps 41 utilities through `@theme inline` but only defines 28 — 13 are dead
  (`--chart-1..5` and seven `--sidebar*` variables). The design panel's struck-through/unpickable
  treatment of undefined tokens is the same fact the Tokens sidebar tab already surfaces; the panel
  doesn't need a second mechanism to detect it, only to consume it.
- Element selection already exists and is what the panel targets: `features/canvas/hooks/useElementSelection.ts`
  plus `shared/lib/element-context.ts` (`extractElementContext`). Alt+hover/click, plain DOM
  traversal, previews render inline in the same document — no iframe, no `penpal`.

### Measurements absorbed from `research/tailwindeditor.md`

TailwindEditor is the closest existing implementation of a class-name-editing panel; its row/section
primitives are directly reusable as scanning-density reference even though its architecture (iframe
preview, regex-tag element location) is not:

- Row: fixed height **28px** (`h-7`), label `text-[10px] text-muted-foreground font-medium` on the
  left, control column **120px wide**, right-aligned. Fixed-width label / fixed-width control keeps
  every row's control starting at the same x-offset regardless of label length — what makes a long
  panel scannable.
- Section: header `px-4 py-3`, title `text-xs font-medium`, chevron rotates open; body padding when
  open `px-4 pb-4 pt-1`; `border-border/50` separates stacked sections, no card/shadow.
- Their `CONFLICT_GROUPS` property→regex registry (~140 keys, base-form only, breakpoints/pseudo
  stripped before matching) plus `replaceConflictingClasses` (remove-then-append within a scoped
  modifier chain) is a pure string→string transformer, representation-agnostic — directly reusable
  for the narrow case of a bare string-literal `className`. What is **not** reusable is their
  element→source-location strategy (`data-builder-id` + regex-tag-match against literal HTML text):
  it assumes source and rendered output are the same literal text. Ours is a `.tsx` file compiled
  before it renders, and a shadcn/Radix component's actual class string is frequently the return
  value of `cn(buttonVariants({variant, size}), props.className)` — no `class="..."` literal for a
  regex to find. This is the same gap `spec.md` §7.1/§7.2 raise and the reason the write-back
  mechanism is not yet decided (see Open, below).
- Their colour picker is a hardcoded raw Tailwind hex scale with no token concept — the opposite of
  what's settled above; not reused.

## Open → ROADMAP

- **The write-back mechanism.** Candidate shape: an override slot, `className={cn("p-4",
  editParam)}`, live while dragging and flattened on save. Not decided — unproven, and it blocks the
  panel. Current best practice needs researching before committing to it.
- **The viewport→breakpoint-prefix mapping**, audit the exact prefix set per viewport (Auto/Mobile/
  Desktop → base/`sm`/`md`+`lg`) once the panel is in front of real content — this is an initial
  version, not verified against real breakpoint-cascade cases.
- **§7.1 — reading a `className` the panel doesn't understand.** A real shadcn component's
  className is a runtime expression, not a literal string. Options on the table: parse only literal
  string arguments and disable controls whose value comes from an expression; resolve the class list
  at runtime from the rendered element's `class` attribute and map back through conflict-group
  regexes; or restrict the panel to iteration files, which we author and can keep literal. No option
  chosen.
- **§7.2 — alt-click gives a DOM node; editing needs a JSX attribute.** No source mapping exists;
  build-time `data-pg-src` stamping is parked on an unmeasured HMR cost. Without it, locating "this
  h2's tracking" in the file means matching text content or structure, which is fragile in exactly
  the components that repeat elements. Whether stamping is worth un-parking, or there's a cheaper
  anchor, is undecided.

## Context absorbed (sources below were folded in, then retired in this docs restructure)

`.claude/plans/cozy-hatching-ember.md` (A4, `design-panel.md` bullet) is this spec's authority.
`spec.md` §3 (design panel) and §7.1/§7.2 (className-reading, source-mapping) are folded in above,
with §3's panel-wide breakpoint mode explicitly superseded. `journey.md`'s canvas section ("the
design panel edits class names, not values") and its locked UI decisions (panel targets the
alt-clicked element with a breadcrumb; panel signage line) agree with and are folded into the above.
`research/tailwindeditor.md` supplied the row/section measurements and the conflict-group mechanism
assessment; it is read for content, not cited as authority, and was not moved or deleted.
`shared/ui/ViewportButtons.tsx` and `shared/lib/constants.ts` were read directly for the current
`ComponentSize` shape.
