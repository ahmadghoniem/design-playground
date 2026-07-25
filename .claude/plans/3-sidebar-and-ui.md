# Part 3 — Sidebar, selection, stack

**Repo:** `design-playground`. **Host:** `Rewynd`.
Read `1-diagnosis-and-cleanup.md` first for the shared request/decision log.
Sibling: `2-discovery-engine.md`, which produces the data every tab here renders.

**Status:** the layer tree, three tabs, and Study 01 shell are built and parked on
`feat/layers-sidebar`. Three pieces there are known-wrong against the mockup review and are corrected
below: the toolbar position, the view-control size, and the tokens split-swatch.

---

## 3.1 Layout

**Chrome is always light.** Two theme concepts were being conflated; they are not the same control:

| | Themes | Control | Dark? |
|---|---|---|---|
| **Playground chrome** | sidebar, header, rails, canvas surface | none | **Never** |
| **Component preview** | host components on canvas | header's light/dark button | Yes — its only job |

The code already does this correctly (`previewSchemeClass` / `usePreviewColorSchemeStore` scope the
override to previews; chrome reads the private `--pg-*` namespace). The **artifact** mislabeled it,
and needs its page-level dark toggle and chrome density switcher removed before it's used as a
reference again. Implementation rule: never add a dark palette to `--pg-*`, never let a
`prefers-color-scheme` rule reach chrome.

**Sidebar docks left permanently** — a flow child, not an absolute overlay. No collapse affordance
anywhere. ✅ built.

**`PlaygroundCanvasToolbar` sits immediately right of the sidebar**, as a sibling flow child:

```
┌──────────────┬────┬─────────────────────────────┐
│  Sidebar     │Tool│  Canvas                     │
│  280px       │bar │                             │
└──────────────┴────┴─────────────────────────────┘
```

This is what removes the `calc(1.5rem + 54px + 0.5rem)` offset — that math existed only because the
toolbar *floated over* the canvas while the sidebar dodged it. Docked side by side, no offset is
needed. Change from the branch: move from `absolute right-6 top-1/2` into the flex row; tooltips back
to `side="right"`. With the right edge now free, the agent-output panel (§3.6) can own it.

**View controls:** the shipped 36px is too small — go to the midpoint (`w-8`/32px buttons, `p-1.5`,
16px icons, ~44px overall, still bottom-left).

## 3.2 Tree UI conventions

**W3C [Tree View pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)** — not optional; it's
what makes keyboard nav work. `role=tree/treeitem/group`, `aria-expanded` on parents only,
`aria-level` on every row, `aria-activedescendant` for roving focus (one tab stop, arrows within).
↑↓ move, → expands/descends, ← collapses/ascends, Home/End jump, typeahead. ✅ built.

