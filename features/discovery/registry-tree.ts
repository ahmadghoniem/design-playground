/**
 * Pure transforms over the component registry tree. No React, no I/O —
 * safe to unit-test directly with sample registry trees.
 */

import { RegistryItem, RegistryLeafItem, isGroup, isLeaf } from '@pg/registry';

/** Build a map of parentId -> child leaf items from the registry tree. */
export function buildChildrenMap(items: RegistryItem[]): Map<string, RegistryLeafItem[]> {
  const map = new Map<string, RegistryLeafItem[]>();
  function collect(list: RegistryItem[]) {
    for (const item of list) {
      if (isLeaf(item) && item.parentId) {
        const existing = map.get(item.parentId) || [];
        existing.push(item);
        map.set(item.parentId, existing);
      } else if (isGroup(item)) {
        collect(item.children);
      }
    }
  }
  collect(items);
  return map;
}

/** Flatten all leaves under a group (including nested children with parentId). */
export function flattenLeaves(items: RegistryItem[]): RegistryLeafItem[] {
  const out: RegistryLeafItem[] = [];
  for (const item of items) {
    if (isLeaf(item)) out.push(item);
    else if (isGroup(item)) out.push(...flattenLeaves(item.children));
  }
  return out;
}
