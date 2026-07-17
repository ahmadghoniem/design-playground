import { useCallback, useState } from "react";
import {
  loadSelectedModel,
  saveSelectedModel,
} from "@pg/shared/ui/iterate-dialog/parts";
import { resolveAgentModel } from "@pg/shared/lib/resolve-agent-model";
import type { ModelOption } from "@pg/shared/ui/iterate-dialog/parts";

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
  const [model, setModel] = useState(
    () => resolveAgentModel(loadSelectedModel()) ?? "auto",
  );

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
