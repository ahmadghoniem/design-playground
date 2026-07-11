import {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Plus,
  Palette,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { ProjectBoxIcon } from "@pg/shared/ui/playground-nav-icons";
import { registry, RegistryItem, isGroup, isLeaf } from "@pg/registry";
import type { PendingChild } from "@pg/app/PlaygroundClient";
import DesignSystemModal from "@pg/features/design-system/DesignSystemModal";
import { useModelSettingsStore } from "@pg/shared/stores/model-settings-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@pg/shared/ui/tooltip";
import { toast } from "sonner";
import { buildChildrenMap, flattenLeaves } from "@pg/features/discovery/registry-tree";
import { useSidebarDiscoverySync } from "@pg/features/discovery/useSidebarDiscoverySync";
import ComponentPreviewCard from "@pg/features/discovery/ComponentPreviewCard";
import DesignSystemPreviewCard from "@pg/features/discovery/DesignSystemPreviewCard";

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
    <div className="flex flex-col gap-1.5 select-none pointer-events-none">
      <div className="relative w-full h-[96px] overflow-hidden bg-stone-50 rounded-xl border border-stone-200/70">
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-stone-300 animate-spin" />
        </div>
      </div>
      <div className="mt-1.5 px-0.5 text-[11px] font-medium text-stone-400 truncate">
        {label}
      </div>
    </div>
  );
}

export default function PlaygroundSidebar({
  onCollapse,
  onOpenDiscovery,
  pendingChildren,
  pendingAdds,
}: PlaygroundSidebarProps) {
  const [search, setSearch] = useState("");
  const [componentsExpanded, setComponentsExpanded] = useState(true);
  const [designOpen, setDesignOpen] = useState(false);
  const [designSystemExpanded, setDesignSystemExpanded] = useState(true);
  const [isGeneratingDesignSystem, setIsGeneratingDesignSystem] =
    useState(false);
  const activeProvider = useModelSettingsStore((s) => s.activeProvider);
  const enabledModels = useModelSettingsStore(
    (s) => s.providerState[s.activeProvider]?.enabledModels ?? [],
  );

  const { designSystemHtml, fetchDesignSystem } = useSidebarDiscoverySync();

  const childrenMap = useMemo(() => buildChildrenMap(registry), []);

  const regenerateDesignSystem = useCallback(async () => {
    if (isGeneratingDesignSystem) return;
    setIsGeneratingDesignSystem(true);
    try {
      const res = await fetch(
        "/playground/api/design/generate-preview-showcase",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: activeProvider,
            model: enabledModels[0],
          }),
        },
      );
      if (res.body) {
        const reader = res.body.getReader();
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }
      await fetchDesignSystem();
      toast.success("Design system regenerated");
    } catch (error) {
      toast.error(`Regeneration failed: ${(error as Error).message}`);
    } finally {
      setIsGeneratingDesignSystem(false);
    }
  }, [
    isGeneratingDesignSystem,
    activeProvider,
    enabledModels,
    fetchDesignSystem,
  ]);

  const filterRegistryForGrid = (
    items: RegistryItem[],
    query: string,
  ): RegistryItem[] => {
    if (!query.trim()) return items;
    const lowerQuery = query.toLowerCase();
    return items
      .map((item): RegistryItem | null => {
        if (isGroup(item)) {
          const allLeaves = flattenLeaves(item.children);
          const matchedLeaves = allLeaves.filter((l) =>
            l.label.toLowerCase().includes(lowerQuery),
          );
          if (
            matchedLeaves.length === 0 &&
            !item.label.toLowerCase().includes(lowerQuery)
          )
            return null;
          return { ...item, children: matchedLeaves };
        }
        if (isLeaf(item)) {
          if (item.label.toLowerCase().includes(lowerQuery)) return item;
          const kids = childrenMap.get(item.id) || [];
          if (kids.some((k) => k.label.toLowerCase().includes(lowerQuery)))
            return item;
          return null;
        }
        return null;
      })
      .filter((item): item is RegistryItem => item !== null);
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
            onClick={() => setDesignOpen(true)}
            className="flex items-center justify-center w-[24px] h-[24px] rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label="Design system"
          >
            <Palette className="w-[14px] h-[14px]" />
          </button>
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
        {designSystemHtml &&
          (!search.trim() ||
            "design system".includes(search.toLowerCase())) && (
            <div className="mb-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setDesignSystemExpanded(!designSystemExpanded)}
                  className="flex items-center gap-1.5 px-2 py-2 text-left text-[11px] font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-2xl transition-colors flex-1"
                >
                  {designSystemExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="uppercase tracking-[0.08em] text-[10px]">
                    Design system
                  </span>
                </button>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={regenerateDesignSystem}
                        disabled={isGeneratingDesignSystem}
                        className="p-1 rounded text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50"
                        aria-label="Regenerate"
                      >
                        {isGeneratingDesignSystem ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Regenerate</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {designSystemExpanded && (
                <div className="grid grid-cols-1 gap-y-4 px-2 pt-2 pb-4">
                  <DesignSystemPreviewCard html={designSystemHtml} />
                </div>
              )}
            </div>
          )}

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
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 px-2 pt-2 pb-4">
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
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-2 pb-3 opacity-40 pointer-events-none select-none">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="w-full h-[96px] rounded-xl bg-stone-200 animate-pulse" />
                  <div
                    className="h-2 rounded-full bg-stone-200 animate-pulse"
                    style={{ width: i % 2 === 0 ? "60%" : "75%" }}
                  />
                </div>
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

      <DesignSystemModal open={designOpen} onOpenChange={setDesignOpen} />
    </aside>
  );
}
