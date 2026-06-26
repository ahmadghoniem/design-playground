# Task 09 — Excise the signup-Flow demo feature

**Type:** excision · **Risk:** high · **Depends on:** none · **Do BEFORE Task 10** · **Blast radius:** ~18 files

## Goal

Remove the **signup-Flow "decompose into stages" demo feature** in its entirety. It is a domain-specific demo (a signup page broken into stages with mock data and a simulator) that does not belong in a general-purpose design playground. After this task the canvas keeps components, iterations, frames, draw/shape tools, discovery, and generation — but has no "Decompose into stages", no StageNodes, no FlowSimulator, no MockDataPanel.

## ⚠️ Naming hazard — read before touching anything

"Flow" is overloaded. **Do not** touch `@xyflow/react` ("React Flow"), which is the canvas engine. Specifically these are **CORE — KEEP**:
- `import { ReactFlow, useReactFlow, ... } from '@xyflow/react'`
- `lib/canvas-flow.tsx` / `useCanvasFlow()` — canvas state hook
- any `screenToFlowPosition`, `flowPosition`, `.react-flow__*` CSS, `reactFlowWrapper`

The feature to remove is the **signup-Flow** feature, identifiable by these symbols: `FlowSimulator`, `FlowAdoptModal`, `MockDataPanel`, `StageNode`, `StageGroupNode`, `FlowDecomposePayload`, `FLOW_DECOMPOSE_EVENT`, `FlowAdoptPayload`, `FlowPlayPayload`, `findFlowDescriptor*`, `flowsByComponentId`, `useFlowMocksStore`, `StageNodeData`, `signupFlow`, `SignupPageShell`, "Decompose into stages".

## Files to DELETE

```
components/flow/EmailSentPanel.tsx
components/flow/LogoMarquee.tsx
components/flow/PlanCards.tsx
components/flow/SignupForm.tsx          (delete the whole components/flow/ dir)
components/FlowSimulator.tsx
components/FlowAdoptModal.tsx
components/MockDataPanel.tsx
components/SignupPageShell.tsx
components/stage-renderers.tsx
data/flows/signup.ts                    (delete data/flows/ dir; keep data/ai-models.json)
lib/flows/registry.ts
lib/flows/types.ts                      (delete lib/flows/ dir)
lib/flow-mocks-store.ts                 (or stores/flow-mocks-store.ts if Task 08 ran first)
nodes/StageNode.tsx
nodes/StageGroupNode.tsx
server/routes/flow-adopt.ts
```

> Before deleting each, `git grep` its exported symbols to be sure no *core* code consumes them. The integration points below are the expected consumers — clean those, then the deletes are safe.

## Integration points to CLEAN (not delete the host file — surgically remove the feature)

> **Over-delete guard (Operating Rule 2).** Every file in this section is a **shared** file that keeps most of its content. Remove *only* the flow-feature lines; do not delete whole functions, effects, imports-groups, or JSX blocks because one line inside them is flow-related. After editing each file, it must still compile and its non-flow behaviour must be untouched. If a `useEffect`/handler does flow work *and* other work, excise the flow branch and keep the rest. Edit, re-read the file, confirm only flow lines are gone.


### `lib/constants.ts`
Remove the flow event + payload types and the event-name constants:
- `FLOW_DECOMPOSE_EVENT`, `FlowDecomposePayload`
- `FlowAdoptPayload`, `FlowPlayPayload`, and any `FLOW_*`/`STAGE_*` event constants
- `git grep -n "FLOW_\|FlowDecompose\|FlowAdopt\|FlowPlay\|Stage" lib/constants.ts` to find them all. Leave unrelated constants intact.

### `nodes/ComponentNode.tsx`
- Remove the import `import { FLOW_DECOMPOSE_EVENT, type FlowDecomposePayload } from '../lib/constants'` (line ~9) and the `findFlowDescriptorForComponent` import.
- Remove `flowDescriptor` resolution (line ~124), `handleDecompose` callback (~127–131), and the **Decompose chip** button JSX (~636–650, the `onClick={handleDecompose}` / "Decompose into N stages" tooltip).
- The node keeps every other chip and behaviour.

