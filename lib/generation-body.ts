import { useModelSettingsStore } from './model-settings-store';

/**
 * Build the request body fields for generation API calls.
 * Usage: `{ ...basePayload, ...getProviderFields() }`
 */
export function getProviderFields(): Record<string, unknown> {
  const { activeProvider, claudeCodeOptions } = useModelSettingsStore.getState();

  const fields: Record<string, unknown> = { provider: activeProvider };

  if (claudeCodeOptions.effort) fields.effort = claudeCodeOptions.effort;
  if (claudeCodeOptions.maxBudgetUsd != null) fields.maxBudgetUsd = claudeCodeOptions.maxBudgetUsd;
  if (claudeCodeOptions.maxTurns != null) fields.maxTurns = claudeCodeOptions.maxTurns;
  fields.claudeDetailedStdout = claudeCodeOptions.detailedStdout;

  return fields;
}
