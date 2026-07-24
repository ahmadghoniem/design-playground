import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { Node } from "@xyflow/react";
import type { CanvasRelation } from "@pg/features/canvas/canvas-relations";

export interface UseCanvasClearParams {
  showClearDialog: boolean;
  setShowClearDialog: Dispatch<SetStateAction<boolean>>;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setRelations: Dispatch<SetStateAction<CanvasRelation[]>>;
  setKnownIterations: Dispatch<SetStateAction<string[]>>;
  setCollapsedNodeIds: Dispatch<SetStateAction<Set<string>>>;
  storageKey: string;
}

export function useCanvasClear({
  setShowClearDialog,
  setNodes,
  setRelations,
  setKnownIterations,
  setCollapsedNodeIds,
  storageKey,
}: UseCanvasClearParams) {
  const confirmClearAllNodes = useCallback(async () => {
    try {
      await fetch("/playground/api/generate", {
        method: "DELETE",
      });
    } catch (error) {
      console.error(
        "[Playground] Error cancelling generation during clear:",
        error,
      );
    }

    try {
      const response = await fetch("/playground/api/iterations");
      if (response.ok) {
        const data = (await response.json()) as {
          iterations?: { filename: string }[];
        };
        const iterationFilenames = (data.iterations ?? []).map(
          (iter) => iter.filename,
        );

        await Promise.all(
          iterationFilenames.map(async (filename) => {
            try {
              await fetch("/playground/api/iterations", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename, mode: "cascade" as const }),
              });
            } catch (error) {
              console.error(
                `Error deleting iteration file ${filename}:`,
                error,
              );
            }
          }),
        );
      }
    } catch (error) {
      console.error("Error clearing iteration files:", error);
    }

    setNodes([]);
    setRelations([]);
    setKnownIterations([]);
    setCollapsedNodeIds(new Set());

    localStorage.removeItem(storageKey);

    setShowClearDialog(false);
  }, [
    setNodes,
    setRelations,
    setKnownIterations,
    setCollapsedNodeIds,
    storageKey,
  ]);

  return {
    confirmClearAllNodes,
  };
}