### `nodes/IterationNode.tsx`
- Remove the **stage canonical wiring** (lines ~95–108): the `parentForStage`/`StageNodeData` lookup, `useFlowMocksStore` `canonicalSet`/`setCanonical` reads.
- Remove the "Set as canonical for this stage" UI (line ~749) shown when the parent is a StageNode.
- Everything else in IterationNode stays. (Note: Task 15 deepens this file separately — coordinate; do 09 first so 15 deepens less code.)

### `PlaygroundCanvas.tsx`
- Remove imports (lines ~51–62): `StageNode`, `StageGroupNode`, `findFlowDescriptorForComponent`, `useFlowMocksStore`, `MockDataPanel`, `FlowSimulator`, `FlowAdoptModal`, `StageNodeData`, and `FlowDecomposePayload` (line ~156).
- Remove `nodeTypes` entries `stage` and `stageGroup` (lines ~189–190).
- Remove `MINIMAP_NODE_COLORS` entries `stage` / `stageGroup` (lines ~202–203).
- Remove the **entire decompose handler effect** (lines ~5037–5163): `handleDecompose`, the `FLOW_DECOMPOSE_EVENT` listener add/remove, StageNode/edge creation, `useFlowMocksStore.getState()` usage.
- Remove the rendered `<MockDataPanel />`, `<FlowSimulator />`, `<FlowAdoptModal />` (lines ~5842–5844).

### `PlaygroundHeader.tsx`
- Remove `FlowAdoptPayload` / `FlowPlayPayload` imports (line ~14), the `flows = useFlowMocksStore(...)` read (~125), and the play/adopt handler that switches on those payloads (~133). Remove any header UI that lists flows. (Task 17 deepens this file — do 09 first.)

### `server/index.ts`
- Remove the mount of `flowAdoptRoutes()` (the route factory from `server/routes/flow-adopt.ts`). `git grep -n "flow-adopt\|flowAdopt" server/` to find the import and `.route(...)`/`.mount` call. Remove both.

## Step-by-step

1. **Clean integration points first** (constants → nodes → canvas → header → server). This makes the feature unreachable.
2. **Then delete the feature files** listed above.
3. **Sweep:** `git grep -in "FlowSimulator\|FlowAdopt\|MockDataPanel\|StageNode\|StageGroup\|flowsByComponentId\|findFlowDescriptor\|useFlowMocksStore\|FLOW_DECOMPOSE\|FlowDecompose\|FlowPlay\|signupFlow\|SignupPageShell\|stage-renderers\|StageNodeData"` → **zero** hits.
4. **Confirm React Flow untouched:** `git grep -c "@xyflow/react"` unchanged; `useCanvasFlow`/`lib/canvas-flow.tsx` intact; canvas still imports `ReactFlow`.

## Verification

- Host `bun dev`, open `/playground`.
- Drop a component → its node shows its normal chips but **no "Decompose into stages"** button.
- No StageNodes can be created; no MockDataPanel / FlowSimulator / FlowAdopt modal mounts.
- Core canvas still works end-to-end: drag-to-iterate, generate iterations, draw/shape tools, frames, minimap, discovery, paste. The minimap renders without `stage`/`stageGroup` colors.
- Server starts with no `flow-adopt` route; no 404 handler references it.
- No console errors about missing `useFlowMocksStore` / undefined event constants.

## Done when

Every file above is deleted, every integration point is surgically cleaned, the sweep grep is empty, React Flow is provably untouched, and the playground runs with the demo feature gone.

## Pattern note (the owner asked to "find others following the pattern")

The pattern is **"domain-specific demo content masquerading as a playground primitive."** The signup-Flow cluster is the instance. After excising it, double-check for stragglers of the same shape: any remaining `data/flows/*`, any `*Shell.tsx`/`*Panel.tsx` that hardcodes a specific product page, any registry entry seeding a concrete demo. Report (do not auto-delete) anything you find that fits this pattern but isn't in the delete list above — it may be a separate decision for the owner.
