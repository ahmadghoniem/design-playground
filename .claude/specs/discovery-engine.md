# Discovery engine

The deterministic, non-LLM static scan that finds the host's components and replaces the
agent-driven "Add to Playground" flow.

---

## Settled

- **Deterministic, not LLM.** Discovery is a static property of the code, not something an agent
  should describe. Locate the host's true entry point — `createRoot(...).render(<X />)` (fall back
  through conventional filenames if `main.tsx` isn't it) — and walk the render tree down through
  local imports. **The render argument is usually a wrapper, not the app**: `<StrictMode>`, a
  provider stack, a router root. Unwrap down to the first local component, or the default Vite
  template scans to an empty tree.

- **Replaces N+1 serial `claude` spawns per add with 0 automatic, 1 optional.** Today, adding one
  component with 5 children spawns 6 `claude` CLI processes, strictly serially (the child loop
  `await`s inside the loop), because the agent was answering two questions that are actually static
  ("what are this component's children" and "is this import a component") plus one genuine judgment
  call ("invent realistic sample props"). The first two become the deterministic scan; the third
  becomes **"Generate sample data"** — optional, explicitly invoked, never automatic. Net: 6
  automatic serial processes → 0 automatic, 1 optional. Page reloads per add: 6 → 0 (each
  `regenerateModule()` call today forces a full page reload, not HMR, because the generated module is
  imported by `registry.tsx`, which exports non-component values — that can't be a React-Refresh
  boundary). The scan itself drops from an agent turn to ~100ms of parsing.

- **Three passes, three questions:**

  | Question | Technique | Status |
  |---|---|---|
  | Which components render which? (tree edges) | Syntax-only `ts.createSourceFile`, walk JSX — no `Program`, no `TypeChecker`, because edges are pure syntax | **Built** |
  | Is this export really a component? What does this identifier resolve to? | `TypeChecker.getTypeAtLocation` → call signatures → return type `Element`. Handles aliases, re-exports, barrels, `export *` — all of which the syntax pass gets wrong | **Not built** |
  | Which source line produced *this* DOM element? | Build-time JSX stamping: `data-pg-src="file:line:col"`, written by a Vite `transform` hook reusing the same `ts.createSourceFile` machinery — no Babel pass added to the host | **Not built** |

  Host-config reading (`components.json` → `aliases.ui`, tsconfig `paths`), CVA extraction, and
  token parsing are also **built** — they're not one of the three tree-walk passes, but they're the
  other deterministic replacement for what the agent used to read out of the file.

  The type pass is the expensive half, so it runs once per scan, cached by file mtime — not once per
  component.

- **Node shape:** `{ id, name, sourcePath, line, usedIn, children[], conditional? }`. `conditional`
  is set when the JSX sits inside a ternary, `&&`, or `.map()`, so the tree can say "may not render"
  instead of implying a runtime guarantee.

- **Write the manifest for everything found, once, then call `regenerateModule()` once.** This is
  what makes every component draggable on first load with no click and no agent. Baseline measured
  on the real host (Rewynd): entry `App` @ `src/app/index.tsx`, 61 files parsed in ~100ms, 0
  unresolved specifiers, 17 primitives (3 with CVA), 41 tokens.

