import type { RefObject } from "react";
import { ShapeToolGroup } from "./ShapeToolGroup";
import {
  ProjectBoxIcon,
  CanvasSelectToolIcon,
  CanvasTextToolIcon,
  CanvasImageToolIcon,
} from "../ui/playground-nav-icons";
import type { DrawPenKind } from "../../lib/draw-types";
import type { ShapeKind } from "../../nodes/ShapeNode";

export interface PlaygroundCanvasToolbarProps {
  sidebarVisible: boolean;
  onSidebarButtonClick: () => void;
  onSidebarButtonMouseEnter: () => void;
  onHideSidebar: () => void;
  activeTool: "select" | "text" | "draw" | "shape";
  setActiveTool: (
    tool:
      | "select"
      | "text"
      | "draw"
      | "shape"
      | ((
          prev: "select" | "text" | "draw" | "shape",
        ) => "select" | "text" | "draw" | "shape"),
  ) => void;
  shapeKind: ShapeKind;
  setShapeKind: (kind: ShapeKind) => void;
  drawPenKind: DrawPenKind;
  setDrawPenKind: (kind: DrawPenKind) => void;
  imageInputRef: RefObject<HTMLInputElement | null>;
}

export default function PlaygroundCanvasToolbar({
  sidebarVisible,
  onSidebarButtonClick,
  onSidebarButtonMouseEnter,
  onHideSidebar,
  activeTool,
  setActiveTool,
  shapeKind,
  setShapeKind,
  drawPenKind,
  setDrawPenKind,
  imageInputRef,
}: PlaygroundCanvasToolbarProps) {
  return (
    <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 bg-white rounded-2xl border border-stone-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-2">
      <button
        onClick={onSidebarButtonClick}
        onMouseEnter={onSidebarButtonMouseEnter}
        onMouseLeave={onHideSidebar}
        className={`group flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
          sidebarVisible
            ? "bg-stone-100 text-stone-900"
            : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
        }`}
        aria-label={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
        title="Toggle sidebar"
      >
        <ProjectBoxIcon />
      </button>

      <div className="h-px w-5 bg-stone-200 my-0.5" />

      <button
        onClick={() => setActiveTool("select")}
        className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
          activeTool === "select"
            ? "bg-stone-100 text-stone-900"
            : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
        }`}
        aria-label="Select tool"
        title="Select (V)"
      >
        <CanvasSelectToolIcon />
      </button>

      <ShapeToolGroup
        activeTool={activeTool}
        shapeKind={shapeKind}
        drawPenKind={drawPenKind}
        setActiveTool={setActiveTool}
        setShapeKind={setShapeKind}
        setDrawPenKind={setDrawPenKind}
      />

      <button
        onClick={() =>
          setActiveTool((prev) => (prev === "text" ? "select" : "text"))
        }
        className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
          activeTool === "text"
            ? "bg-stone-100 text-stone-900"
            : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
        }`}
        aria-label="Text tool"
        title="Text (T)"
      >
        <CanvasTextToolIcon />
      </button>

      <button
        onClick={() => imageInputRef.current?.click()}
        className="flex items-center justify-center w-9 h-9 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors"
        aria-label="Upload image"
        title="Image"
      >
        <CanvasImageToolIcon />
      </button>
    </div>
  );
}
