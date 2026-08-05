# Spec — sidebar: Layers tab

The Layers tab of the left sidebar: a Figma-style layer tree over the component registry, for
finding and dragging components onto the canvas. The sidebar container itself (280px, docked, tab
switching, per-tab search + footer) is `shell-and-layout.md`; this file covers only the tree.

## Settled

- **Static render tree from the entry component.** The tree is derived from the host's own
  composition — walk from `createRoot(...).render(<X />)`, down through local imports — not from an
  agent describing the app. *Why:* composition is a static property of the code; a deterministic
  walk is instant and can't hallucinate structure the agent scan (`/api/discover` today) can.
- **First-load with no button, no agent.** Opening the Layers tab shows the tree immediately; there
  is no "Add components" step to click through and no CLI spawn to wait on.
- **Draggable.** Every row — leaf or branch — can be dragged onto the canvas to create a node.
- **Ancestry-preserving search.** A match keeps its parents visible rather than flattening the
  result into a list, so the path to a hit stays readable. Every surviving branch auto-expands while
  a query is active.
- **Per-project expansion.** Which rows are expanded is state scoped to the sidebar for the current
  project, not written into the tree data and not carried across projects.
- **Row affordances:**
  - Indent guides — one hairline per ancestor level; depth is unreadable without them past three
    levels.
  - Type icons — a folder-shaped icon for a row with children, a leaf icon for one without.
  - Truncation + tooltip — long labels truncate; the full label (and source path) is the tooltip.
  - Hover actions — a "focus on canvas" affordance appears on hover, hidden otherwise.
  - Conditional marker — a row whose JSX sits behind a ternary, `&&`, or `.map()` is marked, so the
    tree communicates "this may or may not render" rather than presenting it as unconditional.
  - Canvas ↔ tree selection sync — selecting a node on the canvas highlights its row in the tree,
    and selecting/focusing a row highlights and centers the matching canvas node. Bidirectional.
- **Omit for v1:** visibility toggle, lock, reorder, rename. The tree is a navigation and
  drag-source surface, not a layers-panel editor.

## As the code is today

Read from `feat/layers-sidebar` (`app/PlaygroundSidebar.tsx`, `features/discovery/LayerTree.tsx`,
`features/discovery/registry-tree.ts`).

- **Data source mismatch with the settled decision.** The Layers tab does not render the live
  static-discovery render tree (`scanRenderTree` / `GET /api/discover/tree`, which the Primitives
  and Tokens tabs do consume via `useStaticScan`). It renders `registry` — the flat
  `RegistryLeafItem[]` manifest from `registry.tsx` (`discoveredRegistry`) — through
  `buildRegistryTree()` in `registry-tree.ts`, which expresses nesting via each item's `parentId`.
  Reconciling this with the deterministic-scan decision above is discovery-engine.md's problem, not
  this file's, but the gap is real: today the Layers tab shows whatever the manifest holds, and
  nothing currently writes that manifest from the deterministic scan.
- **First-load still has a button and an agent.** `PlaygroundSidebar.tsx` renders a `+` icon button
  (`aria-label="Add components"`) in the header that calls `onOpenDiscovery`, and an empty-state CTA
  ("Add components") when the registry is empty — both routes into the old agent-driven
  `POST /api/discover` flow. The "no button, no agent" decision above is not yet built.
- **Draggable — built.** `LayerRow` sets `draggable` unconditionally and writes the row's `item.id`
  under `DND_DATA_KEY` (`application/x-playground-component`, `shared/lib/constants.ts`) on
  `dragstart`.
- **Ancestry-preserving search — built.** `filterTree()` in `registry-tree.ts` keeps a node when it
  matches or any descendant matches. `PlaygroundSidebar` unions `collectIds(filtered)` into the
  expanded set while `search` is non-empty, so every surviving branch opens automatically.
- **Per-project expansion — built as session-local state.** `expanded` is a `useState<Set<string>>`
  in `PlaygroundSidebar`; nothing persists it to disk or `localStorage`. It resets on reload.
- **Row affordances — partially built:**
  - Indent guides — built: one `w-[11px]` span with a hairline border per depth level.
  - Type icons — built: `Layers` icon when `children.length > 0`, `Box` icon otherwise.
  - Truncation + tooltip — built: `truncate` class plus a `title={item.label}` attribute.
  - Hover actions — built: a `Crosshair` button (`aria-label="Focus {label} on canvas"`) fades in on
    `group-hover`, calling `useFocusNode().focusNode(id)` → `fitView({ nodes: [{ id }] })`.
  - Conditional marker — **not built**. `RegistryLeafItem` (`registry.tsx`) carries no `conditional`
    field at all — that flag exists only on `RenderTreeNode` (`server/lib/static-discovery/scan.ts`),
    the type the Layers tab does not consume (see the data-source mismatch above). `LayerRow` renders
    nothing for it.
  - Canvas ↔ tree selection sync — **only tree → canvas is built**. Double-click or the crosshair
    button calls `focusNode`, which pans/fits the canvas to the node. There is no reverse path:
    `PlaygroundSidebarProps` takes only `onOpenDiscovery` and `pendingAdds` — no selected-node id
    flows in from the canvas, so selecting a node there does not highlight anything in the tree.
- **Keyboard/W3C tree pattern — built, beyond what the plan bullet asked for.** `LayerTree` implements
  `role="tree"`/`"treeitem"`, `aria-level`, `aria-expanded` on parents only, and roving focus via
  `aria-activedescendant`, with arrow keys, Home/End, Enter/Space, and single-character typeahead.
  This satisfies the shared shell's W3C tree-nav convention (`shell-and-layout.md`).
- **`pendingAdds` skeleton rows.** `PlaygroundSidebar` renders a `SidebarSkeletonCard` (spinner +
  label) for any `PendingSidebarAdd` not yet present in `registry` — a leftover of the agent-add flow
  this spec's "no button, no agent" decision would remove.

## Open → ROADMAP

- **Virtualization / `react-arborist`** for very large trees. `LayerTree` renders the full
  `visibleRows()` flat list directly; the code comment already notes rows are flattened rather than
  recursed specifically so a virtualizer is a one-line swap later, but nothing virtualizes today.

## Context absorbed (sources below were folded in, then retired in this docs restructure)

- `.claude/plans/layout-sidebar-tranquil-galaxy.md` and the other sidebar/discovery plans on
  `.claude/plans/` (being deleted per the docs restructure) — absorbed in full above.
- Branch reality read directly via `git show feat/layers-sidebar:...` for `LayerTree.tsx`,
  `registry-tree.ts`, `PlaygroundSidebar.tsx`, `useFocusNode.ts`, and `registry.tsx`.
- `journey.md` §"Built but parked on feat/layers-sidebar" and `spec.md` "UI decisions — locked" for
  the three-tabs decision (shared with `shell-and-layout.md`, not re-specified here).
- The published "Layers Sidebar — 5 Layout Studies" artifact (`ef903ba0-c540-4763-bfa8-46cf93496ec3`)
  is the living reference for prototyping against; it returned only the frame/font preamble on
  fetch, so this file's code-reality section was authored from the branch components instead, per
  the documented fallback.
