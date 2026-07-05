Stack: TypeScript + React 18 (Vite host). Key files: components/canvas/PlaygroundSidebar.tsx, components/canvas/sidebar/ComponentPreviewCard.tsx, lib/registry-tree.ts.

TASK: Remove the last remaining page affordance in the sidebar — the right-click "Delete <page>" context menu on registered `page.tsx` cards, plus its plumbing. (The html/jsx frame menus were already removed by the sidebar-components refactor; page is the only branch left.) After this, component cards have no context menu.

DETAILS — components/canvas/PlaygroundSidebar.tsx:
1. Remove the `type PageContextPayload` name from the `../sidebar/ComponentPreviewCard` import.
2. Delete the `type ContextMenuFrame = { … frameType: "page"; … }` line and the `contextMenu` `useState` and `contextMenuRef` `useRef`.
3. Delete the `handlePageContextMenu` useCallback.
4. Delete the `handleDeleteFrame` useCallback (the one that fetches `DELETE /playground/api/pages?slug=…` and dispatches `DELETE_FRAME_EVENT`).
5. Delete the `useEffect` that closes the context menu on outside-click / Escape (guarded by `if (!contextMenu) return;`).
6. Delete the context-menu portal render block at the bottom (`{contextMenu && ( … <Trash2 … /> Delete {contextMenu.frame.label} … )}`).
7. Remove the `onPageContextMenu={handlePageContextMenu}` prop from the `<ComponentPreviewCard … />` usage.
8. Remove now-unused imports: `Trash2` (lucide-react) and `DELETE_FRAME_EVENT` (from ../../lib/constants) — only if no other reference remains in the file after the deletions.

DETAILS — components/canvas/sidebar/ComponentPreviewCard.tsx:
1. Delete the `export interface PageContextPayload { … }`.
2. Remove the `onPageContextMenu?: (…)=>void;` prop from the card's props interface and from the destructured params.
3. Remove the `slugFromSourcePath` import.
4. Delete `const isPage = /^src\/app\/[^/]+\/page\.tsx$/.test(item.sourcePath);` and `const slug = isPage ? slugFromSourcePath(item.sourcePath) : null;`.
5. Remove the `onContextMenu` handler wiring that calls `onPageContextMenu(e, { id, label, slug })` (the `isPage && slug && onPageContextMenu ? … : undefined` expression) — the card element should no longer set `onContextMenu` for pages.

DETAILS — lib/registry-tree.ts:
1. Delete the now-unused `slugFromSourcePath` export.

DETAILS — lib/constants.ts:
1. Delete the `DELETE_FRAME_EVENT` export (no listener exists; the sidebar was the only dispatcher).

CONSTRAINTS:
- Do NOT touch the Design-system showcase section, the components grid, `flattenLeaves`, or the collapse/search behavior.
- Do NOT change server routes (the `/api/pages` route is deleted in chunk 04) or canvas node code.

VERIFY:
- `grep -rn "onPageContextMenu\|handlePageContextMenu\|PageContextPayload\|ContextMenuFrame\|slugFromSourcePath\|frameType" components/canvas/PlaygroundSidebar.tsx components/canvas/sidebar/ComponentPreviewCard.tsx lib/registry-tree.ts` returns NOTHING.
- Real typecheck from the host passes: `npx tsc -p tsconfig.app.json --noEmit`.
- Sidebar renders component cards; right-clicking a card does nothing (no delete menu).
