Stack: TypeScript + React 18 (Vite host, no build step). Key files: components/canvas/PlaygroundCanvasContextMenu.tsx, app/PlaygroundCanvas.tsx, components/canvas/PlaygroundCanvasDialogs.tsx. Plus delete hooks/useCanvasCreatePage.ts and prompts/create-page.prompt.ts.

TASK: Remove the "Create a new page" (create-page-from-description) feature entirely, cleaning up all the props it threads through three components, and delete its two now-dead source files.

DETAILS — components/canvas/PlaygroundCanvasContextMenu.tsx:
1. Remove the `<button>` whose text is "Create a new page" (it calls `onCreatePage(contextMenu.x, contextMenu.y)`), AND the `<div className="my-1 h-px bg-white/10" />` divider immediately after it.
2. Remove `onCreatePage` from the component's props interface (the `onCreatePage: (screenX: number, screenY: number) => void;` line) and from the destructured params.
3. Remove the now-unused `PageDocumentIcon` import.

DETAILS — components/canvas/PlaygroundCanvasDialogs.tsx:
1. Remove the entire `{createPageDialog && ( ... )}` JSX block (the New Page dialog).
2. Remove every create-page prop from the component's props interface AND its destructure: `createPageDialog`, `setCreatePageDialog`, `newPageDescription`, `setNewPageDescription`, `createPageError`, `setCreatePageError`, `creatingPage`, `newPageInputRef`, `handleCreatePage`.

DETAILS — app/PlaygroundCanvas.tsx:
1. Remove the `import { useCanvasCreatePage } from "../hooks/useCanvasCreatePage";` line.
2. Remove the whole `const { createPageDialog, setCreatePageDialog, newPageDescription, setNewPageDescription, createPageError, setCreatePageError, creatingPage, newPageInputRef, handleCreatePage, openCreatePageDialog } = useCanvasCreatePage({ ... });` call and its options object.
3. Remove all the create-page props passed to `<PlaygroundCanvasDialogs .../>`: the lines `createPageDialog={createPageDialog}` through `handleCreatePage={handleCreatePage}`.
4. Remove `onCreatePage={openCreatePageDialog}` from the `<PlaygroundCanvasContextMenu .../>` usage.

DETAILS — delete files (they are now unreferenced anywhere else — verified):
- hooks/useCanvasCreatePage.ts
- prompts/create-page.prompt.ts

CONSTRAINTS:
- Do not remove any OTHER context-menu item (Organize, Group, etc.) or any OTHER dialog (clear dialog, delete dialog) — only the create-page pieces.
- Do not touch server routes, nodes, or the html-pages / oncanvas-components code.
- Leave all other props and imports in the three files intact.

VERIFY: grep -rn "useCanvasCreatePage\|createPageDialog\|openCreatePageDialog\|Create a new page\|handleCreatePage" app components hooks prompts must return NOTHING (all references gone); the files hooks/useCanvasCreatePage.ts and prompts/create-page.prompt.ts must not exist.
