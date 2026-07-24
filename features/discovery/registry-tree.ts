/**
 * Pure transforms over the component registry tree. No React, no I/O —
 * safe to unit-test directly with sample registry trees.
 */

import { RegistryLeafItem } from '@pg/registry';

/** Build a map of parentId -> child leaf items from the flat registry list. */
export function buildChildrenMap(items: RegistryLeafItem[]): Map<string, RegistryLeafItem[]> {
  const map = new Map<string, RegistryLeafItem[]>();
  for (const item of items) {
    if (item.parentId) {
      const existing = map.get(item.parentId) || [];
      existing.push(item);
      map.set(item.parentId, existing);
    }
  }
  return map;
}

/** Identity pass-through — kept for call-site clarity where a flat leaf list is expected. */
export function flattenLeaves(items: RegistryLeafItem[]): RegistryLeafItem[] {
  return items;
}
