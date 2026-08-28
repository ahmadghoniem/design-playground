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
import {
  countBatchIterationNodes,
  calculateIterationPosition,
} from "@pg/shared/lib/iteration-scan";
import type { GenerationCoordination } from "@pg/shared/lib/generation-coordination";
import {
  generationEvents,
  type GenerationStartPayload,
  type GenerationCompletePayload,
  type GenerationErrorPayload,
} from "@pg/shared/lib/generation-events";
import {
  DEFAULT_COMPONENT_NODE_WIDTH,
  DEFAULT_COMPONENT_NODE_HEIGHT,
  DEFAULT_ITERATION_NODE_WIDTH,
  DEFAULT_ITERATION_NODE_HEIGHT,
} from "@pg/shared/lib/constants";
import { toast } from "sonner";
import { subscribeGenerationSse } from "@pg/features/generation/subscribe-generation-sse";

const POST_GENERATION_SCAN_DELAY = 1000;

export interface UseGenerationLifecycleParams {
  coord: GenerationCoordination;
  isGenerating: boolean;
  generationInfo: GenerationInfo | null;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setRelations: Dispatch<SetStateAction<CanvasRelation[]>>;
  getNodeId: () => string;
  scanForIterations: (
    resetTimeoutOnFind?: boolean,
    scanContext?: GenerationInfo | null,
  ) => Promise<void>;
}

