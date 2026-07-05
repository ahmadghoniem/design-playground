Stack: TypeScript + React 18 (Vite host, no build step). Key file: components/canvas/PlaygroundSidebar.tsx, and components/canvas/sidebar/useSidebarDiscoverySync.ts.

TASK: In the sidebar, remove the "Design" frames list (created HTML pages + JSX frames) and the Refresh button, and unify the component registry grid into a single collapsible "COMPONENTS" section that carries the "+ Add" button. Keep the "Design system" showcase section and the Palette DesignSystemModal untouched.

DETAILS — components/canvas/PlaygroundSidebar.tsx:

1. DELETE the entire "Frames section" block that renders `filteredFrames` (the JSX comment reads `{/* Frames section — HTML pages and on-canvas JSX components */}` down through its closing `)}`). This is the section whose header label is "Design".

2. DELETE the now-unused frames machinery:
   - the `allFrames` and `filteredFrames` `const` computations
   - the `htmlExpanded` useState
   - the `handleDragStartHtml` function
   - the `handleFrameContextMenu` function
   - inside `handleDeleteFrame`, delete the `frame.frameType === "html"` and `frame.frameType === "jsx"` branches; KEEP the `frame.frameType === "page"` branch. If after that the `ContextMenuFrame` html/jsx variants are unused, narrow the type to just the `page` variant.

3. REMOVE the Refresh button (the `<button>` with `aria-label="Refresh designs"` containing `<RefreshCw .../>`) from the header actions. Keep the Palette button (`aria-label="Design system"`) and the collapse button.

4. Stop consuming frames data from the hook: change the `useSidebarDiscoverySync()` destructure to no longer pull `htmlPages`, `jsxComponents`, `isRefreshingHtml`, `fetchHtmlPages`. Keep `designSystemHtml` and `fetchDesignSystem`.
   - `handleDeleteFrame` currently calls `fetchHtmlPages()` at the end — remove that call.

5. UNIFY the component registry grid into ONE section. Replace the current `filteredRegistry.map(...)` block (which renders a separate header per group) with:
   - A single collapsible header labelled "Components" (uppercase styling identical to the existing group headers — reuse the same className strings and the ChevronDown/ChevronRight toggle), with the existing `onOpenDiscovery` "+ Add" `Plus` button on the right of that header (aria-label "Add components").
   - Below it, ONE grid (same `grid grid-cols-2 gap-x-4 gap-y-4 px-2 pt-2 pb-4` container) rendering `flattenLeaves(filteredRegistry)` mapped through the existing `<ComponentPreviewCard item={leaf} onPageContextMenu={handlePageContextMenu} />`. `flattenLeaves` is already imported from `../../lib/registry-tree`.
   - Use a single boolean state `componentsExpanded` (default true) for the collapse instead of the per-group `groupExpanded` map. You may delete `groupExpanded`, `isGroupExpanded`, `toggleGroup` if now unused.
   - Preserve the empty-state branch (when `filteredRegistry` is empty and no search): keep the skeleton cards, and change the button label from "Add my pages" to "Add components".
   - Preserve the "No results" branch for a non-matching search.

6. Remove now-unused imports: `RefreshCw`, `Frame`, `FileCode` from lucide-react, and `HTML_ID_PREFIX` / `JSX_ID_PREFIX` from constants IF they are no longer referenced after the deletions (they were used by handleDeleteFrame html/jsx branches and handleDragStartHtml). Keep `Plus`, `Palette`, `ChevronRight`, `ChevronDown`, `ChevronLeft`, `Trash2`, `RotateCcw`, `Loader2`.

DETAILS — components/canvas/sidebar/useSidebarDiscoverySync.ts:
- Leave this file UNCHANGED (it still exports the design-system fetch used by the sidebar). Do not delete it. It is fine that htmlPages/jsxComponents remain exported but unused.

CONSTRAINTS:
- Do NOT touch the "Design system" showcase section (the block rendering `designSystemHtml` and `DesignSystemPreviewCard`) or `DesignSystemModal`.
- Do NOT change any server route, node, or iteration code.
- Match the existing Tailwind class strings and formatting exactly when reusing header/grid markup.
- Keep `handlePageContextMenu`, `ComponentPreviewCard`, `flattenLeaves`, and the context-menu portal working.

VERIFY: grep -n "filteredFrames\|allFrames\|handleDragStartHtml\|Refresh designs\|Add my pages" components/canvas/PlaygroundSidebar.tsx must return NOTHING; grep -n "Components\|flattenLeaves(filteredRegistry)\|Add components" components/canvas/PlaygroundSidebar.tsx must match.
