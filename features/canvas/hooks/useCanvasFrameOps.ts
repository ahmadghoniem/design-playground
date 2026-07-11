import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Node } from "@xyflow/react";
import {
  DEFAULT_COMPONENT_NODE_HEIGHT,
  DEFAULT_COMPONENT_NODE_WIDTH,
} from "@pg/shared/lib/constants";
import type { HelperLineState } from "@pg/features/canvas/nodes/HelperLines";
import type { GenerationCoordination } from "@pg/features/generation/useGenerationCoordination";

type CanvasContextMenu = {
  x: number;
  y: number;
  nodeId?: string;
} | null;

export interface UseCanvasFrameOpsParams {
  coord: GenerationCoordination;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  contextMenu: CanvasContextMenu;
  getNodeId: () => string;
}

export function useCanvasFrameOps({
  coord,
  setNodes,
  contextMenu,
  getNodeId,
}: UseCanvasFrameOpsParams) {
  const [helperLines, setHelperLines] = useState<HelperLineState>({});

  // Re-stack selected nodes (or the right-clicked node) along the z-axis.
  const handleZOrder = useCallback(
    (op: "front" | "back" | "forward" | "backward") => {
      setNodes((nds) => {
        const targetIds = new Set<string>();
        for (const n of nds) if (n.selected) targetIds.add(n.id);
        if (targetIds.size === 0 && contextMenu?.nodeId)
          targetIds.add(contextMenu.nodeId);
        if (targetIds.size === 0) return nds;

        const z = (n: Node) => n.zIndex ?? 0;
        const others = nds.filter((n) => !targetIds.has(n.id));
        const targets = nds.filter((n) => targetIds.has(n.id));

        if (op === "front") {
          const max = nds.reduce((m, n) => Math.max(m, z(n)), 0);
          const next = max + 1;
          return nds.map((n) =>
            targetIds.has(n.id) ? { ...n, zIndex: next } : n,
          );
        }
        if (op === "back") {
          const min = nds.reduce((m, n) => Math.min(m, z(n)), 0);
          const next = min - 1;
          return nds.map((n) =>
            targetIds.has(n.id) ? { ...n, zIndex: next } : n,
          );
        }
        // one-step: swap zIndex with the nearest non-selected neighbor.
        const dir: 1 | -1 = op === "forward" ? 1 : -1;
        const targetZs = targets.map(z);
        const refZ = dir === 1 ? Math.max(...targetZs) : Math.min(...targetZs);
        const candidates = others
          .map(z)
          .filter((zz) => (dir === 1 ? zz > refZ : zz < refZ))
          .sort((a, b) => (dir === 1 ? a - b : b - a));
        if (candidates.length === 0) {
          // already at the extreme — bump past it so a subsequent action still has effect.
          const next = refZ + dir;
          return nds.map((n) =>
            targetIds.has(n.id) ? { ...n, zIndex: next } : n,
          );
        }
        const swapZ = candidates[0];
        const next = dir === 1 ? swapZ + 1 : swapZ - 1;
        return nds.map((n) =>
          targetIds.has(n.id) ? { ...n, zIndex: next } : n,
        );
      });
    },
    [setNodes, contextMenu],
  );

  // ---------------------------------------------------------------------------
  // Figma-style frames: Group wraps the current selection in a `frame` node and
  // re-parents the children (parentId + extent:'parent'); Ungroup reverses it.
  // ---------------------------------------------------------------------------
  const nodeDim = (n: Node): { w: number; h: number } => ({
    w:
      n.measured?.width ??
      (n.width as number | undefined) ??
      DEFAULT_COMPONENT_NODE_WIDTH,
    h:
      n.measured?.height ??
      (n.height as number | undefined) ??
      DEFAULT_COMPONENT_NODE_HEIGHT,
  });

  const handleGroupSelection = useCallback(() => {
    const FRAME_PADDING = 28;
    setNodes((nds) => {
      // Only group top-level, non-frame nodes (avoid nested-frame complexity).
      const selected = nds.filter(
        (n) =>
          n.selected &&
          !n.parentId &&
          n.type !== "frame" &&
          n.type !== "skeleton",
      );
      if (selected.length < 1) return nds;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const n of selected) {
        const { w, h } = nodeDim(n);
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + w);
        maxY = Math.max(maxY, n.position.y + h);
      }

      const frameX = minX - FRAME_PADDING;
      const frameY = minY - FRAME_PADDING;
      const frameId = getNodeId();
      const minZ = nds.reduce((m, n) => Math.min(m, n.zIndex ?? 0), 0);

      const frameNode: Node = {
        id: frameId,
        type: "frame",
        position: { x: frameX, y: frameY },
        width: maxX - minX + FRAME_PADDING * 2,
        height: maxY - minY + FRAME_PADDING * 2,
        zIndex: minZ - 1,
        selected: true,
        data: { label: "Group" },
      };

      const selectedIds = new Set(selected.map((n) => n.id));
      // Parent must precede its children in the array, so place the frame first,
      // then the reparented children, then everything else untouched.
      const updatedChildren = selected.map((n) => ({
        ...n,
        parentId: frameId,
        extent: "parent" as const,
        position: { x: n.position.x - frameX, y: n.position.y - frameY },
        selected: false,
      }));
      const rest = nds.filter((n) => !selectedIds.has(n.id));
      return [...rest, frameNode, ...updatedChildren];
    });
  }, [setNodes, getNodeId]);

  const handleUngroupFrame = useCallback(
    (frameIdArg?: string) => {
      setNodes((nds) => {
        const frame =
          (frameIdArg &&
            nds.find((n) => n.id === frameIdArg && n.type === "frame")) ||
          nds.find((n) => n.type === "frame" && n.selected);
        if (!frame) return nds;

        const fx = frame.position.x;
        const fy = frame.position.y;
        return nds
          .filter((n) => n.id !== frame.id)
          .map((n) =>
            n.parentId === frame.id
              ? {
                  ...n,
                  parentId: undefined,
                  extent: undefined,
                  position: { x: n.position.x + fx, y: n.position.y + fy },
                  selected: true,
                }
              : n,
          );
      });
    },
    [setNodes],
  );

  // Alignment guides: while dragging a top-level node, surface pink guides when
  // an edge or center lines up with another node within a small flow-space
  // threshold. Cleared on drag stop. (Child nodes use parent-relative coords, so
  // we skip them rather than draw misplaced guides.)
  const onNodeDrag = useCallback((_e: MouseEvent, node: Node) => {
    if (node.parentId) {
      setHelperLines({});
      return;
    }
    const threshold = 6;
    const { w, h } = nodeDim(node);
    const left = node.position.x;
    const right = left + w;
    const cx = left + w / 2;
    const top = node.position.y;
    const bottom = top + h;
    const cy = top + h / 2;

    let vertical: number | undefined;
    let horizontal: number | undefined;
    let bestV = threshold;
    let bestH = threshold;

    for (const o of coord.getNodes()) {
      if (o.id === node.id || o.parentId || o.type === "skeleton") continue;
      const { w: ow, h: oh } = nodeDim(o);
      const oLeft = o.position.x;
      const oRight = oLeft + ow;
      const ocx = oLeft + ow / 2;
      const oTop = o.position.y;
      const oBottom = oTop + oh;
      const ocy = oTop + oh / 2;

      const vPairs: [number, number][] = [
        [left, oLeft],
        [right, oRight],
        [cx, ocx],
        [left, oRight],
        [right, oLeft],
        [cx, oLeft],
        [cx, oRight],
      ];
      for (const [a, b] of vPairs) {
        const d = Math.abs(a - b);
        if (d < bestV) {
          bestV = d;
          vertical = b;
        }
      }
      const hPairs: [number, number][] = [
        [top, oTop],
        [bottom, oBottom],
        [cy, ocy],
        [top, oBottom],
        [bottom, oTop],
        [cy, oTop],
        [cy, oBottom],
      ];
      for (const [a, b] of hPairs) {
        const d = Math.abs(a - b);
        if (d < bestH) {
          bestH = d;
          horizontal = b;
        }
      }
    }
    setHelperLines({ vertical, horizontal });
  }, [coord.getNodes]);

  const clearHelperLines = useCallback(() => setHelperLines({}), []);

  return {
    handleZOrder,
    handleGroupSelection,
    handleUngroupFrame,
    onNodeDrag,
    clearHelperLines,
    helperLines,
  };
}
