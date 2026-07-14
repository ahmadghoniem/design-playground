Stack: React 18 + react-router-dom v7 (Vite host). Key files: `dev-entry.tsx`, `app/page.tsx`.

TASK: Delete the vestigial `app/page.tsx` entry wrapper (leftover from the Next.js rewrite). Route directly to `PlaygroundClient` — the projectId fetch already lives in `PlaygroundClient`.

DETAILS — dev-entry.tsx:
1. Change `import { PlaygroundPage } from "./app/page"` → `import PlaygroundClient from "./app/PlaygroundClient"`.
2. Change `<Route path="/" element={<PlaygroundPage />} />` → `<Route path="/" element={<PlaygroundClient />} />`.

DETAILS — delete file:
- `app/page.tsx` (delete the whole file).

CONSTRAINTS:
- Do NOT move logic back into a page wrapper — `PlaygroundClient` remains the shell.
- Do NOT confuse this with host `src/app/*/page.tsx` route files (those are skipped by discovery in chunk 06).

VERIFY:
- `app/page.tsx` no longer exists.
- `grep -rn "app/page\|PlaygroundPage" dev-entry.tsx` returns NOTHING.
- `/playground` boots and renders the canvas.
