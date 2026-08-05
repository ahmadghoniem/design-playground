# Cleanup — preliminary

The `master`-branch cleanup that lands before feature work. Once committed and pushed, `master` is
the base every feature spec builds on.

---

## Settled

- **This lands on `master` first, alone.** Cleanup first, then re-plan: the small bugs below are
  cheap once the codebase is tidy, and batching feature work on top of a messy base is planning
  around the mess instead of clearing it. No feature spec branches until this one has landed and
  been pushed.

- **Scope guardrail: only what this plan retires anyway.** This is not a general tidy-up pass — it
  is the specific items below, because each is either blocking a feature spec or already flagged as
  a bug. Nothing else gets pulled in opportunistically.

- **Radix UI → Base UI.** Four primitives — `alert-dialog`, `dialog`, `slot`, `tooltip` — same
  public API, so this is a change of implementation, not abstraction. As of July 2026 Base UI is
  shadcn's own default. Four primitives is few enough that manual migration is viable; shadcn also
  ships an agent skill (`skills add shadcn/ui` → *"migrate dialog to base-ui"*) that does it
  file-by-file. **Commands must be adapted to Bun** — the skill assumes npm/pnpm.
  - Base UI's `Portal` takes a `container` prop (`HTMLElement | ShadowRoot | RefObject | null`), so
    pointing it at the preview card's element traps the overlay inside the card in the DOM. That
    fixes DOM **placement**, not `position: fixed` or backdrop semantics — a `position: fixed`
    overlay still paints over the full viewport regardless of where it sits in the tree. So v1 of
    this migration does not unlock live overlay previews: overlay/portal primitives stay
    listed-but-not-mounted in the registry, same as today.

- **`clsx` + `tailwind-merge` → `cnfast`.** Drop-in: `export { cn, type ClassValue } from "cnfast"`
  — same API, byte-identical output, ~3.8× faster. The host (Rewynd) already re-exports `cn` from
  `cnfast` in `src/utils/styling.ts`; this keeps the playground on the same implementation so merged
  class strings resolve identically on both sides of the boundary.

- **De-arbitrary Tailwind — STUB.** Pending the user's markdown. Not expanded here.

- **`style: new-york` is superseded.** `shadcn/create` (Dec 2025) and CLI v4 (Mar 2026) replaced the
  `default`/`new-york` binary with five density presets — **Vega** (balanced), **Nova**
  (condensed), **Maia** (rounded/soft), **Lyra** (sharp/minimal), **Mira** (ultra-compact). These
  aren't CSS skins; each is a full Tailwind config governing radius, shadow, spacing, and
  typography. Read the host's density from `components.json` (`aliases.ui`, `iconLibrary`,
  `baseColor`/`cssVariables`, `style`, `rsc`) rather than hardcoding one — that file is what makes
  the package host-agnostic. **Mira is the preferred feel** where a default has to be picked. The
  playground's own chrome does not take a density preset — presets apply to previewed components,
  not the tool (chrome is always light — see `shell-and-layout.md`).

- **Tidy `shared/lib/constants.ts`.**
  - Split the payload interfaces out: `ChatSubmitPayload` moves beside the chat composer that
    produces it; `GenerationStartPayload` / `GenerationCompletePayload` / `GenerationErrorPayload`
    move into `shared/lib/generation-events.ts`, which is what emits them.
  - Resolve the `ComponentSize` double-export: it is defined in `shared/lib/constants.ts` and
    re-exported from `registry-types.ts`. Pick one home before moving anything else, or the split
    doubles the confusion. `SIZE_CONFIG` + `getDisplayDimensions` + `ComponentSize` are a genuine
    cross-feature contract and should stay together.
  - Rename `STORAGE_KEY` → `CANVAS_STATE_STORAGE_KEY`. Rename the identifier only — the persisted
    key **string** `'playground-canvas-state'` does not change, and the project-scoped key built as
    `` `${STORAGE_KEY}:${projectId}` `` in `PlaygroundClient.tsx`, plus the legacy bare-key fallback
    read in `canvas-persistence.ts`, both keep working exactly as they do today.

- **Bug fixes.**
  - `ElementHighlight.tsx` renders the enclosing **node's** static component name for every
    selected element, not each element's own resolved name — so alt-clicking two different elements
    inside the same dropped component shows the same label for both. Fix: use the per-element
    resolved name instead of the node-level one.
  - The fiber walk that resolves a component's display name reads only `type.name`, so
    `forwardRef`/`memo` components — most of shadcn — resolve to an ancestor's name instead of their
    own. Fix: check `displayName` first, and unwrap `type.render`/`type.type` before falling back to
    `type.name`.
  - Primitives naming bug: the discovery scan derives a primitive's label from its **filename**
    (`button.tsx` → `button`) instead of its exported identifier, so rows read lowercase instead of
    `Button`. Fix: parse the file's exports and use the primary PascalCase export as the label;
    multi-export files (`card.tsx` → `Card`, `CardHeader`, `CardTitle`…) show the primary export as
    the row, the rest on expand.
  - The fiber-walk name resolution is duplicated: one copy inlined in the element-selection hook,
    one in the shared context helper. Collapse to one.

