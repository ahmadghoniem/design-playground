import { useEffect, type MutableRefObject } from "react";
import type { Node, Viewport } from "@xyflow/react";
import { saveCanvasState } from "@pg/shared/lib/canvas-persistence";
import type { CanvasRelation } from "@pg/shared/lib/canvas-persistence";
import type { GenerationCoordination } from "@pg/shared/lib/generation-coordination";

const SAVE_DEBOUNCE_MS = 250;

export interface UseCanvasPersistenceParams {
  storageKey: string;
  nodes: Node[];
  relations: CanvasRelation[];
  coord: GenerationCoordination;
  knownIterations: string[];
  collapsedNodeIds: Set<string>;
  collapsedNodeIdsRef: MutableRefObject<Set<string>>;
  nodeIdCounterRef: MutableRefObject<number>;
  getViewport: () => Viewport;
}

export function useCanvasPersistence({
  storageKey,
  nodes,
  relations,
  coord,
  knownIterations,
  collapsedNodeIds,
  collapsedNodeIdsRef,
  nodeIdCounterRef,
  getViewport,
}: UseCanvasPersistenceParams): void {
  // Save to localStorage whenever nodes or relations change. Trailing
  // debounce: React Flow updates `nodes` every drag frame, so an immediate
  // save would serialize the whole canvas to localStorage continuously while
  // dragging. Unload is covered by the beforeunload handler below.
  useEffect(() => {
    const timer = setTimeout(() => {
      saveCanvasState(
        storageKey,
        nodes,
        relations,
        nodeIdCounterRef.current,
        knownIterations,
        Array.from(collapsedNodeIds),
        getViewport(),
      );
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [
    nodes,
    relations,
    knownIterations,
    collapsedNodeIds,
    getViewport,
    storageKey,
    nodeIdCounterRef,
  ]);

  // Save viewport on page unload (captures pan/zoom changes that don't trigger node updates)
  useEffect(() => {
    const handler = () => {
      saveCanvasState(
        storageKey,
        coord.getNodes(),
        relations,
        nodeIdCounterRef.current,
        coord.getKnownIterations(),
        Array.from(collapsedNodeIdsRef.current),
        getViewport(),
      );
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [
    relations,
    getViewport,
    storageKey,
    coord.getNodes,
    nodeIdCounterRef,
    coord.getKnownIterations,
    collapsedNodeIdsRef,
  ]);
}
