import { getProvider } from './providers/registry';
import type { ProviderId } from './providers/types';

/**
 * Resolves the human-readable label shown on a presence bubble, e.g.
 * "Claude Code (sonnet)". Cursor bubbles show the raw model name with no
 * provider prefix, since the model name alone is already meaningful there.
 *
 * Shared by the header's presence row and the canvas's presence overlay so
 * both surfaces render identical labels.
 */
export function resolveBubbleDisplayName(model: string, provider: ProviderId): string {
  if (provider === 'cursor') return model;
  const config = getProvider(provider);
  const modelLabel = model && model !== 'auto' ? model : 'default';
  return `${config.displayName} (${modelLabel})`;
}
