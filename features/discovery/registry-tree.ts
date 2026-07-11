/**
 * Pure transforms over the component registry tree. No React, no I/O —
 * safe to unit-test directly with sample registry trees.
 */

import { RegistryItem, RegistryLeafItem, isGroup, isLeaf } from '@pg/registry';
import type { ComponentSize } from '@pg/shared/lib/constants';

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

/** Pick a sensible viewport width for the preview based on the component's size hint. */
export function pickPreviewViewport(size: ComponentSize | undefined): { width: number; height: number } {
  switch (size) {
    case 'laptop': return { width: 1470, height: 832 };
    case 'tablet': return { width: 768, height: 1024 };
    case 'mobile': return { width: 393, height: 852 };
    case 'default':
    default:       return { width: 720, height: 480 };
  }
}
