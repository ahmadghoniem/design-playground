'use client';

import { useCallback, useMemo, useRef, useEffect, useState, DragEvent, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { getProviderFields } from '../lib/generation-body';

import { DEFAULT_PROVIDER_ID } from '../lib/providers/registry';
import { loadCanvasState, saveCanvasState, getCanvasStorageKey, getIterationKeyFromNode, getIterationKeysOnCanvas, pruneKnownIterations, type GenerationInfo } from '../lib/canvas-persistence';
import { useCanvasFlow } from '../lib/canvas-flow';
import { resolveAgentModel } from '../lib/resolve-agent-model';
import type { ProviderId } from '../lib/providers/types';
import PlaygroundCanvasDrawLayer from '../components/canvas/PlaygroundCanvasDrawLayer';
import CanvasPresenceLayer, { type CanvasPresenceBubble } from '../components/canvas/CanvasPresenceLayer';
import { usePlaygroundDrawStore } from '../stores/playground-draw-store';
import { type DrawPenKind, type DrawStroke } from '../lib/draw-types';
import { useCanvasDrawTool } from '../hooks/useCanvasDrawTool';
import { useGenerationCoordination } from '../hooks/useGenerationCoordination';
import { useGenerationLifecycle } from '../hooks/useGenerationLifecycle';
import { useIterationScan } from '../hooks/useIterationScan';
import { useChatSubmit } from '../hooks/useChatSubmit';
import { useDragIterateEventHandler } from '../hooks/useDragToIterate';
import { LayoutGrid, Frame } from 'lucide-react';
import { ShapeToolGroup } from '../components/canvas/ShapeToolGroup';
import { PageDocumentIcon, ProjectBoxIcon } from '../ui/playground-nav-icons';

import ComponentNode from '../nodes/ComponentNode';
import IterationNode from '../nodes/IterationNode';
import SkeletonIterationNode from '../nodes/SkeletonIterationNode';
import DragGhostNode from '../nodes/DragGhostNode';
import ImageNode from '../nodes/ImageNode';
import { hitTestStrokes } from '../lib/draw-hit-test';
import TextNode from '../nodes/TextNode';
import ShapeNode, { type ShapeKind } from '../nodes/ShapeNode';
import FrameNode from '../nodes/FrameNode';
import HelperLines, { type HelperLineState } from '../nodes/shared/HelperLines';
import { matchesAction } from '../lib/keybindings';
import {
  generateIterationPrompt,
  generateIterationFromIterationPrompt,
  generateElementIterationPrompt,
  generateElementIterationFromIterationPrompt,
  resolveRegistryItem,
} from '../registry';
import {
  formatReferenceNodesSection,
  formatSkillSection,
  formatCustomInstructionsSection,
  getStylingConstraint,
} from '../prompts/shared-sections';
import { freeformReferencePrompt } from '../prompts/freeform-reference.prompt';
import { editPrompt } from '../prompts/edit.prompt';
import { pickPlanFrameName } from '../lib/plan-frame-name';
import { createPagePrompt, RESERVED_TOP_LEVEL_SLUGS } from '../prompts/create-page.prompt';
import { generateHtmlIterationPrompt, generateHtmlIterationFromIterationPrompt } from '../lib/html-prompts';
import { generateJsxIterationPrompt, generateJsxIterationFromIterationPrompt } from '../lib/jsx-prompts';
import { captureAndSaveScreenshot, getScreenshotFilename } from '../lib/captureAndSaveScreenshot';
import { loadDefaultSkillPrompt } from '../lib/load-default-skill-prompt';
import { loadSelectedModel } from '../nodes/shared/IterateDialogParts';
import {
  GENERATION_START_EVENT,
  GENERATION_COMPLETE_EVENT,
  GENERATION_ERROR_EVENT,
  GENERATION_QUEUED_EVENT,
  GENERATION_AGENT_PREVIEW_EVENT,
  PLAYGROUND_AUTO_ARRANGE_EVENT,
  CREATE_DESIGN_EVENT,
  DRAG_ITERATE_UNDO_DURATION_MS,
  DRAG_ITERATE_TOAST_DURATION_MS,

  ARRANGE_START_X,
  ARRANGE_START_Y,
  ARRANGE_HORIZONTAL_GAP,
  ARRANGE_BENTO_TILE_GAP_X,
  ARRANGE_BENTO_TILE_GAP_Y,
  ARRANGE_BENTO_CLUSTER_MAX_WIDTH,
  ARRANGE_BENTO_CLUSTER_GAP_X,
  ARRANGE_BENTO_CLUSTER_GAP_Y,
  ARRANGE_BENTO_CLUSTER_ROW_MAX_WIDTH,
  ARRANGE_LABEL_PADDING_X_BASE,
  ARRANGE_LABEL_PADDING_Y_BASE,
  ARRANGE_COLLISION_MIN_SEPARATION,
  ARRANGE_COLLISION_MAX_PASSES,
  NODE_LABEL_SCALE_THRESHOLD,
  NODE_LABEL_MAX_INV_SCALE,
  DEFAULT_ITERATION_NODE_WIDTH,
  DEFAULT_ITERATION_NODE_HEIGHT,
  DEFAULT_COMPONENT_NODE_WIDTH,
  DEFAULT_COMPONENT_NODE_HEIGHT,
  ITERATION_EDGE_STYLE,
  SKELETON_EDGE_STYLE,
  FITVIEW_AFTER_ARRANGE,
  ARRANGE_FITVIEW_DELAY,
  POST_GENERATION_SCAN_DELAY,
  POST_GENERATION_ARRANGE_DELAY,
  SKELETON_ARRANGE_DELAY,
  CANVAS_BACKGROUND_COLOR,
  BACKGROUND_COLOR,
  DND_DATA_KEY,
  HTML_ID_PREFIX,
  JSX_ID_PREFIX,
  DESIGN_SYSTEM_SHOWCASE_ID,
  JSX_COMPONENT_ADDED_EVENT,
  EDIT_COMPLETE_EVENT,
  CANVAS_MAX_ZOOM,
  CANVAS_MIN_ZOOM,
  ITERATION_COLLAPSE_TOGGLE_EVENT,
  PLAYGROUND_CLEAR_EVENT,
  PAN_TO_POSITION_EVENT,
  FIT_COMPONENT_NODES_EVENT,
  PRESENCE_BUBBLE_DISMISS_EVENT,
  DRAG_GHOST_GAP,
  DEFAULT_EMPTY_ITERATION_INSTRUCTIONS,
  DEFAULT_STYLING_MODE,
  CHAT_DEFAULT_COUNT,
  CHAT_DEFAULT_DEPTH,
  ENABLE_FREEFORM_CHAT,
  canSubmitReferenceOnlyChat,
  type StylingMode,
  type GenerationStartPayload,
  type GenerationCompletePayload,
  type GenerationErrorPayload,
  type GenerationQueuedPayload,
  type GenerationAgentPreviewPayload,
  type PresenceBubbleDismissPayload,
  type ChatSubmitPayload,
  type JsxComponentInfo,
} from '../lib/constants';
import DockedChatBar from '../components/chat/DockedChatBar';
import ElementHighlight from '../components/canvas/ElementHighlight';
import { useElementSelection } from '../hooks/useElementSelection';
import { useNodeSelection } from '../hooks/useNodeSelection';
import { useInteractiveNodeStore } from '../stores/interactive-node-store';
import { useDynamicBackground } from '../hooks/useDynamicBackground';
import { toast } from 'sonner';
import { wrapHtmlFragment } from '../lib/html-utils';
import { wrapJsxComponent } from '../lib/jsx-utils';
import { classifyClipboard, nextFrameNumber } from '../lib/canvas-paste';

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
  const [helperLines, setHelperLines] = useState<HelperLineState>({});
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

  // Delete cascade/reparent dialog
  const [deleteDialogNode, setDeleteDialogNode] = useState<Node | null>(null);
  
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
    setIsGenerating,
    setGenerationInfo,
  } = coord;
  const { screenToFlowPosition, fitView, setCenter, getViewport } = useReactFlow();
  const [canvasPresenceBubbles, setCanvasPresenceBubbles] = useState<CanvasPresenceBubble[]>([]);
  const canvasPresenceBubblesRef = useRef<CanvasPresenceBubble[]>([]);

  useEffect(() => {
    canvasPresenceBubblesRef.current = canvasPresenceBubbles;
  }, [canvasPresenceBubbles]);

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
  const clearAllStrokeSelection = usePlaygroundDrawStore((s) => s.clearAllStrokeSelection);

  // Delete selected pen stroke(s) with Backspace / Delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const active = document.activeElement;
      if (active) {
        const tag = active.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        if ((active as HTMLElement).isContentEditable) return;
        if (active.closest('[role="dialog"]') || active.closest('[data-radix-popper-content-wrapper]')) return;
      }
      const store = usePlaygroundDrawStore.getState();
      const sel = store.strokeSelection;
      const multi = store.multiStrokeSelection;

      if (multi.size > 0) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setCanvasDrawings((prev) => prev.filter((s) => !multi.has(s.id)));
        clearAllStrokeSelection();
        return;
      }

      if (!sel) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      setCanvasDrawings((prev) => prev.filter((s) => s.id !== sel.strokeId));
      clearAllStrokeSelection();
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [setNodes, clearAllStrokeSelection]);

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

  // Save to localStorage whenever nodes or edges change.
  useEffect(() => {
    saveCanvasState(
      storageKey,
      nodes,
      edges,
      nodeIdCounterRef.current,
      knownIterations,
      Array.from(collapsedNodeIds),
      coord.getGenerationInfo(),
      getViewport(),
      canvasDrawingsRef.current,
    );
  }, [nodes, edges, knownIterations, collapsedNodeIds, canvasDrawings, getViewport, storageKey]);

  // Save viewport on page unload (captures pan/zoom changes that don't trigger node updates)
  useEffect(() => {
    const handler = () => {
      saveCanvasState(
        storageKey,
        coord.getNodes(),
        edges,
        nodeIdCounterRef.current,
        coord.getKnownIterations(),
        Array.from(collapsedNodeIdsRef.current),
        coord.getGenerationInfo(),
        getViewport(),
        canvasDrawingsRef.current,
      );
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [edges, getViewport, storageKey]);

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

  // Find parent node for a given component (reads from ref to avoid stale closure)
  const findParentNode = useCallback((componentName: string, parentId?: string): Node | undefined => {
    // Convert component name to possible registry IDs
    const possibleIds = [
      componentName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, ''),
      componentName.toLowerCase(),
      `${componentName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')}-expanded`,
      `${componentName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')}-minimal`,
    ];
    
    // Add parentId if provided
    if (parentId) {
      possibleIds.push(parentId);
    }

    return coord.getNodes().find(node => {
      if (node.type !== 'component') return false;
      const componentId = node.data.componentId as string | undefined;
      if (!componentId) return false;
      // Check exact match first, then includes
      return possibleIds.some(id => componentId === id || componentId.includes(id));
    });
  }, []);

  // Find an iteration node by its filename (for tree-aware connections)
  const findIterationNodeByFilename = useCallback((filename: string): Node | undefined => {
    return coord.getNodes().find(
      (n) => (n.type === 'iteration') && (n.data.filename as string) === filename,
    );
  }, []);

  // Calculate position for iteration node
  const calculateIterationPosition = useCallback((parentNode: Node, iterationNumber: number, _totalIterations: number): { x: number; y: number } => {
    const parentX = parentNode.position.x;
    const parentY = parentNode.position.y;
    const parentW = parentNode.measured?.width ?? (parentNode.type === 'component' ? DEFAULT_COMPONENT_NODE_WIDTH : DEFAULT_ITERATION_NODE_WIDTH);

    // Find existing child nodes (iterations + skeletons) of this parent
    const existingChildren = coord.getNodes().filter(
      n =>
        (n.type === 'iteration' || n.type === 'skeleton') &&
        n.data.parentNodeId === parentNode.id
    );

    // Place to the right of the parent, or after the rightmost existing child
    let startX: number;
    if (existingChildren.length > 0) {
      const rightmostEdge = Math.max(
        ...existingChildren.map(n => {
          const w = n.measured?.width ?? DEFAULT_ITERATION_NODE_WIDTH;
          return n.position.x + w;
        })
      );
      startX = rightmostEdge + ARRANGE_HORIZONTAL_GAP;
    } else {
      startX = parentX + parentW + ARRANGE_HORIZONTAL_GAP;
    }

    // Use actual parent width + gap so large nodes don't overlap
    const stepW = parentW + ARRANGE_HORIZONTAL_GAP;

    return {
      x: startX + (iterationNumber - 1) * stepW,
      y: parentY,
    };
  }, []);

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

  const { scanForIterations } = useIterationScan({
    coord,
    isGenerating,
    setNodes,
    setEdges,
    getNodeId,
    findParentNode,
    findIterationNodeByFilename,
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
    calculateIterationPosition,
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
  const generationQueueRef = useRef<ChatSubmitPayload[]>([]);

  const handleChatSubmit = useCallback(async (payload: ChatSubmitPayload) => {
    // If generation already in progress, queue it
    if (coord.getIsGenerating()) {
      generationQueueRef.current.push(payload);
      const queuePf = getProviderFields();
      const queueProvider = (queuePf.provider ?? DEFAULT_PROVIDER_ID) as ProviderId;
      window.dispatchEvent(
        new CustomEvent<GenerationQueuedPayload>(GENERATION_QUEUED_EVENT, {
          detail: {
            componentId: payload.targetComponentId || 'chat-freeform',
            model: resolveAgentModel(queueProvider, payload.model) ?? 'auto',
            provider: queuePf.provider as GenerationQueuedPayload['provider'],
            flowPosition: payload.canvasPosition ?? null,
            targetNodeId: payload.targetNodeId ?? null,
          },
        }),
      );
      return;
    }

    const chatMode = payload.chatMode ?? (payload.editMode ? 'edit' : 'explore');
    const isRawMode = chatMode === 'raw';
    const rawPrompt = payload.text.trim();

    if (payload.renderMode === 'embed' && payload.targetNodeId) {
      toast.error(
        'URL embed frames cannot be the chat target. Place chat on a React, HTML, or JSX frame, or use the embed only as a reference (shift-select).',
      );
      return;
    }

    const hasFreeformContext =
      payload.skillPrompts.length > 0 || (payload.referenceNodes?.length ?? 0) > 0;
    if (isRawMode && !rawPrompt && !hasFreeformContext) return;

    const hasTarget =
      payload.targetNodeId &&
      payload.targetComponentId &&
      payload.targetComponentName &&
      payload.targetType;
    if (
      !hasTarget &&
      !ENABLE_FREEFORM_CHAT &&
      !canSubmitReferenceOnlyChat({
        hasEditTarget: false,
        referenceNodeCount: payload.referenceNodes?.length ?? 0,
        skillPromptCount: payload.skillPrompts.length,
        text: payload.text,
      })
    ) {
      return;
    }

    // ── Edit Mode: modify file in-place, no iterations ──
    if (chatMode === 'edit' && payload.targetNodeId) {
      const isHtmlEdit = payload.renderMode === 'html';
      const isJsxEdit = payload.renderMode === 'jsx' && !!payload.jsxFile;
      const editComponentId = payload.targetComponentId || 'edit-mode';
      const editComponentName = payload.targetComponentName || editComponentId;
      let filePath: string;

      if (isHtmlEdit) {
        if (payload.htmlIterationFolder) {
          filePath = `public/${payload.htmlPageSlug}/${payload.htmlIterationFolder}/index.html`;
        } else {
          filePath = `public/${payload.htmlPageSlug}/index.html`;
        }
      } else if (isJsxEdit) {
        filePath = `src/app/playground/canvas-components/${payload.jsxFile}`;
      } else if (payload.targetType === 'iteration' && payload.sourceFilename) {
        filePath = `src/app/playground/iterations/${payload.sourceFilename}`;
      } else {
        const item = resolveRegistryItem(editComponentId);
        filePath = item?.sourcePath || `src/app/playground/iterations/${editComponentId}`;
      }

      // Gather skill prompts (same logic as normal path)
      let editSkillPrompt: string | undefined;
      if (payload.skillPrompts.length > 0) {
        editSkillPrompt = payload.skillPrompts.join('\n\n');
      } else if (!payload.text) {
        const defaultPrompt = await loadDefaultSkillPrompt();
        editSkillPrompt = defaultPrompt || undefined;
      }

      // Capture screenshot of the target node
      const editScreenshotFilename = getScreenshotFilename(editComponentName, payload.sourceFilename);
      const editScreenshotPath = await captureAndSaveScreenshot(payload.targetNodeId, editScreenshotFilename);

      // Build reference nodes section
      let editRefSection = '';
      if (payload.referenceNodes && payload.referenceNodes.length > 0) {
        const refNodes = payload.referenceNodes.filter((n) => n.nodeId !== payload.targetNodeId);
        if (refNodes.length > 0) {
          const refNodesWithScreenshots = await Promise.all(
            refNodes.map(async (node) => {
              if (node.type === 'text') {
                const textNode = coord.getNodes().find((n) => n.id === node.nodeId);
                return { ...node, textContent: (textNode?.data as Record<string, unknown>)?.text as string || '', screenshotPath: undefined, sourcePath: undefined };
              }
              if (node.type === 'image') {
                return { ...node, screenshotPath: node.imagePath, sourcePath: undefined };
              }
              const ssFilename = getScreenshotFilename(node.componentName, node.sourceFilename);
              const ssPath = await captureAndSaveScreenshot(node.nodeId, ssFilename);
              let sourcePath: string | undefined;
              if (node.type === 'component') {
                const regItem = resolveRegistryItem(node.componentId);
                sourcePath = regItem?.sourcePath;
              }
              return { ...node, screenshotPath: ssPath ?? undefined, sourcePath };
            }),
          );
          editRefSection = formatReferenceNodesSection(refNodesWithScreenshots);
        }
      }

      const prompt = editPrompt({
        filePath,
        customInstructions: payload.text || 'Improve the design',
        skillPrompt: editSkillPrompt,
        screenshotPath: editScreenshotPath ?? undefined,
        referenceNodesSection: editRefSection || undefined,
        elementSelections: payload.elementSelections,
      });

      const editPf = getProviderFields();
      const editProvider = (editPf.provider ?? DEFAULT_PROVIDER_ID) as ProviderId;
      const editResolvedModel = resolveAgentModel(editProvider, payload.model);
      // Dispatch GENERATION_START_EVENT so the presence bubble appears
      window.dispatchEvent(
        new CustomEvent<GenerationStartPayload>(GENERATION_START_EVENT, {
          detail: {
            componentId: editComponentId,
            componentName: editComponentName,
            parentNodeId: payload.targetNodeId,
            iterationCount: 0,
            model: editResolvedModel,
            provider: editPf.provider as GenerationStartPayload['provider'],
            flowPosition: payload.canvasPosition,
            targetNodeId: payload.targetNodeId,
            editMode: true,
            ...(isHtmlEdit ? { renderMode: 'html' as const, htmlFolder: payload.htmlPageSlug } : {}),
            ...(isJsxEdit && payload.jsxFile
              ? { renderMode: 'jsx' as const, jsxFile: payload.jsxFile }
              : {}),
          },
        }),
      );

      try {
        const response = await fetch('/playground/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            componentId: editComponentId,
            model: editResolvedModel,
            source: 'chat_edit',
            skillIds: payload.skillIds,
            ...getProviderFields(),
            ...(isHtmlEdit ? { htmlFolder: payload.htmlPageSlug } : {}),
            ...(isJsxEdit && payload.jsxFile ? { jsxFile: payload.jsxFile } : {}),
          }),
        });
        const data = await response.json().catch(() => ({ success: false }));
        if (!response.ok || !data.success) {
          console.error('[EditMode] Generation failed:', data?.error, 'status:', response.status, 'data:', data);
          toast.error(data?.error || `Edit failed (${response.status})`, { duration: 6000 });
          window.dispatchEvent(
            new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
              detail: { componentId: editComponentId, parentNodeId: payload.targetNodeId, error: data?.error || 'Edit failed' },
            }),
          );
        } else {
          if (isHtmlEdit) {
            // Dispatch edit complete to refresh iframes
            window.dispatchEvent(new CustomEvent(EDIT_COMPLETE_EVENT, {
              detail: { nodeId: payload.targetNodeId },
            }));
          } else if (isJsxEdit) {
            window.dispatchEvent(new Event(JSX_COMPONENT_ADDED_EVENT));
          }
          window.dispatchEvent(
            new CustomEvent<GenerationCompletePayload>(GENERATION_COMPLETE_EVENT, {
              detail: { componentId: editComponentId, parentNodeId: payload.targetNodeId, output: '' },
            }),
          );
        }
      } catch (err) {
        console.error('[EditMode] Error:', err);
        toast.error(err instanceof Error ? err.message : 'Unknown error', { duration: 6000 });
        window.dispatchEvent(
          new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
            detail: { componentId: editComponentId, parentNodeId: payload.targetNodeId, error: String(err) },
          }),
        );
      }
      return;
    }

    const {
      text,
      skillPrompts,
      model: payloadModel,
      targetNodeId,
      targetComponentId,
      targetComponentName,
      targetType,
      sourceFilename,
    } = payload;

    const canvasGenPfEarly = getProviderFields();
    const genProvider = (canvasGenPfEarly.provider ?? DEFAULT_PROVIDER_ID) as ProviderId;
    const resolvedModel = resolveAgentModel(genProvider, payloadModel);

    // Combine skill prompts — explicit skills always apply (including raw / text-only refs)
    let combinedSkillPrompt: string | undefined;
    if (skillPrompts.length > 0) {
      combinedSkillPrompt = skillPrompts.join('\n\n');
    } else if (!isRawMode && !text) {
      // Use default skills only when no explicit skills selected and text is empty
      const defaultPrompt = await loadDefaultSkillPrompt();
      combinedSkillPrompt = defaultPrompt || undefined;
    }

    const customInstructions = isRawMode
      ? rawPrompt
      : (text || DEFAULT_EMPTY_ITERATION_INSTRUCTIONS);
    const hasElementSelections = (payload.elementSelections?.length ?? 0) > 0;
    const stylingMode: StylingMode = payload.skillIds?.includes('no-bound-explore')
      ? 'inline-css' : DEFAULT_STYLING_MODE;

    // Build reference nodes section from canvas selection (text/image/component refs)
    let referenceNodesSection = '';
    if (payload.referenceNodes && payload.referenceNodes.length > 0) {
      // Filter out the target node from references (no need to reference itself)
      const refNodes = payload.referenceNodes.filter((n) => n.nodeId !== targetNodeId);

      if (refNodes.length > 0) {
        // Capture screenshots for each reference node
        const refNodesWithScreenshots = await Promise.all(
          refNodes.map(async (node) => {
            // Text nodes pass their content directly — no screenshot needed
            if (node.type === 'text') {
              const textNode = coord.getNodes().find((n) => n.id === node.nodeId);
              return {
                ...node,
                textContent: (textNode?.data as Record<string, unknown>)?.text as string || '',
                screenshotPath: undefined,
                sourcePath: undefined,
              };
            }
            // Image nodes already have the image — no need to capture a screenshot
            if (node.type === 'image') {
              return {
                ...node,
                screenshotPath: node.imagePath,
                sourcePath: undefined,
              };
            }
            const screenshotFilename = getScreenshotFilename(
              node.componentName,
              node.sourceFilename,
            );
            const screenshotPath = await captureAndSaveScreenshot(
              node.nodeId,
              screenshotFilename,
            );
            // Resolve source path from registry for component nodes
            let sourcePath: string | undefined;
            if (node.type === 'component') {
              const item = resolveRegistryItem(node.componentId);
              sourcePath = item?.sourcePath;
            }
            return {
              ...node,
              screenshotPath: screenshotPath ?? undefined,
              sourcePath,
            };
          }),
        );
        referenceNodesSection = formatReferenceNodesSection(refNodesWithScreenshots);
      }
    }

    const isHtmlTarget = payload.renderMode === 'html' && !!payload.htmlPageSlug;
    const isJsxTarget = payload.renderMode === 'jsx' && !!payload.jsxFile;
    const canvasGenPf = getProviderFields();

    if (targetNodeId && targetComponentId && targetComponentName && targetType) {
      // --- WITH TARGET NODE ---
      let prompt = rawPrompt;
      const componentId = targetComponentId;
      const componentName = targetComponentName;
      const iterationCount = payload.iterationCount ?? CHAT_DEFAULT_COUNT;
      let startNumber = 1;
      let screenshotPath: string | undefined;

      if (isRawMode) {
        prompt = rawPrompt;
      } else {
        // Fetch next available iteration number
        try {
          if (isHtmlTarget) {
            const response = await fetch('/playground/api/html-pages');
            if (response.ok) {
              const { pages } = await response.json();
              const page = pages.find((p: { folder: string }) => p.folder === payload.htmlPageSlug);
              const maxNumber = page?.iterations.reduce(
                (max: number, i: { number: number }) => Math.max(max, i.number), 0
              ) ?? 0;
              startNumber = maxNumber + 1;
            }
          } else if (isJsxTarget && payload.jsxFile) {
            const baseFilename = payload.jsxFile.replace(/\.iteration-\d+\.tsx$/, '.tsx');
            const response = await fetch('/playground/api/oncanvas-components');
            if (response.ok) {
              const { components } = await response.json() as { components: JsxComponentInfo[] };
              const comp = components.find(c => c.filename === baseFilename);
              const maxNumber = comp?.iterations.reduce(
                (max: number, i: { iterationNumber: number }) => Math.max(max, i.iterationNumber),
                0,
              ) ?? 0;
              startNumber = maxNumber + 1;
            }
          } else {
            const cleanName = componentName.replace(/\s+/g, '');
            const response = await fetch('/playground/api/iterations');
            if (response.ok) {
              const { iterations } = await response.json();
              const componentIterations = iterations.filter(
                (i: { componentName: string }) => i.componentName === cleanName
              );
              const maxNumber = componentIterations.reduce(
                (max: number, i: { iterationNumber: number }) =>
                  Math.max(max, i.iterationNumber),
                0
              );
              startNumber = maxNumber + 1;
            }
          }
        } catch { /* use default */ }

        // Capture screenshot of the target node
        const screenshotFilename = getScreenshotFilename(componentName, sourceFilename);
        screenshotPath = (await captureAndSaveScreenshot(targetNodeId, screenshotFilename)) ?? undefined;
      }

      if (!isRawMode && isHtmlTarget && payload.htmlPageSlug) {
        // HTML iteration
        if (targetType === 'iteration' && payload.htmlIterationFolder) {
          prompt = generateHtmlIterationFromIterationPrompt(
            payload.htmlPageSlug,
            payload.htmlIterationFolder,
            iterationCount,
            startNumber,
            customInstructions,
            combinedSkillPrompt,
            screenshotPath,
          );
        } else {
          prompt = generateHtmlIterationPrompt(
            payload.htmlPageSlug,
            iterationCount,
            startNumber,
            customInstructions,
            combinedSkillPrompt,
            screenshotPath,
          );
        }
      } else if (!isRawMode && isJsxTarget && payload.jsxFile) {
        const baseFile = payload.jsxFile.replace(/\.iteration-\d+\.tsx$/, '.tsx');
        if (targetType === 'iteration' && sourceFilename) {
          prompt = generateJsxIterationFromIterationPrompt(
            baseFile,
            sourceFilename,
            iterationCount,
            startNumber,
            customInstructions,
            combinedSkillPrompt,
            screenshotPath,
          );
        } else {
          prompt = generateJsxIterationPrompt(
            baseFile,
            iterationCount,
            startNumber,
            customInstructions,
            combinedSkillPrompt,
            screenshotPath,
          );
        }
      } else if (!isRawMode && targetType === 'iteration' && sourceFilename) {
        // Iterate from iteration
        if (hasElementSelections) {
          prompt = generateElementIterationFromIterationPrompt(
            componentId,
            sourceFilename,
            startNumber,
            iterationCount,
            CHAT_DEFAULT_DEPTH,
            payload.elementSelections,
            customInstructions,
            combinedSkillPrompt,
            stylingMode,
            screenshotPath,
            referenceNodesSection,
          );
        } else {
          prompt = generateIterationFromIterationPrompt(
            componentId,
            sourceFilename,
            iterationCount,
            startNumber,
            CHAT_DEFAULT_DEPTH,
            customInstructions,
            combinedSkillPrompt,
            stylingMode,
            screenshotPath,
            referenceNodesSection,
          );
        }
      } else if (!isRawMode) {
        // Component iteration
        if (hasElementSelections) {
          prompt = generateElementIterationPrompt(
            componentId,
            startNumber,
            iterationCount,
            CHAT_DEFAULT_DEPTH,
            payload.elementSelections,
            customInstructions,
            combinedSkillPrompt,
            stylingMode,
            screenshotPath,
            referenceNodesSection,
          );
        } else {
          prompt = generateIterationPrompt(
            componentId,
            iterationCount,
            startNumber,
            CHAT_DEFAULT_DEPTH,
            customInstructions,
            combinedSkillPrompt,
            stylingMode,
            screenshotPath,
            referenceNodesSection,
          );
        }
      }

      // Dispatch generation start (creates skeleton nodes)
      window.dispatchEvent(
        new CustomEvent<GenerationStartPayload>(GENERATION_START_EVENT, {
          detail: {
            componentId,
            componentName,
            parentNodeId: targetNodeId,
            iterationCount,
            startNumber,
            model: resolvedModel,
            provider: canvasGenPf.provider as GenerationStartPayload['provider'],
            flowPosition: payload.canvasPosition,
            targetNodeId,
            ...(isHtmlTarget ? { renderMode: 'html' as const, htmlFolder: payload.htmlPageSlug } : {}),
            ...(isJsxTarget && payload.jsxFile
              ? { renderMode: 'jsx' as const, jsxFile: payload.jsxFile }
              : {}),
          },
        }),
      );

      // Call the generate API
      try {
        const response = await fetch('/playground/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            componentId,
            iterationCount,
            model: resolvedModel,
            source: 'chat',
            skillIds: payload.skillIds,
            ...canvasGenPf,
            ...(isHtmlTarget ? { htmlFolder: payload.htmlPageSlug } : {}),
            ...(isJsxTarget && payload.jsxFile ? { jsxFile: payload.jsxFile } : {}),
          }),
        });

        let data;
        try {
          data = await response.json();
        } catch {
          window.dispatchEvent(
            new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
              detail: { componentId, parentNodeId: targetNodeId, error: 'Failed to parse response' },
            }),
          );
          return;
        }

        if (!response.ok || !data.success) {
          const error = typeof data?.error === 'string' ? data.error : 'Generation failed';
          window.dispatchEvent(
            new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
              detail: { componentId, parentNodeId: targetNodeId, error },
            }),
          );
        } else {
          window.dispatchEvent(
            new CustomEvent<GenerationCompletePayload>(GENERATION_COMPLETE_EVENT, {
              detail: { componentId, parentNodeId: targetNodeId, output: '' },
            }),
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        window.dispatchEvent(
          new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
            detail: { componentId, parentNodeId: targetNodeId, error: msg },
          }),
        );
      }
    } else if (payload.skillIds?.includes('visualise-plan')) {
      // --- VISUALISE PLAN: create HTML frame on canvas, then edit in place ---
      let planText = text || rawPrompt;
      if (payload.referenceNodes?.length) {
        for (const ref of payload.referenceNodes) {
          if (ref.type !== 'text') continue;
          const textNode = coord.getNodes().find((n) => n.id === ref.nodeId);
          const noteText = (textNode?.data as Record<string, unknown>)?.text;
          if (typeof noteText === 'string' && noteText.trim()) {
            planText = noteText;
            break;
          }
        }
      }

      const frameName = await pickPlanFrameName(planText);
      const position = payload.canvasPosition ?? { x: 0, y: 0 };

      let pageId: string;
      let folder: string;
      try {
        const createRes = await fetch('/playground/api/html-pages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: frameName }),
        });
        const createData = await createRes.json().catch(() => ({}));
        if (!createRes.ok) {
          toast.error(createData?.error || 'Failed to create HTML frame', { duration: 6000 });
          return;
        }
        pageId = createData.page.id as string;
        folder = createData.page.folder as string;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create HTML frame', { duration: 6000 });
        return;
      }

      const newNodeId = getNodeId();
      setNodes((nds) =>
        nds.concat({
          id: newNodeId,
          type: 'component',
          position,
          data: {
            componentId: pageId,
            renderMode: 'html' as const,
            htmlFolder: folder,
          },
        }),
      );
      window.dispatchEvent(new CustomEvent('playground:html-pages-updated'));

      const editSkillPrompt = combinedSkillPrompt;
      const visualiseInstructions =
        text ||
        rawPrompt ||
        'Visualise the referenced plan as interactive HTML per the skill instructions. Replace the placeholder page content entirely.';
      const prompt = editPrompt({
        filePath: `public/${folder}/index.html`,
        customInstructions: visualiseInstructions,
        skillPrompt: editSkillPrompt,
        referenceNodesSection: referenceNodesSection || undefined,
      });

      window.dispatchEvent(
        new CustomEvent<GenerationStartPayload>(GENERATION_START_EVENT, {
          detail: {
            componentId: pageId,
            componentName: folder,
            parentNodeId: newNodeId,
            iterationCount: 0,
            model: resolvedModel,
            provider: canvasGenPf.provider as GenerationStartPayload['provider'],
            flowPosition: payload.canvasPosition ?? undefined,
            targetNodeId: newNodeId,
            editMode: true,
            renderMode: 'html' as const,
            htmlFolder: folder,
          },
        }),
      );

      try {
        const response = await fetch('/playground/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            componentId: pageId,
            model: resolvedModel,
            source: 'visualise_plan',
            skillIds: payload.skillIds,
            htmlFolder: folder,
            ...canvasGenPf,
          }),
        });
        const data = await response.json().catch(() => ({ success: false }));
        if (!response.ok || !data.success) {
          console.error('[VisualisePlan] Generation failed:', data?.error);
          toast.error(data?.error || 'Plan visualisation failed', { duration: 6000 });
          window.dispatchEvent(
            new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
              detail: { componentId: pageId, parentNodeId: newNodeId, error: data?.error || 'Generation failed' },
            }),
          );
        } else {
          window.dispatchEvent(new CustomEvent(EDIT_COMPLETE_EVENT, { detail: { nodeId: newNodeId } }));
          window.dispatchEvent(
            new CustomEvent<GenerationCompletePayload>(GENERATION_COMPLETE_EVENT, {
              detail: { componentId: pageId, parentNodeId: newNodeId, output: '' },
            }),
          );
        }
      } catch (err) {
        console.error('[VisualisePlan] Generation error:', err);
        const msg = err instanceof Error ? err.message : 'Unknown error';
        toast.error(msg, { duration: 6000 });
        window.dispatchEvent(
          new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
            detail: { componentId: pageId, parentNodeId: newNodeId, error: msg },
          }),
        );
      }
    } else {
      // --- FREEFORM (no target) ---
      const freeformComponentId = 'chat-freeform';

      // Dispatch start event — creates skeleton node + presence bubble
      window.dispatchEvent(
        new CustomEvent<GenerationStartPayload>(GENERATION_START_EVENT, {
          detail: {
            componentId: freeformComponentId,
            componentName: 'Freeform',
            parentNodeId: '',
            iterationCount: 0,
            model: resolvedModel,
            provider: canvasGenPf.provider as GenerationStartPayload['provider'],
            flowPosition: payload.canvasPosition ?? undefined,
          },
        }),
      );

      // Build prompt — freeform-reference template or raw text
      let freeformPrompt: string;
      if (isRawMode) {
        if (referenceNodesSection || combinedSkillPrompt) {
          freeformPrompt = freeformReferencePrompt({
            skillSection: combinedSkillPrompt ? formatSkillSection(combinedSkillPrompt) : '',
            referenceNodesSection: referenceNodesSection || '',
            customInstructionsSection: formatCustomInstructionsSection(
              rawPrompt || customInstructions,
            ),
            stylingConstraint: getStylingConstraint(stylingMode),
          });
        } else {
          freeformPrompt = rawPrompt;
        }
      } else if (referenceNodesSection) {
        freeformPrompt = freeformReferencePrompt({
          skillSection: combinedSkillPrompt ? formatSkillSection(combinedSkillPrompt) : '',
          referenceNodesSection,
          customInstructionsSection: formatCustomInstructionsSection(customInstructions),
          stylingConstraint: getStylingConstraint(stylingMode),
        });
      } else {
        freeformPrompt = customInstructions;
      }

      try {
        const response = await fetch('/playground/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: freeformPrompt,
            componentId: 'chat-freeform',
            iterationCount: 0,
            model: resolvedModel,
            source: 'chat_freeform',
            skillIds: payload.skillIds,
            ...canvasGenPf,
          }),
        });

        const data = await response.json().catch(() => ({ success: false }));
        if (!response.ok || !data.success) {
          console.error('[Chat] Freeform generation failed:', data?.error);
          window.dispatchEvent(
            new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
              detail: { componentId: freeformComponentId, parentNodeId: '', error: data?.error || 'Generation failed' },
            }),
          );
        } else {
          window.dispatchEvent(
            new CustomEvent<GenerationCompletePayload>(GENERATION_COMPLETE_EVENT, {
              detail: { componentId: freeformComponentId, parentNodeId: '', output: '' },
            }),
          );
        }
      } catch (err) {
        console.error('[Chat] Freeform generation error:', err);
        const msg = err instanceof Error ? err.message : 'Unknown error';
        window.dispatchEvent(
          new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
            detail: { componentId: freeformComponentId, parentNodeId: '', error: msg },
          }),
        );
      } finally {
        // State cleanup and queue draining handled by GENERATION_COMPLETE/ERROR event handlers
        // Only clear state here as a safety net if events didn't fire (e.g. network error before dispatch)
        if (coord.getGenerationInfo()?.componentId === freeformComponentId) {
          coord.clearGenerationEager();
        }
      }
    }
  }, [setIsGenerating, setGenerationInfo, scanForIterations]);

  // Also drain queue after normal generation completes
  // (hook into generation complete/error to check queue)
  useEffect(() => {
    const drainQueue = () => {
      setTimeout(() => {
        if (generationQueueRef.current.length > 0) {
          const next = generationQueueRef.current.shift()!;
          handleChatSubmit(next);
        }
      }, POST_GENERATION_SCAN_DELAY + 500);
    };

    window.addEventListener(GENERATION_COMPLETE_EVENT, drainQueue);
    window.addEventListener(GENERATION_ERROR_EVENT, drainQueue);
    return () => {
      window.removeEventListener(GENERATION_COMPLETE_EVENT, drainQueue);
      window.removeEventListener(GENERATION_ERROR_EVENT, drainQueue);
    };
  }, [handleChatSubmit]);

  // Fullscreen fitView behavior is no longer used; nodes open in a new tab instead

  // Canvas copy of generation presence bubbles (anchored to flowPosition).
  // This mirrors the header indicators so users can see where they dropped chat.
  useEffect(() => {
    const nextBubbleId = (componentId: string, suffix: string) =>
      `${componentId}-${suffix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const getNodeAnchor = (
      targetNodeId: string | null | undefined,
      flowPosition: { x: number; y: number } | null | undefined,
    ) => {
      if (!targetNodeId) return { targetNodeId: null, nodeOffset: null };
      const targetNode = coord.getNodes().find((node) => node.id === targetNodeId);
      if (!targetNode || !flowPosition) return { targetNodeId, nodeOffset: null };
      return {
        targetNodeId,
        nodeOffset: {
          x: flowPosition.x - targetNode.position.x,
          y: flowPosition.y - targetNode.position.y,
        },
      };
    };

    const handleQueued = (e: Event) => {
      const detail = (e as CustomEvent<GenerationQueuedPayload>).detail;
      const anchor = getNodeAnchor(detail.targetNodeId, detail.flowPosition);
      setCanvasPresenceBubbles((prev) => [
        ...prev,
        {
          id: nextBubbleId(detail.componentId, 'queued'),
          componentId: detail.componentId,
          model: detail.model || 'auto',
          provider: detail.provider,
          status: 'queued',
          flowPosition: detail.flowPosition ?? null,
          targetNodeId: anchor.targetNodeId,
          nodeOffset: anchor.nodeOffset,
        },
      ]);
    };

    const handleStart = (e: Event) => {
      const detail = (e as CustomEvent<GenerationStartPayload>).detail;
      const bubbleType = detail.adoptionMode ? 'adopt' as const : detail.editMode ? 'edit' as const : 'iterate' as const;
      const targetNodeId = detail.targetNodeId ?? (detail.editMode ? detail.parentNodeId : null);
      const anchor = getNodeAnchor(targetNodeId, detail.flowPosition ?? null);
      setCanvasPresenceBubbles((prev) => {
        const queuedIdx = prev.findIndex(
          (bubble) => bubble.componentId === detail.componentId && bubble.status === 'queued',
        );
        if (queuedIdx !== -1) {
          return prev.map((bubble, idx) =>
            idx === queuedIdx
              ? {
                  ...bubble,
                  status: 'generating' as const,
                  model: detail.model || bubble.model,
                  provider: detail.provider ?? bubble.provider,
                  flowPosition: detail.flowPosition ?? bubble.flowPosition,
                  targetNodeId: anchor.targetNodeId ?? bubble.targetNodeId ?? null,
                  nodeOffset: anchor.nodeOffset ?? bubble.nodeOffset ?? null,
                  type: bubbleType,
                  agentPreviewText: undefined,
                }
              : bubble,
          );
        }

        return [
          ...prev,
          {
            id: nextBubbleId(detail.componentId, 'generating'),
            componentId: detail.componentId,
            model: detail.model || 'auto',
            provider: detail.provider,
            status: 'generating',
            flowPosition: detail.flowPosition ?? null,
            targetNodeId: anchor.targetNodeId,
            nodeOffset: anchor.nodeOffset,
            type: bubbleType,
            agentPreviewText: undefined,
          },
        ];
      });
    };

    const handleComplete = (e: Event) => {
      const detail = (e as CustomEvent<GenerationCompletePayload>).detail;
      setCanvasPresenceBubbles((prev) =>
        prev.map((bubble) =>
          bubble.componentId === detail.componentId && bubble.status === 'generating'
            ? { ...bubble, status: 'done' as const }
            : bubble,
        ),
      );
    };

    const handleError = (e: Event) => {
      const detail = (e as CustomEvent<GenerationErrorPayload>).detail;
      setCanvasPresenceBubbles((prev) =>
        prev.filter(
          (bubble) =>
            !(
              bubble.componentId === detail.componentId &&
              (bubble.status === 'queued' || bubble.status === 'generating')
            ),
        ),
      );
    };

    const handleAgentPreview = (e: Event) => {
      const detail = (e as CustomEvent<GenerationAgentPreviewPayload>).detail;
      setCanvasPresenceBubbles((prev) =>
        prev.map((bubble) =>
          bubble.componentId === detail.componentId &&
          (bubble.status === 'generating' || bubble.status === 'done')
            ? { ...bubble, agentPreviewText: detail.text }
            : bubble,
        ),
      );
    };

    const handleDismiss = (e: Event) => {
      const detail = (e as CustomEvent<PresenceBubbleDismissPayload>).detail;
      if (!detail?.componentId) return;
      setCanvasPresenceBubbles((prev) =>
        prev.filter((bubble) => bubble.componentId !== detail.componentId),
      );
    };

    window.addEventListener(GENERATION_QUEUED_EVENT, handleQueued);
    window.addEventListener(GENERATION_START_EVENT, handleStart);
    window.addEventListener(GENERATION_COMPLETE_EVENT, handleComplete);
    window.addEventListener(GENERATION_ERROR_EVENT, handleError);
    window.addEventListener(GENERATION_AGENT_PREVIEW_EVENT, handleAgentPreview);
    window.addEventListener(PRESENCE_BUBBLE_DISMISS_EVENT, handleDismiss);
    return () => {
      window.removeEventListener(GENERATION_QUEUED_EVENT, handleQueued);
      window.removeEventListener(GENERATION_START_EVENT, handleStart);
      window.removeEventListener(GENERATION_COMPLETE_EVENT, handleComplete);
      window.removeEventListener(GENERATION_ERROR_EVENT, handleError);
      window.removeEventListener(GENERATION_AGENT_PREVIEW_EVENT, handleAgentPreview);
      window.removeEventListener(PRESENCE_BUBBLE_DISMISS_EVENT, handleDismiss);
    };
  }, []);

  const getCanvasPresenceBubblePosition = useCallback((
    bubble: CanvasPresenceBubble,
    sourceNodes: Node[] = coord.getNodes(),
  ): { x: number; y: number } | null => {
    if (bubble.targetNodeId) {
      const targetNode = sourceNodes.find((node) => node.id === bubble.targetNodeId);
      if (targetNode) {
        const fallbackOffset = {
          x: (targetNode.measured?.width ?? DEFAULT_COMPONENT_NODE_WIDTH) / 2,
          y: Math.min(48, (targetNode.measured?.height ?? DEFAULT_COMPONENT_NODE_HEIGHT) / 3),
        };
        const offset = bubble.nodeOffset ?? (
          bubble.flowPosition
            ? {
                x: bubble.flowPosition.x - targetNode.position.x,
                y: bubble.flowPosition.y - targetNode.position.y,
              }
            : fallbackOffset
        );
        return {
          x: targetNode.position.x + offset.x,
          y: targetNode.position.y + offset.y,
        };
      }
    }
    return bubble.flowPosition;
  }, []);

  const handleCanvasPresenceBubbleClick = useCallback((bubble: CanvasPresenceBubble) => {
    const currentPosition = getCanvasPresenceBubblePosition(bubble);
    if (currentPosition) {
      setCenter(currentPosition.x, currentPosition.y, { duration: 400, zoom: 1 });
    } else if (bubble.componentId) {
      window.dispatchEvent(
        new CustomEvent(FIT_COMPONENT_NODES_EVENT, { detail: { componentId: bubble.componentId } }),
      );
    }
    // Don't dismiss while the generation is still running or queued — only navigate to it.
    if (bubble.status === 'generating' || bubble.status === 'queued') return;
    window.dispatchEvent(
      new CustomEvent<PresenceBubbleDismissPayload>(PRESENCE_BUBBLE_DISMISS_EVENT, {
        detail: {
          componentId: bubble.componentId,
          flowPosition: currentPosition ?? bubble.flowPosition,
          targetNodeId: bubble.targetNodeId ?? null,
        },
      }),
    );
  }, [getCanvasPresenceBubblePosition, setCenter]);

  // Pan-to-position event listener (for presence bubble clicks)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ x?: number; y?: number; componentId?: string; targetNodeId?: string | null }>).detail;
      const anchoredBubble = detail?.componentId
        ? canvasPresenceBubblesRef.current.find((bubble) => bubble.componentId === detail.componentId)
        : null;
      if (anchoredBubble) {
        const currentPosition = getCanvasPresenceBubblePosition(anchoredBubble);
        if (currentPosition) {
          setCenter(currentPosition.x, currentPosition.y, { duration: 400, zoom: 1 });
          return;
        }
      }
      if (detail?.targetNodeId) {
        const targetNode = coord.getNodes().find((node) => node.id === detail.targetNodeId);
        if (targetNode) {
          const width = targetNode.measured?.width ?? DEFAULT_COMPONENT_NODE_WIDTH;
          const height = targetNode.measured?.height ?? DEFAULT_COMPONENT_NODE_HEIGHT;
          setCenter(targetNode.position.x + width / 2, targetNode.position.y + height / 2, { duration: 400, zoom: 1 });
          return;
        }
      }
      if (detail?.x != null && detail?.y != null) {
        setCenter(detail.x, detail.y, { duration: 400, zoom: 1 });
      }
    };
    window.addEventListener(PAN_TO_POSITION_EVENT, handler);
    return () => window.removeEventListener(PAN_TO_POSITION_EVENT, handler);
  }, [getCanvasPresenceBubblePosition, setCenter]);

  // Fit viewport around all nodes for a given component (presence bubble click)
  useEffect(() => {
    const handler = (e: Event) => {
      const { componentId } = (e as CustomEvent<{ componentId: string }>).detail;
      if (!componentId) return;

      // Find the parent component node and all its iteration/skeleton children
      const parentNode = coord.getNodes().find(
        n => n.type === 'component' && (n.data.componentId as string)?.includes(componentId),
      );
      const childNodes = coord.getNodes().filter(
        n => (n.type === 'iteration' || n.type === 'skeleton') &&
          parentNode && n.data.parentNodeId === parentNode.id,
      );

      const nodeIds = [
        ...(parentNode ? [parentNode.id] : []),
        ...childNodes.map(n => n.id),
      ];

      if (nodeIds.length > 0) {
        fitView({ nodes: nodeIds.map(id => ({ id })), duration: 400, padding: 0.15 });
      }
    };
    window.addEventListener(FIT_COMPONENT_NODES_EVENT, handler);
    return () => window.removeEventListener(FIT_COMPONENT_NODES_EVENT, handler);
  }, [fitView]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      // Check for image file drops
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (imageFiles.length > 0) {
          const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
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
          return;
        }

        // Check for HTML file drops
        const htmlFiles = Array.from(files).filter((f) =>
          /\.(html?|htm)$/i.test(f.name)
        );
        if (htmlFiles.length > 0) {
          const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });

          (async () => {
            // Determine next frame number
            let frameNumber = 1;
            const [htmlRes, jsxRes] = await Promise.all([
              fetch('/playground/api/html-pages').catch(() => null),
              fetch('/playground/api/oncanvas-components').catch(() => null),
            ]);
            if (htmlRes?.ok) {
              const { pages } = await htmlRes.json() as { pages: { folder: string }[] };
              for (const page of pages) {
                const match = page.folder.match(/^frame-(\d+)$/);
                if (match) frameNumber = Math.max(frameNumber, parseInt(match[1], 10) + 1);
              }
            }
            if (jsxRes?.ok) {
              const { components } = await jsxRes.json() as { components: { filename: string }[] };
              for (const comp of components) {
                const match = comp.filename.match(/^frame-(\d+)\.tsx$/);
                if (match) frameNumber = Math.max(frameNumber, parseInt(match[1], 10) + 1);
              }
            }

            for (let idx = 0; idx < htmlFiles.length; idx++) {
              const file = htmlFiles[idx];
              try {
                const text = await file.text();
                const wrappedHtml = wrapHtmlFragment(text);
                const frameName = `frame-${frameNumber + idx}`;

                const res = await fetch('/playground/api/html-pages', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: frameName, content: wrappedHtml }),
                });
                const data = await res.json();

                if (!res.ok) {
                  console.error('[Playground] HTML file drop failed:', data.error);
                  toast.error(data.error || 'Failed to create frame from dropped HTML');
                  continue;
                }

                const pageId = data.page.id as string;
                const folder = data.page.folder as string;

                const newNode: Node = {
                  id: getNodeId(),
                  type: 'component',
                  position: { x: position.x + idx * 320, y: position.y },
                  data: {
                    componentId: pageId,
                    renderMode: 'html' as const,
                    htmlFolder: folder,
                  },
                };
                setNodes((nds) => nds.concat(newNode));
              } catch (err) {
                console.error('[Playground] HTML file drop failed:', err);
                toast.error('Failed to create frame from dropped HTML');
              }
            }
          })();
          return;
        }
      }

      const componentId = event.dataTransfer.getData(DND_DATA_KEY);
      if (!componentId) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const isHtml = componentId.startsWith(HTML_ID_PREFIX);
      const isJsxFrame = componentId.startsWith(JSX_ID_PREFIX);
      const isDesignSystem = componentId === DESIGN_SYSTEM_SHOWCASE_ID;
      const parentNodeId = getNodeId();
      const newNode: Node = {
        id: parentNodeId,
        type: 'component',
        position,
        data: {
          componentId,
          ...(isHtml ? {
            renderMode: 'html' as const,
            htmlFolder: componentId.slice(HTML_ID_PREFIX.length),
          } : {}),
          ...(isDesignSystem ? {
            renderMode: 'design-system' as const,
          } : {}),
        },
      };

      setNodes((nds) => nds.concat(newNode));

      // After dropping a frame or registry component, also bring any of its
      // iterations that are not already on the canvas, attached to this newly placed parent.
      if (isHtml || isJsxFrame || !isDesignSystem) {
        (async () => {
          try {
            const currentNodes = coord.getNodes();
            const parentW = DEFAULT_COMPONENT_NODE_WIDTH;
            const stepW = ((isHtml || isJsxFrame) ? (isHtml ? DEFAULT_COMPONENT_NODE_WIDTH : DEFAULT_ITERATION_NODE_WIDTH) : DEFAULT_ITERATION_NODE_WIDTH) + ARRANGE_HORIZONTAL_GAP;
            const baseX = position.x + parentW + ARRANGE_HORIZONTAL_GAP;
            const newNodes: Node[] = [];
            const newEdges: Edge[] = [];
            const newKnownFilenames: string[] = [];

            if (isHtml) {
              const htmlFolder = componentId.slice(HTML_ID_PREFIX.length);
              const res = await fetch('/playground/api/html-pages');
              if (!res.ok) return;
              const { pages } = await res.json() as { pages: { folder: string; iterations: { folder: string; number: number }[] }[] };
              const page = pages.find(p => p.folder === htmlFolder);
              if (!page || page.iterations.length === 0) return;

              const existingKeys = getIterationKeysOnCanvas(currentNodes);

              const missing = page.iterations
                .filter(it => !existingKeys.has(`${htmlFolder}/${it.folder}`))
                .sort((a, b) => a.number - b.number);

              missing.forEach((iter, idx) => {
                const nodeId = getNodeId();
                newNodes.push({
                  id: nodeId,
                  type: 'iteration',
                  position: { x: baseX + idx * stepW, y: position.y },
                  data: {
                    componentName: htmlFolder,
                    iterationNumber: iter.number,
                    filename: `${htmlFolder}/iteration-${iter.number}`,
                    description: '',
                    parentNodeId,
                    renderMode: 'html',
                    htmlFolder,
                    htmlIterationFolder: iter.folder,
                    onDelete: handleIterationDelete,
                    onAdopt: handleIterationAdopt,
                  },
                });
                newEdges.push({
                  id: `edge_${parentNodeId}_${nodeId}`,
                  source: parentNodeId,
                  target: nodeId,
                  type: 'smoothstep',
                  animated: false,
                  style: ITERATION_EDGE_STYLE,
                });
                newKnownFilenames.push(`${htmlFolder}/${iter.folder}`);
              });
            } else if (isJsxFrame) {
              const baseFilename = `${componentId.slice(JSX_ID_PREFIX.length)}.tsx`;
              const res = await fetch('/playground/api/oncanvas-components');
              if (!res.ok) return;
              const { components } = await res.json() as { components: JsxComponentInfo[] };
              const comp = components.find(c => c.filename === baseFilename);
              if (!comp || comp.iterations.length === 0) return;

              const existingKeys = getIterationKeysOnCanvas(currentNodes);

              const missing = comp.iterations
                .filter(it => !existingKeys.has(it.filename))
                .sort((a, b) => a.iterationNumber - b.iterationNumber);

              missing.forEach((it, idx) => {
                const nodeId = getNodeId();
                newNodes.push({
                  id: nodeId,
                  type: 'iteration',
                  position: { x: baseX + idx * stepW, y: position.y },
                  data: {
                    componentName: comp.label,
                    iterationNumber: it.iterationNumber,
                    filename: it.filename,
                    description: '',
                    parentNodeId,
                    renderMode: 'jsx',
                    jsxFile: it.filename,
                    onDelete: handleIterationDelete,
                    onAdopt: handleIterationAdopt,
                  },
                });
                newEdges.push({
                  id: `edge_${parentNodeId}_${nodeId}`,
                  source: parentNodeId,
                  target: nodeId,
                  type: 'smoothstep',
                  animated: false,
                  style: ITERATION_EDGE_STYLE,
                });
                newKnownFilenames.push(it.filename);
              });
            } else {
              const res = await fetch('/playground/api/iterations');
              if (!res.ok) return;
              const { iterations } = await res.json() as { iterations: IterationFile[] };

              const existingKeys = getIterationKeysOnCanvas(currentNodes);
              const missing = iterations
                .filter((it) => it.parentId === componentId)
                .filter((it) => !existingKeys.has(it.filename))
                .sort((a, b) => a.iterationNumber - b.iterationNumber);

              missing.forEach((it, idx) => {
                const nodeId = getNodeId();
                newNodes.push({
                  id: nodeId,
                  type: 'iteration',
                  position: { x: baseX + idx * stepW, y: position.y },
                  data: {
                    componentName: it.componentName,
                    iterationNumber: it.iterationNumber,
                    filename: it.filename,
                    description: it.description,
                    parentNodeId,
                    registryId: componentId,
                    onDelete: handleIterationDelete,
                    onAdopt: handleIterationAdopt,
                  },
                });
                newEdges.push({
                  id: `edge_${parentNodeId}_${nodeId}`,
                  source: parentNodeId,
                  target: nodeId,
                  type: 'smoothstep',
                  animated: false,
                  style: ITERATION_EDGE_STYLE,
                });
                newKnownFilenames.push(it.filename);
              });
            }

            if (newNodes.length > 0) {
              setNodes(nds => [...nds, ...newNodes]);
              setEdges(eds => [...eds, ...newEdges]);
              coord.appendKnownIterations(newKnownFilenames);
            }
          } catch (err) {
            console.error('[Playground] Failed to load iterations for dropped frame:', err);
          }
        })();
      }
    },
    [screenToFlowPosition, setNodes, setEdges, getNodeId, handleIterationDelete, handleIterationAdopt]
  );

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

  // Re-stack selected nodes (or the right-clicked node) along the z-axis.
  const handleZOrder = useCallback((op: 'front' | 'back' | 'forward' | 'backward') => {
    setNodes((nds) => {
      const targetIds = new Set<string>();
      for (const n of nds) if (n.selected) targetIds.add(n.id);
      if (targetIds.size === 0 && contextMenu?.nodeId) targetIds.add(contextMenu.nodeId);
      if (targetIds.size === 0) return nds;

      const z = (n: Node) => n.zIndex ?? 0;
      const others = nds.filter((n) => !targetIds.has(n.id));
      const targets = nds.filter((n) => targetIds.has(n.id));

      if (op === 'front') {
        const max = nds.reduce((m, n) => Math.max(m, z(n)), 0);
        const next = max + 1;
        return nds.map((n) => (targetIds.has(n.id) ? { ...n, zIndex: next } : n));
      }
      if (op === 'back') {
        const min = nds.reduce((m, n) => Math.min(m, z(n)), 0);
        const next = min - 1;
        return nds.map((n) => (targetIds.has(n.id) ? { ...n, zIndex: next } : n));
      }
      // one-step: swap zIndex with the nearest non-selected neighbor.
      const dir: 1 | -1 = op === 'forward' ? 1 : -1;
      const targetZs = targets.map(z);
      const refZ = dir === 1 ? Math.max(...targetZs) : Math.min(...targetZs);
      const candidates = others
        .map(z)
        .filter((zz) => (dir === 1 ? zz > refZ : zz < refZ))
        .sort((a, b) => (dir === 1 ? a - b : b - a));
      if (candidates.length === 0) {
        // already at the extreme — bump past it so a subsequent action still has effect.
        const next = refZ + dir;
        return nds.map((n) => (targetIds.has(n.id) ? { ...n, zIndex: next } : n));
      }
      const swapZ = candidates[0];
      const next = dir === 1 ? swapZ + 1 : swapZ - 1;
      return nds.map((n) => (targetIds.has(n.id) ? { ...n, zIndex: next } : n));
    });
  }, [setNodes, contextMenu]);

  // ---------------------------------------------------------------------------
  // Figma-style frames: Group wraps the current selection in a `frame` node and
  // re-parents the children (parentId + extent:'parent'); Ungroup reverses it.
  // ---------------------------------------------------------------------------
  const nodeDim = (n: Node): { w: number; h: number } => ({
    w: n.measured?.width ?? (n.width as number | undefined) ?? DEFAULT_COMPONENT_NODE_WIDTH,
    h: n.measured?.height ?? (n.height as number | undefined) ?? DEFAULT_COMPONENT_NODE_HEIGHT,
  });

  const handleGroupSelection = useCallback(() => {
    const FRAME_PADDING = 28;
    setNodes((nds) => {
      // Only group top-level, non-frame nodes (avoid nested-frame complexity).
      const selected = nds.filter(
        (n) => n.selected && !n.parentId && n.type !== 'frame' && n.type !== 'skeleton',
      );
      if (selected.length < 1) return nds;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const n of selected) {
        const { w, h } = nodeDim(n);
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + w);
        maxY = Math.max(maxY, n.position.y + h);
      }

      const frameX = minX - FRAME_PADDING;
      const frameY = minY - FRAME_PADDING;
      const frameId = getNodeId();
      const minZ = nds.reduce((m, n) => Math.min(m, n.zIndex ?? 0), 0);

      const frameNode: Node = {
        id: frameId,
        type: 'frame',
        position: { x: frameX, y: frameY },
        width: maxX - minX + FRAME_PADDING * 2,
        height: maxY - minY + FRAME_PADDING * 2,
        zIndex: minZ - 1,
        selected: true,
        data: { label: 'Group' },
      };

      const selectedIds = new Set(selected.map((n) => n.id));
      // Parent must precede its children in the array, so place the frame first,
      // then the reparented children, then everything else untouched.
      const updatedChildren = selected.map((n) => ({
        ...n,
        parentId: frameId,
        extent: 'parent' as const,
        position: { x: n.position.x - frameX, y: n.position.y - frameY },
        selected: false,
      }));
      const rest = nds.filter((n) => !selectedIds.has(n.id));
      return [...rest, frameNode, ...updatedChildren];
    });
  }, [setNodes, getNodeId]);

  const handleUngroupFrame = useCallback(
    (frameIdArg?: string) => {
      setNodes((nds) => {
        const frame =
          (frameIdArg && nds.find((n) => n.id === frameIdArg && n.type === 'frame')) ||
          nds.find((n) => n.type === 'frame' && n.selected);
        if (!frame) return nds;

        const fx = frame.position.x;
        const fy = frame.position.y;
        return nds
          .filter((n) => n.id !== frame.id)
          .map((n) =>
            n.parentId === frame.id
              ? {
                  ...n,
                  parentId: undefined,
                  extent: undefined,
                  position: { x: n.position.x + fx, y: n.position.y + fy },
                  selected: true,
                }
              : n,
          );
      });
    },
    [setNodes],
  );

  // Alignment guides: while dragging a top-level node, surface pink guides when
  // an edge or center lines up with another node within a small flow-space
  // threshold. Cleared on drag stop. (Child nodes use parent-relative coords, so
  // we skip them rather than draw misplaced guides.)
  const onNodeDrag = useCallback(
    (_e: MouseEvent, node: Node) => {
      if (node.parentId) {
        setHelperLines({});
        return;
      }
      const threshold = 6;
      const { w, h } = nodeDim(node);
      const left = node.position.x;
      const right = left + w;
      const cx = left + w / 2;
      const top = node.position.y;
      const bottom = top + h;
      const cy = top + h / 2;

      let vertical: number | undefined;
      let horizontal: number | undefined;
      let bestV = threshold;
      let bestH = threshold;

      for (const o of coord.getNodes()) {
        if (o.id === node.id || o.parentId || o.type === 'skeleton') continue;
        const { w: ow, h: oh } = nodeDim(o);
        const oLeft = o.position.x;
        const oRight = oLeft + ow;
        const ocx = oLeft + ow / 2;
        const oTop = o.position.y;
        const oBottom = oTop + oh;
        const ocy = oTop + oh / 2;

        const vPairs: [number, number][] = [
          [left, oLeft], [right, oRight], [cx, ocx], [left, oRight], [right, oLeft], [cx, oLeft], [cx, oRight],
        ];
        for (const [a, b] of vPairs) {
          const d = Math.abs(a - b);
          if (d < bestV) { bestV = d; vertical = b; }
        }
        const hPairs: [number, number][] = [
          [top, oTop], [bottom, oBottom], [cy, ocy], [top, oBottom], [bottom, oTop], [cy, oTop], [cy, oBottom],
        ];
        for (const [a, b] of hPairs) {
          const d = Math.abs(a - b);
          if (d < bestH) { bestH = d; horizontal = b; }
        }
      }
      setHelperLines({ vertical, horizontal });
    },
    [],
  );

  const clearHelperLines = useCallback(() => setHelperLines({}), []);

  // Close context menu on any click outside
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  // "T" shortcut — toggle text-placement tool mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!matchesAction(e, 'canvas.add-text')) return;
      const active = document.activeElement;
      if (active) {
        const tag = active.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        if ((active as HTMLElement).isContentEditable) return;
        if (active.closest('[role="dialog"]') || active.closest('[data-radix-popper-content-wrapper]')) return;
      }
      e.preventDefault();
      setActiveTool((prev) => (prev === 'text' ? 'select' : 'text'));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Z-order shortcuts: Cmd/Ctrl + ] / [ (with Shift for front/back).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      let op: 'front' | 'back' | 'forward' | 'backward' | null = null;
      if (matchesAction(e, 'canvas.bring-to-front')) op = 'front';
      else if (matchesAction(e, 'canvas.send-to-back')) op = 'back';
      else if (matchesAction(e, 'canvas.bring-forward')) op = 'forward';
      else if (matchesAction(e, 'canvas.send-backward')) op = 'backward';
      if (!op) return;
      const active = document.activeElement;
      if (active) {
        const tag = active.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        if ((active as HTMLElement).isContentEditable) return;
        if (active.closest('[role="dialog"]') || active.closest('[data-radix-popper-content-wrapper]')) return;
      }
      e.preventDefault();
      handleZOrder(op);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleZOrder]);

  // Group / Ungroup shortcuts: Cmd/Ctrl+G and Cmd/Ctrl+Shift+G.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isGroup = matchesAction(e, 'canvas.group');
      const isUngroup = matchesAction(e, 'canvas.ungroup');
      if (!isGroup && !isUngroup) return;
      const active = document.activeElement;
      if (active) {
        const tag = active.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        if ((active as HTMLElement).isContentEditable) return;
        if (active.closest('[role="dialog"]') || active.closest('[data-radix-popper-content-wrapper]')) return;
      }
      e.preventDefault();
      if (isUngroup) handleUngroupFrame();
      else handleGroupSelection();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleGroupSelection, handleUngroupFrame]);

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

  // Undo / redo / duplicate / copy / paste shortcuts.
  useEffect(() => {
    const isTyping = () => {
      const active = document.activeElement;
      if (!active) return false;
      const tag = active.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return true;
      if ((active as HTMLElement).isContentEditable) return true;
      if (active.closest('[role="dialog"]') || active.closest('[data-radix-popper-content-wrapper]')) return true;
      return false;
    };

    const handler = (e: KeyboardEvent) => {
      if (isTyping()) return;
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const key = e.key.toLowerCase();

      if (matchesAction(e, 'canvas.redo') || (key === 'y' && meta)) {
        e.preventDefault();
        redo();
        return;
      }
      if (matchesAction(e, 'canvas.undo')) {
        e.preventDefault();
        undo();
        return;
      }
      if (matchesAction(e, 'canvas.duplicate')) {
        e.preventDefault();
        handleDuplicateNodes();
        return;
      }
      if (key === 'c' && !e.shiftKey) {
        // Only intercept when a node is selected; otherwise leave native copy alone.
        if (handleCopyNodes()) e.preventDefault();
        return;
      }
      if (key === 'v' && !e.shiftKey) {
        if (handlePasteNodes()) e.preventDefault();
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, handleDuplicateNodes, handleCopyNodes, handlePasteNodes]);

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

  // Paste images or HTML from clipboard onto the canvas
  useEffect(() => {
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return;

    const handlePaste = async (e: ClipboardEvent) => {
      // Don't intercept pastes into text inputs
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          (active as HTMLElement).isContentEditable)
      ) {
        return;
      }

      // Pure classification decides which node a paste becomes; this handler
      // owns the I/O (upload, frame-file writes, node insertion) each drives.
      const intent = classifyClipboard(e.clipboardData ?? null);
      if (intent.kind === 'none') return;
      e.preventDefault();

      // Drop the new node at the current viewport centre (computed lazily so
      // image/JSX/HTML pastes place correctly after their awaited round-trip).
      const centerPosition = () => {
        const wrapperBounds = wrapper.getBoundingClientRect();
        return screenToFlowPosition({
          x: wrapperBounds.left + wrapperBounds.width / 2,
          y: wrapperBounds.top + wrapperBounds.height / 2,
        });
      };

      // --- Image paste (takes priority) ---
      if (intent.kind === 'image') {
        const file = intent.file;
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          try {
            const res = await fetch('/playground/api/images', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageBase64: base64,
                originalName: file.name || `pasted-image.${file.type.split('/')[1] || 'png'}`,
              }),
            });
            const data = await res.json();
            if (data.success) {
              const position = centerPosition();
              const newNode: Node = {
                id: getNodeId(),
                type: 'image',
                position,
                style: { width: 300, height: 250 },
                data: {
                  imagePath: data.path,
                  imageUrl: data.url,
                  filename: data.filename,
                  originalName: file.name || 'Pasted Image',
                },
              };
              setNodes((nds) => nds.concat(newNode));
            }
          } catch (err) {
            console.error('[Playground] Image paste upload failed:', err);
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      // --- JSX paste (checked before HTML since JSX also contains HTML tags) ---
      if (intent.kind === 'jsx') {
        try {
          // Determine next frame number by scanning existing JSX components and HTML pages
          const [jsxRes, htmlRes] = await Promise.all([
            fetch('/playground/api/oncanvas-components').catch(() => null),
            fetch('/playground/api/html-pages').catch(() => null),
          ]);
          const jsxFilenames: string[] = [];
          const htmlFolders: string[] = [];
          if (jsxRes?.ok) {
            const { components } = await jsxRes.json() as { components: { filename: string }[] };
            for (const comp of components) jsxFilenames.push(comp.filename);
          }
          if (htmlRes?.ok) {
            const { pages } = await htmlRes.json() as { pages: { folder: string }[] };
            for (const page of pages) htmlFolders.push(page.folder);
          }
          const frameNumber = nextFrameNumber(jsxFilenames, htmlFolders);

          const frameName = `frame-${frameNumber}`;
          const componentName = `Frame${frameNumber}`;
          const filename = `${frameName}.tsx`;
          const wrappedJsx = wrapJsxComponent(intent.source, componentName);

          const res = await fetch('/playground/api/oncanvas-components', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, content: wrappedJsx }),
          });
          const data = await res.json();

          if (!res.ok) {
            console.error('[Playground] JSX paste failed:', data.error);
            toast.error(data.error || 'Failed to create frame from pasted JSX');
            return;
          }

          const position = centerPosition();
          const newNode: Node = {
            id: getNodeId(),
            type: 'component',
            position,
            data: {
              componentId: `${JSX_ID_PREFIX}${frameName}`,
              renderMode: 'jsx' as const,
              jsxFile: filename,
            },
          };
          setNodes((nds) => nds.concat(newNode));

          // Delay event dispatch to give the bundler (HMR) time to recompile
          // the updated barrel index after the new file is written to disk.
          // Retry a few times in case the first attempt is too early.
          const dispatchWithRetry = (attempts: number, delay: number) => {
            setTimeout(() => {
              window.dispatchEvent(new Event(JSX_COMPONENT_ADDED_EVENT));
              if (attempts > 1) {
                dispatchWithRetry(attempts - 1, delay * 2);
              }
            }, delay);
          };
          dispatchWithRetry(3, 500);
        } catch (err) {
          console.error('[Playground] JSX paste failed:', err);
          toast.error('Failed to create frame from pasted JSX');
        }
        return;
      }

      // --- Single-line URL paste → remote iframe embed (no file on disk) ---
      if (intent.kind === 'url') {
        const position = centerPosition();
        const embedComponentId = `url-embed:${crypto.randomUUID()}`;
        const newNode: Node = {
          id: getNodeId(),
          type: 'component',
          position,
          style: { width: DEFAULT_COMPONENT_NODE_WIDTH, height: DEFAULT_COMPONENT_NODE_HEIGHT },
          data: {
            componentId: embedComponentId,
            renderMode: 'embed' as const,
            embedUrl: intent.url,
          },
        };
        setNodes((nds) => nds.concat(newNode));
        return;
      }

      // --- HTML paste ---
      try {
        // Determine next frame number by scanning existing HTML pages and JSX components
        const [htmlRes2, jsxRes2] = await Promise.all([
          fetch('/playground/api/html-pages').catch(() => null),
          fetch('/playground/api/oncanvas-components').catch(() => null),
        ]);
        const jsxFilenames: string[] = [];
        const htmlFolders: string[] = [];
        if (htmlRes2?.ok) {
          const { pages } = await htmlRes2.json() as { pages: { folder: string }[] };
          for (const page of pages) htmlFolders.push(page.folder);
        }
        if (jsxRes2?.ok) {
          const { components } = await jsxRes2.json() as { components: { filename: string }[] };
          for (const comp of components) jsxFilenames.push(comp.filename);
        }
        const frameNumber = nextFrameNumber(jsxFilenames, htmlFolders);

        const frameName = `frame-${frameNumber}`;
        const wrappedHtml = wrapHtmlFragment(intent.html);

        const res = await fetch('/playground/api/html-pages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: frameName, content: wrappedHtml }),
        });
        const data = await res.json();

        if (!res.ok) {
          console.error('[Playground] HTML paste failed:', data.error);
          toast.error(data.error || 'Failed to create frame from pasted HTML');
          return;
        }

        const position = centerPosition();
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
      } catch (err) {
        console.error('[Playground] HTML paste failed:', err);
        toast.error('Failed to create frame from pasted HTML');
      }
    };

    wrapper.addEventListener('paste', handlePaste);
    return () => wrapper.removeEventListener('paste', handlePaste);
  }, [screenToFlowPosition, getNodeId, setNodes]);

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

  // Handle node deletion - check for children first
  const onNodesDelete = useCallback(async (deletedNodes: Node[]) => {
    if (usePlaygroundDrawStore.getState().strokeSelection) return;

    for (const node of deletedNodes) {
      if (node.type === 'image' && node.data.filename) {
        try {
          await fetch('/playground/api/images', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: node.data.filename }),
          });
        } catch (error) {
          console.error('Error deleting image file:', error);
        }
      } else if (node.type === 'iteration' && node.data.filename) {
        // Check if this node has children
        const childEdges = edges.filter(e => e.source === node.id);
        if (childEdges.length > 0) {
          // Has children -- show cascade/reparent dialog instead of deleting immediately
          setDeleteDialogNode(node);
          return; // Don't delete yet, wait for dialog action
        }

        // No children -- simple delete
        try {
          await fetch('/playground/api/iterations', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: node.data.filename }),
          });
          setKnownIterations(prev => prev.filter(f => f !== node.data.filename));
        } catch (error) {
          console.error('Error deleting iteration file:', error);
        }
      }
    }
  }, [edges]);

  // Handle cascade or reparent deletion
  const handleDeleteWithMode = useCallback(async (mode: 'cascade' | 'reparent') => {
    const node = deleteDialogNode;
    if (!node || !node.data.filename) return;

    try {
      const resp = await fetch('/playground/api/iterations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: node.data.filename, mode }),
      });

      if (!resp.ok) {
        console.error('[Playground] Delete failed:', resp.status);
        setDeleteDialogNode(null);
        return;
      }

      const { deletedFiles } = (await resp.json()) as { deletedFiles: string[] };

      if (mode === 'cascade') {
        // Remove the node and all descendants from canvas
        const deletedSet = new Set(deletedFiles);

        // Find all node IDs to remove (match by filename)
        const nodeIdsToRemove = new Set<string>();
        nodes.forEach(n => {
          if (n.id === node.id) nodeIdsToRemove.add(n.id);
          if (n.data.filename && deletedSet.has(n.data.filename as string)) {
            nodeIdsToRemove.add(n.id);
          }
        });

        setNodes(nds => nds.filter(n => !nodeIdsToRemove.has(n.id)));
        setEdges(eds => eds.filter(e => !nodeIdsToRemove.has(e.source) && !nodeIdsToRemove.has(e.target)));
        setKnownIterations(prev => prev.filter(f => !deletedSet.has(f)));
        
        // Clean up collapsed state
        setCollapsedNodeIds(prev => {
          const next = new Set(prev);
          nodeIdsToRemove.forEach(id => next.delete(id));
          return next;
        });
      } else {
        // Reparent: reconnect children to the deleted node's parent
        const parentEdge = edges.find(e => e.target === node.id);
        const parentId = parentEdge?.source;

        // Get child node IDs
        const childEdges = edges.filter(e => e.source === node.id);
        const childNodeIds = childEdges.map(e => e.target);

        // Remove the deleted node
        setNodes(nds => nds.filter(n => n.id !== node.id));

        // Remove all edges to/from deleted node, and add new edges from parent to children
        setEdges(eds => {
          const filtered = eds.filter(e => e.source !== node.id && e.target !== node.id);
          if (parentId) {
            const newEdges = childNodeIds.map(childId => ({
              id: `edge_${parentId}_${childId}`,
              source: parentId,
              target: childId,
              type: 'smoothstep',
              animated: false,
              style: ITERATION_EDGE_STYLE,
            }));
            return [...filtered, ...newEdges];
          }
          return filtered;
        });

        setKnownIterations(prev => prev.filter(f => f !== node.data.filename));
        
        // Clean up collapsed state for deleted node
        setCollapsedNodeIds(prev => {
          const next = new Set(prev);
          next.delete(node.id);
          return next;
        });
      }
    } catch (error) {
      console.error('[Playground] Delete error:', error);
    } finally {
      setDeleteDialogNode(null);
    }
  }, [deleteDialogNode, nodes, edges, setNodes, setEdges]);

  // ---------------------------------------------------------------------------
  // Auto-arrange: bento cluster layout
  // Each component and all of its visible descendants are laid out as a local bento cluster.
  // Component clusters are then packed left-to-right in rows with spacing between clusters.
  // ---------------------------------------------------------------------------
  const autoArrangeNodes = useCallback((andFitView: boolean = false) => {
    const componentNodes = nodes.filter(n => n.type === 'component');

    const START_X = ARRANGE_START_X;
    const START_Y = ARRANGE_START_Y;
    const TILE_GAP_X = ARRANGE_BENTO_TILE_GAP_X;
    const TILE_GAP_Y = ARRANGE_BENTO_TILE_GAP_Y;
    const CLUSTER_MAX_WIDTH = ARRANGE_BENTO_CLUSTER_MAX_WIDTH;
    const CLUSTER_GAP_X = ARRANGE_BENTO_CLUSTER_GAP_X;
    const CLUSTER_GAP_Y = ARRANGE_BENTO_CLUSTER_GAP_Y;
    const CLUSTER_ROW_MAX_WIDTH = ARRANGE_BENTO_CLUSTER_ROW_MAX_WIDTH;
    const COLLISION_MIN_SEPARATION = ARRANGE_COLLISION_MIN_SEPARATION;
    const COLLISION_MAX_PASSES = ARRANGE_COLLISION_MAX_PASSES;
    const LABEL_PADDING_X_BASE = ARRANGE_LABEL_PADDING_X_BASE;
    const LABEL_PADDING_Y_BASE = ARRANGE_LABEL_PADDING_Y_BASE;
    const zoom = Math.max(getViewport().zoom, 0.0001);

    // Helper to get node dimensions
    const getNodeSize = (node: Node): { width: number; height: number } => {
      const measured = node.measured;
      if (measured?.width && measured?.height) {
        return { width: measured.width, height: measured.height };
      }
      if (node.type === 'iteration' || node.type === 'skeleton') {
        return { width: DEFAULT_ITERATION_NODE_WIDTH, height: DEFAULT_ITERATION_NODE_HEIGHT };
      }
      return { width: DEFAULT_COMPONENT_NODE_WIDTH, height: DEFAULT_COMPONENT_NODE_HEIGHT };
    };
    const getEffectiveNodeFootprint = (node: Node): { width: number; height: number } => {
      const base = getNodeSize(node);
      const inverseLabelScale = Math.min(
        NODE_LABEL_MAX_INV_SCALE,
        Math.max(1, NODE_LABEL_SCALE_THRESHOLD / zoom),
      );
      const zoomGrowth = Math.max(0, inverseLabelScale - 1);
      const extraX = LABEL_PADDING_X_BASE * zoomGrowth;
      const extraY = LABEL_PADDING_Y_BASE * zoomGrowth;
      return {
        width: base.width + extraX,
        height: base.height + extraY,
      };
    };

    const nodeOrder = new Map<string, number>();
    nodes.forEach((node, index) => nodeOrder.set(node.id, index));
    const sortByStableNodeOrder = (a: string, b: string) =>
      (nodeOrder.get(a) ?? Number.MAX_SAFE_INTEGER) - (nodeOrder.get(b) ?? Number.MAX_SAFE_INTEGER);

    // Build adjacency list from edges (parent -> children)
    const childrenMap = new Map<string, string[]>();
    edges.forEach(edge => {
      const existing = childrenMap.get(edge.source) || [];
      existing.push(edge.target);
      childrenMap.set(edge.source, existing);
    });
    childrenMap.forEach((children, parentId) => {
      childrenMap.set(parentId, children.sort(sortByStableNodeOrder));
    });

    // Build visibility map based on collapsed state
    const collapsed = collapsedNodeIdsRef.current;
    const hiddenNodeIds = new Set<string>();
    const markDescendantsHidden = (parentId: string) => {
      const children = childrenMap.get(parentId) || [];
      for (const childId of children) {
        hiddenNodeIds.add(childId);
        markDescendantsHidden(childId);
      }
    };
    collapsed.forEach(nodeId => markDescendantsHidden(nodeId));

    const nodeMap = new Map<string, Node>();
    nodes.forEach(n => nodeMap.set(n.id, n));

    const collectVisibleClusterNodeIds = (rootNodeId: string): string[] => {
      const collected: string[] = [];
      const visited = new Set<string>();
      const queue: string[] = [rootNodeId];

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (visited.has(currentId) || hiddenNodeIds.has(currentId)) continue;
        const currentNode = nodeMap.get(currentId);
        if (!currentNode) continue;

        visited.add(currentId);
        collected.push(currentId);
        const children = (childrenMap.get(currentId) || []).filter(childId => !hiddenNodeIds.has(childId));
        queue.push(...children);
      }

      return collected;
    };

    const getDepthByNodeId = (rootNodeId: string, clusterNodeIds: Set<string>): Map<string, number> => {
      const depthByNodeId = new Map<string, number>();
      const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: rootNodeId, depth: 0 }];

      while (queue.length > 0) {
        const { nodeId, depth } = queue.shift()!;
        if (depthByNodeId.has(nodeId) || !clusterNodeIds.has(nodeId)) continue;

        depthByNodeId.set(nodeId, depth);
        const children = (childrenMap.get(nodeId) || []).filter(childId => clusterNodeIds.has(childId));
        children.forEach(childId => queue.push({ nodeId: childId, depth: depth + 1 }));
      }

      return depthByNodeId;
    };

    const layoutClusterBento = (
      rootNodeId: string,
      clusterNodeIds: string[],
      anchorRootAtTopLeft: boolean,
    ): {
      positions: Map<string, { x: number; y: number }>;
      width: number;
      height: number;
    } => {
      const localPositions = new Map<string, { x: number; y: number }>();
      if (clusterNodeIds.length === 0) {
        return { positions: localPositions, width: 0, height: 0 };
      }

      const nodeIdSet = new Set(clusterNodeIds);
      const depthByNodeId = getDepthByNodeId(rootNodeId, nodeIdSet);

      const orderedTiles = clusterNodeIds
        .filter(nodeId => !anchorRootAtTopLeft || nodeId !== rootNodeId)
        .sort((a, b) => {
          const depthDelta = (depthByNodeId.get(a) ?? Number.MAX_SAFE_INTEGER) -
            (depthByNodeId.get(b) ?? Number.MAX_SAFE_INTEGER);
          if (depthDelta !== 0) return depthDelta;
          return sortByStableNodeOrder(a, b);
        });

      let cursorX = 0;
      let cursorY = 0;
      let rowHeight = 0;
      let maxRight = 0;
      let maxBottom = 0;

      const placeTile = (nodeId: string, x: number, y: number) => {
        const node = nodeMap.get(nodeId);
        if (!node) return;
        const size = getEffectiveNodeFootprint(node);
        localPositions.set(nodeId, { x, y });
        maxRight = Math.max(maxRight, x + size.width);
        maxBottom = Math.max(maxBottom, y + size.height);
      };

      if (anchorRootAtTopLeft && nodeIdSet.has(rootNodeId)) {
        const rootNode = nodeMap.get(rootNodeId);
        if (rootNode) {
          const rootSize = getEffectiveNodeFootprint(rootNode);
          placeTile(rootNodeId, 0, 0);
          cursorX = rootSize.width + TILE_GAP_X;
          rowHeight = rootSize.height;
        }
      }

      orderedTiles.forEach(tileNodeId => {
        const tileNode = nodeMap.get(tileNodeId);
        if (!tileNode) return;

        const tileSize = getEffectiveNodeFootprint(tileNode);
        const wouldOverflow = cursorX > 0 && cursorX + tileSize.width > CLUSTER_MAX_WIDTH;
        if (wouldOverflow) {
          cursorY += rowHeight + TILE_GAP_Y;
          cursorX = 0;
          rowHeight = 0;
        }

        placeTile(tileNodeId, cursorX, cursorY);
        rowHeight = Math.max(rowHeight, tileSize.height);
        cursorX += tileSize.width + TILE_GAP_X;
      });

      return {
        positions: localPositions,
        width: maxRight,
        height: maxBottom,
      };
    };

    const clusterLayouts: Array<{
      clusterId: string;
      positions: Map<string, { x: number; y: number }>;
      width: number;
      height: number;
    }> = [];
    const assignedNodeIds = new Set<string>();

    componentNodes.forEach(componentNode => {
      const clusterNodeIds = collectVisibleClusterNodeIds(componentNode.id)
        .filter(nodeId => !assignedNodeIds.has(nodeId));
      if (clusterNodeIds.length === 0) return;

      clusterNodeIds.forEach(nodeId => assignedNodeIds.add(nodeId));
      const layout = layoutClusterBento(componentNode.id, clusterNodeIds, true);
      clusterLayouts.push({
        clusterId: componentNode.id,
        positions: layout.positions,
        width: layout.width,
        height: layout.height,
      });
    });

    // Keep non-hidden, non-component leftovers in a fallback bento cluster.
    const orphanNodeIds = nodes
      .map(node => node.id)
      .filter(nodeId => !hiddenNodeIds.has(nodeId) && !assignedNodeIds.has(nodeId));
    if (orphanNodeIds.length > 0) {
      orphanNodeIds.forEach(nodeId => assignedNodeIds.add(nodeId));
      const layout = layoutClusterBento(orphanNodeIds[0], orphanNodeIds, false);
      clusterLayouts.push({
        clusterId: '__orphans__',
        positions: layout.positions,
        width: layout.width,
        height: layout.height,
      });
    }

    const clusterOrigins = new Map<string, { x: number; y: number }>();
    let clusterCursorX = START_X;
    let clusterCursorY = START_Y;
    let currentRowHeight = 0;
    const maxClusterRowRight = START_X + CLUSTER_ROW_MAX_WIDTH;

    clusterLayouts.forEach(clusterLayout => {
      const shouldWrapRow = clusterCursorX > START_X &&
        clusterCursorX + clusterLayout.width > maxClusterRowRight;
      if (shouldWrapRow) {
        clusterCursorX = START_X;
        clusterCursorY += currentRowHeight + CLUSTER_GAP_Y;
        currentRowHeight = 0;
      }

      clusterOrigins.set(clusterLayout.clusterId, { x: clusterCursorX, y: clusterCursorY });
      clusterCursorX += clusterLayout.width + CLUSTER_GAP_X;
      currentRowHeight = Math.max(currentRowHeight, clusterLayout.height);
    });

    const positionMap = new Map<string, { x: number; y: number }>();
    clusterLayouts.forEach(clusterLayout => {
      const origin = clusterOrigins.get(clusterLayout.clusterId);
      if (!origin) return;

      clusterLayout.positions.forEach((localPosition, nodeId) => {
        positionMap.set(nodeId, {
          x: origin.x + localPosition.x,
          y: origin.y + localPosition.y,
        });
      });
    });

    const effectiveSizeByNodeId = new Map<string, { width: number; height: number }>();
    positionMap.forEach((_, nodeId) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;
      effectiveSizeByNodeId.set(nodeId, getEffectiveNodeFootprint(node));
    });
    const positionedNodeIds = Array.from(positionMap.keys()).sort(sortByStableNodeOrder);
    const hasOverlap = (
      aPos: { x: number; y: number },
      aSize: { width: number; height: number },
      bPos: { x: number; y: number },
      bSize: { width: number; height: number },
    ) => {
      const aRight = aPos.x + aSize.width + COLLISION_MIN_SEPARATION;
      const aBottom = aPos.y + aSize.height + COLLISION_MIN_SEPARATION;
      const bRight = bPos.x + bSize.width + COLLISION_MIN_SEPARATION;
      const bBottom = bPos.y + bSize.height + COLLISION_MIN_SEPARATION;
      return aPos.x < bRight && aRight > bPos.x && aPos.y < bBottom && aBottom > bPos.y;
    };
    const resolveCollisions = () => {
      for (let pass = 0; pass < COLLISION_MAX_PASSES; pass += 1) {
        let movedAny = false;
        for (let i = 0; i < positionedNodeIds.length; i += 1) {
          const leftNodeId = positionedNodeIds[i];
          const leftPos = positionMap.get(leftNodeId);
          const leftSize = effectiveSizeByNodeId.get(leftNodeId);
          if (!leftPos || !leftSize) continue;
          for (let j = i + 1; j < positionedNodeIds.length; j += 1) {
            const rightNodeId = positionedNodeIds[j];
            const rightPos = positionMap.get(rightNodeId);
            const rightSize = effectiveSizeByNodeId.get(rightNodeId);
            if (!rightPos || !rightSize) continue;
            if (!hasOverlap(leftPos, leftSize, rightPos, rightSize)) continue;

            const pushX = (leftPos.x + leftSize.width + COLLISION_MIN_SEPARATION) - rightPos.x;
            const pushY = (leftPos.y + leftSize.height + COLLISION_MIN_SEPARATION) - rightPos.y;
            if (pushX <= 0 || pushY <= 0) continue;

            if (pushX <= pushY) {
              positionMap.set(rightNodeId, { x: rightPos.x + pushX, y: rightPos.y });
            } else {
              positionMap.set(rightNodeId, { x: rightPos.x, y: rightPos.y + pushY });
            }
            movedAny = true;
          }
        }
        if (!movedAny) break;
      }
    };
    resolveCollisions();

    // Apply positions
    setNodes(currentNodes =>
      currentNodes.map(node => {
        const newPosition = positionMap.get(node.id);
        if (newPosition) {
          return { ...node, position: newPosition };
        }
        return node;
      }),
    );

    if (andFitView) {
      setTimeout(() => {
        fitView(FITVIEW_AFTER_ARRANGE);
      }, ARRANGE_FITVIEW_DELAY);
    }
  }, [nodes, edges, setNodes, fitView, getViewport]);

  // Handle auto-arrange event (triggered after skeleton nodes are added)
  useEffect(() => {
    const handleAutoArrange = (e: CustomEvent<{ fitView: boolean }>) => {
      autoArrangeNodes(e.detail.fitView);
    };

    window.addEventListener(PLAYGROUND_AUTO_ARRANGE_EVENT, handleAutoArrange as EventListener);
    return () => {
      window.removeEventListener(PLAYGROUND_AUTO_ARRANGE_EVENT, handleAutoArrange as EventListener);
    };
  }, [autoArrangeNodes]);

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
  const { visibleNodes, visibleEdges } = useMemo(() => {
    // Build adjacency from current edges
    const childrenMap = new Map<string, string[]>();
    edges.forEach(edge => {
      const existing = childrenMap.get(edge.source) || [];
      existing.push(edge.target);
      childrenMap.set(edge.source, existing);
    });

    // Determine hidden nodes (descendants of collapsed nodes)
    const hiddenSet = new Set<string>();
    const markDescendantsHidden = (parentId: string) => {
      const children = childrenMap.get(parentId) || [];
      for (const childId of children) {
        hiddenSet.add(childId);
        markDescendantsHidden(childId);
      }
    };
    collapsedNodeIds.forEach(nodeId => markDescendantsHidden(nodeId));

    // Annotate iteration nodes with hasChildren + isCollapsed
    const annotatedNodes = nodes
      .filter(n => !hiddenSet.has(n.id))
      .map(n => {
        if (n.type === 'iteration') {
          const children = childrenMap.get(n.id) || [];
          const hasChildren = children.length > 0;
          const isCollapsed = collapsedNodeIds.has(n.id);
          if (hasChildren !== n.data.hasChildren || isCollapsed !== n.data.isCollapsed) {
            return { ...n, data: { ...n.data, hasChildren, isCollapsed } };
          }
        }
        return n;
      });

    const vEdges = edges.filter(e => !hiddenSet.has(e.target) && !hiddenSet.has(e.source));
    return { visibleNodes: annotatedNodes, visibleEdges: vEdges };
  }, [nodes, edges, collapsedNodeIds]);

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

  const handleSidebarButtonMouseEnter = useCallback(() => {
    sidebarOpenedByButtonHoverRef.current = !sidebarVisible;
    onShowSidebar();
  }, [onShowSidebar, sidebarVisible]);

  const handleSidebarButtonClick = useCallback(() => {
    onToggleSidebar(sidebarOpenedByButtonHoverRef.current);
    sidebarOpenedByButtonHoverRef.current = false;
  }, [onToggleSidebar]);

  // Tool shortcuts: V select, P pen, Escape leaves draw/text
  useEffect(() => {
    const isTypingTarget = () => {
      const active = document.activeElement;
      if (!active) return false;
      const tag = active.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return true;
      if ((active as HTMLElement).isContentEditable) return true;
      if (active.closest('[role="dialog"]') || active.closest('[data-radix-popper-content-wrapper]')) return true;
      return false;
    };

    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget()) return;

      if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
        return;
      }
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        toggleDrawPenKind('pen');
        return;
      }
      const shapeShortcut: Record<string, ShapeKind> = { r: 'rect', o: 'ellipse', l: 'line' };
      const shapeForKey = shapeShortcut[e.key.toLowerCase()];
      if (shapeForKey) {
        e.preventDefault();
        if (activeTool === 'shape' && shapeKind === shapeForKey) {
          setActiveTool('select');
        } else {
          setShapeKind(shapeForKey);
          setActiveTool('shape');
        }
        return;
      }
      if (activeTool !== 'select' && e.key === 'Escape') {
        setActiveTool('select');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTool, shapeKind, toggleDrawPenKind]);

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

      {/* Match PlaygroundClient: left-6 (1.5rem); vertically centered */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 bg-white rounded-2xl border border-stone-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-2">
        {/* Sidebar toggle (hexagon) — hover instantly shows panel */}
        <button
          onClick={handleSidebarButtonClick}
          onMouseEnter={handleSidebarButtonMouseEnter}
          onMouseLeave={onHideSidebar}
          className={`group flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
            sidebarVisible ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
          }`}
          aria-label={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
          title="Toggle sidebar"
        >
          <ProjectBoxIcon />
        </button>

        <div className="h-px w-5 bg-stone-200 my-0.5" />

        {/* Select / Cursor (default) */}
        <button
          onClick={() => setActiveTool('select')}
          className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
            activeTool === 'select' ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
          }`}
          aria-label="Select tool"
          title="Select (V)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3l14 9-7 1-4 7z" />
          </svg>
        </button>

        {/* Shape tools — pen, rectangle, ellipse, line grouped into one flyout slot */}
        <ShapeToolGroup
          activeTool={activeTool}
          shapeKind={shapeKind}
          drawPenKind={drawPenKind}
          setActiveTool={setActiveTool}
          setShapeKind={setShapeKind}
          setDrawPenKind={setDrawPenKind}
        />

        {/* Text tool */}
        <button
          onClick={() => setActiveTool((prev) => (prev === 'text' ? 'select' : 'text'))}
          className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
            activeTool === 'text' ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
          }`}
          aria-label="Text tool"
          title="Text (T)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
        </button>

        {/* Snap-to-grid is now modal (hold Control/⌘ while dragging) — no toolbar toggle. */}

        {/* Image upload */}
        <button
          onClick={() => imageInputRef.current?.click()}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors"
          aria-label="Upload image"
          title="Image"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>
      </div>

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

      {/* Clear canvas confirmation dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear everything?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all components and variations from the canvas and permanently delete all generated variation files. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearAllNodes}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Clear canvas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Create new page dialog */}
      {createPageDialog && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-start"
          onClick={() => {
            if (creatingPage) return;
            setCreatePageDialog(null);
            setNewPageDescription('');
            setCreatePageError('');
          }}
        >
          <div
            className="bg-white rounded-2xl border border-stone-200 shadow-xl p-4 w-[360px] animate-in fade-in-0 zoom-in-95 duration-150"
            style={{ position: 'fixed', left: createPageDialog.screenX, top: createPageDialog.screenY }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[13px] font-semibold text-stone-800 mb-1">New Page</h3>
            <p className="text-[11px] text-stone-500 mb-3">Describe the page. The AI will pick a slug, scaffold it, and register it in the Pages section.</p>
            <textarea
              ref={newPageInputRef}
              rows={4}
              placeholder="A landing page for our pricing plans, with a 3-tier comparison table…"
              value={newPageDescription}
              onChange={(e) => { setNewPageDescription(e.target.value); setCreatePageError(''); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleCreatePage(); }
                if (e.key === 'Escape' && !creatingPage) { setCreatePageDialog(null); setNewPageDescription(''); setCreatePageError(''); }
              }}
              disabled={creatingPage}
              className="w-full px-3 py-2 text-[13px] bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-colors resize-none disabled:opacity-50"
            />
            {createPageError && (
              <p className="text-[11px] text-red-500 mt-1.5">{createPageError}</p>
            )}
            <div className="flex justify-between items-center gap-2 mt-3">
              <span className="text-[10px] text-stone-400">⌘↵ to submit</span>
              <div className="flex gap-2">
                <button
                  onClick={() => { setCreatePageDialog(null); setNewPageDescription(''); setCreatePageError(''); }}
                  disabled={creatingPage}
                  className="px-3 py-1.5 text-[12px] text-stone-500 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePage}
                  disabled={!newPageDescription.trim() || creatingPage}
                  className="px-3 py-1.5 text-[12px] bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {creatingPage ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete iteration with children - cascade / reparent dialog */}
      <AlertDialog open={!!deleteDialogNode} onOpenChange={(open) => { if (!open) setDeleteDialogNode(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete variation with children?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteDialogNode?.data.filename as string}</strong> has child variations. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteWithMode('reparent')}
              className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-600"
            >
              Keep children
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleDeleteWithMode('cascade')}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
    </TooltipProvider>
  );
}
