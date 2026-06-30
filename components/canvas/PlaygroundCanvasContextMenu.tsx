'use client';

import type { Node } from '@xyflow/react';
import { LayoutGrid, Frame } from 'lucide-react';
import { PageDocumentIcon } from '../../ui/playground-nav-icons';

export type CanvasContextMenuState = { x: number; y: number; nodeId?: string } | null;

export interface PlaygroundCanvasContextMenuProps {
  contextMenu: CanvasContextMenuState;
  nodes: Node[];
  onClose: () => void;
  onCreateDesign: (screenX: number, screenY: number) => void;
  onCreatePage: (screenX: number, screenY: number) => void;
  onOrganize: () => void;
  onGroup: () => void;
  onUngroup: (frameId?: string) => void;
  onZOrder: (op: 'front' | 'back' | 'forward' | 'backward') => void;
}

export default function PlaygroundCanvasContextMenu({
  contextMenu,
  nodes,
  onClose,
  onCreateDesign,
  onCreatePage,
  onOrganize,
  onGroup,
  onUngroup,
  onZOrder,
}: PlaygroundCanvasContextMenuProps) {
  if (!contextMenu) return null;

  const ctxNode = contextMenu.nodeId ? nodes.find((n) => n.id === contextMenu.nodeId) : undefined;
  const isFrameTarget =
    ctxNode?.type === 'frame' || nodes.some((n) => n.type === 'frame' && n.selected);
  const groupable = nodes.filter(
    (n) => n.selected && !n.parentId && n.type !== 'frame' && n.type !== 'skeleton',
  );
  const showFrameSection = isFrameTarget || groupable.length >= 1;
  const showZOrder = Boolean(contextMenu.nodeId || nodes.some((n) => n.selected));

  return (
    <div
      className="playground-canvas-context-menu fixed z-50 min-w-[180px] bg-[#1C1C1E] rounded-2xl shadow-2xl py-2 px-2 animate-in fade-in-0 zoom-in-95 duration-100"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      <button
        className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
          void onCreateDesign(contextMenu.x, contextMenu.y);
        }}
      >
        <Frame className="w-3.5 h-3.5 text-stone-500 shrink-0" strokeWidth={1.5} />
        Create a new design
      </button>
      <button
        className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
        onClick={(e) => {
          e.stopPropagation();
          onCreatePage(contextMenu.x, contextMenu.y);
          onClose();
        }}
      >
        <PageDocumentIcon className="text-stone-500 shrink-0" size={14} />
        Create a new page
      </button>
      <div className="my-1 h-px bg-white/10" />
      <button
        className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
        onClick={(e) => {
          e.stopPropagation();
          onOrganize();
          onClose();
        }}
      >
        <LayoutGrid className="w-3.5 h-3.5 text-stone-500 shrink-0" strokeWidth={1.5} />
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
              <Frame className="w-3.5 h-3.5 text-stone-500 shrink-0" strokeWidth={1.5} />
              Group selection
            </button>
          )}
          {isFrameTarget && (
            <button
              className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                onUngroup(ctxNode?.type === 'frame' ? ctxNode.id : undefined);
                onClose();
              }}
            >
              <Frame className="w-3.5 h-3.5 text-stone-500 shrink-0" strokeWidth={1.5} />
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
              onZOrder('front');
              onClose();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500 shrink-0">
              <rect x="7" y="7" width="13" height="13" rx="2" />
              <path d="M4 16V6a2 2 0 0 1 2-2h10" />
            </svg>
            Bring to Front
          </button>
          <button
            className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              onZOrder('forward');
              onClose();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500 shrink-0">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M4 14V6a2 2 0 0 1 2-2h8" />
            </svg>
            Bring Forward
          </button>
          <button
            className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              onZOrder('backward');
              onClose();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500 shrink-0">
              <rect x="4" y="4" width="11" height="11" rx="2" />
              <path d="M20 10v8a2 2 0 0 1-2 2h-8" />
            </svg>
            Send Backward
          </button>
          <button
            className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[13px] text-stone-200 hover:bg-white/10 transition-colors text-left rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              onZOrder('back');
              onClose();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500 shrink-0">
              <rect x="4" y="4" width="13" height="13" rx="2" />
              <path d="M20 8v10a2 2 0 0 1-2 2H8" />
            </svg>
            Send to Back
          </button>
        </>
      )}
    </div>
  );
}
