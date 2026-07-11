import { useState, useEffect, useRef } from "react";
import { Square, Circle, Slash, Shapes } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@pg/shared/ui/tooltip";
import type { ShapeKind } from "@pg/features/canvas/nodes/ShapeNode";

interface ShapeToolGroupProps {
  activeTool: "select" | "text" | "shape" | "hand";
  shapeKind: ShapeKind;
  setActiveTool: (tool: "select" | "text" | "shape" | "hand") => void;
  setShapeKind: (kind: ShapeKind) => void;
}

const SUB_TOOLS = [
  {
    type: "shape" as const,
    kind: "rect" as ShapeKind,
    Icon: Square,
    label: "Rectangle",
    shortcut: "R",
  },
  {
    type: "shape" as const,
    kind: "ellipse" as ShapeKind,
    Icon: Circle,
    label: "Ellipse",
    shortcut: "O",
  },
  {
    type: "shape" as const,
    kind: "line" as ShapeKind,
    Icon: Slash,
    label: "Line / arrow",
    shortcut: "L",
  },
] as const;

export function ShapeToolGroup({
  activeTool,
  shapeKind,
  setActiveTool,
  setShapeKind,
}: ShapeToolGroupProps) {
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close flyout on Escape (does not interfere with the canvas escape-to-select handler
  // because we stop here first when the flyout is open).
  useEffect(() => {
    if (!flyoutOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setFlyoutOpen(false);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [flyoutOpen]);

  // Close flyout on outside click.
  useEffect(() => {
    if (!flyoutOpen) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setFlyoutOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [flyoutOpen]);

  const isGroupActive = activeTool === "shape";

  const mainButtonClasses = `flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
    isGroupActive
      ? "bg-stone-100 text-stone-900"
      : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
  }`;

  const activateSubTool = (tool: (typeof SUB_TOOLS)[number]) => {
    setShapeKind(tool.kind);
    setActiveTool("shape");
    setFlyoutOpen(false);
  };

  const isSubToolActive = (tool: (typeof SUB_TOOLS)[number]) =>
    activeTool === "shape" && shapeKind === tool.kind;

  return (
    <div ref={containerRef} className="relative">
      {/* Main button — static Shapes icon; click toggles the flyout */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setFlyoutOpen((v) => !v)}
            className={mainButtonClasses}
            aria-label="Shape tools"
          >
            <Shapes className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Shape tools</TooltipContent>
      </Tooltip>

      {/* Flyout panel — opens to the right, styled to match the parent toolbar */}
      {flyoutOpen && (
        <div className="absolute left-full top-0 ml-2 z-50 flex flex-col items-center gap-1 bg-white rounded-2xl border border-stone-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-1.5">
          {SUB_TOOLS.map((tool) => (
            <Tooltip key={`${tool.type}-${tool.kind}`}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => activateSubTool(tool)}
                  className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
                    isSubToolActive(tool)
                      ? "bg-stone-100 text-stone-900"
                      : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
                  }`}
                  aria-label={`${tool.label} (${tool.shortcut})`}
                >
                  <tool.Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {tool.label} ({tool.shortcut})
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}
