// Pure helpers for tree-aware iteration scanning + positioning.
//
// Extracted from PlaygroundCanvas's scan logic. These functions take
// (nodes, generationInfo, ...) and return values only — no setNodes, no
// side effects — so the scan handlers in PlaygroundCanvas can call them
// directly without reaching into component state.

import type { Node } from '@xyflow/react';
import type { GenerationInfo } from './canvas-persistence';
import {
  ARRANGE_HORIZONTAL_GAP,
  DEFAULT_ITERATION_NODE_WIDTH,
  DEFAULT_COMPONENT_NODE_WIDTH,
} from './constants';

export function isInExpectedBatch(iterationNumber: number, info: GenerationInfo | null | undefined): boolean {
  if (info?.startNumber == null || !info.iterationCount) return true;
  const end = info.startNumber + info.iterationCount - 1;
  return iterationNumber >= info.startNumber && iterationNumber <= end;
}

/** Map a file iteration number to its skeleton node id (slot = number - startNumber). */
export function getSkeletonIdForFileIteration(
  info: GenerationInfo,
  fileIterationNumber: number,
  currentNodes: Node[],
): string | undefined {
  const start = info.startNumber ?? 1;
  const slotIndex = fileIterationNumber - start;
  if (slotIndex < 0 || slotIndex >= info.skeletonNodeIds.length) return undefined;
  const skeletonId = info.skeletonNodeIds[slotIndex];
  return currentNodes.some((n) => n.id === skeletonId) ? skeletonId : undefined;
}

export function resolveIterationPosition(
  info: GenerationInfo,
  fileIterationNumber: number,
  currentNodes: Node[],
  skeletonsToRemove: string[],
  sourceNode: Node | undefined,
  fallbackPosition?: { x: number; y: number },
): { x: number; y: number } {
  const skeletonId = getSkeletonIdForFileIteration(info, fileIterationNumber, currentNodes);
  if (skeletonId) {
    const skeletonNode = currentNodes.find((n) => n.id === skeletonId);
    if (skeletonNode) {
      skeletonsToRemove.push(skeletonId);
      return { ...skeletonNode.position };
    }
  }
  if (sourceNode) {
    const srcW =
      sourceNode.measured?.width ??
      (sourceNode.type === 'component' ? DEFAULT_COMPONENT_NODE_WIDTH : DEFAULT_ITERATION_NODE_WIDTH);
    return {
      x: sourceNode.position.x + srcW + ARRANGE_HORIZONTAL_GAP,
      y: sourceNode.position.y,
    };
  }
  return fallbackPosition ?? { x: 400, y: 200 };
}

export function countBatchIterationNodes(nodes: Node[], info: GenerationInfo): number {
  if (info.startNumber == null || !info.iterationCount) return 0;
  const start = info.startNumber;
  const end = start + info.iterationCount - 1;
  return nodes.filter((n) => {
    if (n.type !== 'iteration') return false;
    const num = n.data.iterationNumber as number;
    return num >= start && num <= end;
  }).length;
}
