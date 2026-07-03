Stack: TypeScript + React 18 hooks (no build step — host compiles). Key files: hooks/useGenerationLifecycle.ts, hooks/useGenerationCoordination.ts.

TASK: Remove the status-polling reconciliation loop from useGenerationLifecycle.ts (the SSE channel now carries authoritative per-file events) and delete the now-unused inactive-streak/startedAt API from useGenerationCoordination.ts.

DETAILS — hooks/useGenerationLifecycle.ts:
1. Delete the entire useEffect whose comment reads "Reconcile UI loading state with backend generation status in case events are missed" (the one defining `pollStatus`, STARTUP_GRACE_MS, REQUIRED_INACTIVE_POLLS and fetching `/playground/api/generate?action=status`), including its dependency array.
2. In `startGenerationEventSource`, the SSE `es.onmessage` handler currently parses `data.type === "iteration-added"`. Keep that behavior, but pass the payload through: when `data.type === "iteration-added"`, build the scan context as `const ctx = coord.getGenerationInfo();` (unchanged) and call `scanForIterations(false, ctx ?? undefined)` exactly as today. Above that call add a comment: `// data.filePath / data.iterationNumber identify the exact file written (from the agent's tool events)`. Do not change the scan call signature.
3. Remove all calls to `coord.resetInactiveStreak()` and `coord.setGenerationStartedAt(...)` throughout the file (they appear in handleGenerationStart, handleGenerationComplete, and handleGenerationError). Remove `coord.resetInactiveStreak` / `coord.setGenerationStartedAt` / `coord.bumpInactiveStreak` / `coord.getInactiveStreak` / `coord.getGenerationStartedAt` from every useEffect dependency array they appear in.
4. Keep everything else: the elapsed-time timer effect, the 10-minute safety timeout, resume-after-reload effect, skeleton creation/replacement logic, and all three GENERATION_* window-event handlers.

DETAILS — hooks/useGenerationCoordination.ts:
1. Delete `resetInactiveStreak`, `bumpInactiveStreak`, `getInactiveStreak`, `getGenerationStartedAt`, `setGenerationStartedAt` — their declarations, the two refs `generationStartedAtMsRef` and `inactiveStatusStreakRef`, their entries in the `GenerationCoordination` interface, and their entries in the returned object.
2. Change nothing else in the file.

CONSTRAINTS:
- Do not touch any other file.
- Do not rename or change the signature of anything that remains.
- Preserve the existing comment style and formatting (double-quoted strings, trailing commas).

VERIFY: grep -c "inactiveStreak\|InactiveStreak\|generationStartedAt\|GenerationStartedAt" hooks/useGenerationLifecycle.ts hooks/useGenerationCoordination.ts must return 0 for both files; grep -n "action=status" hooks/useGenerationLifecycle.ts must return nothing; grep -n "startGenerationEventSource" hooks/useGenerationLifecycle.ts must still match.
