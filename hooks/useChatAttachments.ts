import { useMemo } from 'react';
import type { SelectedElement } from '../lib/element-context';
import type { SelectedNodeContext } from './useNodeSelection';
import type { ChatSubmitPayload } from '../lib/constants';

export interface UseChatAttachmentsOptions {
  selectedElements?: SelectedElement[];
  selectedNodes?: SelectedNodeContext[];
}

export interface UseChatAttachmentsResult {
  /** The primary edit/explore target: first selected component or iteration that is not embed. */
  editTarget: SelectedNodeContext | null;
  /** All selected nodes that are not the edit target (used as reference context). */
  referenceNodes: SelectedNodeContext[];
  /** True when there is any meaningful selection (edit target, element selections, or nodes). */
  hasSelection: boolean;
  /**
   * True when there is an editable edit target or at least one element selection —
   * i.e. when Edit/Explore mode is applicable.
   */
  canEditOrExplore: boolean;
  /** True when there is an edit target, element selections, or reference nodes. */
  hasAnyPill: boolean;
  /**
   * Serialize the current element selections into the `elementSelections` portion
   * of `ChatSubmitPayload`. Returns undefined when there are none.
   */
  buildElementSelectionsPayload(): ChatSubmitPayload['elementSelections'];
  /**
   * Serialize the current reference nodes into the `referenceNodes` portion of
   * `ChatSubmitPayload`. Returns undefined when there are none.
   */
  buildReferenceNodesPayload(): ChatSubmitPayload['referenceNodes'];
}

/**
 * Derives attachment state (edit target, reference nodes, selection flags) from
 * the canvas selection props, and provides serializers for the submit payload.
 * Hides all the derivation and mapping logic from `DockedChatBar`.
 */
export function useChatAttachments({
  selectedElements,
  selectedNodes,
}: UseChatAttachmentsOptions): UseChatAttachmentsResult {
  // The edit/explore target is the FIRST selected node that is a valid target
  // (a React/HTML/JSX component or iteration — not an embed/image/text). The
  // rest of the selection becomes reference context.
  const editTarget = useMemo<SelectedNodeContext | null>(() => {
    const candidates = (selectedNodes ?? []).filter(
      (n) => (n.type === 'component' || n.type === 'iteration') && n.renderMode !== 'embed',
    );
    return candidates[0] ?? null;
  }, [selectedNodes]);

  const referenceNodes = useMemo(
    () => (selectedNodes ?? []).filter((n) => n.nodeId !== editTarget?.nodeId),
    [selectedNodes, editTarget],
  );

  const hasSelection =
    !!editTarget || (selectedElements?.length ?? 0) > 0 || (selectedNodes?.length ?? 0) > 0;

  const canEditOrExplore = !!editTarget || (selectedElements?.length ?? 0) > 0;

  const hasAnyPill = !!editTarget || (selectedElements?.length ?? 0) > 0 || referenceNodes.length > 0;

  const buildElementSelectionsPayload = useMemo(
    () => (): ChatSubmitPayload['elementSelections'] => {
      if (!selectedElements || selectedElements.length === 0) return undefined;
      return selectedElements.map((sel) => ({
        tagName: sel.context.tagName,
        displayName: sel.context.displayName,
        textContent: sel.context.textContent,
        cssSelector: sel.context.cssSelector,
        htmlSource: sel.context.htmlSource,
        ancestorComponents: sel.context.ancestorComponents,
        nodeId: sel.nodeId,
        componentName: sel.componentName,
      }));
    },
    [selectedElements],
  );

  const buildReferenceNodesPayload = useMemo(
    () => (): ChatSubmitPayload['referenceNodes'] => {
      if (referenceNodes.length === 0) return undefined;
      return referenceNodes.map((node) => ({
        nodeId: node.nodeId,
        componentId: node.componentId,
        componentName: node.componentName,
        type: node.type,
        sourceFilename: node.sourceFilename,
        ...(node.renderMode === 'embed' && node.embedUrl ? { embedUrl: node.embedUrl } : {}),
        ...(node.type === 'image'
          ? { imagePath: node.imagePath, imageUrl: node.imageUrl }
          : {}),
      }));
    },
    [referenceNodes],
  );

  return {
    editTarget,
    referenceNodes,
    hasSelection,
    canEditOrExplore,
    hasAnyPill,
    buildElementSelectionsPayload,
    buildReferenceNodesPayload,
  };
}
