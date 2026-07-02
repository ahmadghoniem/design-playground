import { useState, type DragEvent, type MouseEvent } from "react";
import { ChevronRight, ChevronDown, Loader2, Component } from "lucide-react";
import { PageDocumentIcon } from "../../ui/playground-nav-icons";
import {
  RegistryItem,
  RegistryLeafItem,
  isGroup,
  isLeaf,
} from "../../../registry";
import { DND_DATA_KEY } from "../../../lib/constants";
import { slugFromSourcePath } from "../../../lib/registry-tree";
import type { PendingChild } from "../../../app/PlaygroundClient";
import { useFocusNode } from "../../../hooks/useFocusNode";
import type { PageContextPayload } from "./ComponentPreviewCard";

interface TreeNodeProps {
  item: RegistryItem;
  depth?: number;
  childrenMap: Map<string, RegistryLeafItem[]>;
  pendingChildren: Map<string, PendingChild[]>;
  parentGroupId?: string;
  onPageContextMenu?: (e: MouseEvent, payload: PageContextPayload) => void;
}

/** Recursive tree row — renders groups (expandable headers) and leaves (draggable rows). */
export default function TreeNode({
  item,
  depth = 0,
  childrenMap,
  pendingChildren,
  parentGroupId,
  onPageContextMenu,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const { focusNode } = useFocusNode();

  const handleDragStart = (
    e: DragEvent<HTMLDivElement>,
    componentId: string,
  ) => {
    e.dataTransfer.setData(DND_DATA_KEY, componentId);
    e.dataTransfer.setData("text/plain", "");
    e.dataTransfer.effectAllowed = "move";
  };

  if (isGroup(item)) {
    const sortedChildren =
      item.id === "pages"
        ? [...item.children].sort((a, b) => a.label.localeCompare(b.label))
        : item.children;
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full px-2 py-2 text-left text-[11px] font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-2xl transition-colors"
          style={{ paddingLeft: `${depth * 10 + 8}px` }}
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
        {expanded && (
          <div>
            {sortedChildren.map((child) => (
              <TreeNode
                key={child.id}
                item={child}
                depth={depth + 1}
                childrenMap={childrenMap}
                pendingChildren={pendingChildren}
                parentGroupId={item.id}
                onPageContextMenu={onPageContextMenu}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isLeaf(item)) {
    const registryChildren = childrenMap.get(item.id) || [];
    const pending = pendingChildren.get(item.id) || [];
    // Filter out pending items that already exist as registry children (done analyzing)
    const registryChildIds = new Set(registryChildren.map((c) => c.id));
    const activePending = pending.filter(
      (p) => p.status !== "done" && !registryChildIds.has(p.id),
    );
    const hasChildren = registryChildren.length > 0 || activePending.length > 0;

    const isPageEntry =
      parentGroupId === "pages" ||
      /^src\/app\/[^/]+\/page\.tsx$/.test(item.sourcePath);

    if (hasChildren) {
      return (
        <div>
          {/* Parent item — both expandable and draggable */}
          <div
            className="flex items-center gap-1 px-2 py-1.5 text-[13px] text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-2xl transition-colors group select-none"
            style={{ paddingLeft: `${depth * 10 + 8}px` }}
          >
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDoubleClick={() => focusNode(item.id)}
              className="flex items-center gap-1.5 flex-1 min-w-0 cursor-grab active:cursor-grabbing"
            >
              {isPageEntry ? (
                <PageDocumentIcon
                  className="shrink-0 text-stone-500"
                  size={14}
                />
              ) : (
                <Component className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {item.label}
              </span>
              <button
                onClick={() => setExpanded(!expanded)}
                className="shrink-0 p-0 text-stone-400 hover:text-stone-600"
              >
                {expanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
          {expanded && (
            <div>
              {/* Already-analyzed child components */}
              {registryChildren.map((child) => (
                <TreeNode
                  key={child.id}
                  item={child}
                  depth={depth + 1}
                  childrenMap={childrenMap}
                  pendingChildren={pendingChildren}
                />
              ))}
              {/* Pending child components — greyed out with spinner */}
              {activePending.map((child) => (
                <div
                  key={child.id}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-[13px] text-stone-400 opacity-50 cursor-default select-none rounded-2xl"
                  title={`Adding ${child.name}…`}
                  style={{ paddingLeft: `${(depth + 1) * 10 + 8}px` }}
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-300 shrink-0" />
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {child.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Normal leaf — no children
    const isPage = parentGroupId === "pages";
    const slug = isPage ? slugFromSourcePath(item.sourcePath) : null;
    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, item.id)}
        onDoubleClick={() => focusNode(item.id)}
        onContextMenu={
          isPage && slug && onPageContextMenu
            ? (e) =>
                onPageContextMenu(e, { id: item.id, label: item.label, slug })
            : undefined
        }
        className="flex items-center gap-1.5 px-2 py-1.5 text-[13px] text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-2xl cursor-grab active:cursor-grabbing transition-colors group select-none"
        style={{ paddingLeft: `${depth * 10 + 8}px` }}
      >
        {isPage ? (
          <PageDocumentIcon className="shrink-0 text-stone-500" size={14} />
        ) : (
          <Component className="w-3.5 h-3.5 shrink-0" />
        )}
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {item.label}
        </span>
      </div>
    );
  }

  return null;
}
