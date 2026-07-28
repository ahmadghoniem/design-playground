import { useModelSettingsStore } from '@pg/shared/stores/model-settings-store';

/**
 * Build the Claude Code request-body fields for generation API calls.
 * Usage: `{ ...basePayload, ...getClaudeCodeFields() }`
 */
export function getClaudeCodeFields(): Record<string, unknown> {
  const { claudeCodeOptions } = useModelSettingsStore.getState();

  const fields: Record<string, unknown> = {};

  if (claudeCodeOptions.effort) fields.effort = claudeCodeOptions.effort;
  if (claudeCodeOptions.maxBudgetUsd != null) fields.maxBudgetUsd = claudeCodeOptions.maxBudgetUsd;
  fields.claudeDetailedStdout = claudeCodeOptions.detailedStdout;

  return fields;
}
