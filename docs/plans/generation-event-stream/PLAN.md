# Plan: Event-driven generation pipeline (Tier 3) + Onlook adoptions

**Status:** DONE (2026-07-03, commits a8aa910…8070576), Phase 3 fs-watcher deletion landed 2026-07-04 — all approved chunks landed and verified:
Phases 1+2 (tool-event streaming + client de-scaffold, live-verified end-to-end); `design-system-store` inlined; window event bus → typed `lib/generation-events.ts`; penpal bridge (`lib/iframe-bridge*.ts`, inline script deleted); `data-pg-oid` stamping for HTML pages (`lib/oid-stamp.ts`, parse5); iframe error badges (`stores/iframe-error-store.ts`).
Phase 3: `server/lib/generation-file-watcher.ts` deleted; `startFileWatcher`/`stopFileWatcher` calls removed from `generate.ts`; `syncPublicFrameGitignoreSafe()` moved to the process `close`/`error` handlers. The client's final `scanForIterations` on generation-complete remains as the belt-and-braces catch for files written via `Bash` instead of `Write`/`Edit`.
Also fixed: 8 type errors surfaced by the first REAL typecheck — Rewynd's `type-check` script checks zero files (solution-style tsconfig without --build); use `npx tsc -p tsconfig.app.json --noEmit`.

**Remaining follow-ups:** JSX (Babel) oid stamping · submit-time oid staleness validation · error badge on ComponentNode HTML frames · manual smoke of Alt+hover selection through the new bridge.
**Decision:** Tier 3 (parse `tool_use`/`tool_result` from the existing `claude` stream-json output) over Tier 2 (ACP adapter). Rationale at the bottom. Tier 2 revisit deferred until main features are solid / multi-provider un-hides.

**Remaining (approved scope):**
1. Replace `GENERATION_*_EVENT` window CustomEvent bus with a zustand generation store (10 consumer files; deletes the eager-ref workarounds in `useGenerationCoordination`)
2. Penpal adoption — typed iframe RPC replacing the hand-rolled `element-select:*` postMessage protocol (bridge becomes a served module, nested `penpal` dep)
3. data-oid stamping for HTML iterations (on-disk, idempotent; JSX/Babel pass is a separate follow-up)
4. TerminalBuffer (vendored from Onlook) — iframe console-error capture + error badge on iteration nodes (no fix-with-AI)

**Out of scope (user decision):** git checkpoints, autolayout, tw-merge, cloud sandboxes, fix-with-AI, JSX Babel oid pass.

## Problem

Three parallel mechanisms answer one question ("did an iteration land?"), none authoritative:

1. `server/lib/generation-file-watcher.ts` — 3 × `fs.watch` + 500ms debounce → content-free `iteration-added` SSE ping.
2. Client full re-fetch + diff on every ping (`useGenerationLifecycle` → `scanForIterations`), correlating by client-side-guessed iteration numbers (racy).
3. `?action=status` poll every 5s + inactive-streak(2) + 2s startup grace + 10-min safety timeout.

Meanwhile `server/lib/claude-jsonl.ts` already receives the authoritative signal — `tool_use` blocks naming every file Claude writes — and discards them (it only extracts text deltas + session id).

