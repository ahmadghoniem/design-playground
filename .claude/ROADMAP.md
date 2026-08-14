# Roadmap

Open work only — completed work lives in git history. Each line says what it is and where it
stands, so nothing needs re-deriving. `[tags]` mark the area.

`.claude/specs/` is the post-cleanup source of truth, split per feature so each spec is small
enough for a Fable audit. `00-cleanup-preliminary` lands on `main` first; after that, `main` is
the base every feature spec builds from. Specs are referenced by filename (e.g.
`branch-model.md`, `design-panel.md`).

Several items below are **built but parked on `feat/layers-sidebar`**. They need reviving and
merging, not rebuilding.

## How we work on specs

1. Specs live in `.claude/specs/`, audited with Fable and locked before any code is generated.
2. `00-cleanup-preliminary` (Base UI + cnfast + de-arbitrary Tailwind) lands on `main` first —
   commit and push — then `main` is the base for everything after it.
3. One branch per spec, pushed when it lands. Independent features branch off `main` and merge on
   their own. Stack a spec on another only on a real code dependency (e.g. design-panel needs the
   sidebar's selection), to avoid the rebase churn of a long linear stack.
4. The prototype is the UI-alignment gate — clear it before implementing a spec whose UI is still
   moving.
5. Each spec is iterated with Fable, nothing taken for granted. The right design panel collects
   multiple references and goes back and forth until its UI is definite.

**Still to settle (open):**
- The exact end-to-end git workflow.
- What the Help & Resources button shows on click. Starting point: `image.png`'s popover — Docs,
  Keyboard shortcuts, Give feedback, Submit a prompt, Contact us, Discord community, What's new.

## Building

- **[prompts]** Token list generated from the host stylesheet — not started. The styling rule
  currently hand-writes 8 token names + "etc." Rewynd maps 41 utilities but defines only 28.
  Stopgap: drop the "etc." and name the 13 dead ones (`chart-*`, `sidebar*`) as forbidden.
- **[previews]** Portal-to-card overlay containment — approach chosen, nothing written. Point each
  overlay primitive's portal at the preview card *and* make the card a positioning boundary; both
  halves or neither. Must be verified by hand on a real dropdown — upstream has a known rough edge
  with focus/scroll inside transformed containers.

## Next

- **[canvas]** Measured width for iteration placement — one line. `useCanvasDragDrop.ts` uses
  `DEFAULT_COMPONENT_NODE_WIDTH` (650) unconditionally, which matches no real component, so
  narrow presets get a ~455px gap.
- **[previews]** Label failed cards — not built. A card that fails to render should say why on its
  face instead of appearing blank. Pairs with a per-card error boundary.
- **[chore]** Cleanup pass, then re-plan — the codebase is due a tidy before more feature work is
  planned on top of it. Several small bugs below are cheap once this happens.
- **[chore]** cnfast migration — done on `feat/layers-sidebar` (`dd22a55`), absent from master.
  Master still runs `twMerge(clsx())`. Note `node_modules/cnfast@0.0.8` is installed but missing
  from `package.json` and `bun.lock`, so an import resolves locally and breaks on a fresh clone.
- **[research]** The editor's override slot — `className={cn("p-4", editParam)}`, live while
  dragging and flattened on save. Research current best practice for writing Tailwind classes back
  into React source before committing to this shape. Deferred; blocks the design panel.
- **[research]** Stable names for recoverable failures — which names, and the table telling the
  agent what each one means. The framing is settled; the mechanism is not.

## Later

- **[sidebar]** Layers tab — built, parked on `feat/layers-sidebar`. Wants indent guides, keyboard
  nav, ARIA tree semantics, ancestry-preserving search, per-project expansion state.
- **[sidebar]** Primitives tab — built, parked on the same branch. Known bug: rows read `button`
  instead of `Button` because the scan uses the filename rather than the exported identifier.
- **[sidebar]** Tokens tab — built, parked on the same branch. Already earned its keep by finding
  Rewynd's 13 mapped-but-undefined variables.
- **[sidebar]** Variant chip drag payload — broken on the branch. Chips encode
  `` `${name}?${group}=${opt}` `` into one string; nothing splits it, so the drop creates a node
  with a componentId no registry entry matches. Fix: carry `{ componentId, props }` as structured
  data on both sides.
- **[sidebar]** Control sizing — canvas zoom/undo/redo widget and view-control buttons are too
  small. Target ~32px buttons, `p-1.5`, 16px icons.
- **[agent]** Agent-output panel — not built. Collapsible right-edge strip streaming the
  generation output that already flows through `generate.ts` / `claude-jsonl.ts`.
- **[agent]** Skills installer — the UI exists, the backend does not.
  `/api/skills/{add,update,remove,preview}` are unimplemented.
- **[discovery]** Static discovery engine — partly built on `feat/layers-sidebar`. The syntax pass,
  host-config reading, CVA extraction and token parsing exist; the TypeChecker pass does not. This
  is what removes the 6 serial `claude` spawns per component add.
- **[discovery]** CVA extraction bugs — `extractCva` returns after the first `cva()` call (stock
  shadcn files declare several) and ignores `compoundVariants` entirely.
- **[stack]** Base UI migration — not started. Go component by component; partial is a stable
  resting place. Do the behaviourally-different ones (dialog, sheet) before the highest
  `asChild` count. Budget for the backdrop rename and the open/closed state-attribute rename,
  which touches every overlay's Tailwind selectors.
- **[canvas]** Split `constants.ts` — 261 lines down to ~65. Single-consumer filename constants
  inline at their use site; types move to their owning modules; canvas geometry to its own file.
- **[evals]** Eval harness — removed, to be rebuilt. Model to copy: drive the real generation loop
  with canned `stream-json` output and assert on the structure of what comes out.

- **[research]** Tagging every canvas change with its author (person / agent / undo) — research
  whether it actually improves undo/redo before it becomes a decision.
- **[research]** Per-component branching — "Keep this version" creating a branch per component gets
  cumbersome once several components are edited in one pass. Same question covers the dirty-working-
  tree stop and its one-click stash. Phase 2 of the git flow; does not block phase 1.

## Parked
- **[canvas]** Workspace tabs / pill / stash. Replaced by the composer branch picker as the
  workspace switcher (one canvas, checkout to move). Frozen tab prototypes stay under
  `.claude/prototype/variant-*.html`. Don't re-propose a second canvas or a tab strip.
- **[discovery]** Build-time JSX source stamping — `data-pg-src="file:line:col"` via the existing
  Vite transform, giving agent prompts real source anchors. Parked on an unmeasured HMR cost,
  which was flagged as the highest-risk unknown in the original plan.
- **[previews]** A frame per preview — dropped in favour of portal-to-card containment, which keeps
  alt-click element selection working. Reconsider only if containment fails in the browser.
- **[stack]** Model catalogue as data — only Claude Code is supported today. Revisit when a second
  provider or agent (Cursor, Antigravity) lands.
