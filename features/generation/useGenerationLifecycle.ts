import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Edge, Node } from "@xyflow/react";
import type { GenerationInfo } from "@pg/shared/lib/canvas-persistence";
import {
  countBatchIterationNodes,
  calculateIterationPosition,
} from "@pg/shared/lib/iteration-scan";
import type { GenerationCoordination } from "./useGenerationCoordination";
import {
  generationEvents,
} from "@pg/shared/lib/generation-events";
import {
  DRAG_GHOST_GAP,
  ARRANGE_HORIZONTAL_GAP,
  DEFAULT_COMPONENT_NODE_WIDTH,
  DEFAULT_COMPONENT_NODE_HEIGHT,
  DEFAULT_ITERATION_NODE_WIDTH,
  DEFAULT_ITERATION_NODE_HEIGHT,
  SKELETON_EDGE_STYLE,
  POST_GENERATION_SCAN_DELAY,
  type GenerationStartPayload,
  type GenerationCompletePayload,
  type GenerationErrorPayload,
} from "@pg/shared/lib/constants";
import { toast } from "sonner";

export interface UseGenerationLifecycleParams {
  coord: GenerationCoordination;
  isGenerating: boolean;
  generationInfo: GenerationInfo | null;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  getNodeId: () => string;
  scanForIterations: (
    resetTimeoutOnFind?: boolean,
    scanContext?: GenerationInfo | null,
  ) => Promise<void>;
  resumeGenerationInfo?: GenerationInfo | null;
}

