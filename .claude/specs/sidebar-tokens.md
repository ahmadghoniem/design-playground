# Spec — sidebar: Tokens tab

The Tokens tab of the left sidebar: the host's theme CSS custom properties, grouped and swatched, for
copying the right Tailwind utility. The sidebar container itself (280px, docked, tab switching,
per-tab search + footer) is `shell-and-layout.md`; this file covers only the tab body.

## Settled

- **Parse the host theme CSS.** The CSS entry comes from `components.json` → `tailwind.css`, never
  hardcoded. Every custom property found becomes a row with a swatch.
- **Groups: Base, Surfaces, Actions, Neutrals, Charts, Sidebar, Radius, Custom.** This is shadcn's own
  theming-docs grouping order, not an invented taxonomy; anything that doesn't match a group's pattern
  falls to Custom, so a host with unfamiliar tokens degrades gracefully rather than being mis-grouped.
- **Click copies the utility**, not the raw value — `bg-primary`, `text-muted-foreground` — the form
  a developer actually pastes into a class list.
- **One scheme that follows the preview toggle.** A token row shows a single swatch/value: light
  values when the preview is in light mode, dark values when it's in dark mode — matching
  `usePreviewColorSchemeStore`, the same store the header's preview toggle already writes to. This
  **supersedes the split light/dark swatch built on `feat/layers-sidebar`** (see below); the
  split-swatch shape should not be rebuilt.
- **No "N live · N dead" header.** The tab doesn't summarize token health with a count at the top.
- **Mapped-but-undefined tokens are flagged `UNDEF`.** A token referenced in `@theme inline` but never
  given a value in `:root` or `.dark` still generates a utility that silently resolves to nothing —
  the tab shows a dashed-amber marker instead of an empty swatch, surfacing the bug instead of hiding
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
  `usePreviewColorSchemeStore` is not imported or read anywhere in the tab. This is exactly the shape
  the settled decision above supersedes — it should not be carried forward, and nothing currently
  wires the tab to the preview scheme.
- **No count header — already true.** `TokensList.tsx` has no "N live · N dead" line; the tab opens
  straight into grouped rows. Nothing to remove here.
- **`UNDEF` flagging — built.** `ThemeToken.undefinedInTheme` is set when a name is in the `@theme
  inline`-mapped set but has neither a light nor a dark value; `TokensList` renders a dashed amber
  swatch, amber row text, and an `AlertTriangle` + `UNDEF` badge in place of the value readout.
- **Click-to-copy — built.** `copy()` reproduces shadcn's utility naming (`-foreground`-suffixed names
  get `text-`, everything else gets `bg-`), writes to the clipboard, and swaps the value readout for
  `copied` for 1200ms.

## Open → ROADMAP

- **`registry:base` as a longer-term token source.** A whole design system delivered as one payload
  is tracked as a better long-term source for this tab than parsing CSS by hand, but nothing is built
  or committed toward it.

## Context absorbed (sources below were folded in, then retired in this docs restructure)

- `.claude/plans/3-sidebar-and-ui.md` §3.5 (Tokens tab) and the round-4 supersession note in §3.1 —
  absorbed in full above.
- Branch reality read directly via `git show feat/layers-sidebar:...` for `tokens.ts` and
  `TokensList.tsx`, and the current `shared/stores/preview-color-scheme-store.ts` (present on both
  `master` and the branch, unchanged) for the store the one-scheme decision wires into.
- The published "Layers Sidebar — 5 Layout Studies" artifact (`ef903ba0-c540-4763-bfa8-46cf93496ec3`)
  is the living reference for prototyping against, per the same fallback noted in
  `sidebar-layers.md`.
