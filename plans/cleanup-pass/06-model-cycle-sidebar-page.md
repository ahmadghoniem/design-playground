Stack: React 19 + react-router-dom v7 + Vite, TypeScript. Relative imports, no `@` alias. NOTE: there is NO `@tanstack/*` dependency — do NOT add one.

TASK: Three independent simplifications — strip the model-cycle flip animation, drop sidebar-visibility localStorage persistence, and move the projectId fetch out of the shallow page wrapper.

--- Part 1: useModelCycle animation strip ---

Edit `hooks/useModelCycle.ts`:
- Make `cycleModel` set the model synchronously. Remove the 350ms `setTimeout` flip, the `switchTimeoutRef`, the `isSwitching` state, and the `nextModel` state.
- `cycleModel` should compute the next model, then immediately `setModel(next)` and `saveSelectedModel(next)`.
- Remove the unmount cleanup useEffect that cleared `switchTimeoutRef`.
- Update `UseModelCycleReturn` to drop `isSwitching` and `nextModel`; return `{ model, setModel, cycleModel }`.

Edit `components/chat/DockedChatBar.tsx`:
- Update the `useModelCycle(models)` destructure to `{ model, cycleModel }` (drop `isSwitching`, `nextModel`).
- Remove the `is-switching` className usage on the chat-bubble button(s).
- Remove `nextConfig` (the `getModelIconConfig(nextModel, ...)` computation) and any JSX that rendered the next-model preview during the flip.

--- Part 2: Sidebar visibility — drop localStorage ---

Edit `app/PlaygroundClient.tsx`:
- Remove `getSidebarVisibilityStorageKey`, `loadSidebarVisibility`, and the `sidebarVisibilityStorageKey` variable.
- Change the sidebar state to default visible: `const [sidebarVisible, setSidebarVisible] = useState(true);`.
- Remove the useEffect that writes `sidebarVisible` to `window.localStorage`.
- Remove the now-unused `STORAGE_KEY` import ONLY if it is not still used elsewhere in the file (it is also used for the canvas `CanvasFlowProvider` storageKey — keep that usage and the import if so).

--- Part 3: page.tsx / projectId fetch ---

`dev-entry.tsx` imports `{ PlaygroundPage }` from `./app/page` and renders it as the router entry, so `app/page.tsx` must remain the entry export. Move the fetch inward:
- Edit `app/PlaygroundClient.tsx`: add the projectId fetch here. Add a `useProjectId()` local hook (plain `fetch('/playground/api/project-id')` in a useEffect, falling back to `{ projectId: 'unknown-project' }` on error, returning `null` until loaded). While `null`, render `null`. Use the resolved `projectId` internally instead of receiving it as a prop. Remove the `projectId?: string` prop from `PlaygroundClient`'s signature and all internal uses now read from the local hook.
- Edit `app/page.tsx`: simplify to just `export function PlaygroundPage() { return <PlaygroundClient />; }` — remove `useProjectInfo`, the `ProjectInfoResponse` interface, and the prop plumbing.

CONSTRAINTS:
- Do NOT add `@tanstack/react-query` or any new dependency — keep the plain `fetch`.
- Keep `PlaygroundPage` exported from `app/page.tsx` (dev-entry.tsx depends on it).
- The projectId is still used to scope canvas persistence — ensure `PlaygroundClient` passes it to `<PlaygroundCanvas projectId=...>` and the `CanvasFlowProvider storageKey` exactly as before, just sourced from the internal hook.
- SHARED FILE: `app/PlaygroundClient.tsx` is edited by tasks 01, 04 — only make the changes listed here.

VERIFY:
- `grep -rn "isSwitching\|nextModel\|switchTimeoutRef\|is-switching\|nextConfig" --include=*.ts --include=*.tsx .` returns no matches.
- `grep -n "loadSidebarVisibility\|sidebar-visible\|getSidebarVisibilityStorageKey" app/PlaygroundClient.tsx` returns nothing.
- `grep -n "useProjectInfo\|projectId" app/page.tsx` returns nothing (page.tsx is now a thin wrapper).
- `grep -rn "@tanstack" package.json` returns nothing (no new dep added).
