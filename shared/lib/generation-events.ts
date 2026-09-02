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

export interface GenerationStartPayload {
  componentId: string;
  componentName: string;
  parentNodeId: string;
  iterationCount: number;
  startNumber?: number;
  model?: string;
  provider?: string;
  flowPosition?: { x: number; y: number };
  targetNodeId?: string | null;
  /** When true, this is an edit-in-place operation — no skeleton nodes should be created */
  editMode?: boolean;
}

export interface GenerationCompletePayload {
  componentId: string;
  parentNodeId: string;
  output: string;
}

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