export function useGenerationLifecycle({
  coord,
  isGenerating,
  generationInfo,
  setNodes,
  setEdges,
  getNodeId,
  scanForIterations,
  resumeGenerationInfo,
}: UseGenerationLifecycleParams): void {
  const generationEventSourceRef = useRef<EventSource | null>(null);
  const hasResumedRef = useRef(false);
  const [, setLastGenerationDuration] = useState<string | null>(null);
  const [, setElapsedTime] = useState<string>("0m:00s");

  // Running timer during generation + safety timeout for orphaned skeletons
  useEffect(() => {
    if (!isGenerating || !generationInfo?.startTime) {
      return;
    }

    // Update elapsed time every second
    const updateElapsed = () => {
      const durationMs = Date.now() - generationInfo.startTime;
      const totalSeconds = Math.floor(durationMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setElapsedTime(`${minutes}m:${seconds.toString().padStart(2, "0")}s`);
    };

    // Initial update
    updateElapsed();

    // Update every second
    const intervalId = setInterval(updateElapsed, 1000);

    // Safety: auto-clean skeleton nodes after 10 minutes if generation hangs
    const safetyTimeout = setTimeout(
      () => {
        const info = coord.getGenerationInfo();
        if (info) {
          setNodes((nds) =>
            nds.filter((n) => !info.skeletonNodeIds.includes(n.id)),
          );
          setEdges((eds) =>
            eds.filter(
              (e) => !info.skeletonNodeIds.some((sid) => e.target === sid),
            ),
          );
        }
        coord.clearGenerationEager();
      },
      10 * 60 * 1000,
    );

    return () => {
      clearInterval(intervalId);
      clearTimeout(safetyTimeout);
    };
  }, [
    isGenerating,
    generationInfo?.startTime,
    setNodes,
    setEdges,
    coord.getGenerationInfo,
    coord.clearGenerationEager,
  ]);

  // SSE helpers for progressive iteration detection during generation.
  // The server parses the agent's stream-json tool events and pushes an
  // event per written file (the fs-watcher remains as a silent fallback).
  const stopGenerationEventSource = useCallback(() => {
    if (generationEventSourceRef.current) {
      generationEventSourceRef.current.close();
      generationEventSourceRef.current = null;
    }
  }, []);

  const startGenerationEventSource = useCallback(() => {
    stopGenerationEventSource();
    const es = new EventSource("/playground/api/generate?action=events");
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "iteration-added") {
          const ctx = coord.getGenerationInfo();
          // data.filePath / data.iterationNumber identify the exact file written (from the agent's tool events)
          scanForIterations(false, ctx ?? undefined);
        } else if (data.type === "done") {
          es.close();
        }
      } catch {
        /* ignore parse errors */
      }
    };
    es.onerror = () => {
      // Connection lost — server will close when generation ends.
      // The final scan in handleGenerationComplete catches anything missed.
      es.close();
    };
    generationEventSourceRef.current = es;
  }, [scanForIterations, stopGenerationEventSource, coord.getGenerationInfo]);

  // Resume generation after page reload — restore persisted generationInfo,
  // keep skeleton nodes on canvas, and reconnect SSE.
  useEffect(() => {
    // Resume is a one-time restore after page reload; guard so re-runs
    // (from dependency changes) never re-trigger it.
    if (hasResumedRef.current) return;
    const persisted = resumeGenerationInfo;
    if (!persisted) return;

    // Verify skeletons actually exist in the loaded nodes
    const currentSkeletons = coord
      .getNodes()
      .filter(
        (n) =>
          n.type === "skeleton" && persisted.skeletonNodeIds.includes(n.id),
      );
    if (currentSkeletons.length === 0) return;

    hasResumedRef.current = true;

    // Restore generation state
    coord.setGenerationInfoEager(persisted);
    coord.setIsGeneratingEager(true);

    // Reconnect SSE and kick off an immediate scan to pick up any
    // iterations that landed while the page was reloading
    startGenerationEventSource();
    scanForIterations(false, persisted);
  }, [
    resumeGenerationInfo,
    coord.getNodes,
    coord.setGenerationInfoEager,
    coord.setIsGeneratingEager,
    startGenerationEventSource,
    scanForIterations,
  ]);

  // Handle generation lifecycle events
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
     * downward until none of them overlap any existing node on the canvas.
     * Also avoids overlapping previously placed skeletons in the same batch.
     */
    const resolveOverlaps = (
      rects: { x: number; y: number; w: number; h: number }[],
      existingNodes: Node[],
    ) => {
      const SHIFT_STEP = 80; // px to shift down per iteration
      const MAX_ATTEMPTS = 20;

      // Build bounding boxes for all existing canvas nodes
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
          // Shift all candidate rects to the right
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
        gridLayout,
        renderMode: genRenderMode,
        jsxFile: genJsxFile,
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
          renderMode: genRenderMode,
          jsxFile: genJsxFile,
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
          renderMode: genRenderMode,
          jsxFile: genJsxFile,
          startNumber: genStartNumber ?? 1,
        };
        coord.setGenerationInfoEager(newInfo);
        coord.setIsGeneratingEager(true);

        // Subscribe to server-sent events for progressive iteration detection
        startGenerationEventSource();
        return;
      }

      // Find the parent node (use ref for current nodes)
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

      // Create skeleton nodes
      const skeletonNodes: Node[] = [];
      const skeletonEdges: Edge[] = [];
      const skeletonNodeIds: string[] = [];

      // Build candidate positions for all skeletons first
      const candidateRects: { x: number; y: number; w: number; h: number }[] =
        [];

      for (let i = 1; i <= iterationCount; i++) {
        let x: number;
        let y: number;

        if (gridLayout) {
          // Grid layout from drag-to-iterate: anchor grid to the right of parent
          const { cols } = gridLayout;
          const gap = DRAG_GHOST_GAP;
          const parentW =
            parentNode.measured?.width ??
            (parentNode.type === "component"
              ? DEFAULT_COMPONENT_NODE_WIDTH
              : DEFAULT_ITERATION_NODE_WIDTH);

          const gridOriginX =
            parentNode.position.x + parentW + ARRANGE_HORIZONTAL_GAP;
          const gridOriginY = parentNode.position.y;

          // Fill grid left-to-right, top-to-bottom
          const col = (i - 1) % cols;
          const row = Math.floor((i - 1) / cols);

          x = gridOriginX + col * (cellW + gap);
          y = gridOriginY + row * (cellH + gap);
        } else {
          // Dialog flow: place iterations to the right of the parent
          const pos = calculateIterationPosition(
            coord.getNodes(),
            parentNode,
            i,
            iterationCount,
          );
          x = pos.x;
          y = pos.y;
        }

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
            // Always size skeleton nodes to match parent so button and drag flows are consistent
            width: cellW,
            height: cellH,
          },
        });

        skeletonEdges.push({
          id: `edge_${parentNodeId}_${nodeId}`,
          source: parentNodeId,
          target: nodeId,
          type: "smoothstep",
          animated: true,
          style: SKELETON_EDGE_STYLE,
        });
      }

      // Add skeleton nodes to canvas
      setNodes((nds) => [...nds, ...skeletonNodes]);
      setEdges((eds) => [...eds, ...skeletonEdges]);

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
        gridPositions: gridLayout
          ? skeletonNodes.map((n) => ({ x: n.position.x, y: n.position.y }))
          : undefined,
        gridCellSize: gridLayout ? { width: cellW, height: cellH } : undefined,
        renderMode: genRenderMode,
        jsxFile: genJsxFile,
        startNumber: genStartNumber ?? 1,
      };
      coord.setGenerationInfoEager(newInfo);
      coord.setIsGeneratingEager(true);
      setLastGenerationDuration(null);

      // Subscribe to server-sent events for progressive iteration detection
      startGenerationEventSource();
    };

    const handleGenerationComplete = (_payload: GenerationCompletePayload): void => {
      stopGenerationEventSource();

      const info = coord.getGenerationInfo();
      const savedScanContext = info ? { ...info } : null;

      if (info?.startTime) {
        const durationMs = Date.now() - info.startTime;
        const totalSeconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const formatted = `${minutes}m:${seconds.toString().padStart(2, "0")}s`;
        setLastGenerationDuration(formatted);
      }

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
          setEdges((eds) =>
            eds.filter(
              (e) =>
                !savedScanContext.skeletonNodeIds.some(
                  (id) => e.target === id && replacedSkeletonIds.has(id),
                ),
            ),
          );
        } else if (info) {
          setNodes((nds) =>
            nds.filter((n) => !info.skeletonNodeIds.includes(n.id)),
          );
          setEdges((eds) =>
            eds.filter(
              (e) => !info.skeletonNodeIds.some((id) => e.target === id),
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
      // Close the SSE connection for progressive iteration detection
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

      // Use ref to get latest generation info to distinguish dialog vs drag-to-iterate flows.
      const info = coord.getGenerationInfo();
      const isDragFlow = !!info?.gridPositions;

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

      // Remove skeleton nodes
      if (info) {
        setNodes((nds) =>
          nds.filter((n) => !info.skeletonNodeIds.includes(n.id)),
        );
        setEdges((eds) =>
          eds.filter(
            (e) => !info.skeletonNodeIds.some((id) => e.target === id),
          ),
        );
      }

      // Reset generation state — eagerly sync ref
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
    setEdges,
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
