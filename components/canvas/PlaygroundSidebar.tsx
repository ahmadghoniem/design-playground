import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  DragEvent,
  MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Plus,
  Palette,
  Loader2,
  RefreshCw,
  RotateCcw,
  Frame,
  FileCode,
  Trash2,
} from "lucide-react";
import { ProjectBoxIcon } from "../ui/playground-nav-icons";
import { registry, RegistryItem, isGroup, isLeaf } from "../../registry";
import {
  DND_DATA_KEY,
  HTML_ID_PREFIX,
  JSX_ID_PREFIX,
  DELETE_FRAME_EVENT,
  CREATE_DESIGN_EVENT,
} from "../../lib/constants";
import type { PendingChild } from "../../app/PlaygroundClient";
import DesignSystemModal from "../modals/DesignSystemModal";
import { useModelSettingsStore } from "../../stores/model-settings-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { toast } from "sonner";
import { buildChildrenMap, flattenLeaves } from "../../lib/registry-tree";
import { useFocusNode } from "../../hooks/useFocusNode";
import { useSidebarDiscoverySync } from "./sidebar/useSidebarDiscoverySync";
import ComponentPreviewCard from "./sidebar/ComponentPreviewCard";
import DesignSystemPreviewCard from "./sidebar/DesignSystemPreviewCard";
import TreeNode, { type PageContextPayload } from "./sidebar/TreeNode";

interface PlaygroundSidebarProps {
  onCollapse: () => void;
  onOpenDiscovery: () => void;
  pendingChildren: Map<string, PendingChild[]>;
}

