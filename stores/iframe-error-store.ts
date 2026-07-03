import { create } from 'zustand';

/**
 * Console/window errors reported by HTML-preview iframes, keyed by canvas
 * node id. Written by the node components' bridge onConsoleError handler,
 * read by the same nodes' error badges — a store (rather than node state)
 * so the generation flows can clear a node's errors from outside the node.
 */
interface IframeErrorState {
  errors: Record<string, string[]>;
  addError: (nodeId: string, text: string) => void;
  clearErrors: (nodeId: string) => void;
}

const MAX_ERRORS_PER_NODE = 20;

export const useIframeErrorStore = create<IframeErrorState>((set) => ({
  errors: {},
  addError: (nodeId, text) =>
    set((state) => {
      const existing = state.errors[nodeId] ?? [];
      if (existing.includes(text) || existing.length >= MAX_ERRORS_PER_NODE) {
        return state;
      }
      return { errors: { ...state.errors, [nodeId]: [...existing, text] } };
    }),
  clearErrors: (nodeId) =>
    set((state) => {
      if (!(nodeId in state.errors)) return state;
      const next = { ...state.errors };
      delete next[nodeId];
      return { errors: next };
    }),
}));
