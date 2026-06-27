'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { X } from 'lucide-react';
import { getModelIconConfig } from '../../lib/model-icons';
import { DEFAULT_PROVIDER_ID } from '../../lib/providers/registry';
import { resolveBubbleDisplayName } from '../../lib/presence-display-name';
import { cn } from '../../lib/utils';
import type { ProviderId } from '../../lib/providers/types';

// ---------------------------------------------------------------------------
// PlaygroundHeaderPresence
// ---------------------------------------------------------------------------
// The presence-bubble row shown in the header: one bubble per in-flight or
// recently-finished generation, with hover-to-cancel/dismiss and an
// agent-stream-preview tooltip for Claude Code / Codex. Pure render — all
// state lives in the caller (PlaygroundHeader), which owns the bubble list
// lifecycle (queue/start/complete/error events).
// ---------------------------------------------------------------------------

export interface PresenceBubble {
  id: string;
  componentId: string;
  model: string;
  provider?: string;
  status: 'queued' | 'generating' | 'done';
  flowPosition: { x: number; y: number } | null;
  targetNodeId?: string | null;
  /** Distinguishes adopt operations from normal generation */
  type?: 'iterate' | 'edit' | 'adopt';
  /** Live assistant text from Claude Code stream-json (not persisted) */
  agentPreviewText?: string;
}

export interface PlaygroundHeaderPresenceProps {
  bubbles: PresenceBubble[];
  onBubbleClick: (bubble: PresenceBubble) => void;
  onBubbleRemove: (bubble: PresenceBubble) => void;
}

export default function PlaygroundHeaderPresence({
  bubbles,
  onBubbleClick,
  onBubbleRemove,
}: PlaygroundHeaderPresenceProps) {
  if (bubbles.length === 0) return null;

  return (
    <div className="flex items-center ml-1.5 gap-0.5">
      {bubbles.map((bubble) => {
        const bubbleProvider = (bubble.provider ?? DEFAULT_PROVIDER_ID) as ProviderId;
        const iconConfig = getModelIconConfig(bubble.model, bubbleProvider);
        const displayName = resolveBubbleDisplayName(bubble.model, bubbleProvider);
        const tooltipText = bubble.status === 'queued'
          ? 'Queued — will run after current generation'
          : bubble.type === 'adopt'
            ? `Adopting — ${displayName}`
            : `${displayName} — ${bubble.status}`;

        const showAgentStreamTooltip =
          (bubbleProvider === 'claude-code' || bubbleProvider === 'codex') &&
          (bubble.status === 'generating' ||
            (bubble.status === 'done' && Boolean(bubble.agentPreviewText?.trim())));

        return (
          <Tooltip key={bubble.id} delayDuration={showAgentStreamTooltip ? 280 : undefined}>
            <TooltipTrigger asChild>
              <div
                className="presence-bubble group"
                data-status={bubble.status}
                onClick={() => onBubbleClick(bubble)}
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
                {bubble.status === 'done' && (
                  <div className="presence-bubble-dot" />
                )}
                {/* Cancel / remove on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBubbleRemove(bubble);
                  }}
                  className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white border border-stone-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={bubble.status === 'generating' ? 'Cancel generation' : bubble.status === 'queued' ? 'Remove from queue' : 'Dismiss'}
                >
                  <X className="w-2 h-2 text-stone-500" />
                </button>
              </div>
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
                        ? `Adopting — ${displayName}`
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
        );
      })}
    </div>
  );
}
