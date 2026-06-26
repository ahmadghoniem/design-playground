'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { Pencil, Square, Circle, Slash, Shapes } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import type { ShapeKind } from '../../nodes/ShapeNode';
import type { DrawPenKind } from '../../lib/draw-types';

interface ShapeToolGroupProps {
  activeTool: 'select' | 'text' | 'draw' | 'shape';
  shapeKind: ShapeKind;
  drawPenKind: DrawPenKind;
  setActiveTool: (tool: 'select' | 'text' | 'draw' | 'shape') => void;
  setShapeKind: (kind: ShapeKind) => void;
  setDrawPenKind: (kind: DrawPenKind) => void;
}

const SUB_TOOLS = [
  { type: 'draw' as const, kind: 'pen' as DrawPenKind, Icon: Pencil, label: 'Pen', shortcut: 'P' },
  { type: 'shape' as const, kind: 'rect' as ShapeKind, Icon: Square, label: 'Rectangle', shortcut: 'R' },
  { type: 'shape' as const, kind: 'ellipse' as ShapeKind, Icon: Circle, label: 'Ellipse', shortcut: 'O' },
  { type: 'shape' as const, kind: 'line' as ShapeKind, Icon: Slash, label: 'Line / arrow', shortcut: 'L' },
] as const;

export function ShapeToolGroup({
  activeTool,
  shapeKind,
  drawPenKind,
  setActiveTool,
  setShapeKind,
  setDrawPenKind,
}: ShapeToolGroupProps) {
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close flyout on Escape (does not interfere with the canvas escape-to-select handler
  // because we stop here first when the flyout is open).
  useEffect(() => {
    if (!flyoutOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setFlyoutOpen(false);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [flyoutOpen]);

  // Close flyout on outside click.
  useEffect(() => {
    if (!flyoutOpen) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setFlyoutOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [flyoutOpen]);

  const isGroupActive = activeTool === 'draw' || activeTool === 'shape';

  const mainButtonClasses = `flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
    isGroupActive
      ? 'bg-stone-100 text-stone-900'
      : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
  }`;

  const activateSubTool = (tool: (typeof SUB_TOOLS)[number]) => {
    if (tool.type === 'draw') {
      setDrawPenKind(tool.kind);
      setActiveTool('draw');
    } else {
      setShapeKind(tool.kind);
      setActiveTool('shape');
    }
    setFlyoutOpen(false);
  };

  const isSubToolActive = (tool: (typeof SUB_TOOLS)[number]) => {
    if (tool.type === 'draw') return activeTool === 'draw' && drawPenKind === tool.kind;
    return activeTool === 'shape' && shapeKind === tool.kind;
  };

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
          {SUB_TOOLS.map((tool, i) => (
            <Fragment key={`${tool.type}-${tool.kind}`}>
              {/* Divider separating draw tools from shape tools */}
              {i === 1 && <div className="h-px w-5 bg-stone-200 my-0.5" />}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => activateSubTool(tool)}
                    className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
                      isSubToolActive(tool)
                        ? 'bg-stone-100 text-stone-900'
                        : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
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
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
