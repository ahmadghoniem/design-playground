Stack: React 19 + react-router-dom v7 + Vite + @xyflow/react, TypeScript. Zustand stores. No `@` path alias — imports are relative. Repo root: the design-playground package.

TASK: Remove the entire keyboard-shortcut system (configurable keybindings + shortcuts modal + clipboard hotkeys) and strip every reference to it.

Delete these files entirely:
- `hooks/useCanvasKeyboard.ts`
- `hooks/useCanvasClipboard.ts`
- `lib/keybindings.ts`
- `stores/keybinding-store.ts`
- `components/modals/KeyboardShortcutsModal.tsx`

Edit `app/PlaygroundCanvas.tsx`:
- Remove the imports of `useCanvasKeyboard` and `useCanvasClipboard`.
- Remove the `useCanvasKeyboard({...})` call and the `useCanvasClipboard({...})` call.
- Remove `handleCopyNodes`, `handlePasteNodes`, `handleDuplicateNodes` (they came from `useCanvasClipboard`).
- Remove the `toggleDrawPenKind` useCallback (only consumed by `useCanvasKeyboard`).
- In the `useCanvasFlow()` destructure, remove `undo` and `redo` if they become unused after removing the keyboard hook.
- Keep the ReactFlow `deleteKeyCode={strokeSelection ? null : ["Delete", "Backspace"]}` prop unchanged (native React Flow, not part of the shortcut system).
- Keep the Ctrl/Meta-hold snap-to-grid effect (the one toggling `snapEnabled`) unchanged.

Edit `app/PlaygroundHeader.tsx`:
- Remove the import of `KeyboardShortcutsModal`.
- Remove the `Keyboard` lucide-react icon import.
- Remove the `shortcutsOpen` useState and the header button that calls `setShortcutsOpen(true)` (aria-label "Keyboard shortcuts") including its Tooltip wrapper.
- Remove the `<KeyboardShortcutsModal ... />` render at the bottom.

Edit `app/PlaygroundClient.tsx`:
- Remove the import of `matchesAction` from `../lib/keybindings`.
- Remove the useEffect that registers the `sidebar.toggle` keydown handler via `matchesAction`.

Edit `components/chat/DockedChatBar.tsx`:
- Remove the import of `matchesAction`, `formatKeyCombo`, `getCombo` from `../../lib/keybindings`.
- Remove the keydown branches that call `matchesAction(e.nativeEvent, "chat.cycle-model")` and `matchesAction(e.nativeEvent, "chat.toggle-edit-mode")`. The on-screen buttons for cycling model and toggling edit/explore mode already exist and must stay.
- Keep the plain `Enter` (submit) and `Escape` (clear/minimise) handlers.
- If `formatKeyCombo`/`getCombo` were only used to render shortcut hint text in the UI, remove that hint text too.

Edit `nodes/shared/IterateDialog.tsx`:
- Remove the import of `matchesAction` from `../../lib/keybindings`.
- Replace `if (matchesAction(e, "iterate.run") && canRun)` with `if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canRun)` — running the iteration is core and must keep working.
- Remove the branch that calls `matchesAction(e, "iterate.copy-prompt")` (drop the copy-prompt shortcut entirely).

Edit `hooks/useElementSelection.ts`:
- Remove the import of `getHoldKey` from `../lib/keybindings` and replace its use with the string literal `"Alt"`.

CONSTRAINTS:
- Do NOT change any other behavior. Do not touch React Flow's native delete-key handling or snap-to-grid.
- Match the existing relative-import style. Do not add a path alias.
- SHARED FILES: `app/PlaygroundCanvas.tsx`, `app/PlaygroundHeader.tsx`, `app/PlaygroundClient.tsx` are also edited by other tasks — only make the changes listed here.
- After deleting files, ensure no remaining import references them.

VERIFY:
- `grep -rn "useCanvasKeyboard\|useCanvasClipboard\|keybindings\|keybinding-store\|KeyboardShortcutsModal\|matchesAction\|getHoldKey" --include=*.ts --include=*.tsx .` returns no matches outside deleted files (should be empty).
- `grep -n "iterate.run\|metaKey || e.ctrlKey" nodes/shared/IterateDialog.tsx` shows the new inline Cmd/Ctrl+Enter check.
