# Part 1 — Diagnosis, cleanup, branch strategy

**Repo:** `design-playground` — a local-dev-only design canvas embedded in a host React app
**Host:** `Rewynd` (React 19, Vite 7, TS 5.9, Tailwind v4, shadcn/ui, at `src/app/playground`)

**Review this part first.** Parts 2 and 3 depend on decisions made here.
Siblings: `2-discovery-engine.md`, `3-sidebar-and-ui.md`.

**Status: the cleanup described in §1.4 has been done** — branch `chore/cleanup`, commit `dc07c6a`,
1,495 lines removed, `CLEANUP.md` written at the repo root. §1.1–1.3 are the reasoning behind it and
are unchanged from the agreed plan.

---

## Requests and decisions

*Condensed from four rounds of prompts and annotations. Intent preserved; wording compressed.
Nothing is dropped — items marked **superseded** were changed later, and are kept so the reasoning
stays traceable. This section is shared context for all three parts.*

### Layout

- Sidebar docks left, always visible. Remove the collapse/toggle entirely. ✅ built
- **`PlaygroundCanvasToolbar`** sits immediately right of the sidebar. *(Round 1 said "floating
  helper widget docks right" and asked me to confirm the real component name; round 4 clarified this
  component was meant, and that it belongs beside the sidebar — **superseding** both "docks right"
  and what is currently on the branch.)*
- Shrink the canvas control widget (zoom/undo/redo). Shipped version is too small — middle ground.
- **Study 01** (single panel, three tabs on top) is the chosen layout.
- **The playground chrome is never dark.** The header's light/dark button themes the *component
  previews*, not the tool. Density presets (Mira/Nova/Vega/Lyra/Maia) likewise apply to
  components — no density switcher for the playground's own UI. Mira is the preferred feel.

### Discovery

- Diagnose the slow "Add to Playground" before changing anything — no network is involved, so find
  the real bottleneck. Suspected the per-component LLM description.
- Discovery must be **deterministic, not LLM-based**: start at the true entry point
  (`main.tsx` → `createRoot`) and statically walk the render tree.
- Drop the per-component LLM `description` field.
- "Does that mean it spawns 6 claude CLI processes?" — and, in round 4, *how* that gets fixed.
- The original sketch was rough; don't follow it blindly — research a better approach, including
  react+vite shadcn apps, OSS projects, and GitHub/Reddit discussion.
- Delete both dead code paths.
- **No "+ Add to Playground" button.** On first load the parser runs, every component is listed, and
  you drag straight from the list. *(Round 4 — supersedes the whole add/analyze click flow.)*

### Sidebar

- Replace the flat list with a **Figma-style layer tree** reflecting real composition. ✅ built
- **Primitives** tab: everything in `components/ui/` is a primitive. **No `isPrimitive` flag** — a
  file either lives in that folder or it doesn't.
- **Tokens** tab, third: read from the host's `index.css` the way shadcn documents it. Round 4:
  show **only the scheme currently previewed** — light tokens in light preview, dark in dark — not
  both side by side. *(Supersedes the shipped split-swatch.)*
- Use **CVA** to show a component's variants in the Primitives step — shadcn's own variant mechanism.
- Scope to shadcn UI first; defer the remote registry if it adds real complexity.

### Selection label

- Currently renders `<html-tag> React Component`. Propose better formats; add several to the
  artifact to pick from. Inspiration: react-grab, agentation, React DevTools.
- Round 4: liked **A** (name only) and **D** (name + variant chips). **Final: A alone** — variant
  chips deferred.

### Stack

