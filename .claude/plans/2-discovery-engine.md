# Part 2 — The discovery engine

**Repo:** `design-playground`. **Host:** `Rewynd`.
Read `1-diagnosis-and-cleanup.md` first — it carries the shared request/decision log and establishes
why the agent leaves this path. Sibling: `3-sidebar-and-ui.md`.

**Status:** the syntax pass, host-config reading, CVA extraction, and token parsing are built and
parked on `feat/layers-sidebar`. The type-checker pass and the JSX stamp are not.

---

## 2.1 What the prior art actually says

**The tools closest to this feature don't rely on static analysis at all.**

[**Onlook**](https://github.com/onlook-dev/onlook) (Apache 2.0) is the nearest analogue that
exists — an open-source visual editor with a layers panel over a live React app. Its shape:
load code → run it → index it → **stamp identity into the JSX** → layers panel reads the live DOM →
visual edit → use the stamp to locate the JSX → patch the file → HMR.

**Correction after pulling the local copy** (`~/Documents/GitHub/onlook`, fetched to `origin/main`
@ `423e2e92`; the three new commits are an IDOR fix and two README images — nothing architectural).
Reading `packages/parser/src/ids.ts` changes one thing that was wrong in the first draft:

> Onlook's `data-oid` values are **random opaque IDs written into the user's source files** by a
> Babel transform, with global/local uniqueness tracking and per-branch ownership. They are *not*
> `file:line` stamps computed at build time.

That distinction matters. Onlook needs *stable* ids because it **edits** JSX and line numbers shift
under it. We only **read**. So we take the idea — put the answer in the markup instead of inferring
it — and deliberately reject the mechanism: **we never write to host source.** Zero diff to the host
is this package's entire value proposition. Our stamp is computed in a Vite transform, exists only in
the served module, and is `file:line:col`.

**Storybook, Ladle, React Cosmos** take the opposite escape route: they auto-discover *nothing*,
requiring hand-authored `.stories.tsx`. That makes the developer declare the answer — precisely what
this feature must avoid.

**Pure static visualizers exist but have poor survival rates.** React Monocle, ReacTree, React Sight,
Realize, envision-jsx, react-component-hierarchy — a long line of parse-the-source tree visualizers,
most abandoned. That pattern is itself evidence: static-only analysis of a React tree is brittle
enough that projects built on it tend not to last. One good idea from a survivor — the
`react-component-tree` VS Code extension gives **visual indication of conditional rendering**.

[**Preview.js**](https://fwouts.com/articles/previewjs-detecting-components) is the exception. It
auto-detects via the TypeScript `TypeChecker`: is the symbol callable, and does a call signature
return `Element`? Two type-level questions instead of naming conventions — so `const Bar = Foo`
resolves for free, and capitalized non-components don't produce false positives. Known gap:
`forwardRef`, `memo`, and HOCs need explicit unwrapping.

## 2.2 Three techniques, three questions

| Question | Technique | Why this one |
|---|---|---|
| Which components render which? (tree edges) | Syntax-only `ts.createSourceFile`, walk JSX | Edges are pure syntax. Single-digit ms per file. |
| Is this export really a component? What does this identifier resolve to? | `TypeChecker.getTypeAtLocation` → call signatures → return type `Element` | Handles aliases, re-exports, barrels, `export *` — all of which the syntax pass gets wrong. |
| Which source line produced *this* DOM element? | Build-time JSX stamping (§2.4) | A lookup instead of an inference. Also fixes the selection label. |

The fast syntax pass builds the graph; the type checker validates and resolves nodes; the stamp puts
ground truth in the DOM. The type pass is the expensive half, so it runs **once per scan**, cached by
file mtime — not per component. `ts-morph` wraps the same `TypeChecker`; use it only if the
ergonomics justify it.

**Already built and uncontested** (`server/lib/static-discovery/`, on `feat/layers-sidebar`): the
syntax pass, host-config reading, CVA extraction, and token parsing. Measured on Rewynd: entry `App`
@ `src/app/index.tsx`, **61 files parsed in ~100ms, 0 unresolved specifiers**, 17 primitives (3 with
CVA), 41 tokens.

## 2.3 Walk algorithm

1. **Locate the entry.** Read the host's `vite.config`/`index.html`; fall back to `src/main.tsx`.
   Detect `createRoot(...).render(<X />)` and resolve `X`. Verified on Rewynd.
2. **Walk down** through local imports, recording JSX elements resolving to non-`node_modules`
   modules. Cycle-guard by resolved absolute path; depth-cap.
3. **Resolve specifiers** against `tsconfig.app.json` paths (`@/*` → `./src/*`), following
   `extends`/`references`, plus relative and `index.*` resolution.
4. **Emit** `{ id, name, sourcePath, line, usedIn, children[], conditional? }`. Mark `conditional`
   when the JSX sits inside a ternary, `&&`, or `.map()`, so the tree can say "may not render"
   rather than implying a runtime guarantee.
5. **Write the manifest for everything found, once**, then call `regenerateModule()` **once**. This
   is what makes every component draggable on first load with no click and no agent.

**Consequence to design for:** the generated module will eagerly import ~60 host components.
Acceptable in dev, but overlay components (`Dialog`, `Sheet`, `DonationsDialog`, …) must be
**excluded from the generated module entirely** — listed in the tree, never mounted. This is the
structural fix for the modal that covered the canvas; Part 1 only removed the symptom.

## 2.4 Build-time JSX stamping

Stamp each JSX element with its origin as it's served, so element → source is an attribute read:

```jsx
<Button data-pg-src="src/components/ui/button.tsx:46:19" />
```

**Reuse the parser; don't add Babel.** Every published variant of this
([`@metagptx/vite-plugin-source-locator`](https://www.npmjs.com/package/@metagptx/vite-plugin-source-locator),
[`babel-plugin-transform-react-jsx-location`](https://github.com/adrianton3/babel-plugin-transform-react-jsx-location),
`@react-dev-inspector/babel-plugin`) is a Babel plugin, which would mean adding a Babel pass to a
host that has none. We don't need to: §2.2 already parses the same files, and
`server/vite-plugin.ts` already hooks Vite. Add a `transform` hook walking JSX with the same
`ts.createSourceFile` machinery. **One parser, two outputs.**

Constraints: dev-only, host-source-only, never `node_modules`, never written to disk. Attribute name
goes in `shared/lib/constants.ts` (a genuine cross-module contract) and must be handled in
`EXCLUDE_SELECTORS` so playground chrome is never stamped or selected.

**Measure HMR cost before committing** — the highest-risk unknown in the plan. Fallback: stamp only
files the walk already identified as components.

**What it unlocks:** exact `file:line:column` on every element, feeding agent prompts real source
anchors instead of CSS selectors, and removing the fiber walk from the hot path — including its
`forwardRef`/`memo` name-resolution gap (Part 3 §3.7).

## 2.5 Runtime enrichment (v2, opt-in)

Static analysis can't see `.map()` output, unrendered branches, components passed as props, or —
most importantly — **real props**. That last gap is the only reason an LLM was ever needed here.

A second pass mounts the host's `<App />` in a hidden container and uses
[bippy](https://github.com/aidenybai/bippy)'s `traverseFiber` to read the real fiber tree, merging
actual props and confirming which static branches render. Real risk (side effects, data fetching,
providers, routing), so **opt-in, behind a toggle, degrading to static-only.** Ship static in v1.

## 2.6 Deferred

shadcn's **remote registry** (network install) — out of scope for v1, per round 1.

---

## Open questions owned by this part

1. **Stamping HMR cost** — does stamping every host JSX element in a Vite `transform` measurably slow
   HMR? Highest-risk unknown in the whole plan; §2.4 underpins both source anchors and the label
   fallback.
2. **Runtime enrichment safety** — how much of a real host can mount offscreen without side effects?
   Determines whether §2.5 is viable at all.
3. **Eager-import ceiling** — a generated module importing ~60 host components is fine in dev, but
   worth measuring cold-start before assuming it. (§2.3)

---

## Verification

`GET /playground/api/discover/tree` returns the tree; hand-check it against `src/app/index.tsx`.
Time a cold scan. Inspect host DOM for `data-pg-src` on host elements and its **absence** on
`node_modules` and playground chrome; measure HMR before/after on a warm dev server. Confirm agent
spawns per page load: 0.
