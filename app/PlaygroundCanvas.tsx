'use client';

import { useCallback, useMemo, useRef, useEffect, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  addEdge,
  Connection,
  useReactFlow,
  Node,
  Edge,
  SelectionMode,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TooltipProvider } from '../ui/tooltip';
import { getProviderFields } from '../lib/generation-body';
import { loadCanvasState, getCanvasStorageKey, getIterationKeyFromNode, pruneKnownIterations, type GenerationInfo } from '../lib/canvas-persistence';
import { useCanvasFlow } from '../lib/canvas-flow';
import PlaygroundCanvasDrawLayer from '../components/canvas/PlaygroundCanvasDrawLayer';
import PlaygroundCanvasToolbar from '../components/canvas/PlaygroundCanvasToolbar';
import PlaygroundCanvasDialogs from '../components/canvas/PlaygroundCanvasDialogs';
import CanvasPresenceLayer from '../components/canvas/CanvasPresenceLayer';
import { usePlaygroundDrawStore } from '../stores/playground-draw-store';
import { type DrawPenKind, type DrawStroke } from '../lib/draw-types';
import { useCanvasDrawTool } from '../hooks/useCanvasDrawTool';
import { useCanvasPersistence } from '../hooks/useCanvasPersistence';
import { useCanvasPresenceBubbles } from '../hooks/useCanvasPresenceBubbles';
import { useCanvasDragDrop } from '../hooks/useCanvasDragDrop';
import { useCanvasPaste } from '../hooks/useCanvasPaste';
import { useGenerationCoordination } from '../hooks/useGenerationCoordination';
import { useGenerationLifecycle } from '../hooks/useGenerationLifecycle';
import { useIterationScan } from '../hooks/useIterationScan';
import { useChatSubmit } from '../hooks/useChatSubmit';
import { useCanvasKeyboard } from '../hooks/useCanvasKeyboard';
import { useCanvasFrameOps } from '../hooks/useCanvasFrameOps';
import { useCanvasNodeDelete } from '../hooks/useCanvasNodeDelete';
import { useCanvasAutoArrange } from '../hooks/useCanvasAutoArrange';
import { useDragIterateEventHandler } from '../hooks/useDragToIterate';
import { LayoutGrid, Frame } from 'lucide-react';
import { PageDocumentIcon } from '../ui/playground-nav-icons';

import ComponentNode from '../nodes/ComponentNode';
import IterationNode from '../nodes/IterationNode';
import SkeletonIterationNode from '../nodes/SkeletonIterationNode';
import DragGhostNode from '../nodes/DragGhostNode';
import ImageNode from '../nodes/ImageNode';
import { hitTestStrokes } from '../lib/draw-hit-test';
import TextNode from '../nodes/TextNode';
import ShapeNode, { type ShapeKind } from '../nodes/ShapeNode';
import FrameNode from '../nodes/FrameNode';
import HelperLines from '../nodes/shared/HelperLines';
import {
  formatSkillSection,
  getStylingConstraint,
} from '../prompts/shared-sections';
import { createPagePrompt, RESERVED_TOP_LEVEL_SLUGS } from '../prompts/create-page.prompt';
import { loadDefaultSkillPrompt } from '../lib/load-default-skill-prompt';
import { loadSelectedModel } from '../nodes/shared/IterateDialogParts';
import {
  GENERATION_START_EVENT,
  GENERATION_COMPLETE_EVENT,
  GENERATION_ERROR_EVENT,
  CREATE_DESIGN_EVENT,
  CANVAS_BACKGROUND_COLOR,
  BACKGROUND_COLOR,
  CANVAS_MAX_ZOOM,
  CANVAS_MIN_ZOOM,
  ITERATION_COLLAPSE_TOGGLE_EVENT,
  PLAYGROUND_CLEAR_EVENT,
  DEFAULT_STYLING_MODE,
  type GenerationStartPayload,
  type GenerationCompletePayload,
  type GenerationErrorPayload,
} from '../lib/constants';
import DockedChatBar from '../components/chat/DockedChatBar';
import ElementHighlight from '../components/canvas/ElementHighlight';
import { useElementSelection } from '../hooks/useElementSelection';
import { useNodeSelection } from '../hooks/useNodeSelection';
import { useInteractiveNodeStore } from '../stores/interactive-node-store';
import { useDynamicBackground } from '../hooks/useDynamicBackground';
import { toast } from 'sonner';
import { computeVisibleNodes } from '../lib/canvas-visibility';

