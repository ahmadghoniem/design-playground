// Canvas flow-state source. Provides a unified { nodes, relations, setNodes,
// setRelations, onNodesChange } shape so the giant PlaygroundCanvas component
// doesn't care about the underlying state implementation.
//
// `relations` are explicit parent→child iteration records (see canvas-relations.ts).
// They were previously modelled as React Flow `Edge[]` state, but edges were
// never rendered, so there is no React Flow edge state, `onEdgesChange`, or
// edge styling here anymore.
//
// This provider is also the single loader of persisted canvas state: it reads
// localStorage once (lazily) and exposes the loaded snapshot via `initialState`,
// so PlaygroundCanvas never reads localStorage itself.

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  useNodesState,
  type Node,
  type NodeChange,
  type OnNodesChange,
} from "@xyflow/react";
import {
  loadCanvasState,
  type CanvasState,
  type CanvasRelation,
} from "@pg/shared/lib/canvas-persistence";

export interface CanvasFlowState {
  nodes: Node[];
  relations: CanvasRelation[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setRelations: Dispatch<SetStateAction<CanvasRelation[]>>;
  onNodesChange: OnNodesChange<Node>;
  isLoading: boolean;
  /** The persisted snapshot loaded once at mount (null when nothing stored). */
  initialState: CanvasState | null;
  /** Restore the previous canvas snapshot (no-op when history is empty). */
  undo: () => void;
  /** Re-apply the last undone snapshot (no-op when there is nothing to redo). */
  redo: () => void;
  /** True when there is at least one snapshot to undo (drives button state). */
  canUndo: boolean;
  /** True when there is at least one undone snapshot to re-apply. */
  canRedo: boolean;
}

interface CanvasSnapshot {
  nodes: Node[];
  relations: CanvasRelation[];
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
  const [relations, setRelations] = useState<CanvasRelation[]>(initial?.relations ?? []);

  // Snapshot-based history. Refs mirror the latest committed state so a snapshot
  // can be captured at the moment a mutation begins (before React re-renders).
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const relationsRef = useRef(relations);
  relationsRef.current = relations;

  const pastRef = useRef<CanvasSnapshot[]>([]);
  const futureRef = useRef<CanvasSnapshot[]>([]);
  const draggingRef = useRef(false);

  // The stacks themselves are refs (so a snapshot can be taken mid-mutation,
  // before React re-renders). Refs don't re-render, so these two booleans mirror
  // the stack depths purely to drive UI enabled/disabled state. Every mutation
  // of either stack must call syncHistoryFlags(). Re-render cost is nil when the
  // value is unchanged — React bails out on an identical setState value.
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const syncHistoryFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  // Capture the CURRENT (pre-mutation) state as a history entry.
  const commit = useCallback(() => {
    pastRef.current.push({ nodes: nodesRef.current, relations: relationsRef.current });
    if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
    futureRef.current = [];
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  // Imperative setters used across the canvas — each call is a discrete action,
  // so snapshot first, then apply.
  const setNodesWithHistory = useCallback<Dispatch<SetStateAction<Node[]>>>(
    (arg) => {
      commit();
      setNodes(arg);
    },
    [commit, setNodes],
  );
  const setRelationsWithHistory = useCallback<Dispatch<SetStateAction<CanvasRelation[]>>>(
    (arg) => {
      commit();
      setRelations(arg);
    },
    [commit],
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

  // Undo/redo apply snapshots through the RAW setters so they don't re-enter history.
  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push({ nodes: nodesRef.current, relations: relationsRef.current });
    setNodes(prev.nodes);
    setRelations(prev.relations);
    syncHistoryFlags();
  }, [setNodes, syncHistoryFlags]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push({ nodes: nodesRef.current, relations: relationsRef.current });
    setNodes(next.nodes);
    setRelations(next.relations);
    syncHistoryFlags();
  }, [setNodes, syncHistoryFlags]);

  const value: CanvasFlowState = {
    nodes,
    relations,
    setNodes: setNodesWithHistory,
    setRelations: setRelationsWithHistory,
    onNodesChange: onNodesChangeWithHistory,
    isLoading: false,
    initialState: initial,
    undo,
    redo,
    canUndo,
    canRedo,
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
