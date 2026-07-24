import {
  useState,
  useMemo,
} from "react";
import {
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Plus,
  Loader2,
} from "lucide-react";
import { ProjectBoxIcon } from "@pg/shared/ui/playground-nav-icons";
import { registry, RegistryLeafItem } from "@pg/registry";
import type { PendingChild } from "@pg/app/PlaygroundClient";
import { buildChildrenMap, flattenLeaves } from "@pg/features/discovery/registry-tree";
import ComponentPreviewCard from "@pg/features/discovery/ComponentPreviewCard";

export interface PendingSidebarAdd {
  id: string;
  name: string;
}

interface PlaygroundSidebarProps {
  onCollapse: () => void;
  onOpenDiscovery: () => void;
  pendingChildren: Map<string, PendingChild[]>;
  pendingAdds: PendingSidebarAdd[];
}

function SidebarSkeletonCard({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 select-none pointer-events-none">
      <Loader2 className="w-3.5 h-3.5 shrink-0 text-stone-300 animate-spin" />
      <div className="text-[12px] font-medium text-stone-400 truncate">
        {label}
      </div>
    </div>
  );
}

export default function PlaygroundSidebar({
  onCollapse,
  onOpenDiscovery,
  pendingAdds,
}: PlaygroundSidebarProps) {
  const [search, setSearch] = useState("");
  const [componentsExpanded, setComponentsExpanded] = useState(true);

  const childrenMap = useMemo(() => buildChildrenMap(registry), []);

  const filterRegistryForGrid = (
    items: RegistryLeafItem[],
    query: string,
  ): RegistryLeafItem[] => {
    if (!query.trim()) return items;
    const lowerQuery = query.toLowerCase();
    return items.filter((item) => {
      if (item.label.toLowerCase().includes(lowerQuery)) return true;
      const kids = childrenMap.get(item.id) || [];
      return kids.some((k) => k.label.toLowerCase().includes(lowerQuery));
    });
  };

  const filteredRegistry = filterRegistryForGrid(registry, search);
  const registryLeaves = flattenLeaves(filteredRegistry);
  const registryIds = new Set(registryLeaves.map((leaf) => leaf.id));
  const visiblePendingAdds = pendingAdds.filter(
    (pending) =>
      !registryIds.has(pending.id) &&
      (!search.trim() ||
        pending.name.toLowerCase().includes(search.toLowerCase())),
  );
  const hasComponents =
    registryLeaves.length > 0 || visiblePendingAdds.length > 0;

  return (
    <aside className="w-[280px] h-full bg-white rounded-2xl border border-pg-border flex flex-col overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ProjectBoxIcon className="text-stone-400 shrink-0" size={13} />
          <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-stone-400 select-none">
            Project
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onCollapse();
            }}
            onClick={onCollapse}
            className="flex items-center justify-center w-[24px] h-[24px] rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-3 pb-3 flex-shrink-0">
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-[13px] bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-400/15 transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-1.5 min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-300 [&::-webkit-scrollbar-thumb]:rounded">
        {hasComponents ? (
          <div className="mb-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setComponentsExpanded(!componentsExpanded)}
                className="flex items-center gap-1.5 px-2 py-2 text-left text-[11px] font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-2xl transition-colors flex-1"
              >
                {componentsExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="uppercase tracking-[0.08em] text-[10px]">
                  Components
                </span>
              </button>
              <button
                onClick={onOpenDiscovery}
                className="flex items-center justify-center w-[24px] h-[24px] rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors shrink-0 mr-1"
                aria-label="Add components"
              >
                <Plus className="w-[14px] h-[14px]" />
              </button>
            </div>
            {componentsExpanded && (
              <div className="flex flex-col pt-2 pb-4">
                {visiblePendingAdds.map((pending) => (
                  <SidebarSkeletonCard key={pending.id} label={pending.name} />
                ))}
                {registryLeaves.map((leaf) => (
                  <ComponentPreviewCard key={leaf.id} item={leaf} />
                ))}
              </div>
            )}
          </div>
        ) : !search.trim() ? (
          <div className="px-2 pt-1 pb-3">
            <div className="flex flex-col gap-2 pt-2 pb-3 opacity-40 pointer-events-none select-none">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-3 rounded-full bg-stone-200 animate-pulse"
                  style={{ width: i % 2 === 0 ? "60%" : "75%" }}
                />
              ))}
            </div>
            <button
              onClick={onOpenDiscovery}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-stone-900 text-white text-[12px] font-medium hover:bg-stone-700 active:bg-stone-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add components
            </button>
          </div>
        ) : (
          <p className="text-xs text-stone-400 text-center py-3 select-none">
            No results
          </p>
        )}
      </div>

      <div className="px-3 py-2 flex-shrink-0 border-t border-stone-100">
        <p className="text-[11px] text-stone-400 text-center select-none">
          Drag drop any component
        </p>
      </div>
    </aside>
  );
}
