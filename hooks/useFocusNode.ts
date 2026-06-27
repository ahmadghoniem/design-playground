'use client';

import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

/**
 * Centers the canvas viewport on a node by id. This is the canvas-focus
 * seam for callers (e.g. sidebar double-click) that previously dispatched
 * a `playground:focus-node` window CustomEvent with no listener anywhere
 * in the repo — the feature was dead. Callers must render inside a
 * `<ReactFlowProvider>` (the sidebar does, via `PlaygroundClient`).
 */
export function useFocusNode() {
  const { fitView } = useReactFlow();

  const focusNode = useCallback(
    (id: string) => {
      fitView({ nodes: [{ id }], duration: 400, padding: 0.2 });
    },
    [fitView],
  );

  return { focusNode };
}
