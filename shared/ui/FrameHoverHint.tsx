import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Cursor-following tip on component/iteration frames.
 *
 * Important: while React Flow is dragging a node it steals pointer events from
 * the node, so a node-local `onMouseMove` stops firing and a naive tooltip
 * freezes at the drag-start coordinates. We (1) hide on pointer-down (drag
 * about to start) and (2) track `window` pointermove while the tip is visible.
 */
export function useFrameHoverHint(enabled: boolean) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled) setPos(null);
  }, [enabled]);

  // Keep the tip under the cursor even if the node stops receiving moves
  // (e.g. brief event gaps). Cleared on pointer-down before a drag begins.
  useEffect(() => {
    if (!pos || !enabled) return;
    const onMove = (e: PointerEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [pos, enabled]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return;
      setPos({ x: e.clientX, y: e.clientY });
    },
    [enabled],
  );

  const onMouseLeave = useCallback(() => setPos(null), []);

  // Hide immediately when the user presses — RF drag would otherwise leave
  // the tip stranded at the press coordinates.
  const onPointerDown = useCallback(() => setPos(null), []);

  const tooltip =
    enabled && pos && typeof document !== "undefined"
      ? createPortal(
          <div
            className="pointer-events-none fixed px-2 py-1 rounded bg-stone-900 text-white text-[10px] font-medium whitespace-nowrap shadow-md flex items-center gap-1.5"
            style={{ left: pos.x + 14, top: pos.y + 14, zIndex: 9999 }}
          >
            <span>hold</span>
            <kbd className="px-1 py-px rounded bg-stone-700 text-white text-[9px] font-sans leading-none">
              ⌘
            </kbd>
            <span>to select an element</span>
            <span className="text-stone-400">·</span>
            <span>double click to interact</span>
          </div>,
          document.body,
        )
      : null;

  return { onMouseMove, onMouseLeave, onPointerDown, tooltip };
}
