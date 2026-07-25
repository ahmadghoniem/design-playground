# Cleanup pass — for review

Branch `chore/cleanup`, off `master`. **Removal only.** No new features, no refactors, no
behavioural changes to anything that stays. The goal is a smaller codebase to read before the next
round of work lands on top of it.

This file is a working note. Delete it once acted on.

**Result:** 1,495 lines removed, 21 added. Typecheck from the host: 119 playground files in the
program, **0 playground errors** (the host's own 84 pre-existing errors are unrelated and unchanged).

---

## What was removed, and why

Everything here is retired by an agreed plan that replaces the agent-driven component scan with
deterministic static analysis. Nothing was removed on a hunch.

### 1. The LLM discovery scan

| File | Lines | Note |
|---|---|---|
| `features/generation/prompts/discovery.prompt.ts` | 75 | The scan prompt. Its Step 3 asked the model for a one-sentence visual description of every candidate component, which forced a partial read of each file — the single largest cost in the initial scan. |
| `features/discovery/DiscoveryModal.tsx` | 404 | The scan UI: a 2.5s poll loop, a rescan button, and five scan-status states. Its only job was driving the prompt above. |
| `server/routes/discover.ts` — scan half | 333 → the file is now 322 lines shorter | `GET /api/discover` (status), `POST /api/discover` (run the scan), `DELETE /api/discover` (cancel), plus the lockfile/orphaned-process recovery machinery that existed only to survive HMR mid-scan. |
| `shared/lib/constants.ts` — `DISCOVERY_LOCKFILE_FILENAME` | 3 | Zero consumers once the lockfile machinery went. |

The scan spawned a `claude` CLI process with `cwd` at the host root, so the host's `CLAUDE.md` was
re-read on every run.

### 2. The per-component add flow

| File | Lines | Note |
|---|---|---|
| `app/PlaygroundClient.tsx` — `analyzeChildren`, the mount-time catch-up effect, `handleAddComponent`, `notifySidebar` | 237 | `analyzeChildren` looped a component's children with the `await` **inside** the loop, so adding one component with five children spawned six `claude` processes strictly in series. The catch-up effect scanned for half-analyzed parents on every page load and spawned more. |
| `app/PlaygroundSidebar.tsx` — the `+` button, "Add components" empty state, pending-add skeletons | 68 | All entry points into the flow above. |

**`playground:discovery-updated` went with it.** `notifySidebar()` dispatched this event and nothing
listened — the sidebar read the module-level `registry` under `useMemo(..., [])`, so the only thing
that actually made an added component appear was the full page reload caused by rewriting
`discovered-registry.gen.tsx`. That reload is not HMR: `registry.tsx` exports non-component values,
so it can't be a React-Refresh boundary and invalidation bubbles to the whole page.

### 3. Dead on arrival

| File | Lines | Note |
|---|---|---|
| `shared/lib/props-fetchers.server.ts` | 42 | The `propsFetchers` map ships empty, so `fetchPropsSnapshot()` always returned `null`. Its one caller wrapped it in a try/catch that swallowed the result. The prompt section instructing the agent to write fetchers into it went too. |

### 4. Misfiled, not dead

| Move | Note |
|---|---|
| `shared/ui/iterate-dialog/parts.tsx` → `shared/lib/model-selection.ts` | Contained no UI and nothing to do with iterating. It is `loadSelectedModel`, `saveSelectedModel`, and the `useAvailableModels` hook, consumed by `ModelSettingsModal`, `DockedChatBar`, and `useModelCycle`. The node-level IterateDialog it was named after is already gone; the directory existed to hold this one mis-named file. |

---

## Judgment calls a reviewer should check

**1. `POST /api/discover/analyze` and `DELETE /api/discover/analyze` were kept, and are currently
unreachable.** Nothing in the UI calls them now. They were kept because the plan retains exactly one
optional, explicitly-invoked agent call ("generate sample props"), and this is the closest existing
thing to it. But they are coupled to `discovery.json` bookkeeping that the deleted scan used to
produce, so as written they would not work end-to-end.

> **This is the one decision worth a second opinion.** Either finish removing them and let the
> replacement be written clean, or keep them and accept ~250 lines of currently-inert route code.
> Keeping them was the conservative choice, not an obviously correct one.

**2. `features/generation/prompts/discovery-analyze.prompt.ts` was edited, not deleted.** Its Step 3
(write a props fetcher) and the `propsSnapshot` parameter were removed because the file backing them
is gone. The rest is untouched. If the analyze routes go, this goes with them.

**3. The sidebar's empty state is now a sentence, not a button.** With no add flow there is nothing
to click. It reads "No components in the registry yet." Components already in
`discovered-registry.json` still list and still drag to canvas — that data is committed and was not
touched.

**4. `playground:focus-node` needed no work.** It is called out as dead in a comment on
`features/discovery/useFocusNode.ts`, but the event was already replaced by a direct `fitView` call.
Only the comment refers to it. The hook itself is live (used by `ComponentPreviewCard`).

---

## Separately: the modal that blocked the canvas

A `DonationsDialog` entry, plus `NotesDialog` and `Dialog`, had been written into
`discovered-registry.json` and `discovered-registry.gen.tsx` with `open: true` / `defaultOpen: true`.
These render through a Radix portal into `document.body` with a fixed-position overlay, which escapes
the canvas card's containment and covers the viewport — the dialog appears to open by itself and
can't be dismissed. `CLAUDE.md` explicitly warns against adopting overlay-shaped components for live
preview; the agent scan adopted them anyway.

**These were never committed** — they existed only as uncommitted working-tree changes, and are now
stashed (`agent-scan adopted dialog components (open:true) - the modal-blocking bug`) rather than
discarded, in case the props are wanted as reference. `master` and this branch are both clean of
them.

The structural fix is not in this branch: the replacement scan must exclude overlay components from
the generated module entirely — listed, never mounted.

---

## Not done here, worth knowing

- **`knip.json` already exists** and lists the real entry points, so a full unused-export sweep
  across the repo is one command away. It was deliberately not run — this pass was scoped to code a
  specific plan retires, and a repo-wide sweep is a different exercise with different risk.
- **`registry.tsx` can't be an HMR boundary** because it exports non-component values alongside
  components. Splitting the data exports out would turn full page reloads into hot updates. Real,
  independent of this cleanup, untouched.
- The **hover-to-open / auto-hide sidebar** logic in `PlaygroundClient.tsx` is still here. It is
  removed by the sidebar redesign, not by this cleanup, so it was left alone.

---

## How to verify

```bash
# from the host (Rewynd), with "@pg/*": ["./src/app/playground/*"] in tsconfig.app.json paths
npx tsc -p tsconfig.app.json --noEmit --listFiles | grep -c "app/playground"   # expect ~119
npx tsc -p tsconfig.app.json --noEmit | grep -i playground                    # expect no output
```

Do **not** trust Rewynd's own `type-check` npm script — it is a solution-style tsconfig without
`--build`, so it silently checks zero files and always passes.

Then `bun dev` in the host and open `/playground`: the sidebar lists the committed registry
components and they still drag onto the canvas; no dialog opens by itself.
