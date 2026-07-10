import type { RefObject } from "react";
import { Hand } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ShapeToolGroup } from "./ShapeToolGroup";
import {
  ProjectBoxIcon,
  CanvasSelectToolIcon,
  CanvasTextToolIcon,
  CanvasImageToolIcon,
} from "../ui/playground-nav-icons";
import type { ShapeKind } from "../../nodes/ShapeNode";

export interface PlaygroundCanvasToolbarProps {
  sidebarVisible: boolean;
  onSidebarButtonClick: () => void;
  onSidebarButtonMouseEnter: () => void;
  onHideSidebar: () => void;
  activeTool: "select" | "text" | "shape" | "hand";
  setActiveTool: (
    tool:
      | "select"
      | "text"
      | "shape"
      | "hand"
      | ((
          prev: "select" | "text" | "shape" | "hand",
        ) => "select" | "text" | "shape" | "hand"),
  ) => void;
  shapeKind: ShapeKind;
  setShapeKind: (kind: ShapeKind) => void;
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
  imageInputRef,
}: PlaygroundCanvasToolbarProps) {
  return (
    <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 bg-white rounded-2xl border border-stone-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-2">
      <Tooltip>
        <TooltipTrigger asChild>
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
          >
            <ProjectBoxIcon />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Toggle sidebar</TooltipContent>
      </Tooltip>

      <div className="h-px w-5 bg-stone-200 my-0.5" />

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setActiveTool("select")}
            className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
              activeTool === "select"
                ? "bg-stone-100 text-stone-900"
                : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
            }`}
            aria-label="Select tool"
          >
            <CanvasSelectToolIcon />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Select (V)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setActiveTool("hand")}
            className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
              activeTool === "hand"
                ? "bg-stone-100 text-stone-900"
                : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
            }`}
            aria-label="Hand tool"
          >
            <Hand className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Hand (H)</TooltipContent>
      </Tooltip>

      <ShapeToolGroup
        activeTool={activeTool}
        shapeKind={shapeKind}
        setActiveTool={setActiveTool}
        setShapeKind={setShapeKind}
      />

      <Tooltip>
        <TooltipTrigger asChild>
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
          >
            <CanvasTextToolIcon />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Text (T)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors"
            aria-label="Upload image"
          >
            <CanvasImageToolIcon />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Image</TooltipContent>
      </Tooltip>
    </div>
  );
}
