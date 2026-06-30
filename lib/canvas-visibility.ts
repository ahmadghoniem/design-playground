// Pure graph helper for collapse/expand visibility on the canvas.
//
// Given the current nodes, edges, and the set of collapsed node ids, computes
// which nodes/edges are visible (descendants of collapsed nodes are hidden) and
// annotates iteration nodes with `hasChildren` / `isCollapsed` flags. No side
// effects — PlaygroundCanvas memoizes the result.

import type { Edge, Node } from '@xyflow/react';

export interface VisibleGraph {
  visibleNodes: Node[];
  visibleEdges: Edge[];
}

export function computeVisibleNodes(
  nodes: Node[],
  edges: Edge[],
  collapsedNodeIds: Set<string>,
): VisibleGraph {
  const childrenMap = new Map<string, string[]>();
  edges.forEach((edge) => {
    const existing = childrenMap.get(edge.source) || [];
    existing.push(edge.target);
    childrenMap.set(edge.source, existing);
  });

  const hiddenSet = new Set<string>();
  const markDescendantsHidden = (parentId: string) => {
    const children = childrenMap.get(parentId) || [];
    for (const childId of children) {
      hiddenSet.add(childId);
      markDescendantsHidden(childId);
    }
  };
  collapsedNodeIds.forEach((nodeId) => markDescendantsHidden(nodeId));

  const annotatedNodes = nodes
    .filter((n) => !hiddenSet.has(n.id))
    .map((n) => {
      if (n.type === 'iteration') {
        const children = childrenMap.get(n.id) || [];
        const hasChildren = children.length > 0;
        const isCollapsed = collapsedNodeIds.has(n.id);
        if (hasChildren !== n.data.hasChildren || isCollapsed !== n.data.isCollapsed) {
          return { ...n, data: { ...n.data, hasChildren, isCollapsed } };
        }
      }
      return n;
    });

  const vEdges = edges.filter((e) => !hiddenSet.has(e.target) && !hiddenSet.has(e.source));
  return { visibleNodes: annotatedNodes, visibleEdges: vEdges };
}
