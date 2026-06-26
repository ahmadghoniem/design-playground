import type { ProviderId } from './providers/types';
import { getProvider } from './providers/registry';
import { migrateModelId } from './model-catalog';

/**
 * Map client model selection to a value the Claude Code CLI accepts.
 * `auto` is not a valid Claude Code model id — fall back to the first default.
 */
export function resolveAgentModel(
  providerId: ProviderId,
  model?: string | null,
): string | undefined {
  const trimmed = model?.trim();
  const config = getProvider(providerId);
  const migrated = trimmed ? migrateModelId(providerId, trimmed) : trimmed;

  if (!migrated || migrated === 'auto') {
    return config.defaultEnabledModels[0];
  }
  return migrated;
}
