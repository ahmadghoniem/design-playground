import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import { useReactFlow } from "@xyflow/react";
import type { Node, NodeChange } from "@xyflow/react";
import {
  getIterationKeyFromNode,
  type CanvasRelation,
} from "@pg/shared/lib/canvas-persistence";
import { useCanvasPersistence } from "@pg/features/canvas/hooks/useCanvasPersistence";
import { useCanvasDragDrop } from "@pg/features/canvas/hooks/useCanvasDragDrop";
import { useCanvasPaste } from "@pg/features/canvas/hooks/useCanvasPaste";
import { useGenerationCoordination } from "@pg/features/generation/useGenerationCoordination";
import { useGenerationLifecycle } from "@pg/features/generation/useGenerationLifecycle";
import { useIterationScan } from "@pg/features/iterations/useIterationScan";
import { useChatSubmit } from "@pg/app/useChatSubmit";
import { useCanvasFrameOps } from "@pg/features/canvas/hooks/useCanvasFrameOps";
import { useCanvasNodeDelete } from "@pg/features/canvas/hooks/useCanvasNodeDelete";
import { useCanvasAutoArrange } from "@pg/features/canvas/hooks/useCanvasAutoArrange";
import { useCanvasClear } from "@pg/features/canvas/hooks/useCanvasClear";
import { useCanvasDrawTool } from "@pg/features/canvas/hooks/useCanvasDrawTool";
import { useElementSelection } from "@pg/features/canvas/hooks/useElementSelection";
import { useNodeSelection } from "@pg/features/chat/useNodeSelection";
import type { ShapeKind } from "@pg/features/canvas/nodes/ShapeNode";

export interface UsePlaygroundCanvasControllerParams {
  nodes: Node[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  onNodesChange: (changes: NodeChange[]) => void;
  relations: CanvasRelation[];
  setRelations: Dispatch<SetStateAction<CanvasRelation[]>>;
  storageKey: string;
  knownIterations: string[];
  setKnownIterations: Dispatch<SetStateAction<string[]>>;
  collapsedNodeIds: Set<string>;
  setCollapsedNodeIds: Dispatch<SetStateAction<Set<string>>>;
  collapsedNodeIdsRef: MutableRefObject<Set<string>>;
  nodeIdCounterRef: MutableRefObject<number>;
  getNodeId: () => string;
  contextMenu: { x: number; y: number; nodeId?: string } | null;
  showClearDialog: boolean;
  setShowClearDialog: Dispatch<SetStateAction<boolean>>;
  reactFlowWrapper: RefObject<HTMLDivElement | null>;
  activeTool: "select" | "text" | "shape" | "hand";
  setActiveTool: Dispatch<
    SetStateAction<"select" | "text" | "shape" | "hand">
  >;
  shapeKind: ShapeKind;
}

/**
 * Wires generation, chat submit, iteration scan, persistence, drag-drop,
 * frame ops, and related canvas feature hooks. PlaygroundCanvas stays a
 * composition shell that owns local UI state (tools, context menu, etc.).
 */
export function usePlaygroundCanvasController({
  nodes,
  setNodes,
  onNodesChange,
  relations,
  setRelations,
  storageKey,
  knownIterations,
  setKnownIterations,
  collapsedNodeIds,
  setCollapsedNodeIds,
  collapsedNodeIdsRef,
  nodeIdCounterRef,
  getNodeId,
  contextMenu,
  showClearDialog,
  setShowClearDialog,
  reactFlowWrapper,
  activeTool,
  setActiveTool,
  shapeKind,
}: UsePlaygroundCanvasControllerParams) {
  // Under the same ReactFlowProvider as PlaygroundCanvas, so viewport helpers
  // come straight from React Flow instead of being threaded through params.
  const { getViewport, fitView, screenToFlowPosition } = useReactFlow();

  const coord = useGenerationCoordination({
    nodes,
    knownIterations,
    setKnownIterations,
  });
  const { isGenerating, generationInfo } = coord;

  const {
    handleZOrder,
    handleGroupSelection,
    handleUngroupFrame,
    onNodeDrag,
    clearHelperLines,
    helperLines,
  } = useCanvasFrameOps({ coord, setNodes, contextMenu, getNodeId });

  const {
    onNodesDelete,
    deleteDialogNode,
    setDeleteDialogNode,
    handleDeleteWithMode,
  } = useCanvasNodeDelete({
    nodes,
    relations,
    setNodes,
    setRelations,
    setKnownIterations,
    setCollapsedNodeIds,
  });

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const removedIterationKeys: string[] = [];
      for (const change of changes) {
        if (change.type === "remove") {
          const node = coord.getNodes().find((n) => n.id === change.id);
          if (node?.type === "iteration") {
            const key = getIterationKeyFromNode(node);
            if (key) removedIterationKeys.push(key);
          }
        }
      }
      if (removedIterationKeys.length > 0) {
        coord.removeKnownIterations(removedIterationKeys);
      }

      onNodesChange(changes);
    },
    [onNodesChange, coord.getNodes, coord.removeKnownIterations],
  );

  useCanvasPersistence({
    storageKey,
    nodes,
    relations,
    coord,
    knownIterations,
    collapsedNodeIds,
    collapsedNodeIdsRef,
    nodeIdCounterRef,
    getViewport,
  });

  useCanvasDrawTool({
    activeTool,
    reactFlowWrapper,
    screenToFlowPosition,
    shapeKind,
    getNodeId,
    setNodes,
    setActiveTool,
  });

  const handleIterationDelete = useCallback((filename: string) => {
    setKnownIterations((prev) => prev.filter((f) => f !== filename));
  }, [setKnownIterations]);

  const { scanForIterations } = useIterationScan({
    coord,
    isGenerating,
    setNodes,
    setRelations,
    getNodeId,
    handleIterationDelete,
  });

  const { confirmClearAllNodes } = useCanvasClear({
    showClearDialog,
    setShowClearDialog,
    setNodes,
    setRelations,
    setKnownIterations,
    setCollapsedNodeIds,
    storageKey,
  });

  useGenerationLifecycle({
    coord,
    isGenerating,
    generationInfo,
    setNodes,
    setRelations,
    getNodeId,
    scanForIterations,
  });

  const elementSelection = useElementSelection();
  const nodeSelection = useNodeSelection();
  const { handleChatSubmit } = useChatSubmit({ coord });

  const { onDragOver, onDrop } = useCanvasDragDrop({
    coord,
    screenToFlowPosition,
    getNodeId,
    setNodes,
    setRelations,
    handleIterationDelete,
  });

  useCanvasPaste({
    reactFlowWrapper,
    screenToFlowPosition,
    getNodeId,
    setNodes,
  });

  const { autoArrangeNodes } = useCanvasAutoArrange({
    nodes,
    relations,
    collapsedNodeIdsRef,
    setNodes,
    fitView,
    getViewport,
  });

  return {
    isGenerating,
    handleNodesChange,
    onNodesDelete,
    deleteDialogNode,
    setDeleteDialogNode,
    handleDeleteWithMode,
    onDragOver,
    onDrop,
    onNodeDrag,
    clearHelperLines,
    helperLines,
    handleZOrder,
    handleGroupSelection,
    handleUngroupFrame,
    handleChatSubmit,
    elementSelection,
    nodeSelection,
    confirmClearAllNodes,
    autoArrangeNodes,
    scanForIterations,
  };
}
