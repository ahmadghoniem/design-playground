/**
 * Model selection, shared by every surface that lets you pick one:
 *   - loadSelectedModel / saveSelectedModel (localStorage)
 *   - useAvailableModels hook
 *
 * Consumers: ModelSettingsModal, DockedChatBar, useSelectedModel.
 */

import { useEffect } from "react";
import { useModelSettingsStore } from "@pg/shared/stores/model-settings-store";
import { AGENT_DEFAULT_ENABLED_MODELS } from "@pg/shared/lib/agent-config";
import { resolveAgentModel } from "@pg/shared/lib/resolve-agent-model";
import { migrateModelId, isModelEnabled } from "@pg/shared/lib/model-catalog";

export type { ModelOption } from "@pg/shared/lib/constants";

const SELECTED_MODEL_STORAGE_KEY = 'playground-selected-model';

// Legacy provider-scoped key written by older builds; still read for migration.
const LEGACY_SCOPED_KEY = `${SELECTED_MODEL_STORAGE_KEY}-claude-code`;

export function loadSelectedModel(): string {
  if (typeof window === "undefined") return "";
  try {
    let model =
      localStorage.getItem(SELECTED_MODEL_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_SCOPED_KEY) ||
      "";

    const rawModel = model;
    model = migrateModelId(model);

    if (model) {
      const enabled = useModelSettingsStore.getState().enabledModels;
      const enabledModels = enabled.length ? enabled : AGENT_DEFAULT_ENABLED_MODELS;
      if (!isModelEnabled(model, enabledModels)) {
        model = enabledModels[0] || "";
      }
    }

    if (model && model !== rawModel) {
      saveSelectedModel(model);
    }

    return resolveAgentModel(model) ?? model;
  } catch {
    return "";
  }
}

export function saveSelectedModel(model: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, model);
  } catch (e) {
    console.error("[Models] Error saving selected model:", e);
  }
}

export function useAvailableModels() {
  const hasHydrated = useModelSettingsStore((s) => s.hasHydrated);
  const availableModels = useModelSettingsStore((s) => s.availableModels);
  const enabledModels = useModelSettingsStore((s) => s.enabledModels);
  const hasFetched = useModelSettingsStore((s) => s.hasFetched);
  const isLoading = useModelSettingsStore((s) => s.isLoadingModels);
  const fetchModels = useModelSettingsStore((s) => s.fetchModels);

  useEffect(() => {
    if (hasHydrated && !hasFetched) fetchModels();
  }, [hasHydrated, hasFetched, fetchModels]);

  const models =
    enabledModels.length === 0
      ? availableModels.filter((m) => AGENT_DEFAULT_ENABLED_MODELS.includes(m.value))
      : availableModels.filter((m) => isModelEnabled(m.value, enabledModels));

  return { models, allModels: availableModels, isLoading };
}
