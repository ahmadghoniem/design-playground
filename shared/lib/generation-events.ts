/**
 * Typed in-module event bus for generation lifecycle events.
 * Synchronous dispatch, typed payloads, no `as EventListener` casts.
 */
type Listener<T> = (payload: T) => void;

function createChannel<T>() {
  const listeners = new Set<Listener<T>>();
  return {
    on(listener: Listener<T>): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(payload: T): void {
      for (const l of [...listeners]) l(payload);
    },
  };
}

/** Payload for generation start event */
export interface GenerationStartPayload {
  componentId: string;
  componentName: string;
  parentNodeId: string;
  iterationCount: number;
  /** First iteration number in this batch (e.g. 9 when iterations 1–8 already exist) */
  startNumber?: number;
  /** Model used for this generation */
  model?: string;
  /** Agent CLI used for this generation. Always Claude Code; kept for back-compat with consumers. */
  provider?: string;
  /** Flow-space position where the generation was initiated */
  flowPosition?: { x: number; y: number };
  /** Node this generation is anchored to, when dropped on a frame */
  targetNodeId?: string | null;
  /** When true, this is an edit-in-place operation — no skeleton nodes should be created */
  editMode?: boolean;
}

/** Payload for generation complete event */
export interface GenerationCompletePayload {
  componentId: string;
  parentNodeId: string;
  output: string;
}

/** Payload for generation error event */
export interface GenerationErrorPayload {
  componentId: string;
  parentNodeId: string;
  error: string;
}

/** Payload for an in-place edit finishing (same filename — force preview reload). */
export interface EditCompletePayload {
  nodeId: string;
}

export const generationEvents = {
  start: createChannel<GenerationStartPayload>(),
  complete: createChannel<GenerationCompletePayload>(),
  error: createChannel<GenerationErrorPayload>(),
  editComplete: createChannel<EditCompletePayload>(),
};