export default function PlaygroundSidebar({
  onCollapse,
  onOpenDiscovery,
  pendingChildren,
}: PlaygroundSidebarProps) {
  const [search, setSearch] = useState("");
  const [htmlExpanded, setHtmlExpanded] = useState(true);
  const [designOpen, setDesignOpen] = useState(false);
  const [designSystemExpanded, setDesignSystemExpanded] = useState(true);
  const [isGeneratingDesignSystem, setIsGeneratingDesignSystem] =
    useState(false);
  const activeProvider = useModelSettingsStore((s) => s.activeProvider);
  const enabledModels = useModelSettingsStore(
    (s) => s.providerState[s.activeProvider]?.enabledModels ?? [],
  );
  const { focusNode } = useFocusNode();

  const {
    htmlPages,
    jsxComponents,
    isRefreshingHtml,
    fetchHtmlPages,
    designSystemHtml,
    fetchDesignSystem,
  } = useSidebarDiscoverySync();

  const childrenMap = useMemo(() => buildChildrenMap(registry), []);

  // Per-group expanded state for the grid view (defaults to expanded)
  const [groupExpanded, setGroupExpanded] = useState<Record<string, boolean>>(
    {},
  );
  const isGroupExpanded = (id: string) => groupExpanded[id] !== false;
  const toggleGroup = (id: string) =>
    setGroupExpanded((prev) => ({
      ...prev,
      [id]: prev[id] === false ? true : false,
    }));

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
        // Drain the stream — the server returns when generation is done.
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

  // Context menu state
  type ContextMenuFrame =
    | { id: string; label: string; frameType: "html" | "jsx" }
    | { id: string; label: string; frameType: "page"; slug: string };
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    frame: ContextMenuFrame;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const handleFrameContextMenu = useCallback(
    (
      e: MouseEvent,
      frame: { id: string; label: string; frameType: "html" | "jsx" },
    ) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, frame });
    },
    [],
  );

  const handlePageContextMenu = useCallback(
    (e: MouseEvent, payload: PageContextPayload) => {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        frame: {
          id: payload.id,
          label: payload.label,
          frameType: "page",
          slug: payload.slug,
        },
      });
    },
    [],
  );

  const handleDeleteFrame = useCallback(async () => {
    if (!contextMenu) return;
    const { frame } = contextMenu;
    setContextMenu(null);

    try {
      if (frame.frameType === "html") {
        const folder = frame.id.replace(HTML_ID_PREFIX, "");
        await fetch("/playground/api/html-pages", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageFolder: folder }),
        });
      } else if (frame.frameType === "jsx") {
        const filename = frame.id.replace(JSX_ID_PREFIX, "") + ".tsx";
        await fetch("/playground/api/oncanvas-components", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename }),
        });
      } else if (frame.frameType === "page") {
        const res = await fetch(
          `/playground/api/pages?slug=${encodeURIComponent(frame.slug)}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.error("[Sidebar] Page delete failed:", data?.error);
        }
      }
      // Tell the canvas to remove nodes for this frame
      window.dispatchEvent(
        new CustomEvent(DELETE_FRAME_EVENT, {
          detail: { componentId: frame.id },
        }),
      );
      fetchHtmlPages();
    } catch {
      /* ignore */
    }
  }, [contextMenu, fetchHtmlPages]);

  // Close context menu on outside click or escape
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [contextMenu]);

  const handleDragStartHtml = (
    e: DragEvent<HTMLDivElement>,
    pageId: string,
  ) => {
    e.dataTransfer.setData(DND_DATA_KEY, pageId);
    e.dataTransfer.setData("text/plain", "");
    e.dataTransfer.effectAllowed = "move";
  };

  // For the grid view, filtering happens against the FLAT list of leaves
  // under each group — so a search like "card" will surface SubscribeBanner's
  // children too (not just top-level components).
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
          // Re-expose matched leaves directly as the group's flat children so
          // the grid renderer (which flattens again) shows exactly the matches.
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

  // Use the unstripped registry as the base — `flattenLeaves` already walks
  // every leaf (parents and children) so we don't need to strip anything.
  const filteredRegistry = filterRegistryForGrid(registry, search);

  // Merge HTML pages and JSX components into one sorted frames list
  const allFrames = [
    ...htmlPages.map((p) => ({
      id: p.id,
      label: p.label,
      frameType: "html" as const,
    })),
    ...jsxComponents.map((c) => ({
      id: c.id,
      label: c.label,
      frameType: "jsx" as const,
    })),
  ].sort((a, b) => {
    const na = parseInt(a.label.match(/(\d+)/)?.[1] ?? "0", 10);
    const nb = parseInt(b.label.match(/(\d+)/)?.[1] ?? "0", 10);
    return na - nb;
  });

  const filteredFrames = search.trim()
    ? allFrames.filter((f) =>
        f.label.toLowerCase().includes(search.toLowerCase()),
      )
    : allFrames;

  return (
    <aside className="w-[280px] h-full bg-white rounded-2xl border border-pg-border flex flex-col overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Header */}
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
            onClick={fetchHtmlPages}
            disabled={isRefreshingHtml}
            className="flex items-center justify-center w-[24px] h-[24px] rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-50"
            aria-label="Refresh designs"
          >
            <RefreshCw
              className={`w-[14px] h-[14px] ${isRefreshingHtml ? "animate-spin" : ""}`}
            />
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

      {/* Search */}
      <div className="px-3 pb-3 flex-shrink-0">
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-[13px] bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-400/15 transition-colors"
        />
      </div>

      {/* Scrollable area for both HTML pages and component tree */}
      <div className="flex-1 overflow-y-auto px-1.5 min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-300 [&::-webkit-scrollbar-thumb]:rounded">
        {/* Design system section — generated showcase, draggable to canvas */}
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

        {/* Frames section — HTML pages and on-canvas JSX components */}
        {(!search.trim() || filteredFrames.length > 0) && (
          <div className="mb-1">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setHtmlExpanded(!htmlExpanded)}
                className="flex items-center gap-1.5 px-2 py-2 text-left text-[11px] font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-2xl transition-colors flex-1"
              >
                {htmlExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="uppercase tracking-[0.08em] text-[10px]">
                  Design
                </span>
              </button>
              <button
                onClick={() =>
                  window.dispatchEvent(new CustomEvent(CREATE_DESIGN_EVENT))
                }
                className="flex items-center justify-center w-[24px] h-[24px] rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors shrink-0 mr-1"
                aria-label="Create a new design"
              >
                <Plus className="w-[14px] h-[14px]" />
              </button>
            </div>
            {htmlExpanded &&
              filteredFrames.map((frame) => (
                <div
                  key={frame.id}
                  draggable
                  onDragStart={(e) => handleDragStartHtml(e, frame.id)}
                  onDoubleClick={() => focusNode(frame.id)}
                  onContextMenu={(e) => handleFrameContextMenu(e, frame)}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-[13px] text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-sm cursor-grab active:cursor-grabbing transition-colors group select-none"
                  style={{ paddingLeft: "18px" }}
                >
                  {frame.frameType === "jsx" ? (
                    <FileCode className="w-3.5 h-3.5 shrink-0 text-purple-500" />
                  ) : (
                    <Frame className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {frame.label}
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Component grid — flat 2-column layout of preview cards.
            Top-level groups become collapsible section headers; leaves under
            them (including nested children with parentId) are flattened into
            a single grid per group. */}
        {filteredRegistry.length > 0 ? (
          filteredRegistry.map((item) => {
            if (isGroup(item)) {
              const leaves = flattenLeaves(item.children);
              const expanded = isGroupExpanded(item.id);
              return (
                <div key={item.id} className="mb-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleGroup(item.id)}
                      className="flex items-center gap-1.5 px-2 py-2 text-left text-[11px] font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-2xl transition-colors flex-1"
                    >
                      {expanded ? (
                        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="uppercase tracking-[0.08em] text-[10px]">
                        {item.label}
                      </span>
                    </button>
                    {item.id === "pages" && (
                      <button
                        onClick={onOpenDiscovery}
                        className="flex items-center justify-center w-[24px] h-[24px] rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors shrink-0 mr-1"
                        aria-label="Add pages"
                      >
                        <Plus className="w-[14px] h-[14px]" />
                      </button>
                    )}
                  </div>
                  {expanded && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4 px-2 pt-2 pb-4">
                      {leaves.map((leaf) => (
                        <ComponentPreviewCard
                          key={leaf.id}
                          item={leaf}
                          onPageContextMenu={handlePageContextMenu}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            // Stand-alone leaf at the top level — fall back to the original
            // tree row so we never lose access to it.
            return (
              <TreeNode
                key={item.id}
                item={item}
                childrenMap={childrenMap}
                pendingChildren={pendingChildren}
                onPageContextMenu={handlePageContextMenu}
              />
            );
          })
        ) : !search.trim() ? (
          /* Empty state — no components discovered yet */
          <div className="px-2 pt-1 pb-3">
            {/* Skeleton preview cards */}
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
              Add my pages
            </button>
          </div>
        ) : (
          <p className="text-xs text-stone-400 text-center py-3 select-none">
            No results
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex-shrink-0 border-t border-stone-100">
        <p className="text-[11px] text-stone-400 text-center select-none">
          Drag drop any component
        </p>
      </div>

      {/* Context menu — portaled to body to avoid clipping by aside overflow */}
      {contextMenu &&
        createPortal(
          <div
            ref={contextMenuRef}
            className="fixed z-50 min-w-[140px] bg-white border border-stone-200 rounded-2xl shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={handleDeleteFrame}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors text-left rounded-2xl"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete {contextMenu.frame.label}
            </button>
          </div>,
          document.body,
        )}

      <DesignSystemModal open={designOpen} onOpenChange={setDesignOpen} />
    </aside>
  );
}
