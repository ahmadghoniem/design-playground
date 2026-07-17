# Source-only simplification audit

## Purpose

This is a handoff for an agent that will review or implement an overhaul of the
design playground. It deliberately evaluates **current source code only**.
It does not treat README files, design notes, or agent instructions as a source
of requirements.

The intended product is a local, single-user canvas that places host UI modules,
generates variations through one CLI, and lets the user inspect/adopt/delete the
results. That narrow use case is the bar used here: complexity is justified only
when it improves that experience or makes a real failure mode safe.

No source has been modified by this audit.

## Review lens

The preferred result is a few **deep modules** with small, obvious
**interfaces**. Their implementations may contain internal seams, but callers
should not need to coordinate refs, browser events, retries, persistence format,
or child-process state themselves. This improves:

- **Locality**: changes and their verification live together.
- **Leverage**: one implementation fixes repeated behaviour across callers.
- **Testability**: tests cross the same seam that production callers use.

Do not split files merely to lower line counts. A wrapper that only forwards
arguments is a shallow module and should not survive the deletion test.

## Executive summary

The main complexity is not the canvas itself. It is duplicated ownership:

1. React Flow edges are used as hidden relationship records while being passed
   to React Flow as an empty array.
2. Generation is a distributed state machine spanning the chat, canvas,
   scanning, lifecycle hooks, browser events, SSE, and persisted state.
3. Discovery mutates TypeScript source using string parsing while also managing
   manifest I/O and agent processes.
4. Preview-node behaviour, image I/O, client HTTP parsing, and browser-event
   contracts are repeated across many call sites.
5. Several legacy paths are now provably unreferenced or have no effect.

Recommended order:

1. Separate canvas relationships from rendered React Flow edges.
2. Replace generation coordination/scanning/lifecycle with one session module.
3. Simplify persistence around the new canvas/session state.
4. Split discovery orchestration from registry editing.
5. Consolidate preview frames, asset operations, and client transport.
6. Delete legacy polling, unused state, unused callbacks, and hypothetical
   provider variation points.

## Findings

### 1. Hidden relationships are modelled as React Flow edges

**Evidence**

- [`app/PlaygroundCanvas.tsx`](../../app/PlaygroundCanvas.tsx) passes
  `edges={[]}` to `<ReactFlow>` at line 600.
- [`features/canvas/canvas-flow.tsx`](../../features/canvas/canvas-flow.tsx)
  still creates, persists, histories, and exposes an `Edge[]` state.
- [`features/canvas/canvas-visibility.ts`](../../features/canvas/canvas-visibility.ts)
  computes `visibleEdges`, but the only caller reads `visibleNodes`.
- Iteration scan, generation, drag/drop, deletion, clear, and auto-arrange all
  construct or mutate edges. Edge styles are still stored even though they are
  never rendered.

**Why it is too complex**

There are two meanings for one data type:

- a visual connector understood by React Flow;
- an invisible parent/child relationship used for iteration trees.

The UI deliberately renders none of the first meaning. Consequently React Flow
edge callbacks, edge styling, visible-edge calculation, and much of the edge
history machinery provide no product value. Every relationship operation has to
carry irrelevant `type`, `animated`, and `style` details.

**Recommended direction**

Define an explicit persisted relationship type, for example:

```ts
type CanvasRelation = {
  parentId: string;
  childId: string;
  kind: 'iteration';
};
```

Expose it from the canvas module as `relations`, not `edges`. Derive child maps,
collapse visibility, cascade deletion, and auto-arrange from relations. Remove
`onEdgesChange`, React Flow edge state, `visibleEdges`, and edge styling.

If visible connectors are actually a product requirement, take the opposite
route: retain React Flow edges and pass the derived visible edges to React Flow.
Do not retain the current middle state.

**Verification**

- Nested iteration placement, collapse, cascade delete, reparent, undo/redo,
  persistence, and clear-all preserve the same tree.
- React Flow receives no edge-related props if relationships remain hidden.
- A relationship-specific pure module has focused tests for traversal and
  reparenting.

