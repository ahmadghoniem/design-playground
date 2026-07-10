Stack: React 19 + Vite + Hono + TS. All feature moves (plans 00–10) are done. This plan finishes the app-shell placement, deletes emptied dirs, and verifies the whole thing resolves and boots.

TASK: Finalize the restructure — settle the remaining app-shell files, remove now-empty legacy dirs, and prove there are no stale paths or illegal cross-feature imports.

--- app shell (what stays / what moves) ---
`app/` keeps the composition shell only:
- `app/PlaygroundClient.tsx`, `app/PlaygroundHeader.tsx` STAY in `app/`.
- `hooks/useProjectContext.ts` → `git mv` to `app/useProjectContext.ts` (only the header/app shell
  uses it). Update `@/hooks/useProjectContext` → `@/app/useProjectContext` everywhere.
- If any stray file remains in `hooks/`, `lib/`, `stores/`, `nodes/`, `components/canvas/`,
  `components/modals/`, `prompts/` that was NOT explicitly placed by plans 02–10, STOP and report
  it with its importers so it can be assigned — do not guess.

--- remove empty legacy dirs ---
After confirming they contain no files, remove now-empty directories:
- `hooks/`, `lib/` (except any `lib/providers` remnants — should be gone), `stores/`, `nodes/`,
  `nodes/shared/`, `prompts/`, `components/canvas/`, `components/canvas/sidebar/`,
  `components/chat/`, `components/modals/`, `components/modals/design-system/`.
- KEEP `components/ui/` ONLY IF it still holds files (it should be empty → remove); `shared/ui`
  is the new home. `components/` itself can be removed if fully empty.
- Use `git status` to confirm nothing untracked/left behind.

--- global verification (the important part) ---
Run and report each:
1. No stale legacy import roots anywhere (client + server):
   `grep -rnE "@/(hooks|lib|stores|nodes|prompts|components)/" --include=*.ts --include=*.tsx .`
   → MUST be empty. (Everything now lives under `@/features/*`, `@/shared/*`, or `@/app/*`.)
2. No relative cross-dir imports leaked back in client dirs:
   `grep -rnE "from ['\"]\.\.?/" --include=*.ts --include=*.tsx app features shared`
   → should be empty or only same-dir `./x` sibling imports; report any `../` climbs.
3. Cross-feature import audit (features should import shared/, not each other):
   `grep -rnE "@/features/(providers|generation|iterations|chat|discovery|design-system|skills|canvas)/" --include=*.ts --include=*.tsx features` 
   → list every line where a file under `features/A/` imports `@/features/B/` (A≠B). The ONLY
   expected/allowed one is canvas → iterations (`useDragToIterate`, iteration node types). Report
   any OTHER cross-feature import as a finding (do not auto-fix).
4. Server sanity: `grep -rnE "from ['\"]\.\./\.\./(lib|prompts|hooks|nodes|components|stores)/" --include=*.ts server`
   → empty (all server→client refs are `@/` now).

--- boot check ---
- Attempt a typecheck if available (`npx tsc --noEmit -p tsconfig.json`); module-not-found for
  `react`/`vite`/`@xyflow` are ENVIRONMENTAL (peerDeps resolve only in a host) — ignore those, but
  report any `Cannot find module '@/...'` errors, which would mean a bad path.
- Report the final `features/` + `shared/` + `app/` tree (`ls -R features shared app` top levels).

CONSTRAINTS:
- Do NOT touch server logic. Do NOT change runtime behavior. `git mv` only for the one remaining move.
- If verification step 1 or 3 surfaces anything unexpected, REPORT it — do not silently fix, since
  a wrong auto-fix here corrupts the whole restructure.
