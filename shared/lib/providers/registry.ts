import type { ProviderId, ProviderConfig } from './types';
import { claudeCodeProvider } from './claude-code';

/** Claude Code is the only provider. */
export const DEFAULT_PROVIDER_ID: ProviderId = 'claude-code';

const PROVIDERS = new Map<ProviderId, ProviderConfig>([
  [claudeCodeProvider.id, claudeCodeProvider],
]);

/** Get a provider config by ID. Throws if the ID is not registered. */
export function getProvider(id: ProviderId): ProviderConfig {
  const config = PROVIDERS.get(id);
  if (!config) {
    throw new Error(`Unknown provider: ${id}`);
  }
  return config;
}

/** Registered provider IDs (always just Claude Code). */
export function getAllProviderIds(): ProviderId[] {
  return [DEFAULT_PROVIDER_ID];
}
