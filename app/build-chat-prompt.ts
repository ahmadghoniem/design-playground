import {
  generateIterationPrompt,
  generateIterationFromIterationPrompt,
  generateElementIterationPrompt,
  generateElementIterationFromIterationPrompt,
} from "@pg/features/generation/prompt-builders";
import { resolveRegistryItem } from "@pg/registry";
import {
  formatReferenceNodesSection,
  formatCustomInstructionsSection,
  getStylingConstraint,
} from "@pg/features/generation/prompts/shared-sections";
import { freeformReferencePrompt } from "@pg/features/generation/prompts/freeform-reference.prompt";
import { editPrompt } from "@pg/features/generation/prompts/edit.prompt";
import { iterationsFile } from "@pg/shared/lib/playground-paths";
import { CHAT_DEFAULT_COUNT } from "@pg/shared/lib/constants";
import type { ChatSubmitPayload } from "@pg/shared/lib/chat-submit-payload";

export type ChatPromptNode = {
  id: string;
  data: Record<string, unknown>;
};

export type GetNodesFn = () => ChatPromptNode[];

/**
 * Resolve canvas reference nodes into the markdown section injected into prompts.
 * Filters out `excludeNodeId` (typically the edit/explore target).
 */
export function buildReferenceNodesSection(
  referenceNodes: ChatSubmitPayload["referenceNodes"],
  getNodes: GetNodesFn,
  excludeNodeId?: string | null,
): string {
  if (!referenceNodes || referenceNodes.length === 0) return "";

  const refNodes = referenceNodes.filter((n) => n.nodeId !== excludeNodeId);
  if (refNodes.length === 0) return "";

  const refNodesResolved = refNodes.map((node) => {
    if (node.type === "text") {
      const textNode = getNodes().find((n) => n.id === node.nodeId);
      return {
        ...node,
        textContent:
          ((textNode?.data as Record<string, unknown>)?.text as string) || "",
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

  return formatReferenceNodesSection(refNodesResolved);
}

export function resolveEditFilePath(payload: ChatSubmitPayload): {
  filePath: string;
  componentId: string;
  componentName: string;
} {
  const componentId = payload.targetComponentId || "edit-mode";
  const componentName = payload.targetComponentName || componentId;

  let filePath: string;
  if (payload.targetType === "iteration" && payload.sourceFilename) {
    filePath = iterationsFile(payload.sourceFilename);
  } else {
    const item = resolveRegistryItem(componentId);
    filePath = item?.sourcePath || iterationsFile(componentId);
  }

  return { filePath, componentId, componentName };
}

export function buildEditChatPrompt(args: {
  payload: ChatSubmitPayload;
  filePath: string;
  referenceNodesSection: string;
}): string {
  const { payload, filePath, referenceNodesSection } = args;
  return editPrompt({
    filePath,
    customInstructions: payload.text || "Improve the design",
    referenceNodesSection: referenceNodesSection || undefined,
    elementSelections: payload.elementSelections,
  });
}

export type TargetedExplorePromptResult = {
  prompt: string;
  componentId: string;
  componentName: string;
  iterationCount: number;
  startNumber: number;
};

/**
 * Build the explore/iterate prompt for a targeted canvas node.
 * `startNumber` is resolved by the caller (via the iterations API).
 * In raw mode, returns the raw text unchanged as `prompt`.
 */
export function buildTargetedExplorePrompt(args: {
  payload: ChatSubmitPayload;
  isRawMode: boolean;
  customInstructions: string;
  referenceNodesSection: string;
  startNumber: number;
}): TargetedExplorePromptResult {
  const {
    payload,
    isRawMode,
    customInstructions,
    referenceNodesSection,
    startNumber,
  } = args;

  const componentId = payload.targetComponentId!;
  const componentName = payload.targetComponentName!;
  const iterationCount = payload.iterationCount ?? CHAT_DEFAULT_COUNT;
  const hasElementSelections = (payload.elementSelections?.length ?? 0) > 0;
  const { targetType, sourceFilename } = payload;

  let prompt = payload.text.trim();

  if (!isRawMode && targetType === "iteration" && sourceFilename) {
    if (hasElementSelections) {
      prompt = generateElementIterationFromIterationPrompt(
        componentId,
        sourceFilename,
        startNumber,
        iterationCount,
        payload.elementSelections,
        customInstructions,
        referenceNodesSection,
      );
    } else {
      prompt = generateIterationFromIterationPrompt(
        componentId,
        sourceFilename,
        iterationCount,
        startNumber,
        customInstructions,
        referenceNodesSection,
      );
    }
  } else if (!isRawMode) {
    if (hasElementSelections) {
      prompt = generateElementIterationPrompt(
        componentId,
        startNumber,
        iterationCount,
        payload.elementSelections,
        customInstructions,
        referenceNodesSection,
      );
    } else {
      prompt = generateIterationPrompt(
        componentId,
        iterationCount,
        startNumber,
        customInstructions,
        referenceNodesSection,
      );
    }
  }

  return { prompt, componentId, componentName, iterationCount, startNumber };
}

export function buildFreeformChatPrompt(args: {
  isRawMode: boolean;
  rawPrompt: string;
  customInstructions: string;
  referenceNodesSection: string;
}): { prompt: string; componentId: string } {
  const {
    isRawMode,
    rawPrompt,
    customInstructions,
    referenceNodesSection,
  } = args;

  const componentId = "chat-freeform";

  // Raw mode wraps in the reference template only when there is context to
  // carry; non-raw wraps whenever reference nodes exist.
  const useTemplate = Boolean(referenceNodesSection);

  if (!useTemplate) {
    return { prompt: isRawMode ? rawPrompt : customInstructions, componentId };
  }

  const prompt = freeformReferencePrompt({
    referenceNodesSection: referenceNodesSection || "",
    customInstructionsSection: formatCustomInstructionsSection(
      isRawMode ? rawPrompt || customInstructions : customInstructions,
    ),
    stylingConstraint: getStylingConstraint(),
  });

  return { prompt, componentId };
}
