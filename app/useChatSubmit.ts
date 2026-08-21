import { useCallback } from "react";
import { getClaudeCodeFields } from "@pg/shared/lib/generation-body";
import { resolveAgentModel } from "@pg/shared/lib/resolve-agent-model";
import {
  generationEvents,
} from "@pg/shared/lib/generation-events";
import type { ChatSubmitPayload } from "@pg/shared/lib/chat-submit-payload";
import type { GenerationCoordination } from "@pg/shared/lib/generation-coordination";
import { toast } from "sonner";
import {
  buildReferenceNodesSection,
  resolveEditFilePath,
  buildEditChatPrompt,
  buildTargetedExplorePrompt,
  buildFreeformChatPrompt,
} from "@pg/app/build-chat-prompt";

export interface UseChatSubmitParams {
  coord: GenerationCoordination;
}

/**
 * Discriminated on a *string* literal, not a boolean, and deliberately so.
 *
 * The host compiles this package with `strictNullChecks: false`, and without
 * it TypeScript widens `true`/`false` literal types back to `boolean` in a
 * discriminant position — so `if (!result.ok)` fails to narrow and every
 * `result.error` access is an error. A string discriminant narrows under both
 * configs. The playground's own tsconfig is `strict: true`, so this class of
 * bug is invisible until you typecheck from the host.
 */
type PostGenerateResult =
  | { status: "ok"; data: Record<string, unknown> }
  | { status: "error"; error: string };

