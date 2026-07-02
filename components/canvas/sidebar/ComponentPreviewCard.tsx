import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
} from "react";
import { DND_DATA_KEY } from "../../../lib/constants";
import { RegistryLeafItem } from "../../../registry";
import {
  pickPreviewViewport,
  slugFromSourcePath,
} from "../../../lib/registry-tree";
import ComponentErrorBoundary from "../../../nodes/ComponentErrorBoundary";
import { useFocusNode } from "../../../hooks/useFocusNode";

export interface PageContextPayload {
  id: string;
  label: string;
  slug: string;
}

interface ComponentPreviewCardProps {
  item: RegistryLeafItem;
  onPageContextMenu?: (e: MouseEvent, payload: PageContextPayload) => void;
}

/** Renders a live, scaled-down preview of a registry component, draggable onto canvas. */
export default function ComponentPreviewCard({
  item,
  onPageContextMenu,
}: ComponentPreviewCardProps) {
  const PreviewComponent = item.Component;
  const props = (item.props ?? {}) as Record<string, unknown>;
  const viewport = pickPreviewViewport(item.size);
  const { focusNode } = useFocusNode();

  // Measure the card's actual rendered width so we can compute an accurate
  // scale factor — keeps previews sharp when the sidebar gets resized.
  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.12);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / viewport.width);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewport.width]);

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(DND_DATA_KEY, item.id);
    e.dataTransfer.setData("text/plain", "");
    e.dataTransfer.effectAllowed = "move";
  };

  const isPage = /^src\/app\/[^/]+\/page\.tsx$/.test(item.sourcePath);
  const slug = isPage ? slugFromSourcePath(item.sourcePath) : null;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={() => focusNode(item.id)}
      onContextMenu={
        isPage && slug && onPageContextMenu
          ? (e) =>
              onPageContextMenu(e, { id: item.id, label: item.label, slug })
          : undefined
      }
      className="group cursor-grab active:cursor-grabbing select-none"
      title={`Drag ${item.label} onto canvas`}
    >
      {/* Preview thumbnail — fixed height, component scaled to fit the width.
          Tall components get cropped at the bottom (like a real thumbnail). */}
      <div
        ref={previewRef}
        className="relative w-full h-[96px] overflow-hidden bg-stone-50 rounded-xl border border-stone-200/70 group-hover:border-stone-300 group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all pointer-events-none"
      >
        <div
          className="app-theme bg-background absolute top-0 left-0 origin-top-left"
          style={{
            width: viewport.width,
            height: viewport.height,
            transform: `scale(${scale})`,
          }}
        >
          <ComponentErrorBoundary componentName={item.label}>
            <PreviewComponent {...props} />
          </ComponentErrorBoundary>
        </div>
      </div>

      {/* Label — sits OUTSIDE the card, below it, as muted text */}
      <div className="mt-1.5 px-0.5 text-[11px] font-medium text-stone-700 truncate">
        {item.label}
      </div>
    </div>
  );
}
