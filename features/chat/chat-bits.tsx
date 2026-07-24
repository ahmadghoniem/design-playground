// ---------------------------------------------------------------------------
// Shared chat composer bits
// ---------------------------------------------------------------------------
// Presentational pieces for the docked chat bar (DockedChatBar.tsx) — the
// playground's only chat surface.
// ---------------------------------------------------------------------------

import React, {
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { VariationStackIcon } from "@pg/shared/ui/playground-nav-icons";

// ---------------------------------------------------------------------------
// PillLeadingRemoveSlot
// ---------------------------------------------------------------------------

/** Leading pill icon that swaps to a remove control on row hover (`group` on parent). */
export function PillLeadingRemoveSlot({
  icon,
  onRemove,
  slotClassName = "h-3 w-3",
}: {
  icon: ReactNode;
  onRemove?: () => void;
  slotClassName?: string;
}) {
  if (!onRemove) {
    return (
      <span
        className={`inline-flex flex-shrink-0 items-center justify-center ${slotClassName}`}
      >
        {icon}
      </span>
    );
  }
  return (
    <span
      className={`relative inline-flex flex-shrink-0 items-center justify-center ${slotClassName}`}
    >
      <span className="flex items-center justify-center group-hover:invisible group-focus-within:invisible">
        {icon}
      </span>
      {/* Always in the DOM (not display:none) so keyboard users can Tab to it;
          invisible + non-interactive until the row is hovered or it's focused. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onRemove();
        }}
        className="absolute inset-0 flex items-center justify-center rounded-full text-current opacity-0 pointer-events-none transition-opacity hover:bg-black/10 group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto"
        aria-label="Remove reference"
      >
        <span className="text-[14px] leading-none font-light">×</span>
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// IterationCountDragger
// ---------------------------------------------------------------------------

const DRAG_STEP_PX = 24; // pixels of vertical drag per ±1 count
const MIN_COUNT = 1;
const MAX_COUNT = 4;

export function IterationCountDragger({
  count,
  onChange,
}: {
  count: number;
  onChange: (n: number) => void;
}) {
  const dragStartY = useRef(0);
  const dragStartCount = useRef(count);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragStartY.current = e.clientY;
      dragStartCount.current = count;
    },
    [count],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!(e.target as HTMLElement).hasPointerCapture(e.pointerId)) return;
      const delta = dragStartY.current - e.clientY; // up = positive
      const steps = Math.round(delta / DRAG_STEP_PX);
      const next = Math.min(
        MAX_COUNT,
        Math.max(MIN_COUNT, dragStartCount.current + steps),
      );
      onChange(next);
    },
    [onChange],
  );

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="inline-flex items-center justify-center py-1 pl-1.5 pr-2 gap-1 rounded-full text-[9px] font-medium transition-transform duration-150 ease-out select-none bg-stone-50 text-stone-500 border border-stone-100 hover:text-stone-700 hover:scale-[1.05] active:scale-[0.95]"
      style={{ cursor: "ns-resize", touchAction: "none" }}
    >
      <span className="cursor-ns-resize flex items-center">
        <VariationStackIcon size={16} />
      </span>
      <span className="text-nowrap">{count}x</span>
    </button>
  );
}