/** POST to the generate API and normalize transport/HTTP/body errors. */
async function postGenerate(
  body: Record<string, unknown>,
): Promise<PostGenerateResult> {
  try {
    const response = await fetch("/playground/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response
      .json()
      .catch(() => ({ success: false, error: "Failed to parse response" }));
    if (!response.ok || !data.success) {
      const error =
        typeof data?.error === "string"
          ? data.error
          : `Generation failed (${response.status})`;
      return { status: "error", error };
    }
    return { status: "ok", data };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export function useChatSubmit({ coord }: UseChatSubmitParams) {
  const handleChatSubmit = useCallback(
    async (payload: ChatSubmitPayload) => {
      // If generation already in progress, reject this submission
      if (coord.getIsGenerating()) {
        toast.info("Generation in progress — wait for it to finish");
        return;
      }

      const chatMode =
        payload.chatMode ?? (payload.editMode ? "edit" : "explore");
      const isRawMode = chatMode === "raw";
      const rawPrompt = payload.text.trim();

      const hasFreeformContext =
        (payload.referenceNodes?.length ?? 0) > 0;
      if (isRawMode && !rawPrompt && !hasFreeformContext) return;

      const getPromptNodes = () =>
        coord.getNodes().map((n) => ({
          id: n.id,
          data: n.data as Record<string, unknown>,
        }));

      // ── Edit Mode: modify file in-place, no iterations ──
      if (chatMode === "edit" && payload.targetNodeId) {
        const { filePath, componentId: editComponentId, componentName: editComponentName } =
          resolveEditFilePath(payload);

        const editRefSection = buildReferenceNodesSection(
          payload.referenceNodes,
          getPromptNodes,
          payload.targetNodeId,
        );

        const prompt = buildEditChatPrompt({
          payload,
          filePath,
          referenceNodesSection: editRefSection,
        });

        const editResolvedModel = resolveAgentModel(payload.model);
        // Dispatch generation start to kick off generation tracking
        generationEvents.start.emit({
          componentId: editComponentId,
          componentName: editComponentName,
          parentNodeId: payload.targetNodeId,
          iterationCount: 0,
          model: editResolvedModel,
          flowPosition: payload.canvasPosition,
          targetNodeId: payload.targetNodeId,
          editMode: true,
        });

        const result = await postGenerate({
          prompt,
          componentId: editComponentId,
          model: editResolvedModel,
          source: "chat_edit",
          ...getClaudeCodeFields(),
        });

        if (result.status === "error") {
          console.error("[EditMode] Generation failed:", result.error);
          toast.error(result.error, { duration: 6000 });
          generationEvents.error.emit({
            componentId: editComponentId,
            parentNodeId: payload.targetNodeId,
            error: result.error,
          });
        } else {
          // Tell the targeted node to re-import its freshly-edited component
          // (same filename, so the loader can't detect the change itself).
          generationEvents.editComplete.emit({
            nodeId: payload.targetNodeId,
          });
          generationEvents.complete.emit({
            componentId: editComponentId,
            parentNodeId: payload.targetNodeId,
            output: "",
          });
        }
        return;
      }

      const {
        text,
        model: payloadModel,
        targetNodeId,
        targetComponentId,
        targetComponentName,
        targetType,
      } = payload;

      const resolvedModel = resolveAgentModel(payloadModel);

      const customInstructions = isRawMode ? rawPrompt : text;

      const referenceNodesSection = buildReferenceNodesSection(
        payload.referenceNodes,
        getPromptNodes,
        targetNodeId,
      );

      const claudeCodeFields = getClaudeCodeFields();

      if (
        targetNodeId &&
        targetComponentId &&
        targetComponentName &&
        targetType
      ) {
        // --- WITH TARGET NODE ---
        let startNumber = 1;

        if (!isRawMode) {
          // Fetch next available iteration number
          try {
            const cleanName = targetComponentName.replace(/\s+/g, "");
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

        const { prompt, componentId, componentName, iterationCount } =
          buildTargetedExplorePrompt({
            payload,
            isRawMode,
            customInstructions,
            referenceNodesSection,
            startNumber,
          });

        // Dispatch generation start (creates skeleton nodes)
        generationEvents.start.emit({
          componentId,
          componentName,
          parentNodeId: targetNodeId,
          iterationCount,
          startNumber,
          model: resolvedModel,
          flowPosition: payload.canvasPosition,
          targetNodeId,
        });

        const result = await postGenerate({
          prompt,
          componentId,
          iterationCount,
          model: resolvedModel,
          source: "chat",
          ...claudeCodeFields,
        });

        if (result.status === "error") {
          generationEvents.error.emit({
            componentId,
            parentNodeId: targetNodeId,
            error: result.error,
          });
        } else {
          generationEvents.complete.emit({
            componentId,
            parentNodeId: targetNodeId,
            output: "",
          });
        }
      } else {
        // --- FREEFORM (no target) ---
        const { prompt: freeformPrompt, componentId: freeformComponentId } =
          buildFreeformChatPrompt({
            isRawMode,
            rawPrompt,
            customInstructions,
            referenceNodesSection,
          });

        // Dispatch start event — creates skeleton node
        generationEvents.start.emit({
          componentId: freeformComponentId,
          componentName: "Freeform",
          parentNodeId: "",
          iterationCount: 0,
          model: resolvedModel,
          flowPosition: payload.canvasPosition ?? undefined,
        });

        const result = await postGenerate({
          prompt: freeformPrompt,
          componentId: freeformComponentId,
          iterationCount: 0,
          model: resolvedModel,
          source: "chat_freeform",
          ...claudeCodeFields,
        });

        if (result.status === "error") {
          console.error("[Chat] Freeform generation failed:", result.error);
          generationEvents.error.emit({
            componentId: freeformComponentId,
            parentNodeId: "",
            error: result.error,
          });
        } else {
          generationEvents.complete.emit({
            componentId: freeformComponentId,
            parentNodeId: "",
            output: "",
          });
        }

        // State cleanup and queue draining handled by generationEvents
        // complete/error handlers. Safety net if events didn't land.
        if (coord.getGenerationInfo()?.componentId === freeformComponentId) {
          coord.clearGenerationEager();
        }
      }
    },
    [coord],
  );

  return { handleChatSubmit };
}
