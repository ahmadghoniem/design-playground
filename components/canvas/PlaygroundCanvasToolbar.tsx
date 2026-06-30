'use client';

import type { RefObject } from 'react';
import { ShapeToolGroup } from './ShapeToolGroup';
import { ProjectBoxIcon } from '../../ui/playground-nav-icons';
import type { DrawPenKind } from '../../lib/draw-types';
import type { ShapeKind } from '../../nodes/ShapeNode';

export interface PlaygroundCanvasToolbarProps {
  sidebarVisible: boolean;
  onSidebarButtonClick: () => void;
  onSidebarButtonMouseEnter: () => void;
  onHideSidebar: () => void;
  activeTool: 'select' | 'text' | 'draw' | 'shape';
  setActiveTool: (tool: 'select' | 'text' | 'draw' | 'shape' | ((prev: 'select' | 'text' | 'draw' | 'shape') => 'select' | 'text' | 'draw' | 'shape')) => void;
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
          sidebarVisible ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
        }`}
        aria-label={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
        title="Toggle sidebar"
      >
        <ProjectBoxIcon />
      </button>

      <div className="h-px w-5 bg-stone-200 my-0.5" />

      <button
        onClick={() => setActiveTool('select')}
        className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
          activeTool === 'select' ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
        }`}
        aria-label="Select tool"
        title="Select (V)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 3l14 9-7 1-4 7z" />
        </svg>
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
        onClick={() => setActiveTool((prev) => (prev === 'text' ? 'select' : 'text'))}
        className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
          activeTool === 'text' ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
        }`}
        aria-label="Text tool"
        title="Text (T)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      </button>

      <button
        onClick={() => imageInputRef.current?.click()}
        className="flex items-center justify-center w-9 h-9 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors"
        aria-label="Upload image"
        title="Image"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </button>
    </div>
  );
}
