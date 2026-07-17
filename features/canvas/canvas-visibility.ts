// Pure graph helpers for collapse/expand visibility on the canvas.
//
// Given the current nodes, relations, and the set of collapsed node ids, computes
// which nodes are visible (descendants of collapsed nodes are hidden) and
// annotates iteration nodes with `hasChildren` / `isCollapsed` flags. It also
// derives the render-only edge layer from the relation records, respecting the
// same collapse rules. No side effects — PlaygroundCanvas memoizes the results.

import type { Node, Edge } from "@xyflow/react";
import { buildChildrenMap, type CanvasRelation } from "./canvas-relations";

/** Muted, low-contrast stroke that reads clearly on the dotted canvas. */
const EDGE_STROKE_COLOR = "#bdb9b3";

/**
 * Ids of every node hidden because an ancestor is collapsed. The collapsed node
 * itself stays visible; only its descendants are hidden. Cycle-safe.
 */
export function computeHiddenDescendants(
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

/**
 * Render-only edges derived from the relation records. Relations remain the
 * single source of truth (undo/redo, persistence, deletion cascades all operate
 * on them) — these edges are never stored. An edge is emitted only when BOTH
 * endpoints exist and are visible, so a collapsed subtree hides its connectors.
 * Edges are non-interactive; a skeleton endpoint gets a dashed stroke.
 */
export function computeVisibleEdges(
  nodes: Node[],
  relations: CanvasRelation[],
  collapsedNodeIds: Set<string>,
): Edge[] {
  const hiddenSet = computeHiddenDescendants(relations, collapsedNodeIds);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edges: Edge[] = [];

  for (const rel of relations) {
    if (hiddenSet.has(rel.parentId) || hiddenSet.has(rel.childId)) continue;
    const parent = nodeById.get(rel.parentId);
    const child = nodeById.get(rel.childId);
    if (!parent || !child) continue;

    const isSkeletonEdge =
      parent.type === "skeleton" || child.type === "skeleton";

    edges.push({
      id: `rel-${rel.parentId}-${rel.childId}`,
      source: rel.parentId,
      target: rel.childId,
      type: "smoothstep",
      selectable: false,
      deletable: false,
      focusable: false,
      style: {
        stroke: EDGE_STROKE_COLOR,
        strokeWidth: 1.5,
        ...(isSkeletonEdge ? { strokeDasharray: "4 4" } : {}),
      },
    });
  }

  return edges;
}
