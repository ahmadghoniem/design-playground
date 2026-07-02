import {
  useCallback,
  type Dispatch,
  type DragEvent,
  type SetStateAction,
} from "react";
import type { Edge, Node } from "@xyflow/react";
import { getIterationKeysOnCanvas } from "../lib/canvas-persistence";
import { wrapHtmlFragment } from "../lib/html-utils";
import type { GenerationCoordination } from "./useGenerationCoordination";
import {
  DND_DATA_KEY,
  HTML_ID_PREFIX,
  JSX_ID_PREFIX,
  DESIGN_SYSTEM_SHOWCASE_ID,
  ITERATION_EDGE_STYLE,
  ARRANGE_HORIZONTAL_GAP,
  DEFAULT_COMPONENT_NODE_WIDTH,
  DEFAULT_ITERATION_NODE_WIDTH,
  type JsxComponentInfo,
} from "../lib/constants";
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

        // Check for HTML file drops
        const htmlFiles = Array.from(files).filter((f) =>
          /\.(html?|htm)$/i.test(f.name),
        );
        if (htmlFiles.length > 0) {
          const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });

          (async () => {
            // Determine next frame number
            let frameNumber = 1;
            const [htmlRes, jsxRes] = await Promise.all([
              fetch("/playground/api/html-pages").catch(() => null),
              fetch("/playground/api/oncanvas-components").catch(() => null),
            ]);
            if (htmlRes?.ok) {
              const { pages } = (await htmlRes.json()) as {
                pages: { folder: string }[];
              };
              for (const page of pages) {
                const match = page.folder.match(/^frame-(\d+)$/);
                if (match)
                  frameNumber = Math.max(
                    frameNumber,
                    parseInt(match[1], 10) + 1,
                  );
              }
            }
            if (jsxRes?.ok) {
              const { components } = (await jsxRes.json()) as {
                components: { filename: string }[];
              };
              for (const comp of components) {
                const match = comp.filename.match(/^frame-(\d+)\.tsx$/);
                if (match)
                  frameNumber = Math.max(
                    frameNumber,
                    parseInt(match[1], 10) + 1,
                  );
              }
            }

            for (let idx = 0; idx < htmlFiles.length; idx++) {
              const file = htmlFiles[idx];
              try {
                const text = await file.text();
                const wrappedHtml = wrapHtmlFragment(text);
                const frameName = `frame-${frameNumber + idx}`;

                const res = await fetch("/playground/api/html-pages", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: frameName,
                    content: wrappedHtml,
                  }),
                });
                const data = await res.json();

                if (!res.ok) {
                  console.error(
                    "[Playground] HTML file drop failed:",
                    data.error,
                  );
                  toast.error(
                    data.error || "Failed to create frame from dropped HTML",
                  );
                  continue;
                }

                const pageId = data.page.id as string;
                const folder = data.page.folder as string;

                const newNode: Node = {
                  id: getNodeId(),
                  type: "component",
                  position: { x: position.x + idx * 320, y: position.y },
                  data: {
                    componentId: pageId,
                    renderMode: "html" as const,
                    htmlFolder: folder,
                  },
                };
                setNodes((nds) => nds.concat(newNode));
              } catch (err) {
                console.error("[Playground] HTML file drop failed:", err);
                toast.error("Failed to create frame from dropped HTML");
              }
            }
          })();
          return;
        }
      }

      const componentId = event.dataTransfer.getData(DND_DATA_KEY);
      if (!componentId) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const isHtml = componentId.startsWith(HTML_ID_PREFIX);
      const isJsxFrame = componentId.startsWith(JSX_ID_PREFIX);
      const isDesignSystem = componentId === DESIGN_SYSTEM_SHOWCASE_ID;
      const parentNodeId = getNodeId();
      const newNode: Node = {
        id: parentNodeId,
        type: "component",
        position,
        data: {
          componentId,
          ...(isHtml
            ? {
                renderMode: "html" as const,
                htmlFolder: componentId.slice(HTML_ID_PREFIX.length),
              }
            : {}),
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
      if (isHtml || isJsxFrame || !isDesignSystem) {
        (async () => {
          try {
            const currentNodes = coord.getNodes();
            const parentW = DEFAULT_COMPONENT_NODE_WIDTH;
            const stepW =
              (isHtml || isJsxFrame
                ? isHtml
                  ? DEFAULT_COMPONENT_NODE_WIDTH
                  : DEFAULT_ITERATION_NODE_WIDTH
                : DEFAULT_ITERATION_NODE_WIDTH) + ARRANGE_HORIZONTAL_GAP;
            const baseX = position.x + parentW + ARRANGE_HORIZONTAL_GAP;
            const newNodes: Node[] = [];
            const newEdges: Edge[] = [];
            const newKnownFilenames: string[] = [];

            if (isHtml) {
              const htmlFolder = componentId.slice(HTML_ID_PREFIX.length);
              const res = await fetch("/playground/api/html-pages");
              if (!res.ok) return;
              const { pages } = (await res.json()) as {
                pages: {
                  folder: string;
                  iterations: { folder: string; number: number }[];
                }[];
              };
              const page = pages.find((p) => p.folder === htmlFolder);
              if (!page || page.iterations.length === 0) return;

              const existingKeys = getIterationKeysOnCanvas(currentNodes);

              const missing = page.iterations
                .filter((it) => !existingKeys.has(`${htmlFolder}/${it.folder}`))
                .sort((a, b) => a.number - b.number);

              missing.forEach((iter, idx) => {
                const nodeId = getNodeId();
                newNodes.push({
                  id: nodeId,
                  type: "iteration",
                  position: { x: baseX + idx * stepW, y: position.y },
                  data: {
                    componentName: htmlFolder,
                    iterationNumber: iter.number,
                    filename: `${htmlFolder}/iteration-${iter.number}`,
                    description: "",
                    parentNodeId,
                    renderMode: "html",
                    htmlFolder,
                    htmlIterationFolder: iter.folder,
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
                newKnownFilenames.push(`${htmlFolder}/${iter.folder}`);
              });
            } else if (isJsxFrame) {
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
    ],
  );

  return { onDragOver, onDrop };
}
