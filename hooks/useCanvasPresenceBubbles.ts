'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Node } from '@xyflow/react';
import { type CanvasPresenceBubble } from '../components/canvas/CanvasPresenceLayer';
import type { GenerationCoordination } from './useGenerationCoordination';
import {
  GENERATION_START_EVENT,
  GENERATION_COMPLETE_EVENT,
  GENERATION_ERROR_EVENT,
  GENERATION_QUEUED_EVENT,
  GENERATION_AGENT_PREVIEW_EVENT,
  PAN_TO_POSITION_EVENT,
  FIT_COMPONENT_NODES_EVENT,
  PRESENCE_BUBBLE_DISMISS_EVENT,
  DEFAULT_COMPONENT_NODE_WIDTH,
  DEFAULT_COMPONENT_NODE_HEIGHT,
  type GenerationStartPayload,
  type GenerationCompletePayload,
  type GenerationErrorPayload,
  type GenerationQueuedPayload,
  type GenerationAgentPreviewPayload,
  type PresenceBubbleDismissPayload,
} from '../lib/constants';

export interface UseCanvasPresenceBubblesParams {
  coord: GenerationCoordination;
  setCenter: (x: number, y: number, options?: { duration?: number; zoom?: number }) => void;
  fitView: (options?: { nodes?: { id: string }[]; duration?: number; padding?: number }) => void;
}

export interface UseCanvasPresenceBubblesResult {
  canvasPresenceBubbles: CanvasPresenceBubble[];
  getCanvasPresenceBubblePosition: (
    bubble: CanvasPresenceBubble,
    sourceNodes?: Node[],
  ) => { x: number; y: number } | null;
  handleCanvasPresenceBubbleClick: (bubble: CanvasPresenceBubble) => void;
}

export function useCanvasPresenceBubbles({
  coord,
  setCenter,
  fitView,
}: UseCanvasPresenceBubblesParams): UseCanvasPresenceBubblesResult {
  const [canvasPresenceBubbles, setCanvasPresenceBubbles] = useState<CanvasPresenceBubble[]>([]);
  const canvasPresenceBubblesRef = useRef<CanvasPresenceBubble[]>([]);

  useEffect(() => {
    canvasPresenceBubblesRef.current = canvasPresenceBubbles;
  }, [canvasPresenceBubbles]);

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

      const parentNode = coord.getNodes().find(
        (n) => n.type === 'component' && (n.data.componentId as string)?.includes(componentId),
      );
      const childNodes = coord.getNodes().filter(
        (n) =>
          (n.type === 'iteration' || n.type === 'skeleton') &&
          parentNode &&
          n.data.parentNodeId === parentNode.id,
      );

      const nodeIds = [
        ...(parentNode ? [parentNode.id] : []),
        ...childNodes.map((n) => n.id),
      ];

      if (nodeIds.length > 0) {
        fitView({ nodes: nodeIds.map((id) => ({ id })), duration: 400, padding: 0.15 });
      }
    };
    window.addEventListener(FIT_COMPONENT_NODES_EVENT, handler);
    return () => window.removeEventListener(FIT_COMPONENT_NODES_EVENT, handler);
  }, [coord, fitView]);

  return {
    canvasPresenceBubbles,
    getCanvasPresenceBubblePosition,
    handleCanvasPresenceBubbleClick,
  };
}