**Recommendation strength:** Strong.

### 2. Canvas persistence reads localStorage twice, then once per render

**Evidence**

- `CanvasFlowProvider` loads initial state lazily in
  [`features/canvas/canvas-flow.tsx`](../../features/canvas/canvas-flow.tsx).
- [`app/PlaygroundCanvas.tsx`](../../app/PlaygroundCanvas.tsx) calls
  `loadCanvasState(storageKey)` directly during render at line 98.
- `loadCanvasState` parses JSON, performs migration, removes stale skeletons,
  and prunes known iterations in
  [`shared/lib/canvas-persistence.ts`](../../shared/lib/canvas-persistence.ts).

**Why it is too complex**

The provider and child have independent views of what "initial" means. The
child's read is not lazy or memoized, so ordinary canvas re-renders repeatedly
parse persisted JSON and can repeat its migration/cleanup side effects. The
provider owns actual node state, but the child separately reconstructs metadata
from storage.

**Recommended direction**

Have one bootstrap operation produce a complete `CanvasSnapshot` exactly once.
The canvas state module owns it and exposes nodes, relations, viewport,
collapsed ids, known iteration ids, counter, and resumable generation metadata.
`PlaygroundCanvas` consumes the already-loaded snapshot; it never reads
localStorage directly.

Prefer one persisted object and one migration function that returns a valid
current snapshot. This also makes migration testing straightforward.

**Verification**

- Instrument `loadCanvasState`; it runs once per canvas mount, not each render.
- A malformed snapshot falls back cleanly once.
- A stale skeleton cleanup updates the in-memory state and persisted snapshot
  consistently.

**Recommendation strength:** Strong.

### 3. Generation is a distributed state machine

**Evidence**

- [`features/generation/useGenerationCoordination.ts`](../../features/generation/useGenerationCoordination.ts)
  exposes React state setters, mirrored refs, eager setters, getters, a scan
  lock, queue flags, and scan-context transfer methods.
- [`features/generation/useGenerationLifecycle.ts`](../../features/generation/useGenerationLifecycle.ts)
  manages skeleton creation, overlap calculation, SSE, resume, timeout cleanup,
  scan reconciliation, node replacement, timers, and toasts.
- [`features/iterations/useIterationScan.ts`](../../features/iterations/useIterationScan.ts)
  performs polling, dedupe, placement, skeleton replacement, relationship
  construction, and browser-event subscriptions.
- [`app/useChatSubmit.ts`](../../app/useChatSubmit.ts) separately decides what
  to submit, queues requests, publishes lifecycle events, and issues generation
  requests through three similar paths.

**Why it is too complex**

Callers must know ordering requirements such as using an "eager" setter before
an event can complete, preserving scan context while clearing state, and
starting both SSE and fallback polling. That is an implementation concern
leaking through the module interface.

The same completion can be observed by an HTTP response, an SSE `done`, a poll,
the final scan, or an error. This deserves a single owner with explicit state,
not coordination by callbacks spread across four modules.

**Recommended direction**

Create a `generation session` module with a small interface:

```ts
type GenerationSession = {
  state: Idle | Running | Reconciling | Failed;
  submit(request: GenerationRequest): Promise<GenerationResult>;
  cancel(): Promise<void>;
  resume(snapshot: PersistedGeneration): Promise<void>;
};
```

Internally, it can own SSE, the fallback scan, skeleton placement, retry policy,
and a FIFO queue. Externally it emits a state snapshot or subscribable stream.
The canvas supplies a narrow canvas adapter for adding/replacing/removing
placeholder nodes and relations.

Do not put a generic queue in the chat module; queueing is part of generation
policy, so it belongs with the session.

**Verification**

- Unit test state transitions: start -> running -> reconciling -> idle,
  failure, cancellation, and reload resume.
- One integration test covers a generated file arriving through SSE; another
  covers the final scan catching a file absent from tool events.
- No caller accesses scan locks, mirrored refs, or skeleton ids directly.

