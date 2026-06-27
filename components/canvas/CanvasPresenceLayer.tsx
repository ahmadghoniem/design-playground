import { useViewport, type Node } from '@xyflow/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { DEFAULT_PROVIDER_ID } from '../../lib/providers/registry';
import { getModelIconConfig } from '../../lib/model-icons';
import { resolveBubbleDisplayName as resolveCanvasBubbleDisplayName } from '../../lib/presence-display-name';
import type { ProviderId } from '../../lib/providers/types';
import { cn } from '../../lib/utils';

export interface CanvasPresenceBubble {
  id: string;
  componentId: string;
  model: string;
  provider?: ProviderId;
  status: 'queued' | 'generating' | 'done';
  flowPosition: { x: number; y: number } | null;
  targetNodeId?: string | null;
  nodeOffset?: { x: number; y: number } | null;
  type?: 'iterate' | 'edit' | 'adopt';
  agentPreviewText?: string;
}

/**
 * Presence-bubble overlay, extracted from PlaygroundCanvas so that ONLY this
 * layer re-renders on pan/zoom. It owns the `useViewport()` subscription; the
 * parent no longer subscribes, so dragging the canvas no longer re-renders the
 * whole (very large) PlaygroundCanvas tree every frame.
 */
export default function CanvasPresenceLayer({
  bubbles,
  nodes,
  getPosition,
  onBubbleClick,
}: {
  bubbles: CanvasPresenceBubble[];
  nodes: Node[];
  getPosition: (bubble: CanvasPresenceBubble, sourceNodes?: Node[]) => { x: number; y: number } | null;
  onBubbleClick: (bubble: CanvasPresenceBubble) => void;
}) {
  const viewport = useViewport();
  if (bubbles.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[7]">
      {bubbles.map((bubble) => {
        const currentPosition = getPosition(bubble, nodes);
        if (!currentPosition) return null;
        const screenX = currentPosition.x * viewport.zoom + viewport.x;
        const screenY = currentPosition.y * viewport.zoom + viewport.y;
        const provider = (bubble.provider ?? DEFAULT_PROVIDER_ID) as ProviderId;
        const iconConfig = getModelIconConfig(bubble.model, provider);
        const displayName = resolveCanvasBubbleDisplayName(bubble.model, provider);
        const tooltipText = bubble.status === 'queued'
          ? 'Queued - will run after current generation'
          : bubble.type === 'adopt'
            ? `Adopting - ${displayName}`
            : `${displayName} - ${bubble.status}`;
        const showAgentStreamTooltip =
          (bubble.status === 'generating' ||
            (bubble.status === 'done' && Boolean(bubble.agentPreviewText?.trim())));
        return (
          <div
            key={bubble.id}
            className="absolute"
            style={{
              left: screenX,
              top: screenY,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <Tooltip delayDuration={showAgentStreamTooltip ? 280 : undefined}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="presence-bubble group pointer-events-auto border-0 bg-transparent p-0"
                  data-status={bubble.status}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onBubbleClick(bubble);
                  }}
                >
                  {bubble.status === 'generating' && (
                    <div className={bubble.type === 'adopt' ? 'presence-bubble-spinner--adopt' : 'presence-bubble-spinner'} />
                  )}
                  <div
                    className="presence-bubble-face"
                    style={{
                      backgroundColor: iconConfig.bg,
                      backgroundImage: `url(${iconConfig.src})`,
                    }}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={12}
                className={cn(
                  showAgentStreamTooltip
                    ? 'w-[min(22rem,calc(100vw-2rem))] p-0 border border-stone-200/80 bg-[#fbfbfb] text-stone-800 shadow-[0_20px_48px_-22px_rgba(28,25,23,0.38)] pointer-events-auto overflow-hidden rounded-2xl'
                    : 'text-xs',
                )}
              >
                {showAgentStreamTooltip ? (
                  <>
                    <div className="border-b border-stone-200/70 px-3.5 py-2.5 text-[11px] font-semibold tracking-[-0.01em] text-stone-600 bg-gradient-to-b from-white to-stone-50/80">
                      {bubble.status === 'done'
                        ? `${displayName} · done`
                        : bubble.type === 'adopt'
                          ? `Adopting - ${displayName}`
                          : displayName}
                    </div>
                    <div
                      className="max-h-48 min-h-[3.25rem] overflow-y-auto overscroll-y-contain px-3.5 py-3 text-[12px] leading-5 font-mono text-stone-700 whitespace-pre-wrap break-words bg-[#fbfbfb]"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {bubble.agentPreviewText?.trim()
                        ? bubble.agentPreviewText
                        : 'Waiting for assistant text...'}
                    </div>
                  </>
                ) : (
                  <p>{tooltipText}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
}
