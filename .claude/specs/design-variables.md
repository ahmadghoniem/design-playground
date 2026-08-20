# Variables fold

The **Variables** fold of the RightPanel's Design tab: the host's theme values, grouped and swatched,
for reading named colours, radius, typography, and the Icons set in use. The panel container itself is
`shell-and-layout.md`'s subject; this file covers only the Variables fold body.

## Settled

- **Parse the host theme CSS.** The CSS entry comes from `components.json` → `tailwind.css`, never
  hardcoded. Every custom property found becomes a row with a swatch.
- **Groups: Base, Surfaces, Actions, Neutrals, Charts, Sidebar, Radius, Custom.** This is shadcn's own
  theming-docs grouping order, not an invented taxonomy; anything that doesn't match a group's pattern
  falls to Custom, so a host with unfamiliar tokens degrades gracefully rather than being mis-grouped.
- **Row anatomy: name on the left, control on the right.** Each row is a swatch and a plain name;
  clicking it copies nothing. The swatch doubles as a live colour picker that repaints the previews.
  **`UNDEF` rows keep the dashed marker and get no picker** — there is no value to edit.
- **Token names render in plain left-aligned sans**, not monospace and not right-aligned. *Why:* a
  token is a name you read, not code you copy, and the code-focused styling implied an affordance
  that no longer exists.
- **One scheme that follows the preview colour scheme.** A token row shows a single swatch/value: light
  values when the preview is in light mode, dark values when it's in dark mode — matching
  `usePreviewColorSchemeStore`. This **supersedes the split light/dark swatch built on
  `feat/layers-sidebar`** (see below); the split-swatch shape should not be rebuilt.
- **No "N live · N dead" header.** The fold doesn't summarize token health with a count at the top.
- **Mapped-but-undefined tokens are flagged `UNDEF`.** A token referenced in `@theme inline` but never
  given a value in `:root` or `.dark` still generates a utility that silently resolves to nothing —
  the fold shows a dashed-amber marker instead of an empty swatch, surfacing the bug instead of hiding
  it. This is a real finding, not a synthetic one: the host currently maps 8 `--sidebar*` and 5
  `--chart-*` variables this way, 13 tokens flagged.

## As the code is today

Read from `feat/layers-sidebar` (`server/lib/static-discovery/tokens.ts`,
`features/discovery/TokensList.tsx`).

- **CSS parsing and grouping — built and matches the settled shape.** `scanTokens()` reads the
  `:root` and `.dark` block bodies (brace-depth matched, not substring-matched, so
  `@custom-variant dark (&:is(.dark *))` in a v4 file doesn't get mistaken for the `.dark` rule),
  collects `@theme inline`'s `var(--x)` references to find mapped names, and classifies each token
  against the `GROUPS` regex table in the settled order. `--color-*` bridge variables
  (`@theme inline`'s own `--color-primary: var(--primary)` mechanism) are filtered out so the bridge
  doesn't double every row.
- **Swatch shape is still split, not one-scheme.** `TokensList.tsx`'s `Swatch` renders light and dark
  side by side unconditionally (`<span>` for light, `<span>` for dark, half-width each);
  `usePreviewColorSchemeStore` is not imported or read anywhere in the fold. This is exactly the shape
  the settled decision above supersedes — it should not be carried forward, and nothing currently
  wires the fold to the preview colour scheme.
- **No count header — already true.** `TokensList.tsx` has no "N live · N dead" line; the fold opens
  straight into grouped rows. Nothing to remove here.
- **`UNDEF` flagging — built.** `ThemeToken.undefinedInTheme` is set when a name is in the `@theme
  inline`-mapped set but has neither a light nor a dark value; `TokensList` renders a dashed amber
  swatch, amber row text, and an `AlertTriangle` + `UNDEF` badge in place of the value readout.
- **Click-to-copy — built, superseded.** `copy()` reproduces shadcn's utility naming (`-foreground`-suffixed names
  get `text-`, everything else gets `bg-`), writes to the clipboard, and swaps the value readout for
  `copied` for 1200ms. The settled decision above removes this affordance; the row becomes swatch plus
  plain name only, with the swatch as a live picker.

## Open

- **`registry:base` as a longer-term token source.** A whole design system delivered as one payload
  is tracked as a better long-term source for this fold than parsing CSS by hand, but nothing is built
  or committed toward it.
