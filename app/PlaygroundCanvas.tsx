import {
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useReactFlow,
  useViewport,
  Node,
  SelectionMode,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TooltipProvider } from "@pg/shared/ui/tooltip";
import {
  getCanvasStorageKey,
  getIterationKeyFromNode,
  pruneKnownIterations,
} from "@pg/shared/lib/canvas-persistence";
import { useCanvasFlow } from "@pg/features/canvas/canvas-flow";
import PlaygroundCanvasToolbar from "@pg/features/canvas/components/PlaygroundCanvasToolbar";
import PlaygroundCanvasViewControls from "@pg/features/canvas/components/PlaygroundCanvasViewControls";
import PlaygroundCanvasDialogs from "@pg/features/canvas/components/PlaygroundCanvasDialogs";
import PlaygroundCanvasContextMenu from "@pg/features/canvas/components/PlaygroundCanvasContextMenu";
import { useCanvasDrawTool } from "@pg/features/canvas/hooks/useCanvasDrawTool";
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

import ComponentNode from "@pg/features/canvas/nodes/ComponentNode";
import IterationNode from "@pg/features/iterations/IterationNode";
import SkeletonIterationNode from "@pg/features/iterations/SkeletonIterationNode";
import ImageNode from "@pg/features/canvas/nodes/ImageNode";
import TextNode from "@pg/features/canvas/nodes/TextNode";
import ShapeNode, { type ShapeKind } from "@pg/features/canvas/nodes/ShapeNode";
import FrameNode from "@pg/features/canvas/nodes/FrameNode";
import HelperLines from "@pg/features/canvas/nodes/HelperLines";
import { ITERATION_COLLAPSE_TOGGLE_EVENT } from "@pg/shared/lib/constants";
import DockedChatBar from "@pg/features/chat/DockedChatBar";
import ElementHighlight from "@pg/features/canvas/components/ElementHighlight";
import { useElementSelection } from "@pg/features/canvas/hooks/useElementSelection";
import { useNodeSelection } from "@pg/features/chat/useNodeSelection";
import { useInteractiveNodeStore } from "@pg/shared/stores/interactive-node-store";
import { computeVisibleNodes } from "@pg/features/canvas/canvas-visibility";

/** Gap between background dots (px) */
const BACKGROUND_GAP = 10;

/** Size of each background dot (px) */
const BACKGROUND_DOT_SIZE = 1;

/** Maximum zoom level for the playground canvas */
const CANVAS_MAX_ZOOM = 2;

/** Minimum zoom level for the playground canvas */
const CANVAS_MIN_ZOOM = 0.1;

const nodeTypes = {
  component: ComponentNode,
  iteration: IterationNode,
  skeleton: SkeletonIterationNode,
  image: ImageNode,
  text: TextNode,
  shape: ShapeNode,
  frame: FrameNode,
};

interface PlaygroundCanvasProps {
  sidebarVisible: boolean;
  onToggleSidebar: (forceOpen?: boolean) => void;
  onShowSidebar: () => void;
  onHideSidebar: () => void;
  /** Stable per-project id used to scope persisted canvas state to this project. */
  projectId?: string;
  showClearDialog: boolean;
  setShowClearDialog: Dispatch<SetStateAction<boolean>>;
}