Reference implementations that parse the full NDJSON stream: [sugyan/claude-code-webui](https://github.com/sugyan/claude-code-webui), [Code Quest](https://recca0120.github.io/en/2026/05/16/code-quest-claude-code-web-ui/).

## Phase 1 — server: extract file-write events from the stream

**`server/lib/claude-jsonl.ts`** (extend, keep pure/unit-testable):

- Add `extractToolEventsFromClaudeJsonlLines(lines, pending)`:
  - On `assistant` message containing `content[].type === 'tool_use'` with `name` in `Write | Edit | MultiEdit` → record `pending.set(tool_use.id, tool_input.file_path)`.
  - On `user` message containing `content[].type === 'tool_result'` whose `tool_use_id` is in `pending` and `is_error !== true` → emit `{ filePath }`. (Emit on *result*, not request — the file only exists after the tool ran.)
- Classify each `filePath` against the run's expected targets:
  - JSX iterations: `CANVAS_ITERATION_FILENAME_PATTERN` in canvas-components dir
  - HTML iterations: `public/<htmlFolder>/**/iteration-N.html`
  - registry iterations: `resolveIterationsDirs()` `.tsx` files
  - Extract `iterationNumber` from the filename where present.

**`server/routes/generate.ts`**:

- In the stdout `data` handler, after the existing preview/session-id parse, run the tool-event extractor on the same parsed lines and `generationEvents.emit('iteration-added', { filePath, iterationNumber })`.
- SSE `?action=events` handler: include the payload in the event data instead of the bare `{"type":"iteration-added"}`.
- Requires `claudeDetailedStdout` (stream-json) — it already defaults on. When it's off (`--output-format text`), keep the final-scan-on-close path as the only detection (see Phase 3 fallback).

## Phase 2 — client: consume payloads, delete reconciliation scaffolding

**`hooks/useGenerationLifecycle.ts`**:

- SSE `iteration-added` now carries `{filePath, iterationNumber}`. First iteration of this plan: keep calling `scanForIterations` (it's idempotent) but pass the known number so skeleton→node replacement is exact instead of inferred. Second iteration (optional follow-up): targeted single-node materialization without a full list fetch.
- Delete the `?action=status` polling loop, inactive-streak counters, and startup-grace logic (`useGenerationCoordination` loses `resetInactiveStreak`/`bumpInactiveStreak`/`getInactiveStreak`). Completion truth = SSE `done` (emitted on process `close`) + the existing POST response resolving.
- Keep ONE safety net: the 10-min skeleton sweep can stay but simplify — it only matters if the SSE, the POST response, and the resume path all fail.
- Resume-after-reload path stays as is (SSE reconnect + one scan).

## Phase 3 — delete the fs-watchers

- Delete `server/lib/generation-file-watcher.ts`; remove `startFileWatcher`/`stopFileWatcher` calls from `generate.ts`.
- Move `syncPublicFrameGitignoreSafe()` (currently in `stopFileWatcher`) to the process `close`/`error` handlers.
- **Keep** the client's final `scanForIterations` on generation-complete (`POST_GENERATION_SCAN_DELAY`). This is the belt-and-braces catch for files the agent wrote via `Bash` (heredoc etc.) instead of `Write`/`Edit` — tool-event extraction can't see those mid-run, the final scan can.
- Keep: lockfile (guards orphaned process across dev-server restarts), generation-timer (hang timeout), SIGTERM/SIGKILL cancel.

## Phase 4 (optional, separate PR) — Onlook adoptions

Onlook (local at `C:\Users\Ahmed Ibrahim\Documents\GitHub\onlook`) runs its own agent loop (Vercel AI SDK `streamText` + custom toolset, server executes writes itself) — architecturally different, don't copy the loop. Transferable pieces:

1. **`packages/penpal`** (tiny) — typed parent/child iframe RPC. Candidate replacement for hand-rolled `lib/iframe-selection-bridge.ts` postMessage plumbing.
2. **`packages/parser`** (`ids.ts`, `template-node/`) — Babel pass stamping `data-oid` on every JSX element + oid→source map. Adopt *the pattern* (not the package) if/when element-level edit mode needs selections that survive regeneration; fixes the stale-element-descriptor issue flagged in `docs/flows` improve cards.
3. **`packages/ai/src/prompt` + `tools/classes/fuzzy-edit-file.ts`** — read for prompt-structure ideas only.

## Test/verify

- Unit: feed captured stream-json fixtures (incl. a `MultiEdit`, an errored `tool_result`, a >512KB line) to the new extractor.
- E2E: run a real 3-iteration JSX generation in the host app; confirm skeletons resolve progressively with exact numbers, no watcher, no poll traffic in the network tab; kill the server mid-run and confirm resume; cancel mid-run and confirm cleanup.

## Why Tier 3 over Tier 2 (ACP)

- Tier 2's adapter (`@zed-industries/claude-code-acp`) wraps the **Agent SDK**, reopening the auth question (API-key vs the user's existing `claude` subscription login) that shelling to the user's own CLI deliberately avoids.
- ACP was deferred when Cursor/Codex were still in play; Claude-only today — revisit only if multi-agent protocol becomes useful again.
- Tier 3 is ~50 lines inside files that already exist, deletes ~200+, changes no auth, no deps.
