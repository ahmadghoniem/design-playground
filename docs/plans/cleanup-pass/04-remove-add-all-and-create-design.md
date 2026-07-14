Stack: React 19 + @xyflow/react + Hono backend, TypeScript. Relative imports.

TASK: Remove two features — the "Add All" bulk component import, and the "create new (blank) design" HTML-page flow (including the OS-file HTML-drop that shares that subsystem).

--- Part 1: "Add All" ---

Edit `app/PlaygroundClient.tsx`:
- Remove `handleAddAll`, `processAddAllQueue`, `addAllProcessingRef`, the `AddAllQueue` interface, and the useEffect that resumes the queue from sessionStorage on mount (the "Resume Add All on mount (HMR recovery)" effect).
- Remove the import of `ADD_ALL_QUEUE_STORAGE_KEY` from `../lib/constants`.
- Remove the `onAddAll={handleAddAll}` prop passed to `<DiscoveryModal>`.
- Keep `handleAddComponent` (per-item add) and `analyzeChildren` — those stay.

Edit `components/modals/DiscoveryModal.tsx`:
- Remove the `onAddAll` prop from the component's props interface and signature.
- Remove the "Add All (N)" button and the `addableEntries` computation that only fed it.

Edit `lib/constants.ts`:
- Delete `export const ADD_ALL_QUEUE_STORAGE_KEY = ...`.

--- Part 2: "Create new design" (blank HTML page) ---

Edit `hooks/useCanvasCreatePage.ts`:
- Remove `handleCreateHtmlPageAt`, `getNextUntitledDesignName`, and the useEffect that listens for `CREATE_DESIGN_EVENT`.
- Remove the import of `CREATE_DESIGN_EVENT` from `../lib/constants`.
- Remove `handleCreateHtmlPageAt` from the returned object.
- KEEP `handleCreatePage`, `createPageDialog`, `openCreatePageDialog`, `newPageDescription`, and everything else — the "describe a page, agent generates it" dialog stays.

Edit `app/PlaygroundCanvas.tsx`:
- The `useCanvasCreatePage(...)` destructure references `handleCreateHtmlPageAt` — remove it from the destructure.
- Remove the `onCreateDesign={handleCreateHtmlPageAt}` prop from `<PlaygroundCanvasContextMenu>`.

Edit `components/canvas/PlaygroundCanvasContextMenu.tsx`:
- Remove the `onCreateDesign` prop from the props interface and signature.
- Remove the context-menu item that calls `onCreateDesign(...)` (the "New design" item around line 67). Keep the `onCreatePage` item.

Edit `components/canvas/PlaygroundSidebar.tsx`:
- Remove the "+" button (aria-label "Create a new design", around line 424) that dispatches `new CustomEvent(CREATE_DESIGN_EVENT)`.
- Remove the import of `CREATE_DESIGN_EVENT` from `../../lib/constants`.

Edit `hooks/useCanvasDragDrop.ts`:
- Remove the branch that handles dropping a `.html` file from the OS filesystem (the block that reads dropped files, POSTs to `/playground/api/html-pages`, and creates an html-render node — roughly lines 150-210, the section that builds a node with `renderMode: "html"` from a dropped HTML file). Keep the normal drag-from-sidebar `componentId`/`DND_DATA_KEY` path and the existing-iteration attachment logic that follows it.

Edit `lib/constants.ts`:
- Delete `export const CREATE_DESIGN_EVENT = 'playground:create-design';`.

CONSTRAINTS:
- Do NOT remove `handleCreatePage` (the agent-generates-a-page dialog) or any rendering of EXISTING html pages/iterations — generated variations depend on the html-pages subsystem. Only the blank-page creation and OS-file-drop entry points are removed.
- Keep `/playground/api/html-pages` server routes untouched (still used for rename + rendering existing pages).
- SHARED FILES: `app/PlaygroundCanvas.tsx`, `app/PlaygroundClient.tsx`, `lib/constants.ts` are edited by other tasks — only make the changes listed here.

VERIFY:
- `grep -rn "ADD_ALL_QUEUE_STORAGE_KEY\|handleAddAll\|processAddAllQueue\|onAddAll\|CREATE_DESIGN_EVENT\|handleCreateHtmlPageAt\|getNextUntitledDesignName" --include=*.ts --include=*.tsx .` returns no matches (should be empty).
- `grep -n "handleCreatePage" hooks/useCanvasCreatePage.ts` still present (describe-a-page dialog kept).
- `grep -n "html-pages" server/routes/html-pages.ts` still present (server routes untouched).
