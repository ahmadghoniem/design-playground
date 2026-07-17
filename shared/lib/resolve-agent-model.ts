import { AGENT_DEFAULT_ENABLED_MODELS } from './agent-config';
import { migrateModelId } from './model-catalog';

/**
 * Map client model selection to a value the Claude Code CLI accepts.
 * `auto` is not a valid Claude Code model id — fall back to the first default.
 */
export function resolveAgentModel(model?: string | null): string | undefined {
  const trimmed = model?.trim();
  const migrated = trimmed ? migrateModelId(trimmed) : trimmed;

  if (!migrated || migrated === 'auto') {
    return AGENT_DEFAULT_ENABLED_MODELS[0];
  }
  return migrated;
}
