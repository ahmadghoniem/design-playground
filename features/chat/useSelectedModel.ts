import { useCallback, useState } from "react";
import {
  loadSelectedModel,
  saveSelectedModel,
} from "@pg/shared/lib/model-selection";
import { resolveAgentModel } from "@pg/shared/lib/resolve-agent-model";


export interface UseSelectedModelReturn {
  model: string;
  setModel: (value: string) => void;
}

export function useSelectedModel(): UseSelectedModelReturn {
  const [model, setModelState] = useState(
    () => resolveAgentModel(loadSelectedModel()) ?? "auto",
  );

  const setModel = useCallback((value: string) => {
    setModelState(value);
    saveSelectedModel(value);
  }, []);

  return { model, setModel };
}
