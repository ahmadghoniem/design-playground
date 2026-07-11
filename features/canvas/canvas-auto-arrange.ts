import type { Edge, Node } from '@xyflow/react';
import {
  NODE_LABEL_SCALE_THRESHOLD,
  NODE_LABEL_MAX_INV_SCALE,
  DEFAULT_ITERATION_NODE_WIDTH,
  DEFAULT_ITERATION_NODE_HEIGHT,
  DEFAULT_COMPONENT_NODE_WIDTH,
  DEFAULT_COMPONENT_NODE_HEIGHT,
} from '@pg/shared/lib/constants';

/**
 * Bento cluster layout: each component and its visible descendants form a local
 * cluster; clusters are packed left-to-right in rows. Returns absolute positions
 * for nodes that participate in the layout.
 */
export function computeAutoArrangePositions(
  nodes: Node[],
  edges: Edge[],
  collapsedNodeIds: Set<string>,
  zoom: number,
): Map<string, { x: number; y: number }> {
  const componentNodes = nodes.filter(n => n.type === 'component');

  // Layout tuning for this algorithm only (px).
  const START_X = 50;
  const START_Y = 50;
  const TILE_GAP_X = 48;
  const TILE_GAP_Y = 48;
  const CLUSTER_MAX_WIDTH = 2200;
  const CLUSTER_GAP_X = 140;
  const CLUSTER_GAP_Y = 140;
  const CLUSTER_ROW_MAX_WIDTH = 5200;
  const COLLISION_MIN_SEPARATION = 16;
  const COLLISION_MAX_PASSES = 12;
  const LABEL_PADDING_X_BASE = 18;
  const LABEL_PADDING_Y_BASE = 14;
  const safeZoom = Math.max(zoom, 0.0001);

  const getNodeSize = (node: Node): { width: number; height: number } => {
    const measured = node.measured;
    if (measured?.width && measured?.height) {
      return { width: measured.width, height: measured.height };
    }
    if (node.type === 'iteration' || node.type === 'skeleton') {
      return { width: DEFAULT_ITERATION_NODE_WIDTH, height: DEFAULT_ITERATION_NODE_HEIGHT };
    }
    return { width: DEFAULT_COMPONENT_NODE_WIDTH, height: DEFAULT_COMPONENT_NODE_HEIGHT };
  };
  const getEffectiveNodeFootprint = (node: Node): { width: number; height: number } => {
    const base = getNodeSize(node);
    const inverseLabelScale = Math.min(
      NODE_LABEL_MAX_INV_SCALE,
      Math.max(1, NODE_LABEL_SCALE_THRESHOLD / safeZoom),
    );
    const zoomGrowth = Math.max(0, inverseLabelScale - 1);
    const extraX = LABEL_PADDING_X_BASE * zoomGrowth;
    const extraY = LABEL_PADDING_Y_BASE * zoomGrowth;
    return {
      width: base.width + extraX,
      height: base.height + extraY,
    };
  };

  const nodeOrder = new Map<string, number>();
  nodes.forEach((node, index) => nodeOrder.set(node.id, index));
  const sortByStableNodeOrder = (a: string, b: string) =>
    (nodeOrder.get(a) ?? Number.MAX_SAFE_INTEGER) - (nodeOrder.get(b) ?? Number.MAX_SAFE_INTEGER);

  const childrenMap = new Map<string, string[]>();
  edges.forEach(edge => {
    const existing = childrenMap.get(edge.source) || [];
    existing.push(edge.target);
    childrenMap.set(edge.source, existing);
  });
  childrenMap.forEach((children, parentId) => {
    childrenMap.set(parentId, children.sort(sortByStableNodeOrder));
  });

  const collapsed = collapsedNodeIds;
  const hiddenNodeIds = new Set<string>();
  const markDescendantsHidden = (parentId: string) => {
    const children = childrenMap.get(parentId) || [];
    for (const childId of children) {
      hiddenNodeIds.add(childId);
      markDescendantsHidden(childId);
    }
  };
  collapsed.forEach(nodeId => markDescendantsHidden(nodeId));

  const nodeMap = new Map<string, Node>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const collectVisibleClusterNodeIds = (rootNodeId: string): string[] => {
    const collected: string[] = [];
    const visited = new Set<string>();
    const queue: string[] = [rootNodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId) || hiddenNodeIds.has(currentId)) continue;
      const currentNode = nodeMap.get(currentId);
      if (!currentNode) continue;

      visited.add(currentId);
      collected.push(currentId);
      const children = (childrenMap.get(currentId) || []).filter(childId => !hiddenNodeIds.has(childId));
      queue.push(...children);
    }

    return collected;
  };

  const getDepthByNodeId = (rootNodeId: string, clusterNodeIds: Set<string>): Map<string, number> => {
    const depthByNodeId = new Map<string, number>();
    const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: rootNodeId, depth: 0 }];

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;
      if (depthByNodeId.has(nodeId) || !clusterNodeIds.has(nodeId)) continue;

      depthByNodeId.set(nodeId, depth);
      const children = (childrenMap.get(nodeId) || []).filter(childId => clusterNodeIds.has(childId));
      children.forEach(childId => queue.push({ nodeId: childId, depth: depth + 1 }));
    }

    return depthByNodeId;
  };

  const layoutClusterBento = (
    rootNodeId: string,
    clusterNodeIds: string[],
    anchorRootAtTopLeft: boolean,
  ): {
    positions: Map<string, { x: number; y: number }>;
    width: number;
    height: number;
  } => {
    const localPositions = new Map<string, { x: number; y: number }>();
    if (clusterNodeIds.length === 0) {
      return { positions: localPositions, width: 0, height: 0 };
    }

    const nodeIdSet = new Set(clusterNodeIds);
    const depthByNodeId = getDepthByNodeId(rootNodeId, nodeIdSet);

    const orderedTiles = clusterNodeIds
      .filter(nodeId => !anchorRootAtTopLeft || nodeId !== rootNodeId)
      .sort((a, b) => {
        const depthDelta = (depthByNodeId.get(a) ?? Number.MAX_SAFE_INTEGER) -
          (depthByNodeId.get(b) ?? Number.MAX_SAFE_INTEGER);
        if (depthDelta !== 0) return depthDelta;
        return sortByStableNodeOrder(a, b);
      });

    let cursorX = 0;
    let cursorY = 0;
    let rowHeight = 0;
    let maxRight = 0;
    let maxBottom = 0;

    const placeTile = (nodeId: string, x: number, y: number) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;
      const size = getEffectiveNodeFootprint(node);
      localPositions.set(nodeId, { x, y });
      maxRight = Math.max(maxRight, x + size.width);
      maxBottom = Math.max(maxBottom, y + size.height);
    };

    if (anchorRootAtTopLeft && nodeIdSet.has(rootNodeId)) {
      const rootNode = nodeMap.get(rootNodeId);
      if (rootNode) {
        const rootSize = getEffectiveNodeFootprint(rootNode);
        placeTile(rootNodeId, 0, 0);
        cursorX = rootSize.width + TILE_GAP_X;
        rowHeight = rootSize.height;
      }
    }

    orderedTiles.forEach(tileNodeId => {
      const tileNode = nodeMap.get(tileNodeId);
      if (!tileNode) return;

      const tileSize = getEffectiveNodeFootprint(tileNode);
      const wouldOverflow = cursorX > 0 && cursorX + tileSize.width > CLUSTER_MAX_WIDTH;
      if (wouldOverflow) {
        cursorY += rowHeight + TILE_GAP_Y;
        cursorX = 0;
        rowHeight = 0;
      }

      placeTile(tileNodeId, cursorX, cursorY);
      rowHeight = Math.max(rowHeight, tileSize.height);
      cursorX += tileSize.width + TILE_GAP_X;
    });

    return {
      positions: localPositions,
      width: maxRight,
      height: maxBottom,
    };
  };

  const clusterLayouts: Array<{
    clusterId: string;
    positions: Map<string, { x: number; y: number }>;
    width: number;
    height: number;
  }> = [];
  const assignedNodeIds = new Set<string>();

  componentNodes.forEach(componentNode => {
    const clusterNodeIds = collectVisibleClusterNodeIds(componentNode.id)
      .filter(nodeId => !assignedNodeIds.has(nodeId));
    if (clusterNodeIds.length === 0) return;

    clusterNodeIds.forEach(nodeId => assignedNodeIds.add(nodeId));
    const layout = layoutClusterBento(componentNode.id, clusterNodeIds, true);
    clusterLayouts.push({
      clusterId: componentNode.id,
      positions: layout.positions,
      width: layout.width,
      height: layout.height,
    });
  });

  const orphanNodeIds = nodes
    .map(node => node.id)
    .filter(nodeId => !hiddenNodeIds.has(nodeId) && !assignedNodeIds.has(nodeId));
  if (orphanNodeIds.length > 0) {
    orphanNodeIds.forEach(nodeId => assignedNodeIds.add(nodeId));
    const layout = layoutClusterBento(orphanNodeIds[0], orphanNodeIds, false);
    clusterLayouts.push({
      clusterId: '__orphans__',
      positions: layout.positions,
      width: layout.width,
      height: layout.height,
    });
  }

  const clusterOrigins = new Map<string, { x: number; y: number }>();
  let clusterCursorX = START_X;
  let clusterCursorY = START_Y;
  let currentRowHeight = 0;
  const maxClusterRowRight = START_X + CLUSTER_ROW_MAX_WIDTH;

  clusterLayouts.forEach(clusterLayout => {
    const shouldWrapRow = clusterCursorX > START_X &&
      clusterCursorX + clusterLayout.width > maxClusterRowRight;
    if (shouldWrapRow) {
      clusterCursorX = START_X;
      clusterCursorY += currentRowHeight + CLUSTER_GAP_Y;
      currentRowHeight = 0;
    }

    clusterOrigins.set(clusterLayout.clusterId, { x: clusterCursorX, y: clusterCursorY });
    clusterCursorX += clusterLayout.width + CLUSTER_GAP_X;
    currentRowHeight = Math.max(currentRowHeight, clusterLayout.height);
  });

  const positionMap = new Map<string, { x: number; y: number }>();
  clusterLayouts.forEach(clusterLayout => {
    const origin = clusterOrigins.get(clusterLayout.clusterId);
    if (!origin) return;

    clusterLayout.positions.forEach((localPosition, nodeId) => {
      positionMap.set(nodeId, {
        x: origin.x + localPosition.x,
        y: origin.y + localPosition.y,
      });
    });
  });

  const effectiveSizeByNodeId = new Map<string, { width: number; height: number }>();
  positionMap.forEach((_, nodeId) => {
    const node = nodeMap.get(nodeId);
    if (!node) return;
    effectiveSizeByNodeId.set(nodeId, getEffectiveNodeFootprint(node));
  });
  const positionedNodeIds = Array.from(positionMap.keys()).sort(sortByStableNodeOrder);
  const hasOverlap = (
    aPos: { x: number; y: number },
    aSize: { width: number; height: number },
    bPos: { x: number; y: number },
    bSize: { width: number; height: number },
  ) => {
    const aRight = aPos.x + aSize.width + COLLISION_MIN_SEPARATION;
    const aBottom = aPos.y + aSize.height + COLLISION_MIN_SEPARATION;
    const bRight = bPos.x + bSize.width + COLLISION_MIN_SEPARATION;
    const bBottom = bPos.y + bSize.height + COLLISION_MIN_SEPARATION;
    return aPos.x < bRight && aRight > bPos.x && aPos.y < bBottom && aBottom > bPos.y;
  };
  const resolveCollisions = () => {
    for (let pass = 0; pass < COLLISION_MAX_PASSES; pass += 1) {
      let movedAny = false;
      for (let i = 0; i < positionedNodeIds.length; i += 1) {
        const leftNodeId = positionedNodeIds[i];
        const leftPos = positionMap.get(leftNodeId);
        const leftSize = effectiveSizeByNodeId.get(leftNodeId);
        if (!leftPos || !leftSize) continue;
        for (let j = i + 1; j < positionedNodeIds.length; j += 1) {
          const rightNodeId = positionedNodeIds[j];
          const rightPos = positionMap.get(rightNodeId);
          const rightSize = effectiveSizeByNodeId.get(rightNodeId);
          if (!rightPos || !rightSize) continue;
          if (!hasOverlap(leftPos, leftSize, rightPos, rightSize)) continue;

          const pushX = (leftPos.x + leftSize.width + COLLISION_MIN_SEPARATION) - rightPos.x;
          const pushY = (leftPos.y + leftSize.height + COLLISION_MIN_SEPARATION) - rightPos.y;
          if (pushX <= 0 || pushY <= 0) continue;

          if (pushX <= pushY) {
            positionMap.set(rightNodeId, { x: rightPos.x + pushX, y: rightPos.y });
          } else {
            positionMap.set(rightNodeId, { x: rightPos.x, y: rightPos.y + pushY });
          }
          movedAny = true;
        }
      }
      if (!movedAny) break;
    }
  };
  resolveCollisions();

  return positionMap;
}