- **Base UI instead of Radix**; **cnfast instead of clsx + tailwind-merge**. ✅ cnfast done
- Confirm this is shadcn-first and read the docs with extreme care.
- Check whether Base UI avoids the Radix portal problem. *(Round 4: the `DonationsDialog` modal on
  canvas still can't be closed — and Base UI was never actually added, so this was never tested.)*
- `style: new-york` is superseded — check https://ui.shadcn.com/create.

### Process

- Exploration/planning only. Work on a feature branch.
- Add a small chat box on the right showing the LLM's text output.
- Look at https://github.com/aidenybai (React tooling) and https://github.com/benjitaylor/agentation.
- Round 4: **don't take the built code for granted.** Cut a clean branch off `master` containing only
  the removals plus `CLEANUP.md`, and leave `feat/layers-sidebar` intact.
- Produce a **minimal `CLEANUP.md`** to hand to another LLM for review.
- Deliverable: mockups styled against Rewynd (5, after round 2). ✅ delivered

---

## 1.1 Why adding one component is slow

Investigated before proposing anything. **No network is involved — a full LLM agent process is.**

**Every add spawns a `claude` CLI process.** `spawnAgent()` runs
`spawn('claude', ['-p', '--dangerously-skip-permissions', ...])`. No SDK, no session reuse, no
batching. `cwd` is the host root, so Rewynd's `CLAUDE.md` is re-read on every run. This dominates
everything else.

**One click spawns N+1 of them, serially.** For a component with 5 children:

1. `handleAddComponent` (`app/PlaygroundClient.tsx:297`) posts to `/api/discover/analyze` for the
   parent → **process 1**. The server writes the manifest, regenerates
   `discovered-registry.gen.tsx`, then promotes the parent's `childComponents[]` into 5 new
   `discovered` entries (`server/routes/discover.ts:528-548`).
2. `analyzeChildren` (`PlaygroundClient.tsx:167-250`) loops those children with the `await`
   **inside** the loop (`:187-239`) → **processes 2–6, strictly serial.** Child 2 doesn't start
   until child 1's process exits.

The serialization exists only to drive per-child pending/analyzing/done dots. `Promise.allSettled`
with per-item state gives the same UI. A **mount-time catch-up effect** (`:254-294`) additionally
scans for parents whose children are still `discovered` and spawns more processes on page load.

**Each add rewrites the whole generated registry.** `regenerateModule()`
(`server/lib/discovered-registry.ts:101`) rewrites all of `discovered-registry.gen.tsx` from the
manifest — N+1 full-file rewrites per click.

**Each rewrite forces a full page reload, not HMR.** `discovered-registry.gen.tsx` is imported by
`registry.tsx`, which exports non-component values (`registry`, `flatRegistry`, prompt builders).
That can't be a React-Refresh boundary, so invalidation bubbles to a full reload. Combined with the
serial loop: **one reload per child, mid-flight, while further analyze requests are still being
issued from the page being reloaded.** The function's docblock claims HMR handles this; it doesn't.

**Two dead code paths.** `playground:discovery-updated` is dispatched by `notifySidebar()`
(`PlaygroundClient.tsx:162`) and nothing listens — the sidebar reads module-level `registry` under
`useMemo(..., [])`, so the full reload above is the *only* thing that makes an added component
appear. `playground:focus-node` is already documented as dead in `useFocusNode.ts`.

**No feedback, no caching, no timeout.** The analyze route runs in text mode
(`claudeDetailedStdout: false`), so the request blocks behind a `toast.loading` with no output.
Nothing memoizes an analyzed component. `DISCOVERY_TIMEOUT_MS` guards the *scan* only — the analyze
route has no timeout at all.

**The LLM-description hypothesis was half right.** `discovery.prompt.ts` Step 3 does request a
one-sentence visual description, forcing a partial read of every candidate file — but that's in the
**initial scan**, not the add. The add path's prompt generates no description. It should still go;
removing it just won't speed up adds.

## 1.2 How the six processes go away

Five of the six were never necessary. They answered "what are this component's children, and what
are their props?" — and the first half is a static property of the code.

| What the agent was doing | What replaces it |
|---|---|
| Reading a component to find its children | The syntax walk (Part 2). Children are JSX edges. |
| Deciding whether an import is a component | The type-checker pass (Part 2): *does it return `Element`?* |
| Locating the source file | `resolveSpecifier` against tsconfig paths |
| Extracting variants | `cva()` object-literal parse — no evaluation needed |
| **Inventing realistic sample props** | **Nothing. Genuinely a judgment call.** |

With the round-4 decision that everything is listed and draggable on first load, the add click
disappears too: the scan writes the manifest for **every** component it found, in one pass, and
`regenerateModule()` runs **once**. Nothing is spawned by clicking, because there is no click.

**Net: 6 automatic serial processes → 0 automatic, 1 optional and explicitly invoked**
("Generate sample data"). Page reloads per add: 6 → 0. The scan itself drops from an agent turn to
~100ms of parsing, measured on the real host.

Three separate fixes, easy to conflate: **composition stops being an LLM question at all** (the big
one); **remaining agent calls run in parallel** rather than an awaited `for` loop; **module
regeneration batches**, so N+1 reloads become 1. The last was never about CPU — those reloads were
interrupting requests still in flight from the page being reloaded.

## 1.3 Branch strategy

`feat/layers-sidebar` stays exactly as it is. Nothing is discarded, nothing is inherited by accident.

```
master ──┬── feat/layers-sidebar   (4 commits, parked, reviewable)
         └── chore/cleanup         (removals + CLEANUP.md only)   ← dc07c6a
```

`chore/cleanup` branches off `master`, so it is the codebase *without* the code that dies anyway and
*without* anything built ahead of agreement. That's the artifact to read when deciding what else to
improve.

## 1.4 What `chore/cleanup` removed — done

**Scope: only what this plan retires anyway.** No opportunistic refactors, no repo-wide dead-code
sweep — that's a separate exercise once the codebase is legible.

| Target | Lines | Why it went |
|---|---|---|
| `features/generation/prompts/discovery.prompt.ts` | 75 | The LLM scan prompt. Part 2 replaces the entire scan with static analysis. |
| `features/discovery/DiscoveryModal.tsx` | 404 | The 2.5s poll loop, rescan button, and scan-status states — all existed to drive the agent scan. |
| `server/routes/discover.ts` — scan half | 322 | `GET`/`POST`/`DELETE /api/discover` plus the lockfile and orphaned-process recovery machinery. |
| `PlaygroundClient.tsx` — `analyzeChildren`, catch-up effect, `handleAddComponent`, `notifySidebar` | 237 | The serial-process flow above, and the dead `playground:discovery-updated` event. |
| `PlaygroundSidebar.tsx` — `+` button, empty-state CTA, pending skeletons | 68 | Entry points into that flow. |
| `shared/lib/props-fetchers.server.ts` | 42 | The fetcher map ships empty, so `fetchPropsSnapshot` always returned `null`. |
| `shared/lib/constants.ts` — `DISCOVERY_LOCKFILE_FILENAME` | 3 | Zero consumers once the lockfile machinery went. |
| `shared/ui/iterate-dialog/parts.tsx` | moved | No UI, nothing to do with iterating — it is model selection. Now `shared/lib/model-selection.ts`. |

**Two things came out differently than planned, and are flagged in `CLEANUP.md` for review:**

1. **The `/api/discover/analyze` routes were kept and are currently unreachable.** They are the
   closest existing thing to the one surviving optional agent call, but they're coupled to
   `discovery.json` bookkeeping the deleted scan produced, so they wouldn't work end-to-end as
   written. Keeping them was the conservative choice, not an obviously correct one — **this is the
   decision worth a second opinion.**
2. **`DonationsDialog` was never committed.** It, `NotesDialog`, and `Dialog` existed only as
   uncommitted working-tree writes from an agent scan, all with `open: true`. They're now stashed
   rather than discarded. Both `master` and `chore/cleanup` are clean of them. The structural fix
   belongs to Part 2 §2.3: the replacement scan must exclude overlay components from the generated
   module entirely — listed, never mounted.

---

## Verification

Done and passing:

```bash
# from Rewynd, with "@pg/*": ["./src/app/playground/*"] in tsconfig.app.json paths
npx tsc -p tsconfig.app.json --noEmit --listFiles | grep -c "app/playground"   # 119
npx tsc -p tsconfig.app.json --noEmit | grep -i playground                     # no output
```

Do **not** trust Rewynd's own `type-check` npm script — solution-style tsconfig without `--build`,
so it silently checks zero files and always passes.

Still to confirm by hand: `bun dev` in the host, open `/playground` — the sidebar lists the committed
registry components, they still drag onto the canvas, and no dialog opens by itself.
