'use client';

import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { NodeResizer, useReactFlow } from '@xyflow/react';
import { cn } from '../lib/utils';

export interface FrameNodeData {
  label?: string;
}

function FrameNodeInner({
  id,
  data,
  selected,
}: {
  id: string;
  data: FrameNodeData;
  selected?: boolean;
}) {
  const { updateNodeData } = useReactFlow();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const label = data.label ?? 'Group';

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

  const commit = useCallback(() => {
    const text = editorRef.current?.innerText.replace(/\n$/, '').trim() ?? '';
    updateNodeData(id, { label: text || 'Group' });
    setIsEditing(false);
  }, [id, updateNodeData]);

  return (
    <div className="relative h-full w-full" data-screenshot-target>
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={80}
        minHeight={80}
        lineClassName="!border-violet-400"
        handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-2 !border-violet-400 !bg-white"
      />
      {/* The box itself must not eat pointer events, so children stay interactive. */}
      <div
        className={cn(
          'h-full w-full rounded-2xl border-2 border-dashed',
          selected ? 'border-violet-400 bg-violet-50/20' : 'border-stone-300 bg-stone-50/10',
        )}
        style={{ pointerEvents: 'none' }}
      />
      {/* Label chip sits above the frame; it IS interactive (double-click to rename). */}
      <div
        className="absolute -top-6 left-0 max-w-full"
        style={{ pointerEvents: 'all' }}
      >
        <div
          ref={editorRef}
          className={cn(
            'inline-block rounded-md px-1.5 py-0.5 text-[12px] font-medium leading-tight outline-none',
            selected ? 'text-violet-600' : 'text-stone-500',
            isEditing ? 'nodrag nopan nowheel cursor-text select-text bg-white shadow-sm' : 'cursor-move select-none',
          )}
          style={{ fontFamily: 'var(--pg-font-sans)' }}
          contentEditable={isEditing}
          suppressContentEditableWarning
          spellCheck={false}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          onBlur={commit}
          onPointerDown={(e) => {
            if (isEditing) e.stopPropagation();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape' || e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
        >
          {!isEditing ? label : null}
        </div>
      </div>
    </div>
  );
}

const FrameNode = memo(FrameNodeInner);
export default FrameNode;