export function useGenerationLifecycle({
  coord,
  isGenerating,
  generationInfo,
  setNodes,
  setRelations,
  getNodeId,
  scanForIterations,
}: UseGenerationLifecycleParams): void {
  const unsubscribeSseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isGenerating || !generationInfo?.startTime) {
      return;
    }

    // Safety: auto-clean skeleton nodes after 10 minutes if generation hangs
    const safetyTimeout = setTimeout(
      () => {
        const info = coord.getGenerationInfo();
        if (info) {
          setNodes((nds) =>
            nds.filter((n) => !info.skeletonNodeIds.includes(n.id)),
          );
          setRelations((rels) =>
            rels.filter(
              (r) => !info.skeletonNodeIds.some((sid) => r.childId === sid),
            ),
          );
        }
        coord.clearGenerationEager();
      },
      10 * 60 * 1000,
    );

    return () => {
      clearTimeout(safetyTimeout);
    };
  }, [
    isGenerating,
    generationInfo?.startTime,
    setNodes,
    setRelations,
    coord.getGenerationInfo,
    coord.clearGenerationEager,
  ]);

  // SSE helpers for progressive iteration detection during generation.
  // The server parses the agent's stream-json tool events and pushes an
  // event per written file (the 4s poll in useIterationScan remains as
  // belt-and-braces fallback).
  const stopGenerationEventSource = useCallback(() => {
    if (unsubscribeSseRef.current) {
      unsubscribeSseRef.current();
      unsubscribeSseRef.current = null;
    }
  }, []);

  const startGenerationEventSource = useCallback(() => {
    stopGenerationEventSource();
    unsubscribeSseRef.current = subscribeGenerationSse({
      onIterationAdded: () => {
        const ctx = coord.getGenerationInfo();
        // filePath / iterationNumber identify the exact file written (from the agent's tool events)
        scanForIterations(false, ctx ?? undefined);
      },
    });
  }, [scanForIterations, stopGenerationEventSource, coord.getGenerationInfo]);

  useEffect(() => {
    /**
     * Check whether a rectangle overlaps any existing canvas node.
     * Returns true if there is a collision.
     */
    const rectsOverlap = (
      a: { x: number; y: number; w: number; h: number },
      b: { x: number; y: number; w: number; h: number },
      padding = 20,
    ) =>
      a.x < b.x + b.w + padding &&
      a.x + a.w + padding > b.x &&
      a.y < b.y + b.h + padding &&
      a.y + a.h + padding > b.y;

    /**
     * Given a set of candidate skeleton rects, shift the entire group
     * rightward until none of them overlap any existing node on the canvas.
     * Also avoids overlapping previously placed skeletons in the same batch.
     */
    const resolveOverlaps = (
      rects: { x: number; y: number; w: number; h: number }[],
      existingNodes: Node[],
    ) => {
      const SHIFT_STEP = 80; // px to shift right per attempt
      const MAX_ATTEMPTS = 20;

      const obstacles = existingNodes.map((n) => ({
        x: n.position.x,
        y: n.position.y,
        w:
          n.measured?.width ??
          (n.type === "component"
            ? DEFAULT_COMPONENT_NODE_WIDTH
            : DEFAULT_ITERATION_NODE_WIDTH),
        h:
          n.measured?.height ??
          (n.type === "component"
            ? DEFAULT_COMPONENT_NODE_HEIGHT
            : DEFAULT_ITERATION_NODE_HEIGHT),
      }));

      let attempts = 0;
      let hasCollision = true;

      while (hasCollision && attempts < MAX_ATTEMPTS) {
        hasCollision = false;
        for (const rect of rects) {
          for (const obs of obstacles) {
            if (rectsOverlap(rect, obs)) {
              hasCollision = true;
              break;
            }
          }
          if (hasCollision) break;
        }

        if (hasCollision) {
          for (const rect of rects) {
            rect.x += SHIFT_STEP;
          }
          attempts++;
        }
      }

      return rects;
    };

    const handleGenerationStart = (payload: GenerationStartPayload) => {
      const {
        componentId,
        componentName,
        parentNodeId,
        iterationCount,
        editMode: isEditMode,
        startNumber: genStartNumber,
      } = payload;

      // Edit mode: no skeleton nodes are created
      if (isEditMode) {
        coord.setIsGeneratingEager(true);
        coord.setGenerationInfoEager({
          componentId,
          componentName,
          parentNodeId: "",
          iterationCount: 0,
          skeletonNodeIds: [],
          startTime: Date.now(),
        });
        // Subscribe to SSE for progressive iteration detection — same as iterate/freeform
        startGenerationEventSource();
        return;
      }

      // Freeform generations have no parent — create a standalone skeleton
      if (!parentNodeId) {
        const flowPos = payload.flowPosition ?? { x: 400, y: 200 };
        const skeletonId = getNodeId();
        const skeletonNode: Node = {
          id: skeletonId,
          type: "skeleton",
          position: flowPos,
          data: {
            iterationNumber: 1,
            componentName,
            parentNodeId: "",
            totalIterations: 1,
            width: DEFAULT_COMPONENT_NODE_WIDTH,
            height: DEFAULT_COMPONENT_NODE_HEIGHT,
          },
        };

        setNodes((nds) => [...nds, skeletonNode]);

        const newInfo: GenerationInfo = {
          componentId,
          componentName,
          parentNodeId: "",
          iterationCount: 1,
          skeletonNodeIds: [skeletonId],
          startTime: Date.now(),
          skeletonPositions: [{ x: flowPos.x, y: flowPos.y }],
          startNumber: genStartNumber ?? 1,
        };
        coord.setGenerationInfoEager(newInfo);
        coord.setIsGeneratingEager(true);

        startGenerationEventSource();
        return;
      }

      const parentNode = coord.getNodes().find((n) => n.id === parentNodeId);
      if (!parentNode) {
        console.error("[Playground] Parent node not found:", parentNodeId);
        return;
      }

      // Parent node dimensions (used for grid sizing and skeleton sizing)
      const cellW =
        parentNode.measured?.width ??
        (parentNode.type === "component"
          ? DEFAULT_COMPONENT_NODE_WIDTH
          : DEFAULT_ITERATION_NODE_WIDTH);
      const cellH =
        parentNode.measured?.height ??
        (parentNode.type === "component"
          ? DEFAULT_COMPONENT_NODE_HEIGHT
          : DEFAULT_ITERATION_NODE_HEIGHT);

      const skeletonNodes: Node[] = [];
      const skeletonRelations: CanvasRelation[] = [];
      const skeletonNodeIds: string[] = [];

      const candidateRects: { x: number; y: number; w: number; h: number }[] =
        [];

      for (let i = 1; i <= iterationCount; i++) {
        // Place iterations to the right of the parent
        const { x, y } = calculateIterationPosition(
          coord.getNodes(),
          parentNode,
          i,
          iterationCount,
        );

        candidateRects.push({ x, y, w: cellW, h: cellH });
      }

      // Resolve overlaps with existing canvas nodes (excludes parent which is above)
      const existingNodes = coord
        .getNodes()
        .filter((n) => n.id !== parentNodeId);
      resolveOverlaps(candidateRects, existingNodes);

      for (let i = 0; i < iterationCount; i++) {
        const position = { x: candidateRects[i].x, y: candidateRects[i].y };
        const nodeId = getNodeId();
        skeletonNodeIds.push(nodeId);

        skeletonNodes.push({
          id: nodeId,
          type: "skeleton",
          position,
          data: {
            iterationNumber: i + 1,
            componentName,
            parentNodeId,
            totalIterations: iterationCount,
            // Always size skeleton nodes to match parent
            width: cellW,
            height: cellH,
          },
        });

        skeletonRelations.push({
          parentId: parentNodeId,
          childId: nodeId,
          kind: "iteration",
        });
      }

      setNodes((nds) => [...nds, ...skeletonNodes]);
      setRelations((rels) => [...rels, ...skeletonRelations]);

      // Update generation state — sync ref eagerly so that a fast
      // generationEvents.complete can read the skeleton IDs before React
      // renders and the useEffect-based ref sync fires.
      const newInfo: GenerationInfo = {
        componentId,
        componentName,
        parentNodeId,
        iterationCount,
        skeletonNodeIds,
        startTime: Date.now(),
        skeletonPositions: skeletonNodes.map((n) => ({
          x: n.position.x,
          y: n.position.y,
        })),
        startNumber: genStartNumber ?? 1,
      };
      coord.setGenerationInfoEager(newInfo);
      coord.setIsGeneratingEager(true);

      startGenerationEventSource();
    };

    const handleGenerationComplete = (_payload: GenerationCompletePayload): void => {
      stopGenerationEventSource();

      const info = coord.getGenerationInfo();
      const savedScanContext = info ? { ...info } : null;

      const savedPositions = info?.skeletonPositions ?? info?.gridPositions;
      const savedParentNodeId = info?.parentNodeId;

      setTimeout(async () => {
        const nodesBefore = new Set(coord.getNodes().map((n) => n.id));
        if (savedScanContext) {
          await scanForIterations(false, savedScanContext);
        } else {
          await scanForIterations(false);
        }

        if (
          savedScanContext &&
          savedScanContext.iterationCount > 0 &&
          savedScanContext.startNumber != null
        ) {
          const created = countBatchIterationNodes(
            coord.getNodes(),
            savedScanContext,
          );
          const expected = savedScanContext.iterationCount;
          if (created < expected) {
            toast.warning(
              `Generated ${created} of ${expected} iteration${expected === 1 ? "" : "s"}. Remaining placeholders kept on canvas.`,
              { duration: 8000 },
            );
          }

          const start = savedScanContext.startNumber ?? 1;
          const replacedSkeletonIds = new Set<string>();
          for (
            let slot = 0;
            slot < savedScanContext.skeletonNodeIds.length;
            slot++
          ) {
            const iterNum = start + slot;
            const hasNode = coord
              .getNodes()
              .some(
                (n) =>
                  n.type === "iteration" &&
                  (n.data.iterationNumber as number) === iterNum,
              );
            if (hasNode) {
              replacedSkeletonIds.add(savedScanContext.skeletonNodeIds[slot]);
            }
          }

          setNodes((nds) =>
            nds.filter(
              (n) =>
                !savedScanContext.skeletonNodeIds.includes(n.id) ||
                !replacedSkeletonIds.has(n.id),
            ),
          );
          setRelations((rels) =>
            rels.filter(
              (r) =>
                !savedScanContext.skeletonNodeIds.some(
                  (id) => r.childId === id && replacedSkeletonIds.has(id),
                ),
            ),
          );
        } else if (info) {
          setNodes((nds) =>
            nds.filter((n) => !info.skeletonNodeIds.includes(n.id)),
          );
          setRelations((rels) =>
            rels.filter(
              (r) => !info.skeletonNodeIds.some((id) => r.childId === id),
            ),
          );
        }

        coord.clearGenerationEager();

        if (savedPositions && savedParentNodeId) {
          setTimeout(() => {
            const newNodes = coord
              .getNodes()
              .filter((n) => !nodesBefore.has(n.id) && n.type === "iteration");
            if (newNodes.length > 0) {
              const sorted = [...newNodes].sort((a, b) => {
                const aNum = (a.data.iterationNumber as number) || 0;
                const bNum = (b.data.iterationNumber as number) || 0;
                return aNum - bNum;
              });

              setNodes((nds) =>
                nds.map((n) => {
                  const idx = sorted.findIndex((sn) => sn.id === n.id);
                  if (idx !== -1 && idx < savedPositions.length) {
                    return { ...n, position: savedPositions[idx] };
                  }
                  return n;
                }),
              );
            }
          }, 150);
        }
      }, POST_GENERATION_SCAN_DELAY);
    };

    const handleGenerationError = (payload: GenerationErrorPayload) => {
      stopGenerationEventSource();

      const errorMessage = payload.error || "Unknown error occurred";
      const componentId = payload.componentId || "unknown";
      const parentNodeId = payload.parentNodeId || "unknown";
      const logPayload = {
        error: errorMessage,
        componentId,
        parentNodeId,
        fullDetail: payload,
      };

      // Read through the ref so this handler sees the latest generation info.
      const info = coord.getGenerationInfo();

      if (errorMessage === "Cancelled by user") {
        console.info("[Playground] Generation cancelled by user.", logPayload);
      } else if (errorMessage.includes("generation is already in progress")) {
        console.info(
          "[Playground] Generation already in progress.",
          logPayload,
        );
      } else {
        console.error(
          "[Playground] Generation error:",
          errorMessage,
          logPayload,
        );
        toast.error(errorMessage, { duration: 6000 });
      }

      if (info) {
        setNodes((nds) =>
          nds.filter((n) => !info.skeletonNodeIds.includes(n.id)),
        );
        setRelations((rels) =>
          rels.filter(
            (r) => !info.skeletonNodeIds.some((id) => r.childId === id),
          ),
        );
      }

      coord.clearGenerationEager();
    };

    const offStart = generationEvents.start.on(handleGenerationStart);
    const offComplete = generationEvents.complete.on(handleGenerationComplete);
    const offError = generationEvents.error.on(handleGenerationError);

    return () => {
      offStart();
      offComplete();
      offError();
      stopGenerationEventSource();
    };
  }, [
    getNodeId,
    setNodes,
    setRelations,
    scanForIterations,
    startGenerationEventSource,
    stopGenerationEventSource,
    coord.setIsGeneratingEager,
    coord.setGenerationInfoEager,
    coord.getNodes,
    coord.getGenerationInfo,
    coord.clearGenerationEager,
  ]);
}
