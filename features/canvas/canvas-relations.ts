// Explicit parent→child relation model for the canvas iteration tree.
//
// A relation carries parentId → childId. No presentation (`type`, `animated`, `style`) is stored.
//
// Pure module (no React, no side effects) — the traversal helpers below are the
// only vocabulary the canvas needs for children maps, descendant sets, and
// cascade/collapse operations.

import type { CanvasRelation } from '@pg/shared/lib/canvas-persistence';

export function buildChildrenMap(relations: CanvasRelation[]): Map<string, string[]> {
  const childrenMap = new Map<string, string[]>();
  for (const rel of relations) {
    const existing = childrenMap.get(rel.parentId) || [];
    existing.push(rel.childId);
    childrenMap.set(rel.parentId, existing);
  }
  return childrenMap;
}

export function getChildIds(relations: CanvasRelation[], parentId: string): string[] {
  return relations.filter((r) => r.parentId === parentId).map((r) => r.childId);
}

/**
 * All descendant node ids of `rootId` (children, grandchildren, …), excluding
 * `rootId` itself. Cycle-safe via a visited set.
 */
export function getDescendantIds(
  relations: CanvasRelation[],
  rootId: string,
): Set<string> {
  const childrenMap = buildChildrenMap(relations);
  const descendants = new Set<string>();
  const visit = (parentId: string) => {
    for (const childId of childrenMap.get(parentId) || []) {
      if (descendants.has(childId)) continue;
      descendants.add(childId);
      visit(childId);
    }
  };
  visit(rootId);
  return descendants;
}
