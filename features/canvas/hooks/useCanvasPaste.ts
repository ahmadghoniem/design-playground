import {
  useEffect,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type { Node } from "@xyflow/react";
import { classifyClipboard, nextFrameNumber } from "@pg/features/canvas/canvas-paste";
import { wrapJsxComponent } from "@pg/features/canvas/jsx-utils";
import {
  JSX_ID_PREFIX,
  JSX_COMPONENT_ADDED_EVENT,
  DEFAULT_COMPONENT_NODE_WIDTH,
  DEFAULT_COMPONENT_NODE_HEIGHT,
} from "@pg/shared/lib/constants";
import { toast } from "sonner";

export interface UseCanvasPasteParams {
  reactFlowWrapper: RefObject<HTMLDivElement | null>;
  screenToFlowPosition: (position: { x: number; y: number }) => {
    x: number;
    y: number;
  };
  getNodeId: () => string;
  setNodes: Dispatch<SetStateAction<Node[]>>;
}

export function useCanvasPaste({
  reactFlowWrapper,
  screenToFlowPosition,
  getNodeId,
  setNodes,
}: UseCanvasPasteParams): void {
  // Paste images or HTML from clipboard onto the canvas
  useEffect(() => {
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return;

    const handlePaste = async (e: ClipboardEvent) => {
      // Don't intercept pastes into text inputs
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          (active as HTMLElement).isContentEditable)
      ) {
        return;
      }

      // Pure classification decides which node a paste becomes; this handler
      // owns the I/O (upload, frame-file writes, node insertion) each drives.
      const intent = classifyClipboard(e.clipboardData ?? null);
      if (intent.kind === "none") return;
      e.preventDefault();

      // Drop the new node at the current viewport centre (computed lazily so
      // image/JSX/HTML pastes place correctly after their awaited round-trip).
      const centerPosition = () => {
        const wrapperBounds = wrapper.getBoundingClientRect();
        return screenToFlowPosition({
          x: wrapperBounds.left + wrapperBounds.width / 2,
          y: wrapperBounds.top + wrapperBounds.height / 2,
        });
      };

      // --- Image paste (takes priority) ---
      if (intent.kind === "image") {
        const file = intent.file;
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          try {
            const res = await fetch("/playground/api/images", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageBase64: base64,
                originalName:
                  file.name ||
                  `pasted-image.${file.type.split("/")[1] || "png"}`,
              }),
            });
            const data = await res.json();
            if (data.success) {
              const position = centerPosition();
              const newNode: Node = {
                id: getNodeId(),
                type: "image",
                position,
                style: { width: 300, height: 250 },
                data: {
                  imagePath: data.path,
                  imageUrl: data.url,
                  filename: data.filename,
                  originalName: file.name || "Pasted Image",
                },
              };
              setNodes((nds) => nds.concat(newNode));
            }
          } catch (err) {
            console.error("[Playground] Image paste upload failed:", err);
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      // --- JSX paste (checked before HTML since JSX also contains HTML tags) ---
      if (intent.kind === "jsx") {
        try {
          // Determine next frame number by scanning existing JSX components
          const jsxRes = await fetch("/playground/api/oncanvas-components").catch(() => null);
          const jsxFilenames: string[] = [];
          if (jsxRes?.ok) {
            const { components } = (await jsxRes.json()) as {
              components: { filename: string }[];
            };
            for (const comp of components) jsxFilenames.push(comp.filename);
          }
          const frameNumber = nextFrameNumber(jsxFilenames);

          const frameName = `frame-${frameNumber}`;
          const componentName = `Frame${frameNumber}`;
          const filename = `${frameName}.tsx`;
          const wrappedJsx = wrapJsxComponent(intent.source, componentName);

          const res = await fetch("/playground/api/oncanvas-components", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename, content: wrappedJsx }),
          });
          const data = await res.json();

          if (!res.ok) {
            console.error("[Playground] JSX paste failed:", data.error);
            toast.error(data.error || "Failed to create frame from pasted JSX");
            return;
          }

          const position = centerPosition();
          const newNode: Node = {
            id: getNodeId(),
            type: "component",
            position,
            data: {
              componentId: `${JSX_ID_PREFIX}${frameName}`,
              renderMode: "jsx" as const,
              jsxFile: filename,
            },
          };
          setNodes((nds) => nds.concat(newNode));

          // Delay event dispatch to give the bundler (HMR) time to recompile
          // the updated barrel index after the new file is written to disk.
          // Retry a few times in case the first attempt is too early.
          const dispatchWithRetry = (attempts: number, delay: number) => {
            setTimeout(() => {
              window.dispatchEvent(new Event(JSX_COMPONENT_ADDED_EVENT));
              if (attempts > 1) {
                dispatchWithRetry(attempts - 1, delay * 2);
              }
            }, delay);
          };
          dispatchWithRetry(3, 500);
        } catch (err) {
          console.error("[Playground] JSX paste failed:", err);
          toast.error("Failed to create frame from pasted JSX");
        }
        return;
      }
    };

    wrapper.addEventListener("paste", handlePaste);
    return () => wrapper.removeEventListener("paste", handlePaste);
  }, [reactFlowWrapper, screenToFlowPosition, getNodeId, setNodes]);
}
