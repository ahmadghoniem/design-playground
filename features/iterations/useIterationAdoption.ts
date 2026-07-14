import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useReactFlow } from "@xyflow/react";
import { generateAdoptPrompt } from "@pg/registry";
import { getProviderFields } from "@pg/shared/lib/generation-body";
import {
  generationEvents,
} from "@pg/shared/lib/generation-events";
import {
  EDIT_COMPLETE_EVENT,
  ADOPTION_COMPLETE_EVENT,
  ADOPTION_ERROR_EVENT,
  FIT_COMPONENT_NODES_EVENT,
  type GenerationStartPayload,
  type GenerationCompletePayload,
  type GenerationErrorPayload,
  type AdoptionCompletePayload,
  type AdoptionErrorPayload,
} from "@pg/shared/lib/constants";

// ---------------------------------------------------------------------------
// useIterationAdoption
//
// Owns the full adoption lifecycle for an iteration node:
//   - open/close the confirm dialog
//   - POST to /playground/api/generate with the adopt prompt
//   - dispatch ADOPTION_COMPLETE / ADOPTION_ERROR events
//   - update node data + toast
//
// Interface:
//   openAdoptConfirm()    — show the confirm dialog + start thumbnail capture
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
    onAdopt?: (filename: string, componentName: string) => void;
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
      ...(getProviderFields() as Pick<
        GenerationStartPayload,
        "model" | "provider"
      >),
    });

    try {
      const response = await fetch("/playground/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: adoptPrompt,
          componentId: `adopt-${componentId}`,
          source: "adopt",
          ...getProviderFields(),
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
        window.dispatchEvent(
          new CustomEvent<AdoptionErrorPayload>(ADOPTION_ERROR_EVENT, {
            detail: {
              iterationNodeId: id,
              componentId,
              parentNodeId: data.parentNodeId,
              error: errorMsg,
            },
          }),
        );
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
        window.dispatchEvent(
          new CustomEvent<AdoptionCompletePayload>(ADOPTION_COMPLETE_EVENT, {
            detail: {
              iterationNodeId: id,
              componentId,
              parentNodeId: data.parentNodeId,
            },
          }),
        );
        toast.success(
          "Variation adopted! The original component has been updated.",
          { id: toastId },
        );
        setAdoptionStatus("adopted");
        updateNodeData(id, { adopted: true });
        data.onAdopt?.(data.filename, data.componentName);

        // Pan canvas to the original (parent) component so the user sees the update
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent(FIT_COMPONENT_NODES_EVENT, {
              detail: { componentId },
            }),
          );
        }, 600);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error";
      generationEvents.error.emit({
        componentId,
        parentNodeId: data.parentNodeId,
        error: errorMsg,
      });
      window.dispatchEvent(
        new CustomEvent<AdoptionErrorPayload>(ADOPTION_ERROR_EVENT, {
          detail: {
            iterationNodeId: id,
            componentId,
            parentNodeId: data.parentNodeId,
            error: errorMsg,
          },
        }),
      );
      toast.error(`Adoption failed: ${errorMsg}`, {
        id: toastId,
        duration: 6000,
      });
      setAdoptionStatus("error");
      setTimeout(() => setAdoptionStatus("idle"), 3000);
    }
  }, [id, registryId, data, updateNodeData]);

  return {
    adoptionStatus,
    showAdoptConfirm,
    setShowAdoptConfirm,
    openAdoptConfirm,
    handleAdoptConfirm,
  };
}
