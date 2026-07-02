import {
  useCallback,
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { Edge, FitViewOptions, Node, Viewport } from "@xyflow/react";
import { computeAutoArrangePositions } from "../lib/canvas-auto-arrange";
import {
  PLAYGROUND_AUTO_ARRANGE_EVENT,
  FITVIEW_AFTER_ARRANGE,
} from "../lib/constants";

export interface UseCanvasAutoArrangeParams {
  nodes: Node[];
  edges: Edge[];
  collapsedNodeIdsRef: MutableRefObject<Set<string>>;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  fitView: (options?: FitViewOptions) => void;
  getViewport: () => Viewport;
}

export interface UseCanvasAutoArrangeResult {
  autoArrangeNodes: (andFitView?: boolean) => void;
}

export function useCanvasAutoArrange({
  nodes,
  edges,
  collapsedNodeIdsRef,
  setNodes,
  fitView,
  getViewport,
}: UseCanvasAutoArrangeParams): UseCanvasAutoArrangeResult {
  const autoArrangeNodes = useCallback(
    (andFitView: boolean = false) => {
      const zoom = Math.max(getViewport().zoom, 0.0001);
      const positionMap = computeAutoArrangePositions(
        nodes,
        edges,
        collapsedNodeIdsRef.current,
        zoom,
      );

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          const newPosition = positionMap.get(node.id);
          if (newPosition) {
            return { ...node, position: newPosition };
          }
          return node;
        }),
      );

      if (andFitView) {
        // Small delay so the arranged positions commit before fitting.
        setTimeout(() => {
          fitView(FITVIEW_AFTER_ARRANGE);
        }, 50);
      }
    },
    [nodes, edges, setNodes, fitView, getViewport, collapsedNodeIdsRef],
  );

  useEffect(() => {
    const handleAutoArrange = (e: CustomEvent<{ fitView: boolean }>) => {
      autoArrangeNodes(e.detail.fitView);
    };

    window.addEventListener(
      PLAYGROUND_AUTO_ARRANGE_EVENT,
      handleAutoArrange as EventListener,
    );
    return () => {
      window.removeEventListener(
        PLAYGROUND_AUTO_ARRANGE_EVENT,
        handleAutoArrange as EventListener,
      );
    };
  }, [autoArrangeNodes]);

  return { autoArrangeNodes };
}
