/**
 * Client-side EventSource subscription for progressive iteration detection
 * during generation. The server parses agent stream-json tool events and
 * pushes one message per written file.
 */

export type GenerationSseHandlers = {
  onIterationAdded: (data: {
    filePath?: string;
    iterationNumber?: number;
  }) => void;
  onDone?: () => void;
  onError?: () => void;
};

/**
 * Open `/playground/api/generate?action=events` and dispatch parsed messages
 * to `handlers`. Returns an unsubscribe that closes the EventSource.
 */
export function subscribeGenerationSse(
  handlers: GenerationSseHandlers,
): () => void {
  const es = new EventSource("/playground/api/generate?action=events");

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "iteration-added") {
        handlers.onIterationAdded({
          filePath: data.filePath,
          iterationNumber: data.iterationNumber,
        });
      } else if (data.type === "done") {
        handlers.onDone?.();
        es.close();
      }
    } catch {
      /* ignore parse errors */
    }
  };

  es.onerror = () => {
    // Connection lost — server closes when generation ends.
    // Callers typically catch anything missed via a final scan.
    handlers.onError?.();
    es.close();
  };

  return () => {
    es.close();
  };
}
