'use client';

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NodeResizer, useReactFlow } from '@xyflow/react';
import { cn } from '../lib/utils';

export type ShapeKind = 'rect' | 'ellipse' | 'line';

export interface ShapeNodeData {
  shape: ShapeKind;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  /** Hand-drawn wobbly border (rect/ellipse only). */
  rough?: boolean;
  /** Optional centered annotation label (rect/ellipse only). */
  label?: string;
  /** Set briefly after drag-to-draw so a fresh shape focuses its label. */
  autofocus?: boolean;
}

const DEFAULT_STROKE = '#1c1917';
const DEFAULT_FILL = 'transparent';
const DEFAULT_STROKE_WIDTH = 2;
const MIN_SIZE = 12;

// A hand-drawn-looking double border via the classic asymmetric border-radius trick.
const ROUGH_RADIUS = '255px 15px 225px 15px / 15px 225px 15px 255px';

function ShapeNodeInner({
  id,
  data,
  selected,
  width,
  height,
}: {
  id: string;
  data: ShapeNodeData;
  selected?: boolean;
  width?: number;
  height?: number;
}) {
  const { updateNodeData } = useReactFlow();
  const stroke = data.stroke ?? DEFAULT_STROKE;
  const strokeWidth = data.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const fill = data.fill ?? DEFAULT_FILL;
  const rough = data.rough ?? true;

  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Focus the label right after a shape is drawn, mirroring TextNode's autofocus.
  useEffect(() => {
    if (data.autofocus && data.shape !== 'line') {
      updateNodeData(id, { autofocus: false });
      setIsEditing(true);
    } else if (data.autofocus) {
      updateNodeData(id, { autofocus: false });
    }
  }, [data.autofocus, data.shape, id, updateNodeData]);

  useLayoutEffect(() => {
    if (!isEditing || !editorRef.current) return;
    const el = editorRef.current;
    el.textContent = data.label ?? '';
    el.focus({ preventScroll: true });
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [isEditing, data.label]);

  const commitLabel = useCallback(() => {
    const text = editorRef.current?.innerText.replace(/\n$/, '') ?? '';
    updateNodeData(id, { label: text });
    setIsEditing(false);
  }, [id, updateNodeData]);

  const showResizer = Boolean(selected);

  // --- Line / arrow ---
  if (data.shape === 'line') {
    const w = Math.max(width ?? 120, 1);
    const h = Math.max(height ?? 60, 1);
    const markerId = `arrow-${id}`;
    return (
      <div className="relative h-full w-full" data-screenshot-target>
        <NodeResizer
          isVisible={showResizer}
          minWidth={MIN_SIZE}
          minHeight={1}
          lineClassName="!border-[#1e9bff]"
          handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-2 !border-[#1e9bff] !bg-white"
        />
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          className={cn(selected && 'outline outline-1 outline-[#1e9bff]/40')}
        >
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke} />
            </marker>
          </defs>
          <line
            x1={strokeWidth}
            y1={h / 2}
            x2={w - strokeWidth}
            y2={h / 2}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            markerEnd={`url(#${markerId})`}
          />
        </svg>
      </div>
    );
  }

  // --- Rect / ellipse ---
  const isEllipse = data.shape === 'ellipse';
  const borderRadius = isEllipse ? '50%' : rough ? ROUGH_RADIUS : '6px';
  const label = data.label ?? '';
  const showPlaceholder = label.length === 0 && !isEditing && selected;

  return (
    <div className="relative h-full w-full" data-screenshot-target>
      <NodeResizer
        isVisible={showResizer}
        minWidth={MIN_SIZE}
        minHeight={MIN_SIZE}
        lineClassName="!border-[#1e9bff]"
        handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-2 !border-[#1e9bff] !bg-white"
      />
      <div
        className="flex h-full w-full items-center justify-center"
        style={{
          border: `${strokeWidth}px solid ${stroke}`,
          background: fill,
          borderRadius,
          // Second offset border for the sketchy double-line look.
          boxShadow: !isEllipse && rough ? `2px 2px 0 -1px ${stroke}33` : undefined,
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      >
        <div
          ref={editorRef}
          className={cn(
            'max-w-full whitespace-pre-wrap break-words px-2 text-center text-[15px] leading-snug outline-none',
            isEditing ? 'nodrag nopan nowheel cursor-text select-text' : 'cursor-move select-none',
            showPlaceholder && 'text-stone-400',
          )}
          style={{ fontFamily: 'var(--pg-font-hand, var(--pg-font-sans))', color: stroke }}
          contentEditable={isEditing}
          suppressContentEditableWarning
          spellCheck={false}
          onInput={() => {
            const text = editorRef.current?.innerText.replace(/\n$/, '') ?? '';
            updateNodeData(id, { label: text });
          }}
          onBlur={commitLabel}
          onPointerDown={(e) => {
            if (isEditing) e.stopPropagation();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') {
              e.preventDefault();
              commitLabel();
            }
          }}
        >
          {!isEditing ? (showPlaceholder ? 'Label' : label) : null}
        </div>
      </div>
    </div>
  );
}

const ShapeNode = memo(ShapeNodeInner);
export default ShapeNode;
