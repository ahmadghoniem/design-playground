import { create } from 'zustand';

/**
 * Store owns collapsedNodeIds (single source of truth) so IterationNode can
 * toggle without a window event; canvas hydrates from persistence and writes back.
 */
interface CollapsedNodesState {
  collapsedNodeIds: Set<string>;
  hydrate: (ids: Iterable<string>) => void;
  toggleCollapsed: (nodeId: string) => void;
  setCollapsedNodeIds: (
    ids: Set<string> | ((prev: Set<string>) => Set<string>),
  ) => void;
}

export const useCollapsedNodesStore = create<CollapsedNodesState>((set) => ({
  collapsedNodeIds: new Set(),
  hydrate: (ids) => set({ collapsedNodeIds: new Set(ids) }),
  toggleCollapsed: (nodeId) =>
    set((s) => {
      const next = new Set(s.collapsedNodeIds);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return { collapsedNodeIds: next };
    }),
  setCollapsedNodeIds: (ids) =>
    set((s) => ({
      collapsedNodeIds: typeof ids === 'function' ? ids(s.collapsedNodeIds) : ids,
    })),
}));
