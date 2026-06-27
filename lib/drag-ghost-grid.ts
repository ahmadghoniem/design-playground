/**
 * Pure geometry helpers for the drag-to-iterate ghost-grid preview.
 *
 * No React, no DOM, no side effects — these functions are tested directly.
 *
 * The screen<->flow coordinate conversions are taken as **injected ports**
 * (`screenToFlowPosition` / `flowToScreenPosition`). React Flow's
 * `useReactFlow()` returns a non-reactive instance whose transform methods are
 * plain functions, so the component reads them once and hands them in here —
 * the geometry never needs the React Flow context itself. Clamping to the
 * configured grid bounds stays in `useDragToIterate`'s `clampGrid` (it owns the
 * DRAG_ITERATE_MAX_* policy); these helpers return the raw, unclamped grid.
 */

/** The prefix used to identify ghost-preview nodes in the React Flow graph. */
export const GHOST_NODE_PREFIX = 'drag-ghost-';

/**
 * The pending drag grid shape: how many cells the user has dragged out,
 * as rows × cols (and the total count).
 */
export type PendingDragGrid = {
  count: number;
  rows: number;
  cols: number;
};

export interface Point {
  x: number;
  y: number;
}

/** A React Flow coordinate transform (screen↔flow), injected as a port. */
export type CoordTransform = (p: Point) => Point;

/**
 * Convert a screen-delta drag gesture into a raw (unclamped) ghost grid.
 *
 * Given the cursor delta from the drag start, the parent node's flow position,
 * the per-cell size and the inter-cell gap, returns how many rows/cols the
 * dragged-out overlay spans. The first cell is the original node; a new cell
 * appears once the cursor crosses 50 % of the next cell's step (cell + gap).
 *
 * Caller clamps the result with `clampGrid` (which applies the count policy).
 */
export function computeDragGridRaw(
  transforms: { screenToFlowPosition: CoordTransform; flowToScreenPosition: CoordTransform },
  args: {
    delta: { dx: number; dy: number };
    dragStart: Point;
    parentPosition: Point;
    cellW: number;
    cellH: number;
    gapPx: number;
  },
): { rawCols: number; rawRows: number } {
  const { screenToFlowPosition, flowToScreenPosition } = transforms;
  const { delta, dragStart, parentPosition, cellW, cellH, gapPx } = args;

  // The cursor's absolute screen position
  const cursorScreenX = dragStart.x + delta.dx;
  const cursorScreenY = dragStart.y + delta.dy;

  // Parent node's top-left in screen space
  const parentScreen = flowToScreenPosition(parentPosition);

  // The overlay extent in screen pixels (from parent top-left to cursor)
  const overlayW = cursorScreenX - parentScreen.x;
  const overlayH = cursorScreenY - parentScreen.y;

  // Convert the overlay extent to flow-space (zoom-aware)
  const flowOrigin = screenToFlowPosition({ x: 0, y: 0 });
  const flowExtent = screenToFlowPosition({ x: overlayW, y: overlayH });
  const flowW = flowExtent.x - flowOrigin.x;
  const flowH = flowExtent.y - flowOrigin.y;

  const step = cellW + gapPx;
  const stepH = cellH + gapPx;
  const rawCols = 1 + Math.max(0, Math.floor((flowW - cellW + step * 0.5) / step));
  const rawRows = 1 + Math.max(0, Math.floor((flowH - cellH + stepH * 0.5) / stepH));

  return { rawCols, rawRows };
}

/**
 * Convert screen-space overlay padding into flow-space padding (zoom-aware).
 * Padding is the offset from the parent node's top-left at which the ghost
 * bounding overlay begins.
 */
export function flowPaddingFromScreen(
  screenToFlowPosition: CoordTransform,
  paddingX: number,
  paddingY: number,
): { padX: number; padY: number } {
  const flowZero = screenToFlowPosition({ x: 0, y: 0 });
  const flowPad = screenToFlowPosition({ x: paddingX, y: paddingY });
  return { padX: flowPad.x - flowZero.x, padY: flowPad.y - flowZero.y };
}

/**
 * Build the single `drag-ghost` bounding-node descriptor placed behind the
 * parent during a drag-to-iterate preview. Pure: the caller applies it via
 * `setNodes`.
 */
export function buildGhostBoundingNode(args: {
  parentPosition: Point;
  rows: number;
  cols: number;
  cellW: number;
  cellH: number;
  padX: number;
  padY: number;
}) {
  const { parentPosition, rows, cols, cellW, cellH, padX, padY } = args;
  return {
    id: `${GHOST_NODE_PREFIX}bounding`,
    type: 'drag-ghost' as const,
    position: {
      x: parentPosition.x - padX,
      y: parentPosition.y - padY,
    },
    data: {
      cols,
      rows,
      cellWidth: cellW,
      cellHeight: cellH,
      padX,
      padY,
    },
    draggable: false,
    selectable: false,
    connectable: false,
  };
}
