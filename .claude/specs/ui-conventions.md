# UI conventions

Cross-cutting presentation rules shared by panels, canvas chrome, and dense control rows.

## Settled

- **The shared elevation recipe.** One card surface — white fill, a 1px border, a soft low
  shadow, rounded corners — used by the panels, the CollapsedPills, the CanvasToolbar and the
  ZoomControls pill alike. This is load-bearing rather than cosmetic: sharing the surface is
  what makes a CollapsedPill read as *the panel folded up* rather than as a separate control.
  A collapsed affordance that looks like new chrome has failed at its one job.

- **Tooltips are a custom pill**, not native `title=`: inverted accent fill, 6px radius, 12px
  text, an arrow, and a dimmed unbracketed shortcut. Positioned **outside** the surface it
  belongs to.

- **Two tooltip shapes.** A plain pill by default. A **rich** variant — title, dimmed
  description, small artifact — only where the tooltip has to *teach* an affordance the label
  cannot state. Rich is for the unused state; once the mode is on, the plain verb.

- **No tooltip on a labelled chip.** A tooltip that restates visible text is noise.

- **A trigger's tooltip is suppressed while the surface it opens is showing.**

- **Icon-only controls in dense rows get a 24×24 minimum hit area**, glyph size unchanged,
  and must not steal the row's own selection click.

## As the code is today

Read from `master` (`shared/ui/tooltip.tsx`, `styles/playground-global.css`,
`features/canvas/components/`).

- **Shared tooltip component — built, not the settled shape.** `shared/ui/tooltip.tsx`
  wraps `@base-ui/react/tooltip` (`Portal` → `Positioner` → `Popup`). Content uses
  `bg-pg-popover`, `text-pg-popover-foreground`,
  `rounded-lg`, and a soft `shadow-md` — light popover styling, not inverted accent fill with
  a 6px-radius pill and arrow. CanvasToolbar and ZoomControls use it with plain text labels
  (e.g. "Select (V)"); shortcuts are inline in the string, not dimmed/unbracketed separately.
  `ChatComposerControls` still uses native `title=` on Edit/Explore buttons.
- **Elevation recipe — partially present on canvas chrome.** `PlaygroundCanvasToolbar` and
  `PlaygroundCanvasViewControls` both use white fill, `border border-stone-200`, and
  `shadow-[0_2px_8px_rgba(0,0,0,0.06)]` with `rounded-2xl` — close to the settled recipe.
  `PlaygroundSidebar` uses a similar treatment (`bg-white rounded-2xl border border-pg-border
  shadow-[0_1px_3px_rgba(0,0,0,0.04)]`). CollapsedPills do not exist yet, so the load-bearing
  shared-surface rule is untested in code.
- **`--pg-*` chrome tokens — built.** `:root` in `playground-global.css` defines the private
  namespace (`--pg-background`, `--pg-border`, etc.) used by chrome surfaces and the tooltip
  popup classes.
- **Rich tooltips, chip tooltip ban, popover-open suppression, 24×24 dense-row hit areas — not
  built** as cross-cutting conventions. No component enforces tooltip suppression while a
  popover is open; layer-row chevron sizing is specified in `library-layers.md`, not applied
  globally here.

## Open

- **The tooltip migration.** The settled inverted accent pill and the built light
  popover are different objects, not a restyle away from each other: the arrow, the
  dimmed-shortcut slot, and the rich variant all need adding. Whether that is a rewrite of
  `shared/ui/tooltip.tsx` or a second component beside it is undecided.