- **Overlays excluded from the generated module — listed, never mounted.** The generated module will
  eagerly import ~60 host components; overlay primitives (`Dialog`, `Sheet`, and the like) must be
  excluded from it entirely, not just flagged. This is the structural fix for the modal that covers
  the canvas — removing the symptom (Part 1's cleanup) isn't the same as removing the cause.

- **Drop the per-component LLM `description`.** The old scan prompt forced a partial read of every
  candidate file to write one sentence of visual description. It goes; the deterministic node shape
  above never had a description field to begin with.

- **No "+ Add" button.** On first load the parser runs, every component is listed, and dragging is
  the only interaction — the whole add/analyze click flow is superseded, not extended.

- **Prior art absorbed.** [Onlook](https://github.com/onlook-dev/onlook) is the nearest analogue —
  load code, run it, index it, stamp identity into the JSX, read the live DOM, edit, locate via the
  stamp, patch, HMR. Its `data-oid` stamps are random opaque IDs written into the user's source by a
  Babel transform, because Onlook *edits* JSX and line numbers shift under it. We only read, so we
  take the idea — put the answer in the markup instead of inferring it — and reject the mechanism:
  **never write to host source.** The stamp is computed in a Vite transform, exists only in the
  served module, and is `file:line:col`, not a source mutation. Storybook, Ladle, and React Cosmos
  auto-discover nothing and require hand-authored story files — the opposite of what this feature
  needs, since that makes the developer declare the answer. Pure static visualizers (React Monocle,
  ReacTree, React Sight, Realize, envision-jsx, react-component-hierarchy) have poor survival rates —
  evidence that static-only analysis is brittle enough that projects built on nothing else tend not
  to last; one surviving idea worth keeping is `react-component-tree`'s visual indication of
  conditional rendering, which is why `conditional` is in the node shape. **Preview.js** is the
  exception and the model for the type-checker pass: it auto-detects via the TypeScript
  `TypeChecker` — is the symbol callable, and does a call signature return `Element`? — instead of
  naming conventions, so `const Bar = Foo` resolves for free and capitalized non-components don't
  false-positive. Known gap: `forwardRef`/`memo`/HOCs need explicit unwrapping.

## As the code is today

Read from `feat/layers-sidebar` (deleted 2026-08-23 at `6c685a8`; what was worth keeping is folded
into the section below and into `library-primitives.md`, `design-variables.md` and
`library-layers.md`) and current `master` (`registry.tsx`, `server/lib/discovered-registry.ts`).

- **Nothing implements discovery anywhere now.** Two parallel systems coexisted on
  `feat/layers-sidebar` — the deterministic scan described below and the older agent-driven flow it
  was replacing — and that branch was deleted. `registry.tsx` is
  `export let registry = discoveredRegistry`, read-only until something writes
  `discovered-registry.json` again, and the manifest is a per-project artifact that is never
  committed, so a fresh checkout starts with an empty registry.

- **The deterministic scan (syntax pass + host-config + CVA + tokens) is built and already wired to
  a route.** `GET /api/discover/tree` (`server/routes/discover.ts`) calls `readHostConfig()` →
  `scanRenderTree()` → `scanTokens()` synchronously per request — no agent, no lockfile, no polling.
  Its own code comment already states the measured cost: "No agent, no network. Compare against
  `POST /api/discover`, which spawns the Claude CLI and takes minutes; this runs in ~100ms on a
  60-file host" — an independent confirmation of the plan's baseline number. `scanPrimitives()`
  already tags overlay primitives (`dialog`, `alert-dialog`, `sheet`, `drawer`, `popover`, `tooltip`,
  `dropdown-menu`, `context-menu`, `select`, `combobox`, `command`, `menubar`, `navigation-menu`,
  `hover-card`) with `overlay: true` via a hardcoded `OVERLAY_PRIMITIVES` set — but this flag is only
  read by the Primitives sidebar tab (to show a `Ban` icon); nothing yet uses it to exclude an
  overlay component from a generated, mountable registry entry, because nothing yet generates
  registry entries from this scan at all (next point).

  `RenderTreeNode`'s actual shape in `scan.ts` — `{ id, name, sourcePath, line, usedIn?,
  conditional?, children }` — matches the settled node shape exactly.

- **The scan does not write the manifest.** `GET /api/discover/tree` only returns JSON to the
  client for the Layers tab tree; it never calls `writeManifest()` or `regenerateModule()`. So "every
  component listed and draggable on first load, no click, no agent" is not built — the render tree
  is read-only today, consumed once by `useStaticScan.ts` per sidebar-tab mount.

- **`regenerateModule()` no longer exists and has to be rebuilt.** It lived in
  `server/lib/discovered-registry.ts` on `master` — read the manifest, rewrite
  `discovered-registry.gen.tsx` wholesale — alongside `readManifest`, `writeManifest`,
  `manifestPath`, `modulePath` and the entry types. All of it had zero callers once the scan was
  removed and all of it was deleted; that file now keeps only `ensureModuleExists`, which writes an
  empty generated module at server boot so `registry.tsx`'s static import resolves. The deleted
  branch also had a `POST /api/discover/regenerate` route and a `deferRegen` flag on
  `POST /api/discover/analyze`, whose doc comment stated the intent directly: "Batch callers analyze
  N children with `deferRegen: true` and then call this a single time, turning N+1 full page reloads
  into one." Rebuild the batching behaviour, not the per-click flow that drove it.

- **Where the generated module is written is an open question, not a settled one.** Both artifacts
  describe the *host's* components and belong to the host, but `link.mjs` junction-mounts this
  package into the host, so `path.join(playgroundDir, filename)` writes into the package's own
  source tree. That is how a host's components came to be committed here once already. Any rewrite
  that keeps `PLAYGROUND_DIR = resolvePlaygroundDir()` as the write target reproduces it verbatim —
  see Open.

- **The old LLM-driven flow is what's actually wired to the sidebar's "+" button.** Confirmed both
  in `library-layers.md` ("first-load still has a button and an agent") and by reading
  `DiscoveryModal.tsx` and `discover.ts` directly: `POST /api/discover` spawns one `claude` process
  running `discoveryPrompt()` (an `rg --files` candidate list, then per-file INCLUDE/SKIP
  classification, then a one-sentence `description` per entry — the exact field this spec drops) to
  write `discovery.json`. Clicking "Add" on a card then `POST`s to `/api/discover/analyze`, which
  spawns a second `claude` process running `discoveryAnalyzePrompt()` to write a
  `discovered-registry.json` entry (component name, import path, size, inline props) and promote the
  component's `childComponents[]` into new `discovered` entries in `discovery.json` — which is
  exactly the N+1-serial-spawns shape this spec replaces.

- **Not built at all: the TypeChecker pass.** `scan.ts`'s own header comment is explicit about the
  gap it's leaving open: "no Program and no TypeChecker, because tree *edges* are pure syntax...
  Resolving what an identifier really points at (aliases, barrels, `export * from`) is a type-level
  question and is deliberately not attempted here; unresolved specifiers are reported rather than
  guessed at." `ScanResult.unresolved` is the visible seam — a list of import specifiers that looked
  local but didn't resolve, surfaced instead of silently dropped.

- **Not built at all: JSX stamping.** No `data-pg-src` attribute, Babel plugin, or Vite `transform`
  hook exists anywhere in the tree on any branch. It is illustrative-only in the plan record —
  `.claude/plans/summary.md` shows the intended before/after but flags it "planned — illustrative,
  not in repo."

## Open

- **Stamping HMR cost** — does stamping every host JSX element in a Vite `transform` measurably slow
  HMR? The highest-risk unknown; the whole feature (source anchors, and the selection-label fallback)
  depends on the answer being "no" or on a workable fallback (stamp only files the walk already
  identified as components).
- **Runtime enrichment v2 (bippy, opt-in).** Static analysis can't see `.map()` output, unrendered
  branches, components passed as props, or real props — the only reason an LLM was ever needed here.
  A second pass would mount the host's `<App />` in a hidden container and use
  [bippy](https://github.com/aidenybai/bippy)'s `traverseFiber` to read the real fiber tree. Real
  risk (side effects, data fetching, providers, routing) — opt-in, behind a toggle, degrading to
  static-only. Ship static-only in v1.
- **Eager-import ceiling.** A generated module importing ~60 host components is fine in dev, but
  cold-start cost is worth measuring before assuming it stays fine.
- **Where per-project artifacts are written.** The manifest and the generated module describe the
  host's components and belong to the host, but the package is junction-mounted into the host by
  `link.mjs`, so "write beside `registry.tsx`" and "write into the framework source tree" are the
  same filesystem event. The junction is the cause, not the ignore rules, and it is kept
  deliberately because it is what makes package edits hot-reload in the host. The leading option is
  a host-owned output directory at `process.cwd()` with the Vite plugin remapping
  `./discovered-registry.gen` in `resolveId`, so `registry.tsx`'s static import and its
  `hot.accept` specifier stay package-relative. Risks: `resolveId` and `hot.accept` must agree or
  HMR of adds and removes dies silently; standalone `bun server/index.ts` would need the host cwd.
  Ruled out: resolving the mount's real path (it *is* this package), gitignore (a commit filter,
  not a write barrier), and a read-only junction (Windows will not give one without giving up live
  HMR). Note this is a class of problem, not one pair of files — `iterations/`, `tree.json` and
  `data/*.mockData.ts` write through the same mount.

- **Remote registry** — shadcn's network-install registry is out of scope for v1.
- **CVA `compoundVariants`.** `extractCva()` has two known bugs: it returns after the first `cva()`
  call in a file, and `compoundVariants` (which suppresses invalid variant combinations) is ignored
  entirely.
