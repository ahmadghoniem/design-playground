import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Node } from "@xyflow/react";
import { getProviderFields } from "@pg/shared/lib/generation-body";
import { DEFAULT_PROVIDER_ID } from "@pg/shared/lib/providers/registry";
import { resolveAgentModel } from "@pg/shared/lib/resolve-agent-model";
import type { ProviderId } from "@pg/shared/lib/providers/types";
import { loadDefaultSkillPrompt } from "@pg/shared/lib/load-default-skill-prompt";
import {
  generateIterationPrompt,
  generateIterationFromIterationPrompt,
  generateElementIterationPrompt,
  generateElementIterationFromIterationPrompt,
  resolveRegistryItem,
} from "@pg/registry";
import {
  formatReferenceNodesSection,
  formatSkillSection,
  formatCustomInstructionsSection,
  getStylingConstraint,
} from "@pg/shared/lib/prompts/shared-sections";
import { freeformReferencePrompt } from "@pg/features/generation/prompts/freeform-reference.prompt";
import { editPrompt } from "@pg/features/generation/prompts/edit.prompt";
import { iterationsFile } from "@pg/shared/lib/playground-paths";
import {
  generationEvents,
} from "@pg/shared/lib/generation-events";
import {
  POST_GENERATION_SCAN_DELAY,
  DEFAULT_EMPTY_ITERATION_INSTRUCTIONS,
  DEFAULT_STYLING_MODE,
  CHAT_DEFAULT_COUNT,
  ENABLE_FREEFORM_CHAT,
  canSubmitReferenceOnlyChat,
  EDIT_COMPLETE_EVENT,
  type StylingMode,
  type GenerationStartPayload,
  type GenerationCompletePayload,
  type GenerationErrorPayload,
  type ChatSubmitPayload,
} from "@pg/shared/lib/constants";
import type { GenerationInfo } from "@pg/shared/lib/canvas-persistence";
import type { GenerationCoordination } from "@pg/features/generation/useGenerationCoordination";
import { toast } from "sonner";

export interface UseChatSubmitParams {
  coord: GenerationCoordination;
  getNodeId: () => string;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  scanForIterations: (
    resetTimeoutOnFind?: boolean,
    scanContext?: GenerationInfo | null,
  ) => Promise<void>;
}

