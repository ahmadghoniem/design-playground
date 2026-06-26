'use client';

import { memo } from 'react';
import { useViewport } from '@xyflow/react';

export interface HelperLineState {
  /** Flow-space X coordinate for a vertical guide, if any. */
  vertical?: number;
  /** Flow-space Y coordinate for a horizontal guide, if any. */
  horizontal?: number;
}

/**
 * Renders Figma-style pink alignment guides while dragging. Coordinates are in
 * flow space; we map them to screen space with the live viewport transform so
 * the lines stay glued to the canvas during pan/zoom.
 */
function HelperLinesInner({ vertical, horizontal }: HelperLineState) {
  const { x, y, zoom } = useViewport();
  if (vertical == null && horizontal == null) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[6] overflow-hidden">
      {vertical != null && (
        <div
          className="absolute top-0 bottom-0 w-px bg-[#ff4d9d]"
          style={{ left: vertical * zoom + x }}
        />
      )}
      {horizontal != null && (
        <div
          className="absolute left-0 right-0 h-px bg-[#ff4d9d]"
          style={{ top: horizontal * zoom + y }}
        />
      )}
    </div>
  );
}

const HelperLines = memo(HelperLinesInner);
export default HelperLines;
