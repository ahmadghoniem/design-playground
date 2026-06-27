'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GENERATION_START_EVENT,
  GENERATION_COMPLETE_EVENT,
  GENERATION_ERROR_EVENT,
  GENERATION_QUEUED_EVENT,
  GENERATION_AGENT_PREVIEW_EVENT,
  PAN_TO_POSITION_EVENT,
  FIT_COMPONENT_NODES_EVENT,
  PRESENCE_BUBBLE_DISMISS_EVENT,
  PRESENCE_BUBBLES_STORAGE_KEY,
  type GenerationStartPayload,
  type GenerationErrorPayload,
  type GenerationQueuedPayload,
  type GenerationAgentPreviewPayload,
  type PresenceBubbleDismissPayload,
} from '../lib/constants';
import type { PresenceBubble } from '../components/canvas/PlaygroundHeaderPresence';

// ---------------------------------------------------------------------------
// usePresenceBubbles
// ---------------------------------------------------------------------------
// Owns the header's presence-bubble list end to end: hydration from/persistence
// to localStorage, the generation-lifecycle window-event listeners that
// create/update/remove bubbles, and the click/remove/cancel handlers the
// presence row needs. The header just renders whatever this returns.
// ---------------------------------------------------------------------------

export interface UsePresenceBubblesReturn {
  bubbles: PresenceBubble[];
  /** Pan/fit to a bubble's target, and dismiss it once it's no longer in flight. */
  handleBubbleClick: (bubble: PresenceBubble) => void;
  /** Cancel an in-flight generation (if any), remove the bubble, and notify the canvas. */
  handleBubbleRemove: (bubble: PresenceBubble) => void;
}

