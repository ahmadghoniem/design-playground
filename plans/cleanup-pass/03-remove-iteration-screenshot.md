Stack: React 19 + @xyflow/react, TypeScript. Relative imports.

TASK: Remove the `useIterationScreenshot` hook and the adopt-confirm thumbnail capture that depends on it, keeping the adopt flow otherwise intact.

Delete this file entirely:
- `hooks/useIterationScreenshot.ts`

Edit `hooks/useIterationAdoption.ts`:
- Remove the import `import { useIterationScreenshot } from "./useIterationScreenshot";`.
- Remove `const { capture } = useIterationScreenshot();`.
- Remove the `adoptThumbnail` useState (`const [adoptThumbnail, setAdoptThumbnail] = useState<string | null>(null);`).
- In `openAdoptConfirm`, remove the `setAdoptThumbnail(null)` line and the `capture(id).then(...)` block — leave it just opening the confirm dialog (`setShowAdoptConfirm(true)`).
- Remove `adoptThumbnail` from the returned object.
- Update the header doc-comment block to drop the `adoptThumbnail` line.

Edit `nodes/IterationNode.tsx`:
- The adopt-confirm dialog currently branches on `adoption.adoptThumbnail` (around line 771) to show either a captured thumbnail `<img>` or a fallback. Remove the thumbnail branch and keep only the no-thumbnail fallback content. Remove any reference to `adoption.adoptThumbnail`.

CONSTRAINTS:
- Keep the rest of the adoption lifecycle (the confirm dialog, `handleAdoptConfirm`, the API call, toasts) unchanged.
- Match existing relative-import and JSX style.
- SHARED FILE: `nodes/IterationNode.tsx` — only make the changes listed here.

VERIFY:
- `grep -rn "useIterationScreenshot\|adoptThumbnail" --include=*.ts --include=*.tsx .` returns no matches (should be empty).
- `grep -n "showAdoptConfirm" hooks/useIterationAdoption.ts` still shows the confirm-dialog state (adopt flow preserved).
