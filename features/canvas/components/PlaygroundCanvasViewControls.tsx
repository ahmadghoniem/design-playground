import { Minus, Plus, Undo2, Redo2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@pg/shared/ui/tooltip";

/**
 * Canvas view-controls pill (Excalidraw-style): zoom in/out with a live
 * percentage readout, plus undo/redo. Sits bottom-left, as a horizontal
 * sibling to the vertical tool rail.
 *
 * `canUndo`/`canRedo` come from state mirrored off the history stacks in
 * canvas-flow.tsx (the stacks themselves are refs, which don't re-render).
 */
export interface PlaygroundCanvasViewControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function PlaygroundCanvasViewControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: PlaygroundCanvasViewControlsProps) {
  return (
    <div className="absolute left-6 bottom-6 z-20 flex flex-row items-center gap-2 bg-white rounded-2xl border border-stone-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onZoomOut}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors"
            aria-label="Zoom out"
          >
            <Minus className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Zoom out</TooltipContent>
      </Tooltip>

      <span className="min-w-[3.25rem] text-center text-sm tabular-nums text-stone-600 select-none">
        {Math.round(zoom * 100)}%
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onZoomIn}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors"
            aria-label="Zoom in"
          >
            <Plus className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Zoom in</TooltipContent>
      </Tooltip>

      <div className="w-px h-5 bg-stone-200 mx-0.5" />

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors disabled:opacity-35 disabled:pointer-events-none"
            aria-label="Undo"
          >
            <Undo2 className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Undo</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors disabled:opacity-35 disabled:pointer-events-none"
            aria-label="Redo"
          >
            <Redo2 className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Redo</TooltipContent>
      </Tooltip>
    </div>
  );
}
