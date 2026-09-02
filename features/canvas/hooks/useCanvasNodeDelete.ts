import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Node } from "@xyflow/react";
import type { CanvasRelation } from "@pg/shared/lib/canvas-persistence";
import { getChildIds } from "@pg/features/canvas/canvas-relations";

export interface UseCanvasNodeDeleteParams {
  nodes: Node[];
  relations: CanvasRelation[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setRelations: Dispatch<SetStateAction<CanvasRelation[]>>;
  setKnownIterations: Dispatch<SetStateAction<string[]>>;
  setCollapsedNodeIds: Dispatch<SetStateAction<Set<string>>>;
}

export function useCanvasNodeDelete({
  nodes,
  relations,
  setNodes,
  setRelations,
  setKnownIterations,
  setCollapsedNodeIds,
}: UseCanvasNodeDeleteParams) {
  const [deleteDialogNode, setDeleteDialogNode] = useState<Node | null>(null);

  const onNodesDelete = useCallback(
    async (deletedNodes: Node[]) => {
      for (const node of deletedNodes) {
        if (node.type === "image" && node.data.filename) {
          try {
            await fetch("/playground/api/images", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filename: node.data.filename }),
            });
          } catch (error) {
            console.error("Error deleting image file:", error);
          }
        } else if (node.type === "iteration" && node.data.filename) {
          if (getChildIds(relations, node.id).length > 0) {
            setDeleteDialogNode(node);
            return;
          }

          try {
            await fetch("/playground/api/iterations", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filename: node.data.filename }),
            });
            setKnownIterations((prev) =>
              prev.filter((f) => f !== node.data.filename),
            );
          } catch (error) {
            console.error("Error deleting iteration file:", error);
          }
        }
      }
    },
    [relations, setKnownIterations],
  );

  const handleDeleteWithMode = useCallback(
    async (mode: "cascade" | "reparent") => {
      const node = deleteDialogNode;
      if (!node || !node.data.filename) return;

      try {
        const resp = await fetch("/playground/api/iterations", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: node.data.filename, mode }),
        });

        if (!resp.ok) {
          console.error("[Playground] Delete failed:", resp.status);
          setDeleteDialogNode(null);
          return;
        }

        const { deletedFiles } = (await resp.json()) as {
          deletedFiles: string[];
        };

        if (mode === "cascade") {
          const deletedSet = new Set(deletedFiles);

          const nodeIdsToRemove = new Set<string>();
          nodes.forEach((n) => {
            if (n.id === node.id) nodeIdsToRemove.add(n.id);
            if (n.data.filename && deletedSet.has(n.data.filename as string)) {
              nodeIdsToRemove.add(n.id);
            }
          });

          setNodes((nds) => nds.filter((n) => !nodeIdsToRemove.has(n.id)));
          setRelations((rels) =>
            rels.filter(
              (r) =>
                !nodeIdsToRemove.has(r.parentId) &&
                !nodeIdsToRemove.has(r.childId),
            ),
          );
          setKnownIterations((prev) => prev.filter((f) => !deletedSet.has(f)));

          setCollapsedNodeIds((prev) => {
            const next = new Set(prev);
            nodeIdsToRemove.forEach((id) => next.delete(id));
            return next;
          });
        } else {
          // Reparent: reconnect children to the deleted node's parent
          const parentRelation = relations.find((r) => r.childId === node.id);
          const parentId = parentRelation?.parentId;

          const childNodeIds = getChildIds(relations, node.id);

          setNodes((nds) => nds.filter((n) => n.id !== node.id));

          setRelations((rels) => {
            const filtered = rels.filter(
              (r) => r.parentId !== node.id && r.childId !== node.id,
            );
            if (parentId) {
              const newRelations: CanvasRelation[] = childNodeIds.map(
                (childId) => ({
                  parentId,
                  childId,
                  kind: "iteration",
                }),
              );
              return [...filtered, ...newRelations];
            }
            return filtered;
          });

          setKnownIterations((prev) =>
            prev.filter((f) => f !== node.data.filename),
          );

          setCollapsedNodeIds((prev) => {
            const next = new Set(prev);
            next.delete(node.id);
            return next;
          });
        }
      } catch (error) {
        console.error("[Playground] Delete error:", error);
      } finally {
        setDeleteDialogNode(null);
      }
    },
    [
      deleteDialogNode,
      nodes,
      relations,
      setNodes,
      setRelations,
      setKnownIterations,
      setCollapsedNodeIds,
    ],
  );

  return {
    onNodesDelete,
    deleteDialogNode,
    setDeleteDialogNode,
    handleDeleteWithMode,
  };
}
