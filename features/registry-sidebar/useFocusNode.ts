import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";

/**
 * Centers the canvas viewport on a node by id — the canvas-focus seam for
 * callers such as sidebar double-click. Callers must render inside a
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
