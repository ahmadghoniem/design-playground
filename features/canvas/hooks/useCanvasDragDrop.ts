import {
  useCallback,
  type Dispatch,
  type DragEvent,
  type SetStateAction,
} from "react";
import type { Edge, Node } from "@xyflow/react";
import { getIterationKeysOnCanvas } from "@pg/shared/lib/canvas-persistence";
import type { GenerationCoordination } from "@pg/features/generation/useGenerationCoordination";
import {
  DND_DATA_KEY,
  JSX_ID_PREFIX,
  DESIGN_SYSTEM_SHOWCASE_ID,
  ITERATION_EDGE_STYLE,
  ARRANGE_HORIZONTAL_GAP,
  DEFAULT_COMPONENT_NODE_WIDTH,
  DEFAULT_ITERATION_NODE_WIDTH,
  type JsxComponentInfo,
} from "@pg/shared/lib/constants";
import { toast } from "sonner";

interface IterationFile {
  filename: string;
  componentName: string;
  iterationNumber: number;
  parentId: string;
  description: string;
  sourceIteration: string | null;
}

export interface UseCanvasDragDropParams {
  coord: GenerationCoordination;
  screenToFlowPosition: (position: { x: number; y: number }) => {
    x: number;
    y: number;
  };
  getNodeId: () => string;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  handleIterationDelete: (filename: string) => void;
  handleIterationAdopt: (filename: string, componentName: string) => void;
}

export interface UseCanvasDragDropResult {
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}

export function useCanvasDragDrop({
  coord,
  screenToFlowPosition,
  getNodeId,
  setNodes,
  setEdges,
  handleIterationDelete,
  handleIterationAdopt,
}: UseCanvasDragDropParams): UseCanvasDragDropResult {
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      // Check for image file drops
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        const imageFiles = Array.from(files).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (imageFiles.length > 0) {
          const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });
          imageFiles.forEach((file, idx) => {
            const reader = new FileReader();
            reader.onload = async () => {
              const base64 = reader.result as string;
              try {
                const res = await fetch("/playground/api/images", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    imageBase64: base64,
                    originalName: file.name,
                  }),
                });
                const data = await res.json();
                if (data.success) {
                  const newNode: Node = {
                    id: getNodeId(),
                    type: "image",
                    position: { x: position.x + idx * 320, y: position.y },
                    style: { width: 300, height: 250 },
                    data: {
                      imagePath: data.path,
                      imageUrl: data.url,
                      filename: data.filename,
                      originalName: file.name,
                    },
                  };
                  setNodes((nds) => nds.concat(newNode));
                }
              } catch (err) {
                console.error("[Playground] Image upload failed:", err);
              }
            };
            reader.readAsDataURL(file);
          });
          return;
        }

      }

      const componentId = event.dataTransfer.getData(DND_DATA_KEY);
      if (!componentId) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const isJsxFrame = componentId.startsWith(JSX_ID_PREFIX);
      const isDesignSystem = componentId === DESIGN_SYSTEM_SHOWCASE_ID;
      const parentNodeId = getNodeId();
      const newNode: Node = {
        id: parentNodeId,
        type: "component",
        position,
        data: {
          componentId,
          ...(isDesignSystem
            ? {
                renderMode: "design-system" as const,
              }
            : {}),
        },
      };

      setNodes((nds) => nds.concat(newNode));

      // After dropping a frame or registry component, also bring any of its
      // iterations that are not already on the canvas, attached to this newly placed parent.
      if (isJsxFrame || !isDesignSystem) {
        (async () => {
          try {
            const currentNodes = coord.getNodes();
            const parentW = DEFAULT_COMPONENT_NODE_WIDTH;
            const stepW =
              (isJsxFrame
                ? DEFAULT_ITERATION_NODE_WIDTH
                : DEFAULT_ITERATION_NODE_WIDTH) + ARRANGE_HORIZONTAL_GAP;
            const baseX = position.x + parentW + ARRANGE_HORIZONTAL_GAP;
            const newNodes: Node[] = [];
            const newEdges: Edge[] = [];
            const newKnownFilenames: string[] = [];

            if (isJsxFrame) {
              const baseFilename = `${componentId.slice(JSX_ID_PREFIX.length)}.tsx`;
              const res = await fetch("/playground/api/oncanvas-components");
              if (!res.ok) return;
              const { components } = (await res.json()) as {
                components: JsxComponentInfo[];
              };
              const comp = components.find((c) => c.filename === baseFilename);
              if (!comp || comp.iterations.length === 0) return;

              const existingKeys = getIterationKeysOnCanvas(currentNodes);

              const missing = comp.iterations
                .filter((it) => !existingKeys.has(it.filename))
                .sort((a, b) => a.iterationNumber - b.iterationNumber);

              missing.forEach((it, idx) => {
                const nodeId = getNodeId();
                newNodes.push({
                  id: nodeId,
                  type: "iteration",
                  position: { x: baseX + idx * stepW, y: position.y },
                  data: {
                    componentName: comp.label,
                    iterationNumber: it.iterationNumber,
                    filename: it.filename,
                    description: "",
                    parentNodeId,
                    renderMode: "jsx",
                    jsxFile: it.filename,
                    onDelete: handleIterationDelete,
                    onAdopt: handleIterationAdopt,
                  },
                });
                newEdges.push({
                  id: `edge_${parentNodeId}_${nodeId}`,
                  source: parentNodeId,
                  target: nodeId,
                  type: "smoothstep",
                  animated: false,
                  style: ITERATION_EDGE_STYLE,
                });
                newKnownFilenames.push(it.filename);
              });
            } else {
              const res = await fetch("/playground/api/iterations");
              if (!res.ok) return;
              const { iterations } = (await res.json()) as {
                iterations: IterationFile[];
              };

              const existingKeys = getIterationKeysOnCanvas(currentNodes);
              const missing = iterations
                .filter((it) => it.parentId === componentId)
                .filter((it) => !existingKeys.has(it.filename))
                .sort((a, b) => a.iterationNumber - b.iterationNumber);

              missing.forEach((it, idx) => {
                const nodeId = getNodeId();
                newNodes.push({
                  id: nodeId,
                  type: "iteration",
                  position: { x: baseX + idx * stepW, y: position.y },
                  data: {
                    componentName: it.componentName,
                    iterationNumber: it.iterationNumber,
                    filename: it.filename,
                    description: it.description,
                    parentNodeId,
                    registryId: componentId,
                    onDelete: handleIterationDelete,
                    onAdopt: handleIterationAdopt,
                  },
                });
                newEdges.push({
                  id: `edge_${parentNodeId}_${nodeId}`,
                  source: parentNodeId,
                  target: nodeId,
                  type: "smoothstep",
                  animated: false,
                  style: ITERATION_EDGE_STYLE,
                });
                newKnownFilenames.push(it.filename);
              });
            }

            if (newNodes.length > 0) {
              setNodes((nds) => [...nds, ...newNodes]);
              setEdges((eds) => [...eds, ...newEdges]);
              coord.appendKnownIterations(newKnownFilenames);
            }
          } catch (err) {
            console.error(
              "[Playground] Failed to load iterations for dropped frame:",
              err,
            );
          }
        })();
      }
    },
    [
      screenToFlowPosition,
      setNodes,
      setEdges,
      getNodeId,
      handleIterationDelete,
      handleIterationAdopt,
      coord.getNodes,
      coord.appendKnownIterations,
    ],
  );

  return { onDragOver, onDrop };
}
