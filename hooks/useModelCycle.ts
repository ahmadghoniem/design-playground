import { useCallback, useState } from "react";
import {
  loadSelectedModel,
  saveSelectedModel,
} from "../nodes/shared/iterate-dialog/parts";
import { resolveAgentModel } from "../lib/resolve-agent-model";
import { useModelSettingsStore } from "../stores/model-settings-store";
import type { ProviderId } from "../lib/providers/types";
import type { ModelOption } from "../nodes/shared/iterate-dialog/parts";

// ---------------------------------------------------------------------------
// useModelCycle
// ---------------------------------------------------------------------------
// The model-selection slice used by the docked chat bar: it owns the selected
// model, persists it, and cycles to the next available model.
// ---------------------------------------------------------------------------

export interface UseModelCycleReturn {
  model: string;
  setModel: (value: string) => void;
  cycleModel: () => void;
}

export function useModelCycle(models: ModelOption[]): UseModelCycleReturn {
  const [model, setModel] = useState(() => {
    const provider = useModelSettingsStore.getState()
      .activeProvider as ProviderId;
    return resolveAgentModel(provider, loadSelectedModel()) ?? "auto";
  });

  const cycleModel = useCallback(() => {
    if (models.length === 0) return;
    const currentIdx = models.findIndex((m) => m.value === model);
    const nextIdx = (currentIdx + 1) % models.length;
    const next = models[nextIdx].value;

    setModel(next);
    saveSelectedModel(next);
  }, [models, model]);

  return { model, setModel, cycleModel };
}
