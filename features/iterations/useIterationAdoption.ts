import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useReactFlow } from "@xyflow/react";
import { generateAdoptPrompt } from "@pg/features/iterations/adopt-prompt";
import { getClaudeCodeFields } from "@pg/shared/lib/generation-body";
import {
  generationEvents,
} from "@pg/shared/lib/generation-events";

// ---------------------------------------------------------------------------
// useIterationAdoption
//
// Owns the full adoption lifecycle for an iteration node:
//   - open/close the confirm dialog
//   - POST to /playground/api/generate with the adopt prompt
//   - update node data + toast
//
// Interface:
//   openAdoptConfirm()    — show the confirm dialog
//   handleAdoptConfirm()  — perform the API call
//   adoptionStatus        — 'idle' | 'adopting' | 'adopted' | 'error'
//   showAdoptConfirm      — whether the dialog is open
//   setShowAdoptConfirm   — close the dialog
// ---------------------------------------------------------------------------

export interface UseIterationAdoptionParams {
  id: string;
  registryId: string;
  isGlobalGenerating: boolean;
  data: {
    componentName: string;
    parentNodeId: string;
    filename: string;
    adopted?: boolean;
  };
}

export function useIterationAdoption({
  id,
  registryId,
  isGlobalGenerating,
  data,
}: UseIterationAdoptionParams) {
  const [adoptionStatus, setAdoptionStatus] = useState<
    "idle" | "adopting" | "adopted" | "error"
  >(() => (data.adopted ? "adopted" : "idle"));
  const [showAdoptConfirm, setShowAdoptConfirm] = useState(false);

  const { updateNodeData } = useReactFlow();

  const openAdoptConfirm = useCallback(() => {
    setShowAdoptConfirm(true);
  }, []);

  const handleAdoptConfirm = useCallback(async () => {
    setShowAdoptConfirm(false);
    // The button's disabled prop also checks this, but that state is
    // event-driven and resets on reload — guard here so a stale-enabled
    // button can't start a second generation (server would 409 anyway).
    if (isGlobalGenerating) {
      toast.info("Generation in progress — wait for it to finish");
      return;
    }
    setAdoptionStatus("adopting");

    const toastId = `adopt-${id}`;

    // Generate the adopt prompt
    const adoptPrompt = generateAdoptPrompt(registryId, data.filename);

    const componentId = registryId;

    // Dispatch start event (editMode prevents skeleton nodes)
    generationEvents.start.emit({
      componentId,
      componentName: data.componentName,
      parentNodeId: data.parentNodeId,
      iterationCount: 0,
      editMode: true,
    });

    try {
      const response = await fetch("/playground/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: adoptPrompt,
          componentId: `adopt-${componentId}`,
          source: "adopt",
          ...getClaudeCodeFields(),
        }),
      });

      const result = await response
        .json()
        .catch(() => ({ success: false, error: "Invalid response" }));

      if (!response.ok || !result.success) {
        const errorMsg = result?.error || "Adoption failed";
        generationEvents.error.emit({
          componentId,
          parentNodeId: data.parentNodeId,
          error: errorMsg,
        });
        toast.error(`Adoption failed: ${errorMsg}`, {
          id: toastId,
          duration: 6000,
        });
        setAdoptionStatus("error");
        setTimeout(() => setAdoptionStatus("idle"), 3000);
      } else {
        generationEvents.complete.emit({
          componentId,
          parentNodeId: data.parentNodeId,
          output: result.output || "",
        });
        toast.success(
          "Variation adopted! The original component has been updated.",
          { id: toastId },
        );
        setAdoptionStatus("adopted");
        updateNodeData(id, { adopted: true });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error";
      generationEvents.error.emit({
        componentId,
        parentNodeId: data.parentNodeId,
        error: errorMsg,
      });
      toast.error(`Adoption failed: ${errorMsg}`, {
        id: toastId,
        duration: 6000,
      });
      setAdoptionStatus("error");
      setTimeout(() => setAdoptionStatus("idle"), 3000);
    }
  }, [id, registryId, data, updateNodeData, isGlobalGenerating]);

  return {
    adoptionStatus,
    showAdoptConfirm,
    setShowAdoptConfirm,
    openAdoptConfirm,
    handleAdoptConfirm,
  };
}
