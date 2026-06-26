"use client";

// Canvas flow-state source. Provides a unified { nodes, edges, setNodes, setEdges,
// onNodesChange, onEdgesChange } shape so the giant PlaygroundCanvas component doesn't care
// about the underlying state implementation.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  useEdgesState,
  useNodesState,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { loadCanvasState } from "./canvas-persistence";
import { countNodeAdded, type CountableNodeType } from "./telemetry/activity";

// Telemetry: aggregate counts of nodes added to the canvas ("frames generated"
// in the time_summary event) — types and counts only, never node content.
const COUNTABLE_NODE_TYPES: Record<string, CountableNodeType> = {
  component: "component",
  iteration: "iteration",
  image: "image",
  pdf: "pdf",
  text: "text",
  stage: "stage",
  stageGroup: "stage",
};

/**
 * Counts nodes that newly appear in the flow state. The first render seeds the
 * seen-set without counting so hydration (localStorage) isn't reported as user
 * activity. Skeletons/ghosts are intentionally ignored.
 */
function useNodeAddTelemetry(nodes: Node[]): void {
  const seenIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (seenIds.current === null) {
      seenIds.current = new Set(nodes.map((n) => n.id));
      return;
    }
    const seen = seenIds.current;
    for (const node of nodes) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      const countable = node.type ? COUNTABLE_NODE_TYPES[node.type] : undefined;
      if (countable) countNodeAdded(countable);
    }
  }, [nodes]);
}

export interface CanvasFlowState {
  nodes: Node[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  onNodesChange: OnNodesChange<Node>;
  onEdgesChange: OnEdgesChange<Edge>;
  isLoading: boolean;
  /** Restore the previous canvas snapshot (no-op when history is empty). */
  undo: () => void;
  /** Re-apply the last undone snapshot (no-op when there is nothing to redo). */
  redo: () => void;
}

interface CanvasSnapshot {
  nodes: Node[];
  edges: Edge[];
}

const HISTORY_LIMIT = 100;

const CanvasFlowContext = createContext<CanvasFlowState | null>(null);

export function useCanvasFlow(): CanvasFlowState {
  const ctx = useContext(CanvasFlowContext);
  if (!ctx) throw new Error("useCanvasFlow must be used within <CanvasFlowProvider>");
  return ctx;
}

/** Classic local React Flow state seeded from localStorage, with undo/redo. */
function SoloFlowProvider({ children, storageKey }: { children: ReactNode; storageKey?: string }) {
  const [initial] = useState(() => loadCanvasState(storageKey));
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initial?.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial?.edges ?? []);
  useNodeAddTelemetry(nodes);

  // Snapshot-based history. Refs mirror the latest committed state so a snapshot
  // can be captured at the moment a mutation begins (before React re-renders).
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  const pastRef = useRef<CanvasSnapshot[]>([]);
  const futureRef = useRef<CanvasSnapshot[]>([]);
  const draggingRef = useRef(false);

  // Capture the CURRENT (pre-mutation) state as a history entry.
  const commit = useCallback(() => {
    pastRef.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
    futureRef.current = [];
  }, []);

  // Imperative setters used across the canvas — each call is a discrete action,
  // so snapshot first, then apply.
  const setNodesWithHistory = useCallback<Dispatch<SetStateAction<Node[]>>>(
    (arg) => {
      commit();
      setNodes(arg);
    },
    [commit, setNodes],
  );
  const setEdgesWithHistory = useCallback<Dispatch<SetStateAction<Edge[]>>>(
    (arg) => {
      commit();
      setEdges(arg);
    },
    [commit, setEdges],
  );

  // Native interactions (drag/select/delete) flow through onNodesChange. Only
  // commit on meaningful boundaries: structural changes, and the first frame of
  // a drag (so one drag = one undo step). Select/dimensions are ignored.
  const onNodesChangeWithHistory = useCallback<OnNodesChange<Node>>(
    (changes) => {
      let commitNeeded = false;
      for (const c of changes as NodeChange<Node>[]) {
        if (c.type === "add" || c.type === "remove" || c.type === "replace") {
          commitNeeded = true;
        } else if (c.type === "position") {
          if (c.dragging && !draggingRef.current) {
            commitNeeded = true;
            draggingRef.current = true;
          } else if (!c.dragging) {
            draggingRef.current = false;
          }
        }
      }
      if (commitNeeded) commit();
      onNodesChange(changes);
    },
    [commit, onNodesChange],
  );

  const onEdgesChangeWithHistory = useCallback<OnEdgesChange<Edge>>(
    (changes) => {
      const commitNeeded = (changes as EdgeChange<Edge>[]).some(
        (c) => c.type === "add" || c.type === "remove" || c.type === "replace",
      );
      if (commitNeeded) commit();
      onEdgesChange(changes);
    },
    [commit, onEdgesChange],
  );

  // Undo/redo apply snapshots through the RAW setters so they don't re-enter history.
  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    setNodes(prev.nodes);
    setEdges(prev.edges);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [setNodes, setEdges]);

  const value: CanvasFlowState = {
    nodes,
    edges,
    setNodes: setNodesWithHistory,
    setEdges: setEdgesWithHistory,
    onNodesChange: onNodesChangeWithHistory,
    onEdgesChange: onEdgesChangeWithHistory,
    isLoading: false,
    undo,
    redo,
  };
  return <CanvasFlowContext.Provider value={value}>{children}</CanvasFlowContext.Provider>;
}

export function CanvasFlowProvider({
  children,
  storageKey,
}: {
  children: ReactNode;
  /** Project-scoped localStorage key for persistence. */
  storageKey?: string;
}) {
  return <SoloFlowProvider storageKey={storageKey}>{children}</SoloFlowProvider>;
}