- **Two open decisions, listed here so they aren't relitigated silently — resolve, don't guess:**
  - **Three unverified comment-sweep findings.** From the Composer 2.5 comment audit: twelve
    findings were confirmed and fixed already; these three were reported as unverified rather than
    guessed at, and are low-stakes enough to decide inline during this cleanup rather than research
    further:

    | Location | Claim | What would settle it |
    |---|---|---|
    | `shared/lib/canvas-persistence.ts` | `gridPositions` — "grid layout positions for each skeleton node" | Nothing writes it; it is read once as a fallback beside `skeletonPositions`. Decide whether to delete the field or keep it as a documented legacy read. |
    | `server/vite-plugin.ts:34` | "Vite's cwd is the host project root — same truth the API route used" | Past tense refers to a deleted `playground-root` route. Accurate archaeology or noise — a judgement call. |
    | `shared/lib/generation-events.ts:9-10` | "Replaces the window CustomEvent bus (`GENERATION_*_EVENT`)" | Already true — the last window events were removed in `95710ae`. Comment is accurate; confirm it doesn't still read as pending. |

  - **The kept-but-unreachable `/api/discover/analyze` routes — the "second opinion" decision.**
    These routes are the closest existing thing to the one surviving optional agent call
    ("Generate sample data" in `discovery-engine.md`'s design), but they are coupled to
    `discovery.json` bookkeeping that the deleted scan produced, so they would not work end-to-end
    as written. Keeping them (rather than deleting) was the conservative choice made during the
    prior cleanup pass, not an obviously correct one. Decide during this pass: delete them outright,
    or keep them as a starting point for `discovery-engine.md`'s optional agent call.

- **Verification.** `tsc -p tsconfig.app.json --noEmit` (run from the host, with
  `"@pg/*": ["./src/app/playground/*"]` in its `paths`), `bun run check:boundaries`,
  `bun run check:knip`. Do **not** trust the host's own `type-check` script — Rewynd's is a
  solution-style tsconfig without `--build`, so it silently checks zero files and always "passes."

## As the code is today

- **Base UI: not started.** `package.json` still lists
  `@radix-ui/react-{alert-dialog,dialog,slot,tooltip}` (4 packages) and no Base UI dependency, on
  both `master` and `chore/cleanup`. No Base UI or shadcn migration skill is installed under
  `.claude/skills/` (currently only `visual-plan` and `visual-recap`).
- **cnfast: done on `feat/layers-sidebar`, not on `master`.** `master`'s
  `shared/lib/utils.ts` still runs `twMerge(clsx(inputs))`; no `cnfast` entry exists in `package.json`
  or `bun.lock`. `feat/layers-sidebar`'s `shared/lib/utils.ts` already re-exports `cn` from `cnfast`,
  and its `package.json` lists `"cnfast": "^0.0.8"` in dependencies — but its committed `bun.lock` has
  **no `cnfast` entry at all**. That confirms the missing-from-lockfile bug: the dependency resolves
  locally today (from whatever installed it into `node_modules`) and would fail to resolve on a
  fresh clone. Bringing the migration to `master` means committing a lockfile that actually contains
  the package, not just copying `utils.ts`.
- **De-arbitrary Tailwind: no code exists yet** — this item is a stub pending the user's markdown,
  not a partially-built feature.
- **`style: new-york`: unchanged.** No density-preset reading exists; `components.json` parsing for
  `aliases.ui`/`style`/etc. is discovery-engine.md territory and not built anywhere yet.
- **`shared/lib/constants.ts`: not yet split.** `ChatSubmitPayload`, `GenerationStartPayload`,
  `GenerationCompletePayload`, and `GenerationErrorPayload` all still live in this one 211-line file
  alongside the canvas-layout and server-filename constants. `ComponentSize` is defined here (line
  42) and separately re-exported from `registry-types.ts` (`export type { ComponentSize } from
  "@pg/shared/lib/constants"`) — the double-export is real, confirmed by reading both files.
  `STORAGE_KEY` is still the identifier name, still `'playground-canvas-state'`, consumed at
  `app/PlaygroundClient.tsx:192` and `shared/lib/canvas-persistence.ts` exactly as the rename
  preserves.
  - Note beyond the plan bullet: `shared/lib/constants.ts` defines a **fourth** `ComponentSize`
    value, `'tablet'` (with its own `SIZE_CONFIG` entry, 768×1024), that `shared/ui/ViewportButtons.tsx`
    does not wire up — that component only renders buttons for `default`/`laptop`/`mobile`. This is
    not part of the constants split above; it's a separate fact `design-panel.md` already records
    against its own breakpoint-mapping decision.
- **Bug fixes: all four confirmed present by reading the current code.**
  - `features/canvas/components/ElementHighlight.tsx` renders `sel.componentName` per selected
    element (line 136), and that value is set in `features/canvas/hooks/useElementSelection.ts`
    (line 99) from the enclosing node's `data.componentName` — not from
    `context.displayName`, which is the per-element resolved name already computed by
    `extractElementContext`. The bug is real: two different elements selected inside the same
    component preview both show that component's node-level name.
  - `shared/lib/element-context.ts`'s `getReactComponentName` (lines 35-49) walks
    `fiber.type.name` only, with no `displayName` check and no `type.render`/`type.type` unwrap —
    confirmed by reading the function.
  - The primitives filename-vs-export naming bug lives in `server/lib/static-discovery/scan.ts` on
    `feat/layers-sidebar` (this file doesn't exist on `master`, since discovery was removed there);
    not independently re-verified line-by-line here, taken from the prior audit.
  - The duplicated fiber walk is confirmed: `features/canvas/hooks/useElementSelection.ts:145`
    inlines its own `__reactFiber$`-key lookup rather than calling the shared
    `getReactComponentName` in `element-context.ts`.
- **`/api/discover/analyze`: exists only on `feat/layers-sidebar`.** `master`'s `server/routes/`
  has no `discover.ts` at all — the whole discovery route module was removed there. On
  `feat/layers-sidebar`, `server/routes/discover.ts` still defines `POST /api/discover/analyze`
  (line 465) and `DELETE /api/discover/analyze` (line 695), coupled to `discovery.json`
  bookkeeping as described above.
- **Verification commands already exist and are wired up:** `check:boundaries`, `check:knip`, and
  `check:architecture` are all defined in `package.json` and unaffected by anything above.

## Open → ROADMAP

- **De-arbitrary Tailwind** — the whole item is pending the user's markdown; nothing to track yet
  beyond "unblock this."
- **The two open decisions above** (comment-sweep findings, `/api/discover/analyze` fate) are meant
  to be resolved inline during this cleanup pass, not deferred — they're listed under Settled, not
  here, because deferring them further is exactly what this file exists to prevent. If either turns
  out to need real research rather than a quick call, it moves to `.claude/ROADMAP.md` at that point.
- **`shadcn info` (CLI v4)** — reports framework version, CSS variables, installed components, and
  doc links "for agent context." If machine-readable, it could replace hand-written
  `components.json` parsing. Spike `bunx shadcn@latest info` in Rewynd before designing around it —
  not part of this cleanup, belongs to whichever spec ends up parsing host config
  (`sidebar-tokens.md` / `discovery-engine.md`).

## Context absorbed (sources below were folded in, then retired in this docs restructure)

`.claude/plans/cozy-hatching-ember.md` (Part A4, `00-cleanup-preliminary.md` bullet) is this spec's
authority. `.claude/plans/1-diagnosis-and-cleanup.md` ("Stack" section: Base UI, cnfast, `style:
new-york`), `.claude/plans/3-sidebar-and-ui.md` (§3.7 the two ElementHighlight/fiber-walk bugs and
the duplicated `getReactComponentName`; §3.8 the Base UI portal-container caveat and the five
density presets), and `.claude/plans/4-deferred-refactors.md` (§4.2/§4.3 the constants split and
`STORAGE_KEY` rename, §4.5 the three comment-sweep findings table) supplied the detail the plan
bullet only summarizes. `spec.md` §1 (the constraints that don't move) and `journey.md`'s "From
studying Dim0" section ("cleanup first, then re-plan") supplied the ordering argument. Code read
directly to verify current state: `shared/lib/utils.ts`, `shared/lib/constants.ts`,
`registry-types.ts`, `features/canvas/components/ElementHighlight.tsx`,
`features/canvas/hooks/useElementSelection.ts`, `shared/lib/element-context.ts`, `package.json`,
`bun.lock` (all on `master`), plus `package.json`, `bun.lock`, `shared/lib/utils.ts`, and
`server/routes/discover.ts` on `feat/layers-sidebar` via `git show`. `git log --oneline
chore/cleanup -15` and `git show chore/cleanup:package.json` confirmed `chore/cleanup` carries the
same Radix/no-cnfast dependency set as `master`.

**Note on `.claude/plans/`:** this spec's authority bullet (A2) describes `.claude/plans/` as "a
flat archive of ~35 slug-named session plans (there is no numbered `1`-`4` set, no `summary.md`, no
`research/` subdir)." That description matches the global `~/.claude/plans/` directory, not this
repo's own `.claude/plans/`, which does contain a numbered `1`-`4` set, a `summary.md`, and a
`research/` subdir — that repo-local set is exactly what supplied the detail above.
