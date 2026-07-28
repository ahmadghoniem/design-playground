import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Node } from "@xyflow/react";
import type {
  GenerationInfo,
  CanvasRelation,
} from "@pg/shared/lib/canvas-persistence";
import { getIterationKeysOnCanvas } from "@pg/shared/lib/canvas-persistence";
import {
  isInExpectedBatch,
  resolveIterationPosition,
  findParentNode,
  findIterationNodeByFilename,
} from "@pg/shared/lib/iteration-scan";
import type { GenerationCoordination } from "@pg/shared/lib/generation-coordination";
import {
  ITERATION_FETCH_EVENT,
  ARRANGE_HORIZONTAL_GAP,
  DEFAULT_ITERATION_NODE_WIDTH,
  DEFAULT_COMPONENT_NODE_WIDTH,
  type ComponentSize,
} from "@pg/shared/lib/constants";

/** Poll interval while a generation is active (SSE fallback). */
const GENERATION_POLL_INTERVAL_MS = 4000;

interface IterationFile {
  filename: string;
  componentName: string;
  iterationNumber: number;
  parentId: string;
  description: string;
  sourceIteration: string | null;
}

export interface UseIterationScanParams {
  coord: GenerationCoordination;
  isGenerating: boolean;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setRelations: Dispatch<SetStateAction<CanvasRelation[]>>;
  getNodeId: () => string;
  handleIterationDelete: (filename: string) => void;
}

export interface UseIterationScanResult {
  scanForIterations: (
    resetTimeoutOnFind?: boolean,
    scanContext?: GenerationInfo | null,
  ) => Promise<void>;
}

