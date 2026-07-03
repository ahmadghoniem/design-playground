Stack: TypeScript + React 18 (no build step — host compiles). Key files: new lib/generation-events.ts, lib/constants.ts, hooks/useGenerationLifecycle.ts, hooks/useChatSubmit.ts, hooks/useDragToIterate.ts, hooks/useCanvasCreatePage.ts, hooks/useIterationAdoption.ts, hooks/useCanvasClear.ts, nodes/IterationNode.tsx, nodes/ComponentNode.tsx, nodes/shared/IterateDialog.tsx, components/canvas/sidebar/useSidebarDiscoverySync.ts.

TASK: Replace the stringly-typed `window.dispatchEvent(new CustomEvent(GENERATION_*_EVENT, { detail }))` / `window.addEventListener(GENERATION_*_EVENT, handler as EventListener)` bus with a typed in-module emitter, `generationEvents`, in a new file lib/generation-events.ts.

DETAILS — new file lib/generation-events.ts:
```ts
import type {
  GenerationStartPayload,
  GenerationCompletePayload,
  GenerationErrorPayload,
} from './constants';

/**
 * Typed in-module event bus for generation lifecycle events.
 * Replaces the window CustomEvent bus (GENERATION_*_EVENT) — same
 * synchronous dispatch semantics, but typed payloads and no
 * `as EventListener` casts.
 */
type Listener<T> = (payload: T) => void;

function createChannel<T>() {
  const listeners = new Set<Listener<T>>();
  return {
    /** Subscribe; returns an unsubscribe function. */
    on(listener: Listener<T>): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(payload: T): void {
      for (const l of [...listeners]) l(payload);
    },
  };
}

export const generationEvents = {
  start: createChannel<GenerationStartPayload>(),
  complete: createChannel<GenerationCompletePayload>(),
  error: createChannel<GenerationErrorPayload>(),
};
```

DETAILS — conversion patterns (apply in every listed file):

Pattern A (dispatch):
- `window.dispatchEvent(new CustomEvent<GenerationStartPayload>(GENERATION_START_EVENT, { detail: X }))` → `generationEvents.start.emit(X)`
- Same for COMPLETE → `generationEvents.complete.emit(X)` and ERROR → `generationEvents.error.emit(X)`.
- Also handle dispatches written without the generic (`new CustomEvent(GENERATION_COMPLETE_EVENT, { detail: {...} })`).

Pattern B (listen) — in hooks/useGenerationLifecycle.ts, nodes/IterationNode.tsx, nodes/ComponentNode.tsx, components/canvas/sidebar/useSidebarDiscoverySync.ts and anywhere else that calls addEventListener with these constants:
- Handlers currently typed `(e: CustomEvent<GenerationStartPayload>) => { const {...} = e.detail; ... }` become `(payload: GenerationStartPayload) => { const {...} = payload; ... }` — i.e. replace every `e.detail` with the payload parameter and drop the CustomEvent typing.
- `window.addEventListener(GENERATION_START_EVENT, handler as EventListener)` + matching removeEventListener in the cleanup → `const offStart = generationEvents.start.on(handler);` and call `offStart()` in the effect cleanup. Same for complete/error.

DETAILS — lib/constants.ts:
- Delete the `GENERATION_START_EVENT`, `GENERATION_COMPLETE_EVENT`, `GENERATION_ERROR_EVENT` string constants.
- KEEP the payload types (`GenerationStartPayload`, `GenerationCompletePayload`, `GenerationErrorPayload`) exactly where they are.

CONSTRAINTS:
- Behavior must be identical: dispatch stays synchronous, multiple listeners per channel supported.
- Do not change any payload type or any handler's logic — only the transport.
- Update imports in each file: remove the deleted constants, import `generationEvents` from the correct relative path to lib/generation-events (e.g. '../lib/generation-events' from hooks/, '../../lib/generation-events' from components/canvas/sidebar/).
- If a listed file turns out not to reference these events, leave it untouched. If an UNLISTED file references them (search the whole repo for GENERATION_START_EVENT, GENERATION_COMPLETE_EVENT, GENERATION_ERROR_EVENT before finishing), convert it with the same patterns.
- Do not touch server/ files. Do not rename anything else.

VERIFY: grep -rn "GENERATION_START_EVENT\|GENERATION_COMPLETE_EVENT\|GENERATION_ERROR_EVENT" across the repo (excluding .claude/ and plans/) must return nothing; grep -n "generationEvents" lib/generation-events.ts hooks/useGenerationLifecycle.ts hooks/useChatSubmit.ts must match; grep -rn "as EventListener" hooks nodes components must not match generation handlers.
