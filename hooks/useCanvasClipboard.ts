import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import type { Node } from "@xyflow/react";
import type { GenerationCoordination } from "./useGenerationCoordination";

export interface UseCanvasClipboardParams {
  coord: GenerationCoordination;
  getNodeId: () => string;
  setNodes: Dispatch<SetStateAction<Node[]>>;
}

export function useCanvasClipboard({
  coord,
  getNodeId,
  setNodes,
}: UseCanvasClipboardParams) {
  const clipboardRef = useRef<Node[]>([]);

  const collectCopyableSelection = useCallback((): Node[] => {
    const all = coord.getNodes();
    const selected = all.filter(
      (n) => n.selected && n.type !== "skeleton" && n.type !== "drag-ghost",
    );
    const ids = new Set(selected.map((n) => n.id));
    for (const n of selected) {
      if (n.type === "frame") {
        for (const c of all) if (c.parentId === n.id) ids.add(c.id);
      }
    }
    return all.filter((n) => ids.has(n.id));
  }, [coord]);

  const cloneNodes = useCallback(
    (sources: Node[], dx: number, dy: number): Node[] => {
      const idMap = new Map<string, string>();
      for (const n of sources) idMap.set(n.id, getNodeId());
      const clones = sources.map((n) => {
        const parented = Boolean(n.parentId && idMap.has(n.parentId));
        return {
          ...n,
          id: idMap.get(n.id) as string,
          parentId: parented ? idMap.get(n.parentId as string) : undefined,
          extent: parented ? n.extent : undefined,
          position: parented
            ? n.position
            : { x: n.position.x + dx, y: n.position.y + dy },
          selected: true,
          data: { ...(n.data as Record<string, unknown>) },
        } as Node;
      });
      clones.sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0));
      return clones;
    },
    [getNodeId],
  );

  const handleCopyNodes = useCallback(() => {
    const sel = collectCopyableSelection();
    if (sel.length === 0) return false;
    clipboardRef.current = sel;
    return true;
  }, [collectCopyableSelection]);

  const handlePasteNodes = useCallback(() => {
    const sources = clipboardRef.current;
    if (sources.length === 0) return false;
    const clones = cloneNodes(sources, 28, 28);
    clipboardRef.current = clones.map((c) => ({
      ...c,
      data: { ...(c.data as Record<string, unknown>) },
    }));
    setNodes((nds) =>
      nds.map((n) => ({ ...n, selected: false })).concat(clones),
    );
    return true;
  }, [cloneNodes, setNodes]);

  const handleDuplicateNodes = useCallback(() => {
    const sources = collectCopyableSelection();
    if (sources.length === 0) return false;
    const clones = cloneNodes(sources, 28, 28);
    setNodes((nds) =>
      nds.map((n) => ({ ...n, selected: false })).concat(clones),
    );
    return true;
  }, [collectCopyableSelection, cloneNodes, setNodes]);

  return {
    handleCopyNodes,
    handlePasteNodes,
    handleDuplicateNodes,
  };
}