**Recommendation strength:** Strong.

### 4. Legacy iteration polling has no producer

**Evidence**

- [`features/iterations/useIterationScan.ts`](../../features/iterations/useIterationScan.ts)
  subscribes to `ITERATION_PROMPT_COPIED_EVENT` and starts a 10-second,
  two-minute polling loop.
- `rg` finds no dispatch of that event anywhere in source.
- The hook also has `isScanning` state whose value is never read, and a separate
  active-generation poll alongside SSE and final reconciliation.

**Why it is too complex**

The event-driven polling path cannot run in current code. Its timers, state,
constants, public `stopPolling` method, and clear-canvas dependency are legacy
surface area. Keeping it makes the real completion mechanism harder to see.

**Recommended direction**

Delete the prompt-copied polling path, `POLL_INTERVAL`, `POLL_DURATION`,
`ITERATION_PROMPT_COPIED_EVENT`, `isPolling`, `isScanning`, and `stopPolling`
unless a real producer is intentionally restored. Retain one fallback scan
inside the generation session while generation is running, plus one final scan
after completion.

**Verification**

- Clear-all works without a polling control.
- Generation still discovers files written by the CLI without a tool event.

**Recommendation strength:** Strong.

### 5. Chat submission is three copies of transport/lifecycle plumbing

**Evidence**

- [`app/useChatSubmit.ts`](../../app/useChatSubmit.ts) handles edit, targeted
  explore, and freeform execution branches.
- Each branch builds a `POST /playground/api/generate` request, parses a
  response, and emits completion/error events.
- The hook accepts `getNodeId` and `setNodes`, but neither is used in its
  implementation; they only force unnecessary dependencies and callback churn.

**Why it is too complex**

The chat module knows prompt policy, transport policy, lifecycle policy, and
queue policy. Small differences in errors or request fields between branches
are easy to introduce and hard to verify.

**Recommended direction**

Make the chat module produce a `GenerationRequest` only: mode, target,
instructions, references, selected elements, selected model, and count. The
generation session owns transport and lifecycle. Remove unused hook parameters.

Prompt construction can remain specialized, but return a single request shape
to one submit path.

**Recommendation strength:** Strong.

### 6. Preview frame behaviour is duplicated between source and iteration nodes

**Evidence**

- [`features/canvas/nodes/ComponentNode.tsx`](../../features/canvas/nodes/ComponentNode.tsx)
  and [`features/iterations/IterationNode.tsx`](../../features/iterations/IterationNode.tsx)
  both implement size presets, resize state, interaction gating, scroll capture,
  label scaling, resize controls, three render modes, loading/error rendering,
  and error boundaries.
- `IterationNode` adds adoption/delete and dynamic loading, but much of its
  roughly 700 lines is presentation shared with `ComponentNode`.

**Why it is too complex**

A rendering/layout fix must be made in at least two places. The repeated code
also forces separate conventions for auto-height versus fill mode and repeated
loading/error markup.

**Recommended direction**

Create a preview-frame module with a small interface: identity/label, size
state, selected/interactive state, a render function, and optional action
slots. It owns resize persistence, preset scaling, scroll capture, interaction
gate, loading/error fallback, and the three layout modes.

The source-node and iteration-node modules retain their actual difference:
resolving host UI versus loading a generated variation, and their respective
actions.

**Verification**

- A single visual test matrix covers auto, laptop/tablet/mobile, and custom
  resize for both node kinds.
- The source/iteration node modules no longer duplicate frame layout logic.

**Recommendation strength:** Strong.

### 7. IterationNode contains obsolete iframe state and extra callback plumbing

**Evidence**

- [`features/iterations/IterationNode.tsx`](../../features/iterations/IterationNode.tsx)
  declares `iframeRef` and attempts to register an iframe keydown listener, but
  the module renders no iframe.
- It declares `iframeKey`/`setIframeKey`, but neither is subsequently used.
- The persisted `adopted` flag and `onAdopt` callback exist only to initialize
  or notify the local adoption hook. The canvas currently supplies a no-op
  adoption callback.