export function useChatSubmit({
  coord,
  getNodeId,
  setNodes,
  scanForIterations,
}: UseChatSubmitParams) {
  const generationQueueRef = useRef<ChatSubmitPayload[]>([]);

  const handleChatSubmit = useCallback(
    async (payload: ChatSubmitPayload) => {
      // If generation already in progress, queue it
      if (coord.getIsGenerating()) {
        generationQueueRef.current.push(payload);
        return;
      }

      const chatMode =
        payload.chatMode ?? (payload.editMode ? "edit" : "explore");
      const isRawMode = chatMode === "raw";
      const rawPrompt = payload.text.trim();

      const hasFreeformContext =
        payload.skillPrompts.length > 0 ||
        (payload.referenceNodes?.length ?? 0) > 0;
      if (isRawMode && !rawPrompt && !hasFreeformContext) return;

      const hasTarget =
        payload.targetNodeId &&
        payload.targetComponentId &&
        payload.targetComponentName &&
        payload.targetType;
      if (
        !hasTarget &&
        !ENABLE_FREEFORM_CHAT &&
        !canSubmitReferenceOnlyChat({
          hasEditTarget: false,
          referenceNodeCount: payload.referenceNodes?.length ?? 0,
          skillPromptCount: payload.skillPrompts.length,
          text: payload.text,
        })
      ) {
        return;
      }

      // ── Edit Mode: modify file in-place, no iterations ──
      if (chatMode === "edit" && payload.targetNodeId) {
        const editComponentId = payload.targetComponentId || "edit-mode";
        const editComponentName =
          payload.targetComponentName || editComponentId;
        let filePath: string;

        if (
          payload.targetType === "iteration" &&
          payload.sourceFilename
        ) {
          filePath = iterationsFile(payload.sourceFilename);
        } else {
          const item = resolveRegistryItem(editComponentId);
          filePath =
            item?.sourcePath ||
            iterationsFile(editComponentId);
        }

        // Gather skill prompts (same logic as normal path)
        let editSkillPrompt: string | undefined;
        if (payload.skillPrompts.length > 0) {
          editSkillPrompt = payload.skillPrompts.join("\n\n");
        } else if (!payload.text) {
          const defaultPrompt = await loadDefaultSkillPrompt();
          editSkillPrompt = defaultPrompt || undefined;
        }

        // Build reference nodes section
        let editRefSection = "";
        if (payload.referenceNodes && payload.referenceNodes.length > 0) {
          const refNodes = payload.referenceNodes.filter(
            (n) => n.nodeId !== payload.targetNodeId,
          );
          if (refNodes.length > 0) {
            const refNodesResolved = refNodes.map((node) => {
              if (node.type === "text") {
                const textNode = coord
                  .getNodes()
                  .find((n) => n.id === node.nodeId);
                return {
                  ...node,
                  textContent:
                    ((textNode?.data as Record<string, unknown>)
                      ?.text as string) || "",
                  sourcePath: undefined,
                };
              }
              if (node.type === "image") {
                return {
                  ...node,
                  sourcePath: undefined,
                };
              }
              let sourcePath: string | undefined;
              if (node.type === "component") {
                const regItem = resolveRegistryItem(node.componentId);
                sourcePath = regItem?.sourcePath;
              }
              return {
                ...node,
                sourcePath,
              };
            });
            editRefSection = formatReferenceNodesSection(refNodesResolved);
          }
        }

        const prompt = editPrompt({
          filePath,
          customInstructions: payload.text || "Improve the design",
          skillPrompt: editSkillPrompt,
          referenceNodesSection: editRefSection || undefined,
          elementSelections: payload.elementSelections,
        });

        const editPf = getProviderFields();
        const editProvider = (editPf.provider ??
          DEFAULT_PROVIDER_ID) as ProviderId;
        const editResolvedModel = resolveAgentModel(
          editProvider,
          payload.model,
        );
        // Dispatch generation start to kick off generation tracking
        generationEvents.start.emit({
          componentId: editComponentId,
          componentName: editComponentName,
          parentNodeId: payload.targetNodeId,
          iterationCount: 0,
          model: editResolvedModel,
          provider: editPf.provider as GenerationStartPayload["provider"],
          flowPosition: payload.canvasPosition,
          targetNodeId: payload.targetNodeId,
          editMode: true,
        });

        try {
          const response = await fetch("/playground/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              componentId: editComponentId,
              model: editResolvedModel,
              source: "chat_edit",
              skillIds: payload.skillIds,
              ...getProviderFields(),
            }),
          });
          const data = await response.json().catch(() => ({ success: false }));
          if (!response.ok || !data.success) {
            console.error(
              "[EditMode] Generation failed:",
              data?.error,
              "status:",
              response.status,
              "data:",
              data,
            );
            toast.error(data?.error || `Edit failed (${response.status})`, {
              duration: 6000,
            });
            generationEvents.error.emit({
              componentId: editComponentId,
              parentNodeId: payload.targetNodeId,
              error: data?.error || "Edit failed",
            });
          } else {
            // Tell the targeted node to re-import its freshly-edited component
            // (same filename, so the loader can't detect the change itself).
            window.dispatchEvent(
              new CustomEvent(EDIT_COMPLETE_EVENT, {
                detail: { nodeId: payload.targetNodeId },
              }),
            );
            generationEvents.complete.emit({
              componentId: editComponentId,
              parentNodeId: payload.targetNodeId,
              output: "",
            });
          }
        } catch (err) {
          console.error("[EditMode] Error:", err);
          toast.error(err instanceof Error ? err.message : "Unknown error", {
            duration: 6000,
          });
          generationEvents.error.emit({
            componentId: editComponentId,
            parentNodeId: payload.targetNodeId,
            error: String(err),
          });
        }
        return;
      }

      const {
        text,
        skillPrompts,
        model: payloadModel,
        targetNodeId,
        targetComponentId,
        targetComponentName,
        targetType,
        sourceFilename,
      } = payload;

      const canvasGenPfEarly = getProviderFields();
      const genProvider = (canvasGenPfEarly.provider ??
        DEFAULT_PROVIDER_ID) as ProviderId;
      const resolvedModel = resolveAgentModel(genProvider, payloadModel);

      // Combine skill prompts — explicit skills always apply (including raw / text-only refs)
      let combinedSkillPrompt: string | undefined;
      if (skillPrompts.length > 0) {
        combinedSkillPrompt = skillPrompts.join("\n\n");
      } else if (!isRawMode && !text) {
        // Use default skills only when no explicit skills selected and text is empty
        const defaultPrompt = await loadDefaultSkillPrompt();
        combinedSkillPrompt = defaultPrompt || undefined;
      }

      const customInstructions = isRawMode
        ? rawPrompt
        : text || DEFAULT_EMPTY_ITERATION_INSTRUCTIONS;
      const hasElementSelections = (payload.elementSelections?.length ?? 0) > 0;
      const stylingMode: StylingMode = payload.skillIds?.includes(
        "no-bound-explore",
      )
        ? "inline-css"
        : DEFAULT_STYLING_MODE;

      // Build reference nodes section from canvas selection (text/image/component refs)
      let referenceNodesSection = "";
      if (payload.referenceNodes && payload.referenceNodes.length > 0) {
        // Filter out the target node from references (no need to reference itself)
        const refNodes = payload.referenceNodes.filter(
          (n) => n.nodeId !== targetNodeId,
        );

        if (refNodes.length > 0) {
          const refNodesResolved = refNodes.map((node) => {
            if (node.type === "text") {
              const textNode = coord
                .getNodes()
                .find((n) => n.id === node.nodeId);
              return {
                ...node,
                textContent:
                  ((textNode?.data as Record<string, unknown>)
                    ?.text as string) || "",
                sourcePath: undefined,
              };
            }
            if (node.type === "image") {
              return {
                ...node,
                sourcePath: undefined,
              };
            }
            let sourcePath: string | undefined;
            if (node.type === "component") {
              const item = resolveRegistryItem(node.componentId);
              sourcePath = item?.sourcePath;
            }
            return {
              ...node,
              sourcePath,
            };
          });
          referenceNodesSection = formatReferenceNodesSection(refNodesResolved);
        }
      }

      const canvasGenPf = getProviderFields();

      if (
        targetNodeId &&
        targetComponentId &&
        targetComponentName &&
        targetType
      ) {
        // --- WITH TARGET NODE ---
        let prompt = rawPrompt;
        const componentId = targetComponentId;
        const componentName = targetComponentName;
        const iterationCount = payload.iterationCount ?? CHAT_DEFAULT_COUNT;
        let startNumber = 1;

        if (!isRawMode) {
          // Fetch next available iteration number
          try {
            const cleanName = componentName.replace(/\s+/g, "");
            const response = await fetch("/playground/api/iterations");
            if (response.ok) {
              const { iterations } = await response.json();
              const componentIterations = iterations.filter(
                (i: { componentName: string }) =>
                  i.componentName === cleanName,
              );
              const maxNumber = componentIterations.reduce(
                (max: number, i: { iterationNumber: number }) =>
                  Math.max(max, i.iterationNumber),
                0,
              );
              startNumber = maxNumber + 1;
            }
          } catch {
            /* use default */
          }
        }

        if (!isRawMode && targetType === "iteration" && sourceFilename) {
          // Iterate from iteration
          if (hasElementSelections) {
            prompt = generateElementIterationFromIterationPrompt(
              componentId,
              sourceFilename,
              startNumber,
              iterationCount,
              payload.elementSelections,
              customInstructions,
              combinedSkillPrompt,
              stylingMode,
              referenceNodesSection,
            );
          } else {
            prompt = generateIterationFromIterationPrompt(
              componentId,
              sourceFilename,
              iterationCount,
              startNumber,
              customInstructions,
              combinedSkillPrompt,
              stylingMode,
              referenceNodesSection,
            );
          }
        } else if (!isRawMode) {
          // Component iteration
          if (hasElementSelections) {
            prompt = generateElementIterationPrompt(
              componentId,
              startNumber,
              iterationCount,
              payload.elementSelections,
              customInstructions,
              combinedSkillPrompt,
              stylingMode,
              referenceNodesSection,
            );
          } else {
            prompt = generateIterationPrompt(
              componentId,
              iterationCount,
              startNumber,
              customInstructions,
              combinedSkillPrompt,
              stylingMode,
              referenceNodesSection,
            );
          }
        }

        // Dispatch generation start (creates skeleton nodes)
        generationEvents.start.emit({
          componentId,
          componentName,
          parentNodeId: targetNodeId,
          iterationCount,
          startNumber,
          model: resolvedModel,
          provider:
            canvasGenPf.provider as GenerationStartPayload["provider"],
          flowPosition: payload.canvasPosition,
          targetNodeId,
        });

        // Call the generate API
        try {
          const response = await fetch("/playground/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              componentId,
              iterationCount,
              model: resolvedModel,
              source: "chat",
              skillIds: payload.skillIds,
              ...canvasGenPf,
            }),
          });

          let data;
          try {
            data = await response.json();
          } catch {
            generationEvents.error.emit({
              componentId,
              parentNodeId: targetNodeId,
              error: "Failed to parse response",
            });
            return;
          }

          if (!response.ok || !data.success) {
            const error =
              typeof data?.error === "string"
                ? data.error
                : "Generation failed";
            generationEvents.error.emit({
              componentId,
              parentNodeId: targetNodeId,
              error,
            });
          } else {
            generationEvents.complete.emit({
              componentId,
              parentNodeId: targetNodeId,
              output: "",
            });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          generationEvents.error.emit({
            componentId,
            parentNodeId: targetNodeId,
            error: msg,
          });
        }
      } else {
        // --- FREEFORM (no target) ---
        const freeformComponentId = "chat-freeform";

        // Dispatch start event — creates skeleton node
        generationEvents.start.emit({
          componentId: freeformComponentId,
          componentName: "Freeform",
          parentNodeId: "",
          iterationCount: 0,
          model: resolvedModel,
          provider:
            canvasGenPf.provider as GenerationStartPayload["provider"],
          flowPosition: payload.canvasPosition ?? undefined,
        });

        // Build prompt — freeform-reference template or raw text
        let freeformPrompt: string;
        if (isRawMode) {
          if (referenceNodesSection || combinedSkillPrompt) {
            freeformPrompt = freeformReferencePrompt({
              skillSection: combinedSkillPrompt
                ? formatSkillSection(combinedSkillPrompt)
                : "",
              referenceNodesSection: referenceNodesSection || "",
              customInstructionsSection: formatCustomInstructionsSection(
                rawPrompt || customInstructions,
              ),
              stylingConstraint: getStylingConstraint(stylingMode),
            });
          } else {
            freeformPrompt = rawPrompt;
          }
        } else if (referenceNodesSection) {
          freeformPrompt = freeformReferencePrompt({
            skillSection: combinedSkillPrompt
              ? formatSkillSection(combinedSkillPrompt)
              : "",
            referenceNodesSection,
            customInstructionsSection:
              formatCustomInstructionsSection(customInstructions),
            stylingConstraint: getStylingConstraint(stylingMode),
          });
        } else {
          freeformPrompt = customInstructions;
        }

        try {
          const response = await fetch("/playground/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: freeformPrompt,
              componentId: "chat-freeform",
              iterationCount: 0,
              model: resolvedModel,
              source: "chat_freeform",
              skillIds: payload.skillIds,
              ...canvasGenPf,
            }),
          });

          const data = await response.json().catch(() => ({ success: false }));
          if (!response.ok || !data.success) {
            console.error("[Chat] Freeform generation failed:", data?.error);
            generationEvents.error.emit({
              componentId: freeformComponentId,
              parentNodeId: "",
              error: data?.error || "Generation failed",
            });
          } else {
            generationEvents.complete.emit({
              componentId: freeformComponentId,
              parentNodeId: "",
              output: "",
            });
          }
        } catch (err) {
          console.error("[Chat] Freeform generation error:", err);
          const msg = err instanceof Error ? err.message : "Unknown error";
          generationEvents.error.emit({
            componentId: freeformComponentId,
            parentNodeId: "",
            error: msg,
          });
        } finally {
          // State cleanup and queue draining handled by generationEvents.complete/error handlers
          // Only clear state here as a safety net if events didn't fire (e.g. network error before dispatch)
          if (coord.getGenerationInfo()?.componentId === freeformComponentId) {
            coord.clearGenerationEager();
          }
        }
      }
    },
    [coord, getNodeId, setNodes],
  );

  // Also drain queue after normal generation completes
  // (hook into generation complete/error to check queue)
  useEffect(() => {
    const drainQueue = () => {
      setTimeout(() => {
        if (generationQueueRef.current.length > 0) {
          const next = generationQueueRef.current.shift()!;
          handleChatSubmit(next);
        }
      }, POST_GENERATION_SCAN_DELAY + 500);
    };

    const offComplete = generationEvents.complete.on(drainQueue);
    const offError = generationEvents.error.on(drainQueue);
    return () => {
      offComplete();
      offError();
    };
  }, [handleChatSubmit]);

  return { handleChatSubmit };
}
