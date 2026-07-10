import {
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type { Node } from "@xyflow/react";
import type { ShapeKind } from "../nodes/ShapeNode";

type CanvasTool = "select" | "text" | "shape" | "hand";

interface UseCanvasDrawToolParams {
  /** Current canvas tool — the hook's listeners only arm while this is 'shape'. */
  activeTool: CanvasTool;
  reactFlowWrapper: RefObject<HTMLDivElement | null>;
  screenToFlowPosition: (pos: { x: number; y: number }) => {
    x: number;
    y: number;
  };
  /** Selected annotation-shape kind for the drag-to-draw shape tool. */
  shapeKind: ShapeKind;
  getNodeId: () => string;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setActiveTool: (tool: CanvasTool) => void;
}

/**
 * Drag-to-draw annotation shapes ('shape') on the empty canvas: rubber-band a
 * box in flow coords off the `.react-flow__pane`, ignoring drags that start on a
 * node, then create a `shape` node sized to the box (or a default-sized one on a
 * click) and return to the select tool.
 *
 * This is a pure listener-shell seam extracted from PlaygroundCanvas: every
 * piece of canvas state it touches is passed in, so it never reaches back into
 * the parent.
 */
export function useCanvasDrawTool({
  activeTool,
  reactFlowWrapper,
  screenToFlowPosition,
  shapeKind,
  getNodeId,
  setNodes,
  setActiveTool,
}: UseCanvasDrawToolParams) {
  // Drag-to-draw annotation shapes (rect / ellipse / line) on the empty canvas:
  // rubber-band a box in flow coords, then on release create a `shape` node sized
  // to that box and return to the select tool.
  const shapeKindRef = useRef<ShapeKind>(shapeKind);
  useEffect(() => {
    shapeKindRef.current = shapeKind;
  }, [shapeKind]);

  useEffect(() => {
    if (activeTool !== "shape") return;
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return;

    let drawing = false;
    let startFlow: { x: number; y: number } | null = null;
    let startScreen: { x: number; y: number } | null = null;
    let previewEl: HTMLDivElement | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const pane = wrapper.querySelector(".react-flow__pane");
      if (!pane?.contains(e.target as globalThis.Node)) return;
      if ((e.target as Element).closest(".react-flow__node")) return;

      drawing = true;
      startFlow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      startScreen = { x: e.clientX, y: e.clientY };
      previewEl = document.createElement("div");
      previewEl.style.cssText =
        "position:fixed;z-index:9999;pointer-events:none;border:2px dashed #1e9bff;background:rgba(30,155,255,0.06);border-radius:4px;";
      previewEl.style.left = `${e.clientX}px`;
      previewEl.style.top = `${e.clientY}px`;
      document.body.appendChild(previewEl);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drawing || !previewEl || !startScreen) return;
      previewEl.style.left = `${Math.min(startScreen.x, e.clientX)}px`;
      previewEl.style.top = `${Math.min(startScreen.y, e.clientY)}px`;
      previewEl.style.width = `${Math.abs(e.clientX - startScreen.x)}px`;
      previewEl.style.height = `${Math.abs(e.clientY - startScreen.y)}px`;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!drawing || !startFlow) return;
      drawing = false;
      if (previewEl) {
        previewEl.remove();
        previewEl = null;
      }
      const endFlow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const kind = shapeKindRef.current;
      let x = Math.min(startFlow.x, endFlow.x);
      let y = Math.min(startFlow.y, endFlow.y);
      let w = Math.abs(endFlow.x - startFlow.x);
      let h = Math.abs(endFlow.y - startFlow.y);

      // Click without meaningful drag → drop a sensible default-sized shape.
      if (w < 8 && h < 8) {
        w = kind === "line" ? 160 : 140;
        h = kind === "line" ? 60 : 90;
        x = startFlow.x;
        y = startFlow.y;
      }

      const newNode: Node = {
        id: getNodeId(),
        type: "shape",
        position: { x, y },
        width: Math.max(w, 12),
        height: Math.max(h, kind === "line" ? 1 : 12),
        selected: true,
        data: { shape: kind, autofocus: true },
      };
      startFlow = null;
      startScreen = null;
      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        newNode,
      ]);
      setActiveTool("select");
    };

    wrapper.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      wrapper.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      if (previewEl) previewEl.remove();
    };
  }, [
    activeTool,
    screenToFlowPosition,
    getNodeId,
    setNodes,
    reactFlowWrapper,
    setActiveTool,
  ]);
}