**Virtualization is required, not an optimization.** Penpot's most-cited weakness is that its layers
panel degrades on large files. A real host tree runs to thousands of nodes. The built `LayerTree`
renders from a flattened visible-row list specifically so a virtualizer drops in with one change.
Evaluate [react-arborist](https://github.com/brimdata/react-arborist) (virtualized + keyboard + DnD)
before extending the hand-rolled one.

**Row affordances, by value:** indent guides (highest — every mature tool has them) · type icons ·
truncation with full name in tooltip, never wrap · hover-revealed actions, quiet at rest ·
conditional-render marker · **canvas ↔ tree selection sync**, which is what makes a layers panel feel
like a design tool rather than a file browser.

**Deliberately omitted:** visibility/lock toggles, drag-to-reorder within the tree, rename-in-place.
The tree reflects source code; offering to reorder implies a write path that doesn't exist. Onlook
can do this because it patches JSX; out of scope for v1.

## 3.3 Layers tab

The static render tree, rooted at the entry component, **rendered on first load with no button and no
agent**. Every node is draggable to canvas via the existing `DND_DATA_KEY`. Search filters while
**preserving ancestry** — auto-expand matched paths, keep parent rows visible, never flatten to a
result list. Persist expansion state per project.

## 3.4 Primitives tab

A flat listing of files under the host's `aliases.ui` directory — a separate glob against a separate
source, not a filtered view of Layers. No classification flag exists or is needed.

**Naming bug.** Rows currently read `button`, `checkbox` because `scanPrimitives`
(`server/lib/static-discovery/scan.ts:295`) does `f.replace(/\.(tsx|jsx)$/, '')` — it uses the
**filename**, not the exported identifier. Fix: parse the file's exports and use the primary
PascalCase export (`button.tsx` → `Button`). Multi-export files (`card.tsx` → `Card`, `CardHeader`,
`CardTitle`…) list the primary export as the row, the rest on expand.

**CVA variants.** For primitives containing a `cva(...)` call, statically parse the variant object
and render each group as an expandable child:

```
Button
├─ variant → default · destructive · outline · ghost · link
└─ size    → sm · default · lg · icon
```

Dragging a variant row drops the component with those props pre-set. The `cva` second argument is a
plain object literal, so extraction needs no evaluation. Also parse `defaultVariants` (mark the
default) and `compoundVariants` (suppress invalid combinations). **Open and deferred by decision:**
how this reads inside Study 01's 280px panel. The built version uses an indented chip row, which
works but isn't what the mockup showed.

## 3.5 Tokens tab

Parse the host's theme CSS (path from `components.json` → `tailwind.css`) and render each custom
property as a swatch. Grouped: Base, Surfaces, Actions, Neutrals, Charts, Sidebar, Radius, Custom.
Clicking copies the Tailwind utility (`bg-primary`, `text-muted-foreground`).

**Change per round 4: show one scheme, not both.** The built version renders a split light/dark
swatch. Instead, follow `usePreviewColorSchemeStore` — light preview shows light values, dark preview
shows dark. One column, one value, matching what's actually on the canvas.

**Where the groups came from — no LLM was involved.** They are a hand-written regex table
(`server/lib/static-discovery/tokens.ts:28-36`) written from shadcn's theming docs, which list the
variables in that order. Rewynd's `index.css` happens to carry matching section comments. Anything
unmatched falls to "Custom", so a host with different tokens degrades rather than mis-groups. It is a
heuristic, and the code should say so.

**This tab surfaces a real host bug.** Rewynd maps 8 `--sidebar*` and 5 `--chart-*` variables in
`@theme inline` but never defines them in `:root` or `.dark`, so `bg-sidebar` and `text-chart-1`
silently resolve to nothing. The tab flags mapped-but-undefined rather than rendering empty swatches.
✅ built and verified — 13 flagged.

**Precedent:** Penpot treats tokens as a core feature (not a plugin) with W3C-format interop, and its
free Inspect tab is the model for what a tokens view is *for* — handoff, not decoration.

## 3.6 Agent-output panel

Addresses the no-feedback problem from Part 1 §1.1. Minimal by design: an observability surface, not
a chat. Collapsed to a thin strip, expands when a run starts, streams assistant text and tool calls,
auto-scrolls, offers copy and stop. The machinery exists — `server/routes/generate.ts` already
streams via `streamSSE` and `server/lib/claude-jsonl.ts` already parses `stream-json`. With the
toolbar moved left (§3.1), the right edge is free for it.

## 3.7 Selection label

**Decided: name only.** Matches the layer tree exactly, so canvas and sidebar agree at a glance.

```
┌──────────┐
│  Button  │
└──────────┘
```

Variant chips (option D) are **deferred** — they need the *active* CVA option per instance, which
means either matching `className` back against the groups or carrying props through the node. Cheap
for node roots, unsolved for nested elements. Not worth blocking on.

Rejected: **name + source** — valuable, but belongs in the copied agent context, not on-canvas, and
too wide at low zoom. **Ancestry breadcrumb** — grows unboundedly and duplicates the layer tree.

Restyle off the hardcoded `rgba(59,130,246,0.9)` / `9px` onto `--pg-*` tokens (chrome namespace, so
per §3.1 it never themes dark).

**Two bugs to fix regardless of format.** `ElementHighlight.tsx:136` renders the *node's*
`data.componentName`, so every element inside one dropped node shows the same label — use the
per-element resolved name. And the fiber walk reads only `type.name`, so `forwardRef`/`memo`
components (most of shadcn) resolve to an *ancestor's* name — check `displayName` and unwrap
`type.render`/`type.type`. Stamping (Part 2 §2.4) sidesteps this entirely, making the fiber walk a
fallback. The walk is also duplicated: `useElementSelection.ts:145-160` inlines a copy of
`getReactComponentName` from `element-context.ts:29-49`. Collapse to one.

## 3.8 Stack alignment

**Base UI replaces Radix — and has not been started.** `package.json` still lists
`@radix-ui/react-{alert-dialog,dialog,slot,tooltip}` and no Base UI, so the modal that can't be
closed is unfixed *and* was never a test of Base UI. As of
[July 2026 Base UI is shadcn's default](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default);
every component was rebuilt with the same public API, so this is a change of implementation, not
abstraction. Four primitives — manual migration is viable; shadcn also ships an agent skill
(`skills add shadcn/ui` → *"migrate dialog to base-ui"*). **Commands must be adapted to Bun.**

**On the portal problem:** [Base UI's `Portal` takes a `container` prop](https://base-ui.com/react/components/popover)
(`HTMLElement | ShadowRoot | RefObject | null`), so passing the canvas node's element traps the
overlay inside the card. That's the containment story `CLAUDE.md` says doesn't exist. **But
`container` fixes DOM placement, not `position: fixed` or backdrop semantics** — consistent with the
observed behaviour. **v1 keeps overlay components listed but never mounted** (Part 2 §2.3); the
containment spike is a separate follow-up, and only then does live-previewing a Dialog become a
question worth asking.

**cnfast replaces clsx + tailwind-merge.** ✅ done — `shared/lib/utils.ts` is now
`export { cn, type ClassValue } from "cnfast"`, matching the host's `src/utils/styling.ts`. Drop-in:
same API, byte-identical output, ~3.8× faster.

**`style: new-york` is superseded.** [`shadcn/create`](https://ui.shadcn.com/create) (Dec 2025) and
[CLI v4](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4) (Mar 2026) replaced the
`default`/`new-york` binary with five presets — **Vega** (balanced), **Nova** (condensed), **Maia**
(rounded/soft), **Lyra** (sharp/minimal), **Mira** (ultra-compact). These aren't CSS skins; each is a
full Tailwind config governing radius, shadow, spacing, and typography. A **preset code** packs
colors, theme, icons, fonts, and radius into one string (`init --preset a1Dg5eFl`); primitives are
chosen with `init --base radix|base-ui` — which explains `base-vega`/`base-nova` seen in the wild.
**Implication:** read the host's density, never assume it. Rewynd still declares legacy `new-york`.

**`components.json` is the host contract** — these drive the playground and must never be hardcoded:
`aliases.ui` (Primitives source) · `tailwind.css` (Tokens source) · `aliases.utils` (where `cn`
lives) · `iconLibrary` · `baseColor` + `cssVariables` · `style` (density) · `rsc`. This is what makes
the package host-agnostic.

**Open:** CLI v4 added `shadcn info`, reporting framework version, CSS variables, installed
components, and doc links *"for agent context."* If machine-readable it replaces the hand-written
config parser. **Spike `bunx shadcn@latest info` in Rewynd before designing around it.** Also tracked,
not committed: `registry:base` (a whole design system as one payload — a better long-term Tokens
source than parsing CSS) and `registry:font`.

## 3.9 Libraries worth knowing

| Library | Relevance |
|---|---|
| [react-arborist](https://github.com/brimdata/react-arborist) | Virtualized tree, keyboard nav, DnD. Evaluate before extending the hand-rolled tree. |
| [react-accessible-treeview](https://dgreene1.github.io/react-accessible-treeview/) | WAI-ARIA reference implementation, no virtualization. |
| [element-source](https://github.com/aidenybai/element-source) | `resolveElementInfo(node)` → tag, component, file, line, column. Runtime fallback for un-stamped elements. |
| [react-grab](https://github.com/aidenybai/react-grab) | Closest analogue to the selection feature. ⌘C copies `[<a> in LoginForm (at components/login-form.tsx:46:19)]`; its `primitives` entry exposes hit-testing, source extraction, page freezing, and `data-react-grab-ignore` — directly comparable to `EXCLUDE_SELECTORS`. Review before rewriting `useElementSelection.ts`. |
| [bippy](https://github.com/aidenybai/bippy) | Fiber access by impersonating the DevTools hook (React 17–19). The engine for Part 2 §2.5. |
| [react-scanner](https://github.com/mihkeleidast/react-scanner) | Static extraction of rendered components and prop usage to JSON. Reference for output shape. |
| [agentation](https://github.com/benjitaylor/agentation) | Click-to-annotate → structured markdown for agents. **PolyForm Shield, not OSS** — study the UX, don't vendor the code. |

React DevTools was reviewed: its README is user-facing, with no public API for reading the component
tree and no embedding story. The reusable idea is architectural — a backend on the fiber tree, a
frontend rendering it, over a serializable bridge. **bippy** is the practical route in.

---

## Open questions owned by this part

1. **Build vs. buy the tree** — does react-arborist fit, or does drag-to-canvas argue for extending
   what's built? (§3.2)
2. **`shadcn info` output shape** — spike before designing around it. (§3.8)
3. **Primitives variant display in a 280px panel** — deferred by decision. (§3.4)

**Settled across all three parts, recorded so they aren't reopened:** toolbar position (beside the
sidebar) · selection label (name only) · layout (Study 01) · chrome theming (always light) · tokens
follow the preview scheme · branch strategy (park `feat/layers-sidebar`, cut `chore/cleanup` off
master) · no "+ Add" button · overlay components listed but never mounted.

---

## Verification

With the OS in dark mode, chrome stays light and the header toggle flips only previews; no `--pg-*`
dark palette exists. Sidebar → toolbar → canvas with no offset math left in `PlaygroundClient.tsx`.
Expand Layers to a leaf and drag it; drag a `Button` variant row and confirm props land; Tokens shows
one column matching the preview scheme and flags undefined `--sidebar*`/`--chart-*`. Primitives read
`Button`, not `button`. Traverse the whole tree by keyboard alone with one tab stop; verify
`aria-expanded`/`aria-level` with a screen reader; confirm smooth scroll on a synthetic 5,000-node
tree. Alt+hover several elements inside one node — each shows its *own* name, and a `forwardRef`
shadcn component resolves to `Button`. After the Base UI swap, every overlay still opens, positions,
and traps focus.

**Always** — dependency-cruiser via a throwaway `bunx` install with `typescript@5.x` pinned (plain
`bunx dependency-cruiser` false-passes; it can't resolve `@pg/`). Typecheck from Rewynd with
`"@pg/*": ["./src/app/playground/*"]` in its paths, then `npx tsc -p tsconfig.app.json --noEmit` —
Rewynd's own `type-check` script is solution-style without `--build` and checks zero files.