**Why it is too complex**

These are historical implementation details in a hot rendering module. They
create the impression that the current preview is iframe-backed and make the
iteration data contract larger than needed.

**Recommended direction**

Delete `iframeRef`, iframe listener logic, and `iframeKey`. Replace the no-op
callback with either no callback at all or a real completion effect at the one
place that needs it. Keep adoption state local unless it must survive reload;
if it must persist, define it in the iteration record rather than mixing it into
view callback data.

**Recommendation strength:** Strong.

### 8. Browser CustomEvents are an untyped second application architecture

**Evidence**

- Event names are exported from
  [`shared/lib/constants.ts`](../../shared/lib/constants.ts).
- Canvas, header, skills, iteration nodes, and scan hooks communicate via
  `window.addEventListener` and `window.dispatchEvent`.
- Generation already has a typed in-module event channel in
  [`shared/lib/generation-events.ts`](../../shared/lib/generation-events.ts),
  but nearby concerns use the untyped global event bus.

**Why it is too complex**

The actual interfaces include event names, detail payload shape, timing, and
listener lifetime, but TypeScript cannot verify them. Global window dispatch
also makes it difficult to discover who owns an action. Several events merely
cross a short distance between modules mounted under the same canvas.

**Recommended direction**

Prefer direct callbacks for parent/child actions. For genuine cross-tree
actions, use typed channels scoped to the canvas/session instance, not `window`.
Do not create a universal event-bus abstraction; define only channels with two
real independent consumers.

Candidates: clear request, refresh iterations, fit generated nodes, edit
completion, collapse toggle, skills changed, and size propagation.

**Recommendation strength:** Strong.

### 9. Discovery UI state and discovery orchestration live in the application shell

**Evidence**

- [`app/PlaygroundClient.tsx`](../../app/PlaygroundClient.tsx) owns discovery
  modal visibility, add-in-progress state, pending child analysis, orphan catch
  up, sequential child processing, toasts, and a custom sidebar refresh event.
- It is also the shell that mounts the header, canvas, sidebar, and skills
  modal.

**Why it is too complex**

The shell needs detailed knowledge of discovery entry status and child analysis
protocol. Discovery changes consequently require editing the composition module
and communicating with the sidebar via a global event.

**Recommended direction**

Move add/analyze/catch-up state and operations to a discovery module. It should
expose a compact interface to the shell: open state, pending entries, refresh,
and `add(entry)`. The sidebar and modal consume the same discovery state rather
than being forced to refresh through `window`.

**Recommendation strength:** Worth exploring.

### 10. Discovery server route combines process control, files, manifests, and source editing

**Evidence**

- [`server/routes/discover.ts`](../../server/routes/discover.ts) is over 700
  lines.
- It manages agent spawning/cancellation/timeouts, lockfile recovery, manifest
  reads/writes, request handlers, path calculation, logging, registry removal,
  and manual TypeScript/JSX source parsing.

**Why it is too complex**

Changing the registry representation should not risk process cleanup. Changing
the discovery manifest should not require understanding regex-based brace
matching. The route is the only seam but its interface includes every internal
detail.

**Recommended direction**

Split internal modules by responsibility:

- `discovery-run`: one active CLI run, timeout/cancellation/result.
- `discovery-manifest`: typed read/write/update operations.
- `registry-editor`: structured add/remove operations; use an AST or managed
  generated registry rather than string parsing.
- `discover-routes`: parse/validate requests and map results to responses.

The route should be thin orchestration only.

**Recommendation strength:** Strong.

### 11. No client transport module means repeated fetch/error contracts

**Evidence**

There are roughly 29 direct `/playground/api/...` fetch call sites across
application, canvas, discovery, iteration, models, skills, and path modules.
They independently decide headers, JSON parsing, `response.ok` handling, error
fallbacks, and logging.

**Why it is too complex**

