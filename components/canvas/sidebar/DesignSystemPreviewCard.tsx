import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  DND_DATA_KEY,
  DESIGN_SYSTEM_SHOWCASE_ID,
} from "../../../lib/constants";

/** Draggable thumbnail of the generated design-system showcase. */
export default function DesignSystemPreviewCard({ html }: { html: string }) {
  const previewRef = useRef<HTMLDivElement>(null);
  // The showcase is generated at full desktop width; scale to fit the card.
  const VIEWPORT_WIDTH = 1280;
  const VIEWPORT_HEIGHT = 1600;
  const [scale, setScale] = useState(0.18);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / VIEWPORT_WIDTH);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(DND_DATA_KEY, DESIGN_SYSTEM_SHOWCASE_ID);
    e.dataTransfer.setData("text/plain", "");
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group cursor-grab active:cursor-grabbing select-none"
      title="Drag onto canvas"
    >
      <div
        ref={previewRef}
        className="relative w-full h-[140px] overflow-hidden bg-stone-50 rounded-xl border border-stone-200/70 group-hover:border-stone-300 group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all pointer-events-none"
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: VIEWPORT_WIDTH,
            height: VIEWPORT_HEIGHT,
            transform: `scale(${scale})`,
          }}
        >
          <iframe
            srcDoc={html}
            sandbox="allow-same-origin"
            title="Design system preview"
            className="w-full h-full border-0 pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
}
