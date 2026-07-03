Stack: TypeScript (Node 20+, Hono server, no build step — host compiles). Key files: server/lib/claude-jsonl.ts, server/routes/generate.ts.

TASK: Add a pure function `extractToolEventsFromClaudeJsonlLines` to server/lib/claude-jsonl.ts and wire it into server/routes/generate.ts so the `iteration-added` event carries `{ filePath, iterationNumber }` extracted from Claude CLI stream-json tool events, and the fs-watcher only emits when no tool event has been seen this run.

DETAILS — server/lib/claude-jsonl.ts:
Add and export:

```ts
export interface ToolFileEvent { filePath: string; }

export function extractToolEventsFromClaudeJsonlLines(
  lines: string[],
  pendingToolUses: Map<string, string>,
): ToolFileEvent[]
```

Behavior, per line:
- Trim; skip if empty, not starting with `{`, or longer than JSONL_PARSE_MAX_LINE_CHARS.
- `JSON.parse` inside try/catch; ignore parse failures (same style as appendAssistantTextFromClaudeJsonlLines).
- If `obj.type === 'assistant'` and `obj.message?.content` is an array: for each block where `block.type === 'tool_use'`, `block.name` is one of `'Write' | 'Edit' | 'MultiEdit'`, `typeof block.id === 'string'`, and `typeof block.input?.file_path === 'string'` → `pendingToolUses.set(block.id, block.input.file_path)`.
- If `obj.type === 'user'` and `obj.message?.content` is an array: for each block where `block.type === 'tool_result'`, `typeof block.tool_use_id === 'string'`, `pendingToolUses.has(block.tool_use_id)`, and `block.is_error !== true` → push `{ filePath: pendingToolUses.get(block.tool_use_id)! }` to the result and `pendingToolUses.delete(block.tool_use_id)`.
- Return the array of emitted events (empty array if none).

DETAILS — server/routes/generate.ts:
1. Import `extractToolEventsFromClaudeJsonlLines` from '../lib/claude-jsonl'.
2. Inside the POST handler, alongside the existing `assistantPreview` declaration, declare `const pendingToolUses = new Map<string, string>();` and `let toolEventSeenThisRun = false;`.
3. In the stdout 'data' handler, after the existing `appendAssistantTextFromClaudeJsonlLines(parts, assistantPreview)` call (only in the streamJsonForPreview branch), add:
   ```ts
   const toolEvents = extractToolEventsFromClaudeJsonlLines(parts, pendingToolUses);
   for (const evt of toolEvents) {
     toolEventSeenThisRun = true;
     const numMatch = /iteration-(\d+)/.exec(evt.filePath);
     generationEvents.emit('iteration-added', {
       filePath: evt.filePath,
       iterationNumber: numMatch ? Number(numMatch[1]) : undefined,
     });
   }
   ```
4. In the process 'close' handler, where the leftover `stdoutLineBuf` is flushed through appendAssistantTextFromClaudeJsonlLines, also run the same tool-event extraction + emit block on `[stdoutLineBuf]` before clearing it.
5. Change the `startFileWatcher(...)` first argument from `() => generationEvents.emit('iteration-added')` to `() => { if (!toolEventSeenThisRun) generationEvents.emit('iteration-added', {}); }`.
6. In the GET `?action=events` SSE handler, change `onIteration` to accept a payload parameter and send it: `const onIteration = (payload?: { filePath?: string; iterationNumber?: number }) => { stream.writeSSE({ data: JSON.stringify({ type: 'iteration-added', filePath: payload?.filePath, iterationNumber: payload?.iterationNumber }) }).catch(() => {}); };`

CONSTRAINTS:
- Do not change any existing exported function in claude-jsonl.ts; the new function must be pure (no I/O, no module state) with a JSDoc comment, matching the file's existing style.
- Do not add dependencies. Do not touch any other file.
- Keep all existing behavior (preview accumulation, session-id extraction, lockfile, timer, log stream) unchanged.

VERIFY: grep -n "extractToolEventsFromClaudeJsonlLines" server/lib/claude-jsonl.ts server/routes/generate.ts; grep -n "toolEventSeenThisRun" server/routes/generate.ts; grep -n "iterationNumber" server/routes/generate.ts — all must match.
