Stack: React 19 + Hono backend, TypeScript. Relative imports.

TASK: Remove the header "Open in Finder/Cursor/…" external-app launcher (including the macOS file-explorer target), keeping the GET project-context endpoint that feeds the header's project-name label.

Delete this file entirely:
- `hooks/useOpenIn.ts`

Edit `app/PlaygroundHeader.tsx`:
- Remove the import `import { useOpenIn, type OpenInTarget } from "../hooks/useOpenIn";`.
- Remove the `useOpenIn()` destructure (`targets`, `labels: TARGET_LABELS`, `icons`, `defaultTarget`, `openIn`).
- Remove `handleOpenTarget`, `handleCopyPath`, `projectMenuOpen`/`setProjectMenuOpen`, `pathCopied`/`setPathCopied`, and the `copyFeedbackTimerRef` + its cleanup useEffect — all of these only serve the open-in split button.
- Remove the entire "Split open-in button" block (the `<div className="flex items-center ml-1.5">...</div>` containing the default-app button, divider, and the `<DropdownMenu>` picker).
- Remove now-unused imports: `ChevronDown`, `Copy` (lucide-react), and the `DropdownMenu`/`DropdownMenuContent`/`DropdownMenuItem`/`DropdownMenuTrigger` imports if they are no longer used elsewhere in the file.
- KEEP `useProjectContext` and the project-name `<span>/{projectContext.projectName}</span>` — that stays.

Edit `server/routes/open-in.ts`:
- Remove the `app.post('/api/open-in', ...)` handler entirely.
- Remove the now-unused helpers `runOpen`, `getOpenArgs`, the `OpenInTarget` type, and the `execFile` import.
- KEEP the `app.get('/api/open-in', ...)` handler returning `{ projectName, projectPath, platform }` and the `PROJECT_PATH`/`PROJECT_NAME` consts — `useProjectContext` depends on this GET.

Delete these now-orphaned asset files:
- `assets/finder-icon.png`
- `assets/github-desktop-icon.png`
- `assets/antigravity-icon.png`
- `assets/codex-icon.png`
(Only if nothing else imports them — verify with grep first; the only importer was `hooks/useOpenIn.ts` which is deleted.)

CONSTRAINTS:
- Do NOT remove or rename the GET `/api/open-in` route or `useProjectContext.ts` — the header project label breaks otherwise.
- Do NOT touch `server/index.ts` registration of `openInRoutes()` — the route still exports (GET only).
- SHARED FILE: `app/PlaygroundHeader.tsx` is edited by task 01 — only make the changes listed here.

VERIFY:
- `grep -rn "useOpenIn\|OpenInTarget\|open-in\b" --include=*.ts --include=*.tsx . | grep -v "server/routes/open-in.ts\|useProjectContext.ts"` returns no UI/launcher matches.
- `grep -n "app.post" server/routes/open-in.ts` returns nothing; `grep -n "app.get" server/routes/open-in.ts` still shows the GET.
- `grep -rn "finder-icon\|github-desktop-icon\|antigravity-icon\|codex-icon" --include=*.ts --include=*.tsx .` returns no matches.
