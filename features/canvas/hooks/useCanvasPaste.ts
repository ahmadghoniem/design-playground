import {
  useEffect,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type { Node } from "@xyflow/react";
import { classifyClipboard } from "@pg/features/canvas/canvas-paste";

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
      // the image paste places correctly after its awaited round-trip).
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
    };

    wrapper.addEventListener("paste", handlePaste);
    return () => wrapper.removeEventListener("paste", handlePaste);
  }, [reactFlowWrapper, screenToFlowPosition, getNodeId, setNodes]);
}