const nodeTypes = {
  component: ComponentNode,
  iteration: IterationNode,
  skeleton: SkeletonIterationNode,
  'drag-ghost': DragGhostNode,
  image: ImageNode,
  text: TextNode,
  shape: ShapeNode,
  frame: FrameNode,
};

/** Minimap dot color by node type — keeps the overview readable at a glance. */
const MINIMAP_NODE_COLORS: Record<string, string> = {
  component: '#a8a29e',
  iteration: '#34d399',
  skeleton: '#e7e5e4',
  image: '#60a5fa',
  text: '#d6d3d1',
  shape: '#fbbf24',
  frame: '#c4b5fd',
};
function getMinimapNodeColor(node: Node): string {
  return (node.type && MINIMAP_NODE_COLORS[node.type]) || '#d6d3d1';
}

/** Poll interval while a generation is active (SSE fallback) — lives in useIterationScan. */

// countBatchIterationNodes moved to ../lib/iteration-scan

interface IterationFile {
  filename: string;
  componentName: string;
  iterationNumber: number;
  parentId: string;
  description: string;
  sourceIteration: string | null;
}

// CanvasPresenceBubble, CanvasPresenceLayer moved to ../components/canvas/CanvasPresenceLayer

// CanvasState, loadCanvasState, saveCanvasState moved to ./lib/canvas-persistence

// Re-export event names so existing imports keep working
export { ITERATION_PROMPT_COPIED_EVENT, ITERATION_FETCH_EVENT } from '../lib/constants';
import { ITERATION_PROMPT_COPIED_EVENT, ITERATION_FETCH_EVENT } from '../lib/constants';

// GenerationInfo moved to ./lib/canvas-persistence

interface PlaygroundCanvasProps {
  sidebarVisible: boolean;
  onToggleSidebar: (forceOpen?: boolean) => void;
  onShowSidebar: () => void;
  onHideSidebar: () => void;
  /** Stable per-project id used to scope persisted canvas state to this project. */
  projectId?: string;
}