export function useIterationScan({
  coord,
  isGenerating,
  setNodes,
  setRelations,
  getNodeId,
  handleIterationDelete,
}: UseIterationScanParams): UseIterationScanResult {
  const generationPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scanForIterations = useCallback(
    async (resetTimeoutOnFind = false, scanContext?: GenerationInfo | null) => {
      if (!coord.tryAcquireScanLock()) {
        coord.markScanQueued(scanContext);
        return;
      }
      try {
        const info =
          scanContext !== undefined ? scanContext : coord.getGenerationInfo();
        const response = await fetch("/playground/api/iterations");
        if (!response.ok) {
          console.error(
            "[Playground] Failed to fetch iterations:",
            response.status,
          );
          return;
        }

        const { iterations } = (await response.json()) as {
          iterations: IterationFile[];
        };

        const currentNodes = coord.getNodes();
        const existingFilenames = getIterationKeysOnCanvas(currentNodes);

        let newIterations = iterations.filter(
          (iter: IterationFile) => !existingFilenames.has(iter.filename),
        );
        if (info?.startNumber != null && info.iterationCount) {
          const cleanName = info.componentName.replace(/\s+/g, "");
          newIterations = newIterations.filter(
            (iter) =>
              iter.componentName === cleanName &&
              isInExpectedBatch(iter.iterationNumber, info),
          );
        }

        if (newIterations.length === 0) {
          return;
        }

        const skeletonsToRemove: string[] = [];
        const newNodes: Node[] = [];
        const newRelations: CanvasRelation[] = [];
        const newKnownFilenames: string[] = [];
        const pendingNodesByFilename = new Map<string, string>();

        newIterations.sort((a, b) => a.iterationNumber - b.iterationNumber);

        for (const iter of newIterations) {
          let sourceNodeId: string | undefined;

          if (iter.sourceIteration) {
            const sourceIterNode = findIterationNodeByFilename(
              coord.getNodes(),
              iter.sourceIteration,
            );
            if (sourceIterNode) {
              sourceNodeId = sourceIterNode.id;
            } else {
              sourceNodeId = pendingNodesByFilename.get(iter.sourceIteration);
            }
          }

          if (!sourceNodeId) {
            const parentNode = findParentNode(
              coord.getNodes(),
              iter.componentName,
              iter.parentId,
            );
            if (parentNode) {
              sourceNodeId = parentNode.id;
            }
          }

          const sourceNode = sourceNodeId
            ? coord.getNodes().find((n) => n.id === sourceNodeId) ||
              newNodes.find((n) => n.id === sourceNodeId)
            : undefined;

          let position: { x: number; y: number };

          if (info && info.skeletonNodeIds.length > 0) {
            position = resolveIterationPosition(
              info,
              iter.iterationNumber,
              currentNodes,
              skeletonsToRemove,
              sourceNode,
              info.skeletonPositions?.[0],
            );
          } else if (sourceNode) {
            const srcW =
              sourceNode.measured?.width ??
              (sourceNode.type === "component"
                ? DEFAULT_COMPONENT_NODE_WIDTH
                : DEFAULT_ITERATION_NODE_WIDTH);
            position = {
              x: sourceNode.position.x + srcW + ARRANGE_HORIZONTAL_GAP,
              y: sourceNode.position.y,
            };
          } else {
            const skeletonPos = info?.skeletonPositions?.[0];
            position = skeletonPos ?? { x: 400, y: 200 };
          }

          const nodeId = getNodeId();
          pendingNodesByFilename.set(iter.filename, nodeId);

          const parentSize = sourceNode?.data?.size as
            ComponentSize | undefined;
          const inheritedRegistryId =
            (sourceNode?.data?.componentId as string | undefined) ??
            (sourceNode?.data?.registryId as string | undefined);

          newNodes.push({
            id: nodeId,
            type: "iteration",
            position,
            data: {
              componentName: iter.componentName,
              iterationNumber: iter.iterationNumber,
              filename: iter.filename,
              description: iter.description,
              parentNodeId: sourceNodeId || undefined,
              parentSize,
              registryId: inheritedRegistryId,
              onDelete: handleIterationDelete,
            },
          });

          if (sourceNodeId) {
            newRelations.push({
              parentId: sourceNodeId,
              childId: nodeId,
              kind: "iteration",
            });
          }

          newKnownFilenames.push(iter.filename);
        }

        if (newNodes.length > 0) {
          const skeletonSet = new Set(skeletonsToRemove);
          setNodes((nds) => [
            ...nds.filter((n) => !skeletonSet.has(n.id)),
            ...newNodes,
          ]);
          setRelations((rels) => [
            ...rels.filter((r) => !skeletonSet.has(r.childId)),
            ...newRelations,
          ]);
          coord.appendKnownIterations(newKnownFilenames);
        }
      } catch (error) {
        console.error("Error scanning iterations:", error);
      } finally {
        const { queued, override } = coord.releaseScanLock();
        if (queued) {
          scanForIterations(resetTimeoutOnFind, override);
        }
      }
    },
    [
      coord,
      getNodeId,
      handleIterationDelete,
      setNodes,
      setRelations,
    ],
  );

  useEffect(() => {
    const handleFetchRequest = () => {
      scanForIterations(true);
    };

    window.addEventListener(ITERATION_FETCH_EVENT, handleFetchRequest);
    return () => {
      window.removeEventListener(ITERATION_FETCH_EVENT, handleFetchRequest);
    };
  }, [scanForIterations]);

  // Initial scan on mount. scanForIterations changes identity every render
  // (it closes over `coord`), so guard with a ref to keep this run-once while
  // still listing the real dependency.
  const didInitialScanRef = useRef(false);
  useEffect(() => {
    if (didInitialScanRef.current) return;
    didInitialScanRef.current = true;
    scanForIterations(false);
  }, [scanForIterations]);

  useEffect(() => {
    if (!isGenerating) {
      if (generationPollIntervalRef.current) {
        clearInterval(generationPollIntervalRef.current);
        generationPollIntervalRef.current = null;
      }
      return;
    }

    generationPollIntervalRef.current = setInterval(() => {
      const ctx = coord.getGenerationInfo();
      if (ctx) {
        scanForIterations(false, ctx);
      }
    }, GENERATION_POLL_INTERVAL_MS);

    return () => {
      if (generationPollIntervalRef.current) {
        clearInterval(generationPollIntervalRef.current);
        generationPollIntervalRef.current = null;
      }
    };
  }, [isGenerating, scanForIterations, coord]);

  return { scanForIterations };
}
