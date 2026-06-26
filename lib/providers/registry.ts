import type { ProviderId, ProviderConfig } from './types';
import { cursorProvider } from './cursor';
import { claudeCodeProvider } from './claude-code';
import { codexProvider } from './codex';

// ---------------------------------------------------------------------------
// Provider Registry
// ---------------------------------------------------------------------------

const PROVIDERS = new Map<ProviderId, ProviderConfig>([
  [cursorProvider.id, cursorProvider],
  [claudeCodeProvider.id, claudeCodeProvider],
  [codexProvider.id, codexProvider],
]);

export const DEFAULT_PROVIDER_ID: ProviderId = 'claude-code';

// ---------------------------------------------------------------------------
// Provider visibility feature flag
// ---------------------------------------------------------------------------

/**
 * Feature flag: when false, only Claude Code is surfaced in the UI. Cursor and
 * Codex stay fully implemented (registry, spawn logic, options) and can be
 * re-enabled by flipping this to true — nothing is deleted, just hidden.
 */
export const SHOW_ALL_PROVIDERS = false;

/** Provider IDs shown in the UI, in tab order. Gated by SHOW_ALL_PROVIDERS. */
const VISIBLE_PROVIDER_IDS: readonly ProviderId[] = SHOW_ALL_PROVIDERS
  ? ['claude-code', 'cursor', 'codex']
  : ['claude-code'];

/** Get a provider config by ID. Throws if the ID is not registered. */
export function getProvider(id: ProviderId): ProviderConfig {
  const config = PROVIDERS.get(id);
  if (!config) {
    throw new Error(`Unknown provider: ${id}`);
  }
  return config;
}

/** Get all registered provider configs. */
export function getAllProviders(): ProviderConfig[] {
  return Array.from(PROVIDERS.values());
}

/** Get all registered provider IDs. */
export function getAllProviderIds(): ProviderId[] {
  return Array.from(PROVIDERS.keys());
}

/** Get provider configs visible in the UI (gated by SHOW_ALL_PROVIDERS), in tab order. */
export function getVisibleProviders(): ProviderConfig[] {
  return VISIBLE_PROVIDER_IDS.map((id) => getProvider(id));
}

/** Get provider IDs visible in the UI (gated by SHOW_ALL_PROVIDERS), in tab order. */
export function getVisibleProviderIds(): ProviderId[] {
  return [...VISIBLE_PROVIDER_IDS];
}