The server contracts are informal. A route returning malformed JSON or a failed
network request is handled differently at each use. API path changes require
scattered edits.

**Recommended direction**

Create a small typed playground transport module, not a broad data-fetching
framework. It should own the mount prefix, JSON request/response parsing, and a
single error result shape. Add focused operations only where repetition exists:
generation, iterations, images, discovery, skills, models.

Use direct calls for one-off bootstrap concerns if a wrapper would be thinner
than the call itself.

**Recommendation strength:** Strong.

### 12. One-provider variation points are larger than the use case

**Evidence**

- [`shared/lib/providers/registry.ts`](../../shared/lib/providers/registry.ts)
  has a map and list function containing one provider.
- [`shared/stores/model-settings-store.ts`](../../shared/stores/model-settings-store.ts)
  stores active-provider state and provider-indexed maps even though no action
  can change active provider.
- Model endpoint code maintains a generic dynamic-list path even though the
  current configuration supplies a static catalog.

**Why it is too complex**

This is a hypothetical seam. It increases persistence migration, request
payloads, UI state, and model lookup without a second adapter proving that the
variation is real.

**Recommended direction**

Collapse to an `agent configuration` module with selected model and CLI options.
Retain a provider adapter only if adding a second provider is accepted work in
the next roadmap slice. In that case, keep the adapter seam but defer
provider-indexed UI/persistence until two adapters have distinct requirements.

**Recommendation strength:** Strong.

### 13. Local generation status has several redundant observation mechanisms

**Evidence**

- Server generation maintains module-global process, lockfile, log stream,
  `isGenerating`, and an EventEmitter in
  [`server/routes/generate.ts`](../../server/routes/generate.ts).
- The client additionally receives a POST completion, connects SSE, polls the
  iteration listing, and performs a final scan.

**Why it is too complex**

Some redundancy is justified: CLI writes made through a shell cannot always be
seen in stream tool events. But the current implementation distributes the
fallback policy across server and several client hooks.

**Recommended direction**

Keep a single source of truth on the server: session id, status, process,
result, and emitted file events. The client session subscribes while running,
then performs exactly one reconciliation listing when it observes terminal
status. Make the shell-write fallback an explicit reconciliation rule, not a
separate polling mechanism.

**Recommendation strength:** Worth exploring.

### 14. Some derived state is stored, duplicated, or recomputed unnecessarily

**Evidence**

- `knownIterations` duplicates information available from iteration nodes and
  is repeatedly pruned/deduped.
- `collapsedNodeIds` is held in state and mirrored into a ref for unload.
- Generation lifecycle updates elapsed duration every second and records last
  duration, but neither value is rendered or exposed.
- `useIterationScan` stores `isScanning` but never reads it.

**Recommended direction**

First decide the canonical canvas snapshot. Derive iteration filename sets from
nodes when performance permits; cache only if measurements show this matters.
Persist collapse state as part of the same snapshot. Remove duration/scanning
state until UI uses it.

**Recommendation strength:** Strong for the unused state; Worth exploring for
whether `knownIterations` can be fully derived.

### 15. The element-selection hook does too much DOM and bridge orchestration

**Evidence**

- [`features/canvas/hooks/useElementSelection.ts`](../../features/canvas/hooks/useElementSelection.ts)
  owns Alt-key tracking, global mouse movement, document hit testing, React
  fiber introspection, iframe bridge setup, coordinate conversion, global click
  interception, selected-element state, and stale DOM cleanup polling.

**Why it is too complex**

This is the right feature but not one cohesive implementation. It has two
selection adapters (host DOM and iframe DOM) mixed with UI state and global
event lifecycle. Changes to iframe selection need understanding of React-fiber
heuristics; changes to UI pills need understanding of DOM bridge internals.

**Recommended direction**

Make `element selection` the deep module, but split its internal implementation:

- a DOM adapter that resolves a host element;
- an iframe adapter wrapping Penpal and coordinate conversion;
- a pure selection reducer (replace/toggle/clear/remove);
- one controller that owns key/mouse subscriptions and produces selected
  contexts and hover state.