export default function PlaygroundCanvas({
  sidebarVisible,
  onToggleSidebar,
  onShowSidebar,
  onHideSidebar,
  projectId,
  showClearDialog,
  setShowClearDialog,
}: PlaygroundCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const sidebarOpenedByButtonHoverRef = useRef(false);
  const storageKey = getCanvasStorageKey(projectId);

  // The flow provider is the single loader of persisted canvas state. It reads
  // localStorage once and exposes the loaded snapshot via `initialState`, so this
  // component never reads localStorage itself.
  const {
    nodes,
    setNodes,
    onNodesChange,
    relations,
    setRelations,
    initialState,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCanvasFlow();

  const initialKnownIterations = initialState?.knownIterations
    ? pruneKnownIterations(
        initialState.knownIterations,
        initialState.nodes || [],
      )
    : [];
  const [knownIterations, setKnownIterations] = useState<string[]>(
    initialKnownIterations,
  );
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(
    new Set(initialState?.collapsedNodeIds || []),
  );
  const collapsedNodeIdsRef = useRef<Set<string>>(null!);
  if (collapsedNodeIdsRef.current === null) {
    collapsedNodeIdsRef.current = new Set(initialState?.collapsedNodeIds || []);
  }

  // Node ID counter as a ref (survives re-renders, initialized from localStorage)
  const nodeIdCounterRef = useRef<number>(initialState?.nodeIdCounter || 0);
  const getNodeId = useCallback(() => `node_${++nodeIdCounterRef.current}`, []);

  // Keep collapsed ref in sync
  useEffect(() => {
    collapsedNodeIdsRef.current = collapsedNodeIds;
  }, [collapsedNodeIds]);

  // Right-click context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId?: string;
  } | null>(null);

  // Canvas tool mode: 'select' is default pointer, 'text' is click-to-place text,
  // 'shape' is drag-to-draw annotation shapes (kind chosen via shapeKind), 'hand'
  // is drag-to-pan the canvas.
  const [activeTool, setActiveTool] = useState<
    "select" | "text" | "shape" | "hand"
  >("select");
  const [shapeKind, setShapeKind] = useState<ShapeKind>("rect");
  // Snap-to-grid is modal like Excalidraw: freeform placement is the default and
  // snapping only engages while the user holds Control/⌘ (see the effect below).
  // Plus transient Figma-style alignment guides shown while dragging.
  const [snapEnabled, setSnapEnabled] = useState(false);
  const SNAP_GRID = 16;

  // Engage snap-to-grid only while Control (or ⌘) is held; release — or losing
  // window focus mid-hold — turns it back off so it never sticks on.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta") setSnapEnabled(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta") setSnapEnabled(false);
    };
    const reset = () => setSnapEnabled(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", reset);
    };
  }, []);
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (initialState && !initialized.current) {
    nodeIdCounterRef.current = initialState.nodeIdCounter;
    initialized.current = true;
  }

  const coord = useGenerationCoordination({
    nodes,
    knownIterations,
    setKnownIterations,
  });
  const { isGenerating, generationInfo } = coord;
  const { screenToFlowPosition, fitView, getViewport, zoomIn, zoomOut } =
    useReactFlow();
  const { zoom } = useViewport();

  // Undo / redo: Ctrl/⌘+Z undoes, Ctrl/⌘+Y (or Ctrl/⌘+Shift+Z) redoes. Ignored
  // while typing in an input/textarea/contentEditable so it never eats an edit.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable)
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

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

  // Pointer-driven drag-to-draw shapes live behind one seam.
  useCanvasDrawTool({
    activeTool,
    reactFlowWrapper,
    screenToFlowPosition,
    shapeKind,
    getNodeId,
    setNodes,
    setActiveTool,
  });

  // Handle iteration deletion callback
  const handleIterationDelete = useCallback((filename: string) => {
    setKnownIterations((prev) => prev.filter((f) => f !== filename));
  }, []);

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

  // ---------------------------------------------------------------------------
  // Cursor Chat submit handler + queue
  // ---------------------------------------------------------------------------
  const elementSelection = useElementSelection();
  const nodeSelection = useNodeSelection();
  const { handleChatSubmit } = useChatSubmit({
    coord,
    scanForIterations,
  });

  const { onDragOver, onDrop } = useCanvasDragDrop({
    coord,
    screenToFlowPosition,
    getNodeId,
    setNodes,
    setRelations,
    handleIterationDelete,
  });

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      setContextMenu(null);
      useInteractiveNodeStore.getState().setInteractiveNodeId(null);

      if (activeTool === "text") {
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const newNode = {
          id: getNodeId(),
          type: "text" as const,
          position,
          selected: true,
          data: { text: "", autofocus: true },
        };
        // Defer until after the pane click finishes so focus isn't stolen by the click target.
        requestAnimationFrame(() => {
          setNodes((nds) =>
            nds.map((n) => ({ ...n, selected: false })).concat(newNode),
          );
          setActiveTool("select");
        });
      }
    },
    [activeTool, screenToFlowPosition, getNodeId, setNodes],
  );

  // Right-click context menu on canvas pane
  const handlePaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY });
    },
    [],
  );

  // Right-click context menu on a node — also select the node so the
  // z-order actions in the menu have a clear target.
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setNodes((nds) =>
        nds.map((n) => (n.id === node.id ? { ...n, selected: true } : n)),
      );
      setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    [setNodes],
  );

  // Close context menu on any click outside
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [contextMenu]);

  // Suppress browser history swipe (macOS trackpad two-finger swipe-back/forward).
  // React's onWheel is passive — preventDefault() is a no-op there — so we
  // attach the listener imperatively with { passive: false }. We only block
  // horizontal-dominant wheel events; vertical scroll and React Flow's
  // panOnScroll are untouched.
  useEffect(() => {
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
      }
    };

    wrapper.addEventListener("wheel", handleWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", handleWheel);
  }, []);

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

  // ---------------------------------------------------------------------------
  // Collapse/expand toggle event
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleCollapseToggle = (e: CustomEvent<{ nodeId: string }>) => {
      const { nodeId } = e.detail;
      setCollapsedNodeIds((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return next;
      });
    };

    window.addEventListener(
      ITERATION_COLLAPSE_TOGGLE_EVENT,
      handleCollapseToggle as EventListener,
    );
    return () => {
      window.removeEventListener(
        ITERATION_COLLAPSE_TOGGLE_EVENT,
        handleCollapseToggle as EventListener,
      );
    };
  }, []);

  const visibleNodes = useMemo(
    () => computeVisibleNodes(nodes, relations, collapsedNodeIds),
    [nodes, relations, collapsedNodeIds],
  );

  // Image upload via toolbar button (reuses same logic as drag-drop)
  const handleImageFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (imageFiles.length === 0) return;

      const wrapper = reactFlowWrapper.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });

      imageFiles.forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          try {
            const res = await fetch("/playground/api/images", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageBase64: base64,
                originalName: file.name,
              }),
            });
            const data = await res.json();
            if (data.success) {
              const newNode: Node = {
                id: getNodeId(),
                type: "image",
                position: { x: position.x + idx * 320, y: position.y },
                style: { width: 300, height: 250 },
                data: {
                  imagePath: data.path,
                  imageUrl: data.url,
                  filename: data.filename,
                  originalName: file.name,
                },
              };
              setNodes((nds) => nds.concat(newNode));
            }
          } catch (err) {
            console.error("[Playground] Image upload failed:", err);
          }
        };
        reader.readAsDataURL(file);
      });

      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [screenToFlowPosition, getNodeId, setNodes],
  );

  const handleSidebarButtonMouseEnter = useCallback(() => {
    sidebarOpenedByButtonHoverRef.current = !sidebarVisible;
    onShowSidebar();
  }, [onShowSidebar, sidebarVisible]);

  const handleSidebarButtonClick = useCallback(() => {
    onToggleSidebar(sidebarOpenedByButtonHoverRef.current);
    sidebarOpenedByButtonHoverRef.current = false;
  }, [onToggleSidebar]);

  return (
    <TooltipProvider>
      <div
        ref={reactFlowWrapper}
        className={`w-full h-full${activeTool === "text" ? " playground-text-tool" : ""}${activeTool === "hand" ? " playground-hand-tool" : ""}${activeTool === "shape" ? " playground-shape-tool" : ""}`}
      >
        {/* Pane fill (`--xy-background-color`) and grid line `stroke` are set in
            playground-global.css, scoped under `.playground-main-view .react-flow`. */}
        <ReactFlow
          nodes={visibleNodes}
          onNodesChange={handleNodesChange}
          onNodesDelete={onNodesDelete}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={() => clearHelperLines()}
          snapToGrid={snapEnabled}
          snapGrid={[SNAP_GRID, SNAP_GRID]}
          onPaneClick={handlePaneClick}
          onPaneContextMenu={handlePaneContextMenu}
          onNodeContextMenu={handleNodeContextMenu}
          nodeTypes={nodeTypes}
          {...(initialState?.viewport
            ? { defaultViewport: initialState.viewport }
            : { fitView: true })}
          proOptions={{ hideAttribution: true }}
          minZoom={CANVAS_MIN_ZOOM}
          maxZoom={CANVAS_MAX_ZOOM}
          panOnScroll
          zoomOnScroll={false}
          zoomOnPinch
          panOnDrag={activeTool === "hand" ? true : [1]}
          panActivationKeyCode={null}
          selectionOnDrag={activeTool === "select"}
          selectionMode={SelectionMode.Partial}
          nodesDraggable={activeTool !== "hand"}
          nodesConnectable={false}
          elementsSelectable
          deleteKeyCode={["Delete", "Backspace"]}
        >
          {/* <Controls
            className="!bg-white !border-stone-200 !rounded-lg !shadow-sm [&>button]:!bg-white [&>button]:!border-stone-200 [&>button]:!text-stone-600 [&>button:hover]:!bg-stone-50"
          /> */}
          <Background
            variant={BackgroundVariant.Dots}
            gap={BACKGROUND_GAP}
            size={BACKGROUND_DOT_SIZE}
          />
          <HelperLines
            vertical={helperLines.vertical}
            horizontal={helperLines.horizontal}
          />
        </ReactFlow>

        {/* Hidden file input for image upload */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageFileSelect}
        />

        <PlaygroundCanvasToolbar
          sidebarVisible={sidebarVisible}
          onSidebarButtonClick={handleSidebarButtonClick}
          onSidebarButtonMouseEnter={handleSidebarButtonMouseEnter}
          onHideSidebar={onHideSidebar}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          shapeKind={shapeKind}
          setShapeKind={setShapeKind}
          imageInputRef={imageInputRef}
        />

        <PlaygroundCanvasViewControls
          zoom={zoom}
          onZoomIn={() => zoomIn()}
          onZoomOut={() => zoomOut()}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        {/* Element selection highlights */}
        <ElementHighlight
          isAltHeld={elementSelection.isAltHeld}
          hoveredElement={elementSelection.hoveredElement}
          hoveredRect={elementSelection.hoveredRect}
          hoveredInfo={elementSelection.hoveredInfo}
          selectedElements={elementSelection.selectedElements}
        />

        {/* Always-on bottom-center chat composer (the only chat surface) */}
        <DockedChatBar
          isGenerating={isGenerating}
          onSubmit={handleChatSubmit}
          selectedElements={elementSelection.selectedElements}
          onRemoveElement={(idx) => elementSelection.removeElement(idx)}
          onClearElements={elementSelection.clearSelection}
          selectedNodes={nodeSelection.selectedNodes}
          onRemoveNode={nodeSelection.removeNode}
          onClearNodes={nodeSelection.clearNodeSelection}
        />

        <PlaygroundCanvasDialogs
          showClearDialog={showClearDialog}
          setShowClearDialog={setShowClearDialog}
          confirmClearAllNodes={confirmClearAllNodes}
          deleteDialogNode={deleteDialogNode}
          setDeleteDialogNode={setDeleteDialogNode}
          handleDeleteWithMode={handleDeleteWithMode}
        />

        <PlaygroundCanvasContextMenu
          contextMenu={contextMenu}
          nodes={nodes}
          onClose={() => setContextMenu(null)}
          onOrganize={() => autoArrangeNodes(true)}
          onGroup={handleGroupSelection}
          onUngroup={handleUngroupFrame}
          onZOrder={handleZOrder}
        />
      </div>
    </TooltipProvider>
  );
}
