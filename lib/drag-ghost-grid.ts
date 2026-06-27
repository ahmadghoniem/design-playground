/**
 * Pure geometry helpers for the drag-to-iterate ghost-grid preview.
 *
 * No React, no DOM, no side effects — these functions are tested directly.
 */

/** The prefix used to identify ghost-preview nodes in the React Flow graph. */
export const GHOST_NODE_PREFIX = 'drag-ghost-';

/**
 * The pending drag grid shape: how many cells the user has dragged out,
 * as rows × cols (and the total count, which equals rows × cols).
 */
export type PendingDragGrid = {
  count: number;
  rows: number;
  cols: number;
};

/**
 * Given:
 *   - the flow-space overlay extent (width × height from parent top-left to cursor)
 *   - the cell dimensions (cellW, cellH) in flow-space
 *   - the gap between cells in flow-space (DRAG_GHOST_GAP)
 *   - a grid-count cap (maxCount)
 *
 * Returns the integer grid {rows, cols, count} where count = rows × cols,
 * capped at maxCount.  The first cell is the original node; new ghost cells
 * appear once the cursor crosses 50 % of the next cell's step boundary.
 *
 * This is the canonical implementation — IterateDialog delegates here so
 * the layout maths live in one tested place.
 */
export function computeGhostGrid(
  flowW: number,
  flowH: number,
  cellW: number,
  cellH: number,
  gapPx: number,
  maxCount: number,
): { rows: number; cols: number; count: number } {
  const step  = cellW + gapPx;
  const stepH = cellH + gapPx;
  const rawCols = 1 + Math.max(0, Math.floor((flowW - cellW + step  * 0.5) / step));
  const rawRows = 1 + Math.max(0, Math.floor((flowH - cellH + stepH * 0.5) / stepH));
  const { cols, rows } = clampGhostGrid(rawCols, rawRows, maxCount);
  return { rows, cols, count: rows * cols };
}

/**
 * Clamp a (cols, rows) pair so that cols × rows ≤ maxCount.
 * If the product already fits, returns unchanged.
 * When the product exceeds maxCount, reduces cols first, then rows.
 */
export function clampGhostGrid(
  cols: number,
  rows: number,
  maxCount: number,
): { cols: number; rows: number } {
  if (cols * rows <= maxCount) return { cols, rows };
  // Try reducing cols first to keep the row count stable
  const fittingCols = Math.max(1, Math.floor(maxCount / rows));
  if (fittingCols * rows <= maxCount) return { cols: fittingCols, rows };
  // Fall back: single row
  return { cols: Math.min(cols, maxCount), rows: 1 };
}
