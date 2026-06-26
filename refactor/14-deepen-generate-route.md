# Task 14 — Deepen `server/routes/generate.ts` (897 LOC)

**Type:** deepening · **Risk:** medium · **Depends on:** none · **Blast radius:** internal + `server/` siblings

## The problem

This Hono route module mixes the HTTP handlers with a lot of **plain Node infrastructure** that has nothing to do with HTTP: lockfile lifecycle, an orphaned-process recovery routine, a chokidar-style **file watcher**, a generation **timer**, and **Claude JSONL stream parsing** for the agent preview. It is 897 lines with zero React but heavy module-level state. Per `CLAUDE.md`, "module-level state … lives at module scope" is fine — but right now the *logic* is also all at module scope, untestable without spinning up the route.

## Dependency classification

- Lockfile, timer, file watcher: **local-substitutable** (fs / timers). Extract as pure Node modules tested with a temp dir / fake timers.
- JSONL parsing: **in-process** pure functions — the cleanest extraction.
- Agent spawn: already behind `lib/providers` (`spawnAgent`). Leave it.

## Target seams

1. **`server/lib/generation-lockfile.ts`** — `writeLockfile`, `removeLockfile`, `getLockfileStatus`, `cleanupOrphanedProcess`, `isPidAlive`, `LockfileData`/`LockfileStatus` types, and the `LOCKFILE_PATH`/`ensureTempDir` plumbing. **Interface:** `acquire(pid, componentId)`, `release()`, `status()`, `reclaimOrphan()`. Test with a temp dir; assert a stale lock from a dead PID is reclaimed.
2. **`server/lib/generation-file-watcher.ts`** — `startFileWatcher(htmlPageFolder?, jsxFile?)` / `stopFileWatcher()`. **Interface:** `watch(target, onChange)` returning a stop handle. Hides the watcher wiring.
3. **`server/lib/claude-jsonl.ts`** — the JSONL stream-parse helpers: `shouldStreamJsonForPreview`, `appendAssistantTextFromClaudeJsonlLines`, `extractStreamJsonError`, `trimAssistantPreview`, `formatAgentErrorMessage`, and the `AGENT_PREVIEW_MAX_CHARS` / `JSONL_PARSE_MAX_LINE_CHARS` limits. **Pure functions** over arrays of lines → tested directly with sample Claude JSONL. Highest leverage; do this first.
4. **`server/lib/generation-timer.ts`** — `startGenerationTimer`/`clearGenerationTimer`/`GENERATION_TIMEOUT_MS` and the log-stream open/close (`openLogStream`/`closeLogStream`) if cohesive.
5. **`generate.ts` keeps only the Hono handlers** (`/api/generate` SSE via `streamSSE`, status, cancel) and the module-level orchestration that *uses* the extracted modules. Per `CLAUDE.md` Route conventions, keep `streamSSE` + `stream.onAbort(...)` cleanup in the route.

## Method

- Extract `claude-jsonl.ts` first (pure, fully testable), then lockfile, then watcher/timer. Each extraction is a move + an import; the route calls the new modules.
- Preserve the module-scope singletons where they must persist across requests (process handle, `generationEvents` EventEmitter) — those stay in the route module as orchestration state, but the *behaviour* they trigger moves into the extracted modules.

## Verification

- Start a generation via the UI → SSE streams agent preview text (JSONL parse), lockfile is written.
- Kill the host process mid-generation and restart → orphaned-process recovery reclaims the stale lock (`reclaimOrphan`).
- Let a generation exceed the timeout → it is force-stopped (timer).
- Cancel a generation from the UI → `stream.onAbort` cleanup runs, watcher stops, lockfile released.
- Unit-test `claude-jsonl.ts` against captured sample lines (assistant text accumulation, error extraction, preview trimming).

## Done when

`generate.ts` is the HTTP/orchestration layer only; lockfile, watcher, timer, and JSONL parsing are separate testable Node modules under `server/lib/`; generation behaviour and the SSE contract are unchanged.

## Do NOT

- Do not change the SSE event shape or the `/playground/api/generate` contract — the client (`PlaygroundCanvas` generation lifecycle, Task 10) parses it.
- Do not remove the module-scope `generationEvents` EventEmitter or lockfile recovery semantics; relocate logic, keep behaviour.
