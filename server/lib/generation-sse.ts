import { EventEmitter } from 'events';
import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';

/**
 * Server-side SSE bus for progressive iteration detection during generation.
 * Owned here so generate.ts can emit without wiring the EventEmitter itself.
 */

export type IterationAddedPayload = {
  filePath?: string;
  iterationNumber?: number;
};

type GenerationSseHandlers = {
  onIteration: (payload?: IterationAddedPayload) => void;
  onDone: () => void;
};

const sseGenerationEvents = new EventEmitter();

export function emitIterationAdded(payload: IterationAddedPayload): void {
  sseGenerationEvents.emit('iteration-added', payload);
}

export function emitGenerationDone(): void {
  sseGenerationEvents.emit('done');
}

/** Subscribe to generation SSE bus events. Returns an unsubscribe cleanup. */
function subscribeGenerationSse(handlers: GenerationSseHandlers): () => void {
  sseGenerationEvents.on('iteration-added', handlers.onIteration);
  sseGenerationEvents.on('done', handlers.onDone);
  return () => {
    sseGenerationEvents.removeListener('iteration-added', handlers.onIteration);
    sseGenerationEvents.removeListener('done', handlers.onDone);
  };
}

/**
 * Wire the Hono `?action=events` SSE stream: push iteration-added / done until
 * the client disconnects or generation finishes.
 */
export function streamGenerationEvents(
  c: Context,
  generationActive: boolean,
): Response | Promise<Response> {
  return streamSSE(c, async (stream) => {
    if (!generationActive) {
      await stream.writeSSE({ data: '{"type":"done"}' });
      return;
    }

    await new Promise<void>((resolve) => {
      const onIteration = (payload?: IterationAddedPayload) => {
        stream.writeSSE({
          data: JSON.stringify({
            type: 'iteration-added',
            filePath: payload?.filePath,
            iterationNumber: payload?.iterationNumber,
          }),
        }).catch(() => {});
      };

      const onDone = () => {
        stream.writeSSE({ data: '{"type":"done"}' }).catch(() => {});
        cleanup();
        resolve();
      };

      const cleanup = subscribeGenerationSse({ onIteration, onDone });

      stream.onAbort(() => {
        cleanup();
        resolve();
      });
    });
  });
}
