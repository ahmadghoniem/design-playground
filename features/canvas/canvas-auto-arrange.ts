import type { Node } from '@xyflow/react';
import type { CanvasRelation } from '@pg/shared/lib/canvas-persistence';
import { buildChildrenMap } from './canvas-relations';
import {
  DEFAULT_ITERATION_NODE_WIDTH,
  DEFAULT_ITERATION_NODE_HEIGHT,
  DEFAULT_COMPONENT_NODE_WIDTH,
  DEFAULT_COMPONENT_NODE_HEIGHT,
} from '@pg/shared/lib/constants';

/**
 * Simple row-pack layout: each component and its visible descendants form a
 * local cluster, tiled left-to-right within the cluster (wrapping at a max
 * width); clusters are then packed left-to-right in rows the same way.
 * Returns absolute positions for nodes that participate in the layout.
 */
export function computeAutoArrangePositions(
  nodes: Node[],
  relations: CanvasRelation[],
  collapsedNodeIds: Set<string>,
  _zoom: number,
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

  const nodeOrder = new Map<string, number>();
  nodes.forEach((node, index) => nodeOrder.set(node.id, index));
  const sortByStableNodeOrder = (a: string, b: string) =>
    (nodeOrder.get(a) ?? Number.MAX_SAFE_INTEGER) - (nodeOrder.get(b) ?? Number.MAX_SAFE_INTEGER);

  const childrenMap = buildChildrenMap(relations);
  childrenMap.forEach((children, parentId) => {
    childrenMap.set(parentId, children.sort(sortByStableNodeOrder));
  });

  const hiddenNodeIds = new Set<string>();
  const markDescendantsHidden = (parentId: string) => {
    const children = childrenMap.get(parentId) || [];
    for (const childId of children) {
      hiddenNodeIds.add(childId);
      markDescendantsHidden(childId);
    }
  };
  collapsedNodeIds.forEach(nodeId => markDescendantsHidden(nodeId));

  const nodeMap = new Map<string, Node>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const collectVisibleClusterNodeIds = (rootNodeId: string): string[] => {
    const collected: string[] = [];
    const visited = new Set<string>();
    const queue: string[] = [rootNodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId) || hiddenNodeIds.has(currentId)) continue;
      if (!nodeMap.has(currentId)) continue;

      visited.add(currentId);
      collected.push(currentId);
      const children = (childrenMap.get(currentId) || []).filter(childId => !hiddenNodeIds.has(childId));
      queue.push(...children);
    }

    return collected;
  };

  const layoutCluster = (
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

    const orderedTiles = clusterNodeIds
      .filter(nodeId => !anchorRootAtTopLeft || nodeId !== rootNodeId)
      .sort(sortByStableNodeOrder);

    let cursorX = 0;
    let cursorY = 0;
    let rowHeight = 0;
    let maxRight = 0;
    let maxBottom = 0;

    const placeTile = (nodeId: string, x: number, y: number) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;
      const size = getNodeSize(node);
      localPositions.set(nodeId, { x, y });
      maxRight = Math.max(maxRight, x + size.width);
      maxBottom = Math.max(maxBottom, y + size.height);
    };

    if (anchorRootAtTopLeft && nodeMap.has(rootNodeId)) {
      const rootSize = getNodeSize(nodeMap.get(rootNodeId)!);
      placeTile(rootNodeId, 0, 0);
      cursorX = rootSize.width + TILE_GAP_X;
      rowHeight = rootSize.height;
    }

    orderedTiles.forEach(tileNodeId => {
      const tileNode = nodeMap.get(tileNodeId);
      if (!tileNode) return;

      const tileSize = getNodeSize(tileNode);
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

    return { positions: localPositions, width: maxRight, height: maxBottom };
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
    const layout = layoutCluster(componentNode.id, clusterNodeIds, true);
    clusterLayouts.push({ clusterId: componentNode.id, ...layout });
  });

  const orphanNodeIds = nodes
    .map(node => node.id)
    .filter(nodeId => !hiddenNodeIds.has(nodeId) && !assignedNodeIds.has(nodeId));
  if (orphanNodeIds.length > 0) {
    orphanNodeIds.forEach(nodeId => assignedNodeIds.add(nodeId));
    const layout = layoutCluster(orphanNodeIds[0], orphanNodeIds, false);
    clusterLayouts.push({ clusterId: '__orphans__', ...layout });
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

  return positionMap;
}
