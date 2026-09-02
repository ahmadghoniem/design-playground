import { useModelSettingsStore } from '@pg/shared/stores/model-settings-store';

export function getClaudeCodeFields(): Record<string, unknown> {
  const { claudeCodeOptions } = useModelSettingsStore.getState();

  const fields: Record<string, unknown> = {};

  if (claudeCodeOptions.effort) fields.effort = claudeCodeOptions.effort;
  fields.claudeDetailedStdout = claudeCodeOptions.detailedStdout;

  return fields;
}