export default function PlaygroundCanvas({
  sidebarVisible,
  onToggleSidebar,
  onShowSidebar,
  onHideSidebar,
  projectId,
}: PlaygroundCanvasProps) {
  const dynamicBg = useDynamicBackground();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const sidebarOpenedByButtonHoverRef = useRef(false);
  const storageKey = getCanvasStorageKey(projectId);
  const initialState = loadCanvasState(storageKey);
  const initialKnownIterations = initialState?.knownIterations
    ? pruneKnownIterations(initialState.knownIterations, initialState.nodes || [])
    : [];
  const [knownIterations, setKnownIterations] = useState<string[]>(initialKnownIterations);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(
    new Set(initialState?.collapsedNodeIds || []),
  );
  const collapsedNodeIdsRef = useRef<Set<string>>(new Set(initialState?.collapsedNodeIds || []));
  
  // Node ID counter as a ref (survives re-renders, initialized from localStorage)
  const nodeIdCounterRef = useRef<number>(initialState?.nodeIdCounter || 0);
  const getNodeId = useCallback(() => `node_${++nodeIdCounterRef.current}`, []);
  
  // Keep collapsed ref in sync
  useEffect(() => {
    collapsedNodeIdsRef.current = collapsedNodeIds;
  }, [collapsedNodeIds]);
  
  // Right-click context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string } | null>(null);

  const [createPageDialog, setCreatePageDialog] = useState<{ screenX: number; screenY: number } | null>(null);
  const [newPageDescription, setNewPageDescription] = useState('');
  const [createPageError, setCreatePageError] = useState('');
  const [creatingPage, setCreatingPage] = useState(false);
  const newPageInputRef = useRef<HTMLTextAreaElement>(null);

  // Canvas tool mode: 'select' is default pointer, 'text' is click-to-place text, 'draw' is freehand ink,
  // 'shape' is drag-to-draw annotation shapes (kind chosen via shapeKind).
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'draw' | 'shape'>('select');
  const [shapeKind, setShapeKind] = useState<ShapeKind>('rect');
  // Snap-to-grid is modal like Excalidraw: freeform placement is the default and
  // snapping only engages while the user holds Control/⌘ (see the effect below).
  // Plus transient Figma-style alignment guides shown while dragging.
  const [snapEnabled, setSnapEnabled] = useState(false);
  const SNAP_GRID = 16;

  // Engage snap-to-grid only while Control (or ⌘) is held; release — or losing
  // window focus mid-hold — turns it back off so it never sticks on.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') setSnapEnabled(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') setSnapEnabled(false);
    };
    const reset = () => setSnapEnabled(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', reset);
    };
  }, []);
  const [canvasDrawings, setCanvasDrawings] = useState<DrawStroke[]>(
    initialState?.canvasDrawings ?? [],
  );
  const canvasDrawingsRef = useRef<DrawStroke[]>(initialState?.canvasDrawings ?? []);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const setDrawToolActive = usePlaygroundDrawStore((s) => s.setDrawToolActive);
  const setStrokeSelectEnabled = usePlaygroundDrawStore((s) => s.setStrokeSelectEnabled);
  const setStrokeSelection = usePlaygroundDrawStore((s) => s.setStrokeSelection);
  const drawPenKind = usePlaygroundDrawStore((s) => s.drawPenKind);
  const setDrawPenKind = usePlaygroundDrawStore((s) => s.setDrawPenKind);
  const strokeSelection = usePlaygroundDrawStore((s) => s.strokeSelection);

  // Clear canvas confirmation dialog
  const [showClearDialog, setShowClearDialog] = useState(false);
  
  
  if (initialState && !initialized.current) {
    nodeIdCounterRef.current = initialState.nodeIdCounter;
    initialized.current = true;
  }

  const {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    undo,
    redo,
  } = useCanvasFlow();
  const coord = useGenerationCoordination({ nodes, knownIterations, setKnownIterations });
  const {
    isGenerating,
    generationInfo,
  } = coord;
  const { screenToFlowPosition, fitView, setCenter, getViewport } = useReactFlow();

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
    edges,
    setNodes,
    setEdges,
    setKnownIterations,
    setCollapsedNodeIds,
  });

  const {
    canvasPresenceBubbles,
    getCanvasPresenceBubblePosition,
    handleCanvasPresenceBubbleClick,
  } = useCanvasPresenceBubbles({ coord, setCenter, fitView });

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const removedIterationKeys: string[] = [];
      for (const change of changes) {
        if (change.type === 'remove') {
          const node = coord.getNodes().find((n) => n.id === change.id);
          if (node?.type === 'iteration') {
            const key = getIterationKeyFromNode(node);
            if (key) removedIterationKeys.push(key);
          }
        }
      }
      if (removedIterationKeys.length > 0) {
        coord.removeKnownIterations(removedIterationKeys);
      }

      if (usePlaygroundDrawStore.getState().strokeSelection) {
        const withoutRemove = changes.filter((c) => c.type !== 'remove');
        if (withoutRemove.length === 0) return;
        onNodesChange(withoutRemove);
        return;
      }
      onNodesChange(changes);
    },
    [onNodesChange],
  );

  useEffect(() => {
    canvasDrawingsRef.current = canvasDrawings;
  }, [canvasDrawings]);

  useEffect(() => {
    setDrawToolActive(activeTool === 'draw');
    setStrokeSelectEnabled(activeTool === 'select');
    if (activeTool === 'draw') setStrokeSelection(null);
  }, [activeTool, setDrawToolActive, setStrokeSelectEnabled, setStrokeSelection]);

  const CANVAS_DRAW_EXTENT = 8000;

  // Select canvas ink strokes in select mode (complements path hit targets)
  useEffect(() => {
    if (activeTool !== 'select') return;
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || canvasDrawingsRef.current.length === 0) return;
      if (e.target instanceof Element && e.target.closest('[data-canvas-draw-stroke]')) return;
      if (e.target instanceof Element && e.target.closest('.react-flow__node')) return;
      const pane = wrapper.querySelector('.react-flow__pane');
      if (!pane?.contains(e.target as globalThis.Node)) return;

      const pt = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const { zoom } = getViewport();
      const hit = hitTestStrokes(
        canvasDrawingsRef.current,
        pt.x,
        pt.y,
        CANVAS_DRAW_EXTENT,
        CANVAS_DRAW_EXTENT,
        false,
        12 / zoom,
      );
      if (hit) {
        e.stopPropagation();
        setStrokeSelection({ scope: 'canvas', strokeId: hit });
      }
    };

    wrapper.addEventListener('pointerdown', onPointerDown, true);
    return () => wrapper.removeEventListener('pointerdown', onPointerDown, true);
  }, [activeTool, screenToFlowPosition, getViewport, setStrokeSelection]);

  useCanvasPersistence({
    storageKey,
    nodes,
    edges,
    coord,
    knownIterations,
    collapsedNodeIds,
    collapsedNodeIdsRef,
    canvasDrawings,
    canvasDrawingsRef,
    nodeIdCounterRef,
    getViewport,
  });

  // Pointer-driven freehand ink + drag-to-draw shapes live behind one seam.
  useCanvasDrawTool({
    activeTool,
    reactFlowWrapper,
    screenToFlowPosition,
    shapeKind,
    setCanvasDrawings,
    getNodeId,
    setNodes,
    setActiveTool,
  });

  // Handle iteration deletion callback
  const handleIterationDelete = useCallback((filename: string) => {
    setKnownIterations(prev => prev.filter(f => f !== filename));
  }, []);

  // Handle iteration adoption — IterationNode now owns the full adoption flow
  // (agent execution, toasts, presence bubbles). This callback is kept for
  // any canvas-level bookkeeping needed after a successful adoption.
  const handleIterationAdopt = useCallback((_filename: string, _componentName: string) => {
    // No-op: IterationNode handles everything via events + API calls
  }, []);

  const { scanForIterations, stopPolling } = useIterationScan({
    coord,
    isGenerating,
    setNodes,
    setEdges,
    getNodeId,
    handleIterationDelete,
    handleIterationAdopt,
  });

  useGenerationLifecycle({
    coord,
    isGenerating,
    generationInfo,
    setNodes,
    setEdges,
    getNodeId,
    scanForIterations,
    resumeGenerationInfo: initialState?.generationInfo,
  });

  // ---------------------------------------------------------------------------
  // Drag-to-iterate handler
  // ---------------------------------------------------------------------------
  useDragIterateEventHandler();

  // ---------------------------------------------------------------------------
  // Cursor Chat submit handler + queue
  // ---------------------------------------------------------------------------
  const elementSelection = useElementSelection();
  const nodeSelection = useNodeSelection();
  const { handleChatSubmit } = useChatSubmit({
    coord,
    getNodeId,
    setNodes,
    scanForIterations,
  });

  // Fit viewport around all nodes for a given component — handled in useCanvasPresenceBubbles.

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const { onDragOver, onDrop } = useCanvasDragDrop({
    coord,
    screenToFlowPosition,
    getNodeId,
    setNodes,
    setEdges,
    handleIterationDelete,
    handleIterationAdopt,
  });

  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    setContextMenu(null);
    useInteractiveNodeStore.getState().setInteractiveNodeId(null);
    setStrokeSelection(null);

    if (activeTool === 'text') {
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode = {
        id: getNodeId(),
        type: 'text' as const,
        position,
        selected: true,
        data: { text: '', autofocus: true },
      };
      // Defer until after the pane click finishes so focus isn't stolen by the click target.
      requestAnimationFrame(() => {
        setNodes((nds) => nds.map((n) => ({ ...n, selected: false })).concat(newNode));
        setActiveTool('select');
      });
    }
  }, [activeTool, screenToFlowPosition, getNodeId, setNodes, setStrokeSelection]);

  // Right-click context menu on canvas pane
  const handlePaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  }, []);

  // Right-click context menu on a node — also select the node so the
  // z-order actions in the menu have a clear target.
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setNodes((nds) => nds.map((n) => (n.id === node.id ? { ...n, selected: true } : n)));
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }, [setNodes]);

  // Close context menu on any click outside
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  // ---------------------------------------------------------------------------
  // Clipboard: copy / paste / duplicate of canvas nodes (single-player).
  // ---------------------------------------------------------------------------
  const clipboardRef = useRef<Node[]>([]);

  // Gather the current selection, pulling in the children of any selected frame
  // so a group copies as a unit. Skeletons/ghosts are never copyable.
  const collectCopyableSelection = useCallback((): Node[] => {
    const all = coord.getNodes();
    const selected = all.filter(
      (n) => n.selected && n.type !== 'skeleton' && n.type !== 'drag-ghost',
    );
    const ids = new Set(selected.map((n) => n.id));
    for (const n of selected) {
      if (n.type === 'frame') {
        for (const c of all) if (c.parentId === n.id) ids.add(c.id);
      }
    }
    return all.filter((n) => ids.has(n.id));
  }, []);

  // Clone a set of nodes with fresh ids, remapping intra-set parent links and
  // offsetting only the top-level (non-reparented) nodes.
  const cloneNodes = useCallback(
    (sources: Node[], dx: number, dy: number): Node[] => {
      const idMap = new Map<string, string>();
      for (const n of sources) idMap.set(n.id, getNodeId());
      const clones = sources.map((n) => {
        const parented = Boolean(n.parentId && idMap.has(n.parentId));
        return {
          ...n,
          id: idMap.get(n.id) as string,
          parentId: parented ? idMap.get(n.parentId as string) : undefined,
          extent: parented ? n.extent : undefined,
          position: parented ? n.position : { x: n.position.x + dx, y: n.position.y + dy },
          selected: true,
          data: { ...(n.data as Record<string, unknown>) },
        } as Node;
      });
      // Parents must precede their children in the array.
      clones.sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0));
      return clones;
    },
    [getNodeId],
  );

  const handleCopyNodes = useCallback(() => {
    const sel = collectCopyableSelection();
    if (sel.length === 0) return false;
    clipboardRef.current = sel;
    return true;
  }, [collectCopyableSelection]);

  const handlePasteNodes = useCallback(() => {
    const sources = clipboardRef.current;
    if (sources.length === 0) return false;
    const clones = cloneNodes(sources, 28, 28);
    // Re-anchor the clipboard so a repeated paste keeps cascading.
    clipboardRef.current = clones.map((c) => ({ ...c, data: { ...(c.data as Record<string, unknown>) } }));
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })).concat(clones));
    return true;
  }, [cloneNodes, setNodes]);

  const handleDuplicateNodes = useCallback(() => {
    const sources = collectCopyableSelection();
    if (sources.length === 0) return false;
    const clones = cloneNodes(sources, 28, 28);
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })).concat(clones));
    return true;
  }, [collectCopyableSelection, cloneNodes, setNodes]);

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

    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheel);
  }, []);

  useCanvasPaste({
    reactFlowWrapper,
    screenToFlowPosition,
    getNodeId,
    setNodes,
  });

  // Create HTML page from context menu using incremental Untitled-N naming.
  const getNextUntitledDesignName = useCallback(async (): Promise<string> => {
    try {
      const res = await fetch('/playground/api/html-pages');
      if (!res.ok) return 'Untitled-1';
      const data = await res.json() as { pages?: { folder: string }[] };
      const pages = Array.isArray(data.pages) ? data.pages : [];
      let max = 0;
      for (const page of pages) {
        const m = page.folder.match(/^untitled-(\d+)$/i);
        if (!m) continue;
        const n = Number(m[1]);
        if (Number.isFinite(n) && n > max) max = n;
      }
      return `Untitled-${max + 1}`;
    } catch {
      return 'Untitled-1';
    }
  }, []);

  const handleCreateHtmlPageAt = useCallback(async (screenX: number, screenY: number) => {
    try {
      const name = await getNextUntitledDesignName();
      const res = await fetch('/playground/api/html-pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Failed to create design');
        return;
      }

      const position = screenToFlowPosition({ x: screenX, y: screenY });
      const pageId = data.page.id as string;
      const folder = data.page.folder as string;
      const newNode: Node = {
        id: getNodeId(),
        type: 'component',
        position,
        data: {
          componentId: pageId,
          renderMode: 'html' as const,
          htmlFolder: folder,
        },
      };
      setNodes((nds) => nds.concat(newNode));
      window.dispatchEvent(new CustomEvent('playground:html-pages-updated'));
    } catch {
      toast.error('Failed to create design');
    }
  }, [getNextUntitledDesignName, screenToFlowPosition, getNodeId, setNodes]);

  useEffect(() => {
    const handleCreateDesign = () => {
      const wrapper = reactFlowWrapper.current;
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        void handleCreateHtmlPageAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
      } else {
        void handleCreateHtmlPageAt(window.innerWidth / 2, window.innerHeight / 2);
      }
    };
    window.addEventListener(CREATE_DESIGN_EVENT, handleCreateDesign);
    return () => window.removeEventListener(CREATE_DESIGN_EVENT, handleCreateDesign);
  }, [handleCreateHtmlPageAt]);

  // Focus textarea when create-page dialog opens
  useEffect(() => {
    if (createPageDialog && newPageInputRef.current) {
      requestAnimationFrame(() => newPageInputRef.current?.focus());
    }
  }, [createPageDialog]);

  // Create new Next.js page from context menu
  const handleCreatePage = useCallback(async () => {
    const description = newPageDescription.trim();
    if (!description) return;
    setCreatePageError('');
    setCreatingPage(true);

    const skillPromptText = (await loadDefaultSkillPrompt()) ?? '';
    const skillSection = skillPromptText ? formatSkillSection(skillPromptText) : '';
    const prompt = createPagePrompt({
      skillSection,
      description,
      stylingConstraint: getStylingConstraint(DEFAULT_STYLING_MODE),
      reservedSlugs: RESERVED_TOP_LEVEL_SLUGS.join(', '),
    });

    const componentId = 'chat-new-page';
    const pf = getProviderFields();
    const toastId = `create-page-${Date.now()}`;

    toast.loading('Creating new page…', { id: toastId, duration: Infinity });

    window.dispatchEvent(
      new CustomEvent<GenerationStartPayload>(GENERATION_START_EVENT, {
        detail: {
          componentId,
          componentName: 'New Page',
          parentNodeId: '',
          iterationCount: 0,
          model: undefined,
          provider: pf.provider as GenerationStartPayload['provider'],
        },
      }),
    );

    try {
      const response = await fetch('/playground/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          componentId,
          iterationCount: 0,
          source: 'new_page',
          ...pf,
        }),
      });
      const data = await response.json().catch(() => ({ success: false }));
      if (!response.ok || !data.success) {
        const errMsg = data?.error || `Page creation failed (${response.status})`;
        toast.error(errMsg, { id: toastId, duration: 6000 });
        setCreatePageError(errMsg);
        window.dispatchEvent(
          new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
            detail: { componentId, parentNodeId: '', error: errMsg },
          }),
        );
        return;
      }
      toast.success('Page created — drag from sidebar to canvas', { id: toastId, duration: 5000 });
      window.dispatchEvent(
        new CustomEvent<GenerationCompletePayload>(GENERATION_COMPLETE_EVENT, {
          detail: { componentId, parentNodeId: '', output: '' },
        }),
      );
      setCreatePageDialog(null);
      setNewPageDescription('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(msg, { id: toastId, duration: 6000 });
      setCreatePageError(msg);
      window.dispatchEvent(
        new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
          detail: { componentId, parentNodeId: '', error: msg },
        }),
      );
    } finally {
      setCreatingPage(false);
    }
  }, [newPageDescription]);

  const { autoArrangeNodes } = useCanvasAutoArrange({
    nodes,
    edges,
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
      setCollapsedNodeIds(prev => {
        const next = new Set(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return next;
      });
    };

    window.addEventListener(ITERATION_COLLAPSE_TOGGLE_EVENT, handleCollapseToggle as EventListener);
    return () => {
      window.removeEventListener(ITERATION_COLLAPSE_TOGGLE_EVENT, handleCollapseToggle as EventListener);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Clear event from PlaygroundHeader
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleClear = () => setShowClearDialog(true);
    window.addEventListener(PLAYGROUND_CLEAR_EVENT, handleClear);
    return () => window.removeEventListener(PLAYGROUND_CLEAR_EVENT, handleClear);
  }, []);

  // ---------------------------------------------------------------------------
  // Compute hasChildren + isCollapsed for iteration nodes and filter visible
  // ---------------------------------------------------------------------------
  const { visibleNodes, visibleEdges } = useMemo(
    () => computeVisibleNodes(nodes, edges, collapsedNodeIds),
    [nodes, edges, collapsedNodeIds],
  );

  // Clear all nodes and edges, and delete all iteration files from disk
  const confirmClearAllNodes = useCallback(async () => {
    stopPolling();

    // Best-effort: cancel any active generation process so subsequent runs
    // don't hit "generation already in progress" conflicts after clearing.
    try {
      await fetch('/playground/api/generate', {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('[Playground] Error cancelling generation during clear:', error);
    }

    try {
      // Fetch all known iteration files from the API, not just ones currently on the canvas
      const response = await fetch('/playground/api/iterations');
      if (response.ok) {
        const data = (await response.json()) as { iterations?: { filename: string }[] };
        const iterationFilenames = (data.iterations ?? []).map((iter) => iter.filename);

        await Promise.all(
          iterationFilenames.map(async (filename) => {
            try {
              await fetch('/playground/api/iterations', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, mode: 'cascade' as const }),
              });
            } catch (error) {
              console.error(`Error deleting iteration file ${filename}:`, error);
            }
          }),
        );
      }
    } catch (error) {
      console.error('Error clearing iteration files:', error);
    }

    setNodes([]);
    setEdges([]);
    setKnownIterations([]);
    setCollapsedNodeIds(new Set());
    setCanvasDrawings([]);

    localStorage.removeItem(storageKey);

    setShowClearDialog(false);
  }, [setNodes, setEdges, setKnownIterations, setCollapsedNodeIds, stopPolling, storageKey]);

  // Image upload via toolbar button (reuses same logic as drag-drop)
  const handleImageFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
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
          const res = await fetch('/playground/api/images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64, originalName: file.name }),
          });
          const data = await res.json();
          if (data.success) {
            const newNode: Node = {
              id: getNodeId(),
              type: 'image',
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
          console.error('[Playground] Image upload failed:', err);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input so the same file can be re-selected
    e.target.value = '';
  }, [screenToFlowPosition, getNodeId, setNodes]);

  const toggleDrawPenKind = useCallback(
    (kind: DrawPenKind) => {
      if (activeTool === 'draw' && drawPenKind === kind) {
        setActiveTool('select');
      } else {
        setDrawPenKind(kind);
        setActiveTool('draw');
      }
    },
    [activeTool, drawPenKind, setDrawPenKind],
  );

  useCanvasKeyboard({
    setActiveTool,
    activeTool,
    shapeKind,
    setShapeKind,
    toggleDrawPenKind,
    setCanvasDrawings,
    handleZOrder,
    handleGroupSelection,
    handleUngroupFrame,
    undo,
    redo,
    handleDuplicateNodes,
    handleCopyNodes,
    handlePasteNodes,
  });

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
        className={`w-full h-full${activeTool === 'text' ? ' playground-text-tool' : ''}${activeTool === 'draw' ? ' playground-draw-tool' : ''}${activeTool === 'shape' ? ' playground-shape-tool' : ''}`}
        data-draw-kind={activeTool === 'draw' ? drawPenKind : undefined}
      >
        {/* XY Flow reads pane fill from `--xy-background-color`; Tailwind bg-* often loses to `.react-flow` in the cascade. */}
        <ReactFlow
          nodes={visibleNodes}
          edges={[]}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onNodesDelete={onNodesDelete}
          onConnect={onConnect}
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
          style={{ '--xy-background-color': CANVAS_BACKGROUND_COLOR } as CSSProperties}
          proOptions={{ hideAttribution: true }}
          minZoom={CANVAS_MIN_ZOOM}
          maxZoom={CANVAS_MAX_ZOOM}
          panOnScroll
          zoomOnScroll={false}
          zoomOnPinch
          panOnDrag={[1]}
          panActivationKeyCode={null}
          selectionOnDrag={activeTool === 'select'}
          selectionMode={SelectionMode.Partial}
          nodesDraggable={activeTool !== 'draw'}
          nodesConnectable={false}
          elementsSelectable
          deleteKeyCode={strokeSelection ? null : ['Delete', 'Backspace']}
        >
          {/* <Controls
            className="!bg-white !border-stone-200 !rounded-lg !shadow-sm [&>button]:!bg-white [&>button]:!border-stone-200 [&>button]:!text-stone-600 [&>button:hover]:!bg-stone-50"
          /> */}
        <PlaygroundCanvasDrawLayer strokes={canvasDrawings} wrapperRef={reactFlowWrapper} />
        <Background
          variant={BackgroundVariant.Dots}
          gap={dynamicBg.gap}
          size={dynamicBg.size}
          bgColor={CANVAS_BACKGROUND_COLOR}
          color={BACKGROUND_COLOR}
        />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          ariaLabel="Canvas minimap"
          className="!bottom-6 !right-6 !m-0 overflow-hidden rounded-xl border border-stone-200 bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur"
          style={{ width: 200, height: 140 }}
          maskColor="rgba(120,113,108,0.12)"
          nodeColor={getMinimapNodeColor}
          nodeStrokeColor="transparent"
          nodeBorderRadius={4}
        />
        <HelperLines vertical={helperLines.vertical} horizontal={helperLines.horizontal} />
        <CanvasPresenceLayer
          bubbles={canvasPresenceBubbles}
          nodes={nodes}
          getPosition={getCanvasPresenceBubblePosition}
          onBubbleClick={handleCanvasPresenceBubbleClick}
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
        drawPenKind={drawPenKind}
        setDrawPenKind={setDrawPenKind}
        imageInputRef={imageInputRef}
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
        createPageDialog={createPageDialog}
        setCreatePageDialog={setCreatePageDialog}
        newPageDescription={newPageDescription}
        setNewPageDescription={setNewPageDescription}
        createPageError={createPageError}
        setCreatePageError={setCreatePageError}
        creatingPage={creatingPage}
        newPageInputRef={newPageInputRef}
        handleCreatePage={handleCreatePage}
      />

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="playground-canvas-context-menu fixed z-50 min-w-[180px] bg-[#1C1C1E] rounded-2xl shadow-2xl py-2 px-2 animate-in fade-in-0 zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              const { x, y } = contextMenu;
              setContextMenu(null);
              void handleCreateHtmlPageAt(x, y);
            }}
          >
            <Frame className="w-3.5 h-3.5 text-stone-500 shrink-0" strokeWidth={1.5} />
            Create a new design
          </button>
          <button
            className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              setCreatePageDialog({ screenX: contextMenu.x, screenY: contextMenu.y });
              setContextMenu(null);
              setNewPageDescription('');
              setCreatePageError('');
            }}
          >
            <PageDocumentIcon className="text-stone-500 shrink-0" size={14} />
            Create a new page
          </button>
          <div className="my-1 h-px bg-white/10" />
          <button
            className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              autoArrangeNodes(true);
              setContextMenu(null);
            }}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-stone-500 shrink-0" strokeWidth={1.5} />
            Organize canvas
          </button>
          {(() => {
            const ctxNode = contextMenu.nodeId ? nodes.find((n) => n.id === contextMenu.nodeId) : undefined;
            const isFrameTarget =
              ctxNode?.type === 'frame' || nodes.some((n) => n.type === 'frame' && n.selected);
            const groupable = nodes.filter(
              (n) => n.selected && !n.parentId && n.type !== 'frame' && n.type !== 'skeleton',
            );
            if (!isFrameTarget && groupable.length < 1) return null;
            return (
              <>
                <div className="my-1 h-px bg-white/10" />
                {groupable.length >= 1 && (
                  <button
                    className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGroupSelection();
                      setContextMenu(null);
                    }}
                  >
                    <Frame className="w-3.5 h-3.5 text-stone-500 shrink-0" strokeWidth={1.5} />
                    Group selection
                  </button>
                )}
                {isFrameTarget && (
                  <button
                    className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUngroupFrame(ctxNode?.type === 'frame' ? ctxNode.id : undefined);
                      setContextMenu(null);
                    }}
                  >
                    <Frame className="w-3.5 h-3.5 text-stone-500 shrink-0" strokeWidth={1.5} />
                    Ungroup frame
                  </button>
                )}
              </>
            );
          })()}
          {(contextMenu.nodeId || nodes.some((n) => n.selected)) && (
            <>
              <div className="my-1 h-px bg-white/10" />
              <button
                className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  handleZOrder('front');
                  setContextMenu(null);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500 shrink-0">
                  <rect x="7" y="7" width="13" height="13" rx="2" />
                  <path d="M4 16V6a2 2 0 0 1 2-2h10" />
                </svg>
                Bring to Front
              </button>
              <button
                className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  handleZOrder('forward');
                  setContextMenu(null);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500 shrink-0">
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M4 14V6a2 2 0 0 1 2-2h8" />
                </svg>
                Bring Forward
              </button>
              <button
                className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  handleZOrder('backward');
                  setContextMenu(null);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500 shrink-0">
                  <rect x="4" y="4" width="11" height="11" rx="2" />
                  <path d="M20 10v8a2 2 0 0 1-2 2h-8" />
                </svg>
                Send Backward
              </button>
              <button
                className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  handleZOrder('back');
                  setContextMenu(null);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500 shrink-0">
                  <rect x="4" y="4" width="13" height="13" rx="2" />
                  <path d="M20 8v10a2 2 0 0 1-2 2H8" />
                </svg>
                Send to Back
              </button>
            </>
          )}
        </div>
      )}

    </div>
    </TooltipProvider>
  );
}
