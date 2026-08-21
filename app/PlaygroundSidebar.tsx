import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { ProjectBoxIcon } from "@pg/shared/ui/playground-nav-icons";
import type { RegistryLeafItem } from "@pg/registry";
import { buildRegistryChildrenMap } from "@pg/features/registry-sidebar/registry-children";
import RegistryDragRow from "@pg/features/registry-sidebar/RegistryDragRow";
import { useRegistryItems } from "@pg/features/registry-sidebar/useRegistryItems";

export default function PlaygroundSidebar() {
  const [search, setSearch] = useState("");
  const [componentsExpanded, setComponentsExpanded] = useState(true);
  const registryItems = useRegistryItems();

  const childrenMap = useMemo(
    () => buildRegistryChildrenMap(registryItems),
    [registryItems],
  );

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

  const filteredRegistry = filterRegistryForGrid(registryItems, search);
  const hasComponents = filteredRegistry.length > 0;

  return (
    <aside className="w-[280px] h-full bg-white rounded-2xl border border-pg-border flex flex-col overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center px-3 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ProjectBoxIcon className="text-stone-400 shrink-0" size={13} />
          <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-stone-400 select-none">
            Project
          </span>
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
            </div>
            {componentsExpanded && (
              <div className="flex flex-col pt-2 pb-4">
                {filteredRegistry.map((leaf) => (
                  <RegistryDragRow key={leaf.id} item={leaf} />
                ))}
              </div>
            )}
          </div>
        ) : !search.trim() ? (
          <p className="text-xs text-stone-400 text-center py-6 px-3 leading-relaxed select-none">
            No components in the registry yet.
          </p>
        ) : (
          <p className="text-xs text-stone-400 text-center py-3 select-none">
            No results
          </p>
        )}
      </div>

      <div className="px-3 py-2 flex-shrink-0 border-t border-stone-100">
        <p className="text-[11px] text-stone-400 text-center select-none">
          Drag onto canvas
        </p>
      </div>
    </aside>
  );
}
