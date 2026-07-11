import type { Node } from "@xyflow/react";
import { LayoutGrid, Frame } from "lucide-react";
import {
  BringToFrontIcon,
  BringForwardIcon,
  SendBackwardIcon,
  SendToBackIcon,
} from "@pg/shared/ui/playground-nav-icons";

type CanvasContextMenuState = {
  x: number;
  y: number;
  nodeId?: string;
} | null;

export interface PlaygroundCanvasContextMenuProps {
  contextMenu: CanvasContextMenuState;
  nodes: Node[];
  onClose: () => void;
  onOrganize: () => void;
  onGroup: () => void;
  onUngroup: (frameId?: string) => void;
  onZOrder: (op: "front" | "back" | "forward" | "backward") => void;
}

export default function PlaygroundCanvasContextMenu({
  contextMenu,
  nodes,
  onClose,
  onOrganize,
  onGroup,
  onUngroup,
  onZOrder,
}: PlaygroundCanvasContextMenuProps) {
  if (!contextMenu) return null;

  const ctxNode = contextMenu.nodeId
    ? nodes.find((n) => n.id === contextMenu.nodeId)
    : undefined;
  const isFrameTarget =
    ctxNode?.type === "frame" ||
    nodes.some((n) => n.type === "frame" && n.selected);
  const groupable = nodes.filter(
    (n) =>
      n.selected && !n.parentId && n.type !== "frame" && n.type !== "skeleton",
  );
  const showFrameSection = isFrameTarget || groupable.length >= 1;
  const showZOrder = Boolean(
    contextMenu.nodeId || nodes.some((n) => n.selected),
  );

  return (
    <div
      className="playground-canvas-context-menu fixed z-50 min-w-[180px] bg-[#1C1C1E] rounded-2xl shadow-2xl py-2 px-2 animate-in fade-in-0 zoom-in-95 duration-100"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      <button
        className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
        onClick={(e) => {
          e.stopPropagation();
          onOrganize();
          onClose();
        }}
      >
        <LayoutGrid
          className="w-3.5 h-3.5 text-stone-500 shrink-0"
          strokeWidth={1.5}
        />
        Organize canvas
      </button>
      {showFrameSection && (
        <>
          <div className="my-1 h-px bg-white/10" />
          {groupable.length >= 1 && (
            <button
              className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                onGroup();
                onClose();
              }}
            >
              <Frame
                className="w-3.5 h-3.5 text-stone-500 shrink-0"
                strokeWidth={1.5}
              />
              Group selection
            </button>
          )}
          {isFrameTarget && (
            <button
              className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                onUngroup(ctxNode?.type === "frame" ? ctxNode.id : undefined);
                onClose();
              }}
            >
              <Frame
                className="w-3.5 h-3.5 text-stone-500 shrink-0"
                strokeWidth={1.5}
              />
              Ungroup frame
            </button>
          )}
        </>
      )}
      {showZOrder && (
        <>
          <div className="my-1 h-px bg-white/10" />
          <button
            className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              onZOrder("front");
              onClose();
            }}
          >
            <BringToFrontIcon className="text-stone-500 shrink-0" />
            Bring to Front
          </button>
          <button
            className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              onZOrder("forward");
              onClose();
            }}
          >
            <BringForwardIcon className="text-stone-500 shrink-0" />
            Bring Forward
          </button>
          <button
            className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              onZOrder("backward");
              onClose();
            }}
          >
            <SendBackwardIcon className="text-stone-500 shrink-0" />
            Send Backward
          </button>
          <button
            className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              onZOrder("back");
              onClose();
            }}
          >
            <SendToBackIcon className="text-stone-500 shrink-0" />
            Send to Back
          </button>
        </>
      )}
    </div>
  );
}
