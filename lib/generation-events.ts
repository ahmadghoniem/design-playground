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
