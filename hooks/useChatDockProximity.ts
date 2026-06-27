import React, { useCallback, useEffect, useRef, useState } from 'react';

// Cursor-proximity thresholds (px) for the minimise/expand hysteresis.
const NEAR_PX = 44;
const FAR_PX = 120;

export interface UseChatDockProximityOptions {
  /** Ref to the bar's root element — used to read its bounding rect. */
  rootRef: React.RefObject<HTMLElement | null>;
  /**
   * When true, the bar is "held open" by content or selection independent of
   * cursor proximity. The proximity hook will not collapse it.
   */
  heldOpen: boolean;
  /** Callback invoked when the bar should gain focus after expanding. */
  onExpand?: () => void;
}

export interface UseChatDockProximityResult {
  expanded: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  /** Suppress re-expand until the cursor leaves the halo after an Esc dismiss. */
  dismissedRef: React.MutableRefObject<boolean>;
  clearDwell: () => void;
}

/**
 * Manages the docked chat bar's expand/collapse state based on cursor proximity.
 *
 * Returns `expanded` (boolean) and helpers. The caller combines `expanded` with
 * `heldOpen` to derive `shouldExpand` for rendering.
 */
export function useChatDockProximity({
  rootRef,
  heldOpen,
}: UseChatDockProximityOptions): UseChatDockProximityResult {
  const [expanded, setExpanded] = useState(false);

  const expandedRef = useRef(false);
  const dismissedRef = useRef(false);
  const dwellTimerRef = useRef<number | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const clearDwell = useCallback(() => {
    if (dwellTimerRef.current != null) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
  }, []);

  // Mirror `expanded` into a ref for the closure-captured mousemove listener.
  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  // Cache the bar's rect so the hot mousemove path doesn't force a layout read
  // every move. It only changes when the bar resizes (expand/collapse), hides,
  // or the window resizes.
  useEffect(() => {
    const update = () => {
      rectRef.current = rootRef.current?.getBoundingClientRect() ?? null;
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [expanded, heldOpen, rootRef]);

  // Proximity (mouse only — desktop). rAF-coalesced; reads the cached rect.
  // Expanding requires a brief dwell so brushing past the bottom doesn't pop it
  // open; collapsing past FAR is immediate. After an explicit Esc dismiss it
  // stays minimised until the cursor leaves the halo, then re-arms. Text /
  // selection keep it open independently via `heldOpen`.
  useEffect(() => {
    const process = () => {
      rafRef.current = null;
      const pt = lastPointRef.current;
      const rect = rectRef.current;
      if (!pt || !rect) {
        clearDwell();
        return;
      }
      const dx = Math.max(rect.left - pt.x, 0, pt.x - rect.right);
      const dy = Math.max(rect.top - pt.y, 0, pt.y - rect.bottom);
      const dist = Math.hypot(dx, dy);

      if (rootRef.current?.contains(document.activeElement)) {
        dismissedRef.current = false;
        clearDwell();
        setExpanded(true);
        return;
      }

      if (expandedRef.current) {
        if (dist > FAR_PX) {
          clearDwell();
          setExpanded(false);
        }
        return;
      }

      // Minimised.
      if (dismissedRef.current) {
        if (dist > FAR_PX) dismissedRef.current = false;
        clearDwell();
        return;
      }
      if (dist <= NEAR_PX) {
        if (dwellTimerRef.current == null) {
          dwellTimerRef.current = window.setTimeout(() => {
            dwellTimerRef.current = null;
            if (!dismissedRef.current) setExpanded(true);
          }, 150);
        }
      } else {
        clearDwell();
      }
    };
    const onMove = (e: MouseEvent) => {
      lastPointRef.current = { x: e.clientX, y: e.clientY };
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(process);
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      clearDwell();
    };
  }, [clearDwell, rootRef]);

  return { expanded, setExpanded, dismissedRef, clearDwell };
}
