import type { DragEvent } from "react";
import { DND_DATA_KEY } from "@pg/shared/lib/constants";
import type { RegistryLeafItem } from "@pg/registry";
import { useFocusNode } from "@pg/features/registry-sidebar/useFocusNode";

interface RegistryDragRowProps {
  item: RegistryLeafItem;
}

/** Draggable list row for a registry component (name only — not a live preview). */
export default function RegistryDragRow({ item }: RegistryDragRowProps) {
  const { focusNode } = useFocusNode();

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(DND_DATA_KEY, item.id);
    e.dataTransfer.setData("text/plain", "");
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={() => focusNode(item.id)}
      className="group flex items-center px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing select-none hover:bg-stone-100 transition-colors"
      title={`Drag ${item.label} onto canvas`}
    >
      <span className="text-[12px] font-medium text-stone-700 truncate">
        {item.label}
      </span>
    </div>
  );
}