Avoid exposing raw `HTMLElement` outside the controller unless rendering the
highlight requires it.

**Recommendation strength:** Worth exploring.

## Small, safe deletions

These should be independently verified, then removed before or during larger
refactors:

| Candidate | Evidence | Expected deletion |
| --- | --- | --- |
| Prompt-copy polling | Event has no dispatcher | `ITERATION_PROMPT_COPIED_EVENT`, polling timers/state/constants, `stopPolling` plumbing |
| Scan state | Setter is never read | `isScanning` state in `useIterationScan` |
| Generation timer display state | Values are never rendered or returned | elapsed/last duration React state and one-second interval |
| Iteration iframe state | No iframe rendered; key unused | `iframeRef`, iframe keydown effect, `iframeKey` |
| Chat hook arguments | Params unused in body | `getNodeId` and `setNodes` from `useChatSubmit` |
| Hidden-edge presentation | React Flow always receives `[]` | `visibleEdges`, edge styles, `onEdgesChange` after relation-model migration |

Do not delete `knownIterations`, SSE fallback, or persisted generation state as
"unused" before the generation-session design decides whether they can be
derived or folded into canonical state.

## Suggested implementation sequence

### Phase 1: Establish explicit data ownership

1. Introduce a versioned `CanvasSnapshot` with nodes, relations, viewport,
   collapsed ids, counter, and optional generation session snapshot.
2. Make one canvas-state module load/save/migrate it; remove direct storage
   reads from `PlaygroundCanvas`.
3. Replace hidden React Flow edges with `CanvasRelation` and update pure graph
   operations.
4. Delete the confirmed dead state listed above.

This phase should not change visual layout or generation behaviour.

### Phase 2: Consolidate generation

1. Define the generation request/result and session-state types.
2. Move HTTP, SSE, fallback reconciliation, skeleton handling, and queueing
   behind one session interface.
3. Make chat return a request and make the canvas supply a narrow canvas
   adapter.
4. Remove global lifecycle coordination and the dead prompt-copy polling path.

### Phase 3: Reduce repeated UI and transport logic

1. Extract preview-frame layout/resize/interaction behaviour.
2. Create image asset operations and reuse them from toolbar/drop/paste/delete.
3. Add typed client transport operations for repeated endpoints.
4. Replace window events with callbacks or instance-scoped typed channels.

### Phase 4: Make discovery independently understandable

1. Extract manifest repository and process-runner modules.
2. Replace direct TypeScript string parsing with a structured registry editor or
   a managed generated registry.
3. Move discovery add/analyze state out of `PlaygroundClient`.

## Review questions for the next agent

Before implementing the overhaul, resolve these source-level product decisions:

1. Are relationship connectors deliberately hidden forever, or should they be
   visible? This decides relation records versus React Flow edges.
2. Is a generation queue needed, or should a second submission be rejected?
   For a single-user local tool, rejection may be simpler and clearer.
3. Must generation survive a page reload? If not, remove persisted generation
   metadata, reload recovery, and several reconciliation paths.
4. Must iteration adoption status survive reload? If not, keep it entirely
   inside the iteration node/adoption operation.
5. Is editing a host TypeScript registry a core capability? If yes, use a
   structured editor; if no, move generated additions to data the playground
   owns.
6. Do generated previews need direct interaction and element selection for all
   node kinds? If not, limit the bridge to the view that actually uses it.
7. Is multi-provider support planned and funded? If not, collapse it now.

## Completion criteria for an overhaul

- A new contributor can locate canvas relationships, persistence, generation
  state, and discovery source mutation by following one module per concern.
- No `window` event is needed for an action whose producer and consumer share a
  mounted parent.
- A generation request has one client transport path and one lifecycle owner.
- The persisted canvas format has one loader, one saver, and versioned
  migration.
- Hidden relationships are no longer represented as non-rendered presentation
  edges.
- The codebase has focused tests for persistence migration, relation traversal,
  generation transitions, and registry editing.
