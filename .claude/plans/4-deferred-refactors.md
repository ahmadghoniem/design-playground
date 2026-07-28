# Part 4 — Deferred refactors and known gaps

**Repo:** `design-playground`. **Host:** `Rewynd`.
Read `1-diagnosis-and-cleanup.md` first for the shared request/decision log.
Siblings: `2-discovery-engine.md`, `3-sidebar-and-ui.md`.

**Status:** nothing here is started. This is the parking lot — items that were identified during the
constants audit and the `chore/cleanup` review, deliberately left undone, and would otherwise be
rediscovered from scratch every few sessions.

Each item records **why it was deferred**, so the next reader can tell "not worth it" apart from
"not yet".

---

## 4.1 Window CustomEvents → the typed `generation-events` bus

**What.** Six cross-module signals still travel on `window` as stringly-typed `CustomEvent`s, with
their names in `shared/lib/constants.ts`: `ITERATION_FETCH_EVENT`, `COMPONENT_SIZE_CHANGE_EVENT`,
`ITERATION_COLLAPSE_TOGGLE_EVENT`, `EDIT_COMPLETE_EVENT`, `OPEN_SKILLS_CATALOG_EVENT`,
`SKILLS_CHANGED_EVENT`. `shared/lib/generation-events.ts` is already a typed emitter and would be
the natural home.

**Why it was deferred — and read this before "fixing" it.** These are not laziness. React Flow
instantiates node components from `nodeTypes` with only `{ id, data, … }`, so a node **cannot be
handed a callback**, and functions can't be smuggled through `data` because nodes are
JSON-serialised to `localStorage` by `shared/lib/canvas-persistence.ts`. Every surviving event has a
React Flow node on at least one end. The rule established during the audit:

> Reach for a window event **only when a React Flow node is on one end.** Everything else uses props.

`PLAYGROUND_CLEAR_EVENT` and `FIT_COMPONENT_NODES_EVENT` failed that test and were already removed —
the first became lifted state in `PlaygroundClient`, the second was a feature deletion.

**So the real work here is not "migrate to the bus"** — it's deciding whether a typed emitter buys
anything over `window` when the constraint is that one end can't receive a callback either way. The
honest answer may be "no", in which case close this item rather than doing it.

**If done anyway:** type safety at dispatch/listen sites, and the event names stop needing to live
in `constants.ts`. Small win. Touches `useIterationScan.ts`, `ComponentNode.tsx`,
`IterationNode.tsx`, `useChatSubmit.ts`, `useSkills.ts`, `PlaygroundCanvas.tsx`.

## 4.2 Split the payload types out of `constants.ts`

**What.** `shared/lib/constants.ts` ends with ~80 lines of interfaces that are not constants:
`ChatSubmitPayload`, `GenerationStartPayload`, `GenerationCompletePayload`,
`GenerationErrorPayload`, plus `ComponentSize` / `SizeConfigEntry` / `ModelOption`.

**Why it was deferred.** Pure tidiness with no behavioural effect, and it touches a lot of import
lines for zero user-visible change — exactly the kind of churn that makes a diff hard to review
while other work is in flight.

**If done:** `ChatSubmitPayload` belongs beside the chat composer that produces it; the three
`Generation*Payload` types belong in `shared/lib/generation-events.ts`, which is what emits them.
`SIZE_CONFIG` + `getDisplayDimensions` + `ComponentSize` are a genuine cross-feature contract and
should stay — or move together to their own module, since `ComponentSize` is also re-exported from
`registry-types.ts`.

**Watch for:** `ComponentSize` has two export paths today (`shared/lib/constants.ts` and
`registry-types.ts`). Pick one before moving anything, or the split doubles the confusion.

## 4.3 `STORAGE_KEY` → `CANVAS_STATE_STORAGE_KEY`

**What.** `STORAGE_KEY = 'playground-canvas-state'` in `shared/lib/constants.ts` is the least
descriptive name in the file, and it is not the only storage key in the project — the model store
and the preview-colour-scheme store both have their own, inlined next to their consumers.