export function usePresenceBubbles(): UsePresenceBubblesReturn {
  const [bubbles, setBubbles] = useState<PresenceBubble[]>([]);
  const removeTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Hydrate presence bubbles from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRESENCE_BUBBLES_STORAGE_KEY);
      if (stored) {
        const stored_bubbles = JSON.parse(stored) as PresenceBubble[];
        // On reload, drop queued bubbles (queue state is lost), keep generating and done
        setBubbles(stored_bubbles.filter((b) => b.status !== 'queued'));
      }
    } catch { /* ignore */ }
  }, []);

  // Persist presence bubbles to localStorage (omit large live preview text)
  useEffect(() => {
    try {
      const storable = bubbles.map(({ agentPreviewText: _omit, ...rest }) => rest);
      localStorage.setItem(PRESENCE_BUBBLES_STORAGE_KEY, JSON.stringify(storable));
    } catch { /* ignore */ }
  }, [bubbles]);

  // Listen to generation lifecycle events
  useEffect(() => {
    const handleQueued = (e: Event) => {
      const detail = (e as CustomEvent<GenerationQueuedPayload>).detail;
      const id = `${detail.componentId}-queued-${Date.now()}`;
      const bubble: PresenceBubble = {
        id,
        componentId: detail.componentId,
        model: detail.model || 'auto',
        provider: detail.provider,
        status: 'queued',
        flowPosition: detail.flowPosition ?? null,
        targetNodeId: detail.targetNodeId ?? null,
      };
      setBubbles((prev) => [...prev, bubble]);
    };

    const handleStart = (e: Event) => {
      const detail = (e as CustomEvent<GenerationStartPayload>).detail;
      const bubbleType = detail.adoptionMode ? 'adopt' as const : detail.editMode ? 'edit' as const : 'iterate' as const;

      setBubbles((prev) => {
        // Try to transition a queued bubble for this component
        const queuedIdx = prev.findIndex(
          (b) => b.status === 'queued' && b.id.startsWith(detail.componentId)
        );

        if (queuedIdx !== -1) {
          return prev.map((b, i) =>
            i === queuedIdx
              ? {
                  ...b,
                  status: 'generating' as const,
                  model: detail.model || b.model,
                  provider: detail.provider ?? b.provider,
                  flowPosition: detail.flowPosition ?? b.flowPosition,
                  targetNodeId: detail.targetNodeId ?? detail.parentNodeId ?? b.targetNodeId ?? null,
                  type: bubbleType,
                  agentPreviewText: undefined,
                }
              : b
          );
        }

        // No queued bubble — create a new one
        const id = `${detail.componentId}-${Date.now()}`;
        const bubble: PresenceBubble = {
          id,
          componentId: detail.componentId,
          model: detail.model || 'auto',
          provider: detail.provider,
          status: 'generating',
          flowPosition: detail.flowPosition ?? null,
          targetNodeId: detail.targetNodeId ?? detail.parentNodeId ?? null,
          type: bubbleType,
          agentPreviewText: undefined,
        };
        return [...prev, bubble];
      });
    };

    const handleComplete = (e: Event) => {
      const detail = (e as CustomEvent<{ componentId: string }>).detail;
      setBubbles((prev) =>
        prev.map((b) =>
          b.status === 'generating' && b.id.startsWith(detail.componentId)
            ? { ...b, status: 'done' as const }
            : b
        )
      );
    };

    const handleError = (e: Event) => {
      const detail = (e as CustomEvent<{ componentId: string; error?: string }>).detail;
      setBubbles((prev) => {
        // Cancel uses an empty componentId — only drop the active generation bubble.
        // startsWith('') would otherwise match every queued/generating bubble.
        if (!detail.componentId && detail.error === 'Cancelled by user') {
          return prev.filter((b) => b.status !== 'generating');
        }
        if (!detail.componentId) return prev;
        return prev.filter(
          (b) =>
            !(
              (b.status === 'generating' || b.status === 'queued') &&
              b.id.startsWith(detail.componentId)
            ),
        );
      });
    };

    const handleAgentPreview = (e: Event) => {
      const d = (e as CustomEvent<GenerationAgentPreviewPayload>).detail;
      setBubbles((prev) =>
        prev.map((b) =>
          b.componentId === d.componentId &&
          (b.status === 'generating' || b.status === 'done')
            ? { ...b, agentPreviewText: d.text }
            : b,
        ),
      );
    };

    window.addEventListener(GENERATION_QUEUED_EVENT, handleQueued);
    window.addEventListener(GENERATION_START_EVENT, handleStart);
    window.addEventListener(GENERATION_COMPLETE_EVENT, handleComplete);
    window.addEventListener(GENERATION_ERROR_EVENT, handleError);
    window.addEventListener(GENERATION_AGENT_PREVIEW_EVENT, handleAgentPreview);
    return () => {
      window.removeEventListener(GENERATION_QUEUED_EVENT, handleQueued);
      window.removeEventListener(GENERATION_START_EVENT, handleStart);
      window.removeEventListener(GENERATION_COMPLETE_EVENT, handleComplete);
      window.removeEventListener(GENERATION_ERROR_EVENT, handleError);
      window.removeEventListener(GENERATION_AGENT_PREVIEW_EVENT, handleAgentPreview);
      // Clean up timers
      for (const timer of removeTimersRef.current.values()) clearTimeout(timer);
      removeTimersRef.current.clear();
    };
  }, []);

  const dismissBubbleEverywhere = useCallback((bubble: PresenceBubble) => {
    window.dispatchEvent(
      new CustomEvent<PresenceBubbleDismissPayload>(PRESENCE_BUBBLE_DISMISS_EVENT, {
        detail: {
          componentId: bubble.componentId,
          flowPosition: bubble.flowPosition,
          targetNodeId: bubble.targetNodeId ?? null,
        },
      }),
    );
  }, []);

  const removeBubbleById = useCallback((id: string) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id));
    const timer = removeTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      removeTimersRef.current.delete(id);
    }
  }, []);

  const handleBubbleClick = useCallback((bubble: PresenceBubble) => {
    if (bubble.flowPosition || bubble.targetNodeId) {
      window.dispatchEvent(
        new CustomEvent(PAN_TO_POSITION_EVENT, {
          detail: {
            x: bubble.flowPosition?.x,
            y: bubble.flowPosition?.y,
            componentId: bubble.componentId,
            targetNodeId: bubble.targetNodeId ?? null,
          },
        }),
      );
    } else {
      window.dispatchEvent(
        new CustomEvent(FIT_COMPONENT_NODES_EVENT, { detail: { componentId: bubble.componentId } }),
      );
    }
    // Don't dismiss while the generation is still running or queued — only navigate to it.
    if (bubble.status === 'generating' || bubble.status === 'queued') return;
    removeBubbleById(bubble.id);
    dismissBubbleEverywhere(bubble);
  }, [removeBubbleById, dismissBubbleEverywhere]);

  const handleCancelGeneration = useCallback(async () => {
    try {
      await fetch('/playground/api/generate', { method: 'DELETE' });
      window.dispatchEvent(new CustomEvent<GenerationErrorPayload>(GENERATION_ERROR_EVENT, {
        detail: { componentId: '', parentNodeId: '', error: 'Cancelled by user' },
      }));
    } catch (error) {
      console.error('Error cancelling generation:', error);
    }
  }, []);

  const handleBubbleRemove = useCallback((bubble: PresenceBubble) => {
    if (bubble.status === 'generating') {
      handleCancelGeneration();
    }
    removeBubbleById(bubble.id);
    dismissBubbleEverywhere(bubble);
  }, [handleCancelGeneration, removeBubbleById, dismissBubbleEverywhere]);

  return { bubbles, handleBubbleClick, handleBubbleRemove };
}
