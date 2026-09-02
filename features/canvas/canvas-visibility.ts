// Pure graph helpers for collapse/expand visibility on the canvas.
//
// Given the current nodes, relations, and the set of collapsed node ids, computes
// which nodes are visible (descendants of collapsed nodes are hidden) and
// annotates iteration nodes with `hasChildren` / `isCollapsed` flags. No side
// effects — PlaygroundCanvas memoizes the results.

import type { Node } from "@xyflow/react";
import type { CanvasRelation } from "@pg/shared/lib/canvas-persistence";
import { buildChildrenMap } from "./canvas-relations";

/**
 * Ids of every node hidden because an ancestor is collapsed. The collapsed node
 * itself stays visible; only its descendants are hidden. Cycle-safe.
 */
function computeHiddenDescendants(
  relations: CanvasRelation[],
  collapsedNodeIds: Set<string>,
): Set<string> {
  const childrenMap = buildChildrenMap(relations);
  const hiddenSet = new Set<string>();
  const markDescendantsHidden = (parentId: string) => {
    for (const childId of childrenMap.get(parentId) || []) {
      if (hiddenSet.has(childId)) continue;
      hiddenSet.add(childId);
      markDescendantsHidden(childId);
    }
  };
  collapsedNodeIds.forEach((nodeId) => markDescendantsHidden(nodeId));
  return hiddenSet;
}

export function computeVisibleNodes(
  nodes: Node[],
  relations: CanvasRelation[],
  collapsedNodeIds: Set<string>,
): Node[] {
  const childrenMap = buildChildrenMap(relations);
  const hiddenSet = computeHiddenDescendants(relations, collapsedNodeIds);

  const annotatedNodes = nodes
    .filter((n) => !hiddenSet.has(n.id))
    .map((n) => {
      if (n.type === "iteration") {
        const children = childrenMap.get(n.id) || [];
        const hasChildren = children.length > 0;
        const isCollapsed = collapsedNodeIds.has(n.id);
        if (hasChildren !== n.data.hasChildren || isCollapsed !== n.data.isCollapsed) {
          return { ...n, data: { ...n.data, hasChildren, isCollapsed } };
        }
      }
      return n;
    });

  return annotatedNodes;
}
