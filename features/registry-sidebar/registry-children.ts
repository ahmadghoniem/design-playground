/**
 * Pure transforms over the flat component registry. No React, no I/O —
 * safe to unit-test directly with sample registry lists.
 */

import type { RegistryLeafItem } from "@pg/registry";

/**
 * Build a map of parentId -> child leaf items from the flat registry list.
 * (Named distinctly from canvas-relations' buildChildrenMap, which maps
 * canvas node relations, not registry nesting.)
 */
export function buildRegistryChildrenMap(
  items: RegistryLeafItem[],
): Map<string, RegistryLeafItem[]> {
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