**Why it was deferred.** It is a rename with no functional content, and the persisted key **string**
must not change — only the identifier. Doing it during a large refactor risks someone "helpfully"
updating the literal too, which silently orphans every saved canvas.

**If done:** rename the identifier only. Leave `'playground-canvas-state'` exactly as it is. The
project-scoped key is built from it in `PlaygroundClient.tsx` as `${STORAGE_KEY}:${projectId}`, and
`canvas-persistence.ts` reads the bare key as a legacy fallback — both must keep working.

## 4.4 The skills installer is not implemented

**What.** `features/skills/SkillsCatalogModal.tsx` POSTs to four endpoints that don't exist, so the
entire catalog UI 404s: `/api/skills/{add,update,remove,preview}`. Only `GET /api/skills` is served.

**Why it is here.** Not deferred by choice — it predates the cleanup branch and has been broken for
a while. Recorded so it isn't mistaken for a regression from Part 1 or the cleanup.

**Where the detail lives:** a full block comment above `skillsRoutes()` in `server/routes/skills.ts`
documents the real request contracts and the seven constraints an implementation must respect. The
headline: this is a **package manager**, not a CRUD editor — `source` is `owner/repo@skill`, it
fetches from GitHub/skills.sh, and an installed skill is agent instructions injected into generation
prompts. Treat `preview` as a security control, not a convenience.

## 4.5 Three unresolved comment-sweep findings

From the Composer 2.5 comment audit (`.claude/plans/research/comment-sweep-report.md`). Twelve
findings were confirmed and fixed; three were reported as
**unverified** rather than guessed at:

| Location | Claim | What would settle it |
|---|---|---|
| `shared/lib/canvas-persistence.ts` | `gridPositions` — "grid layout positions for each skeleton node" | Nothing writes it; it is read once as a fallback beside `skeletonPositions`. Decide whether to delete the field or keep it as a legacy read. It is currently documented as legacy. |
| `server/vite-plugin.ts:34` | "Vite's cwd is the host project root — same truth the API route used" | Past tense refers to the deleted `playground-root` route. Accurate archaeology or noise — a judgement call. |
| `shared/lib/generation-events.ts:9-10` | "Replaces the window CustomEvent bus (`GENERATION_*_EVENT`)" | True, but see 4.1 — if that migration is closed as "not worth it", this comment should say so rather than implying it is pending. |

All three are low-stakes. Listed so they are not re-audited.

---

## What is deliberately NOT here

- **Discovery.** Removing it was intentional (Part 1 §1.4 plus the decision to restart Part 2 from
  scratch). Nothing writes `discovered-registry.json` today, so the registry is frozen at whatever
  the committed manifest holds. That is `2-discovery-engine.md`'s job, not a deferred refactor.
- **The annotation layer.** Researched and argued against — an Excalidraw coexistence layer can't
  bind arrows to live React Flow nodes without a fragile proxy bridge. The open question is a
  product one: *is arrow-to-component binding a hard requirement?* If floating annotations are
  acceptable the conclusion flips. Extending React Flow in place (freehand via MIT
  `perfect-freehand`, its free lasso/eraser examples, edges for bindable arrows) is the cheaper
  path and needs no Pro licence.

## Verification

Everything in 4.1–4.3 is a refactor with **no intended behaviour change**, so the bar is:

```bash
bun run check:boundaries        # zero violations
bun run check:knip              # no newly-unused exports beyond the known set
```

Then from Rewynd, with `"@pg/*": ["./src/app/playground/*"]` in its paths:

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Do **not** trust Rewynd's own `type-check` script — solution-style tsconfig without `--build`, so it
checks zero files and always passes.

For 4.3 specifically, add one manual check: load `/playground`, confirm the canvas restores from
`localStorage`, and confirm the key in DevTools still reads `playground-canvas-state:<projectId>`.
