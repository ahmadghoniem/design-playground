import { Hono } from 'hono';
import { ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { TEMP_DIR_RELATIVE } from '../../shared/lib/constants';
import { AGENT_DISPLAY_NAME, AGENT_NOT_FOUND_MESSAGE } from '../../shared/lib/agent-config';
import { spawnAgent } from '../lib/spawn-agent';
import { resolveAgentModel } from '../../shared/lib/resolve-agent-model';
import { regenerateIterationsIndex } from './iterations';

import { readJson } from '../lib/hono-helpers';
import {
  writeLockfile,
  removeLockfile,
  getLockfileStatus,
  cleanupOrphanedProcess,
} from '../lib/generation-lockfile';
import { startGenerationTimer, clearGenerationTimer, GENERATION_TIMEOUT_MS } from '../lib/generation-timer';
import {
  shouldStreamJsonForPreview,
  appendAssistantTextFromClaudeJsonlLines,
  extractToolEventsFromClaudeJsonlLines,
  extractStreamJsonError,
  formatAgentErrorMessage,
} from '../lib/claude-jsonl';
import {
  emitIterationAdded,
  emitGenerationDone,
  streamGenerationEvents,
} from '../lib/generation-sse';

/**
 * When a Write/Edit tool_result lands on a React iteration file
 * (`Name.iteration-N.tsx` under an `iterations/` dir), rebuild
 * iterations/index.ts so IterationNode's live preview — which resolves the
 * component by filename — sees it immediately instead of depending on the
 * agent remembering to hand-edit the index itself. Best-effort — must never
 * break generation.
 */
function syncIterationsIndexForToolEvent(filePath: string): void {
  if (!/\.iteration-\d+\.tsx$/.test(filePath)) return;
  if (!/[\\/]iterations[\\/]/.test(filePath)) return;
  try {
    regenerateIterationsIndex();
  } catch (e) {
    console.error('[generate] Failed to sync iterations/index.ts:', e);
  }
}

/**
 * Playground generation API - Agent CLI Integration
 *
 * POST: Start generation (spawns agent CLI, waits for completion)
 * DELETE: Cancel running generation
 * GET?action=download-chat: Download agent output log
 * GET?action=events: SSE stream for progressive iteration detection
 * GET?action=status: Check generation status
 */

const TEMP_DIR = path.join(process.cwd(), TEMP_DIR_RELATIVE);

// Global state for managing the running generation
let currentProcess: ChildProcess | null = null;
let currentChatLogPath: string | null = null;
let currentLogStream: fs.WriteStream | null = null;
let isGenerating = false;

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

cleanupOrphanedProcess();

function getGenerationStatus() {
  const lock = getLockfileStatus();
  const hasProcess = currentProcess !== null;
  const generationActive = isGenerating || hasProcess || (lock.lockfilePresent && lock.lockPidAlive);

  if (!generationActive && lock.lockfilePresent) {
    removeLockfile();
    return {
      success: true,
      isGenerating,
      hasProcess,
      lockfilePresent: false,
      lockPid: lock.lockPid,
      lockPidAlive: false,
      generationActive: false,
    };
  }

  return {
    success: true,
    isGenerating,
    hasProcess,
    lockfilePresent: lock.lockfilePresent,
    lockPid: lock.lockPid,
    lockPidAlive: lock.lockPidAlive,
    generationActive,
  };
}

// ---------------------------------------------------------------------------
// Log stream helpers
// ---------------------------------------------------------------------------

function openLogStream(logPath: string): fs.WriteStream {
  return fs.createWriteStream(logPath, { flags: 'a' });
}

function closeLogStream() {
  if (currentLogStream) {
    currentLogStream.end();
    currentLogStream = null;
  }
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export function generateRoutes() {
  const app = new Hono();

  app.post('/api/generate', async (c) => {
    if (isGenerating) {
      return c.json({ success: false, error: 'A generation is already in progress. Cancel it first or wait for completion.' }, 409);
    }

    // The agent runs as a child process whose result arrives via 'close'/'error'
    // callbacks; bridge those into a single awaited Response.
    let resolveResponse!: (r: Response) => void;
    const responsePromise = new Promise<Response>((r) => { resolveResponse = r; });

    try {
      const body = await readJson<{
        prompt?: string;
        componentId?: string;
        iterationCount?: number;
        model?: string;
        effort?: string;
        claudeDetailedStdout?: boolean;
        source?: string;
      }>(c);

      if (!body || !body.prompt || !body.componentId) {
        return c.json({ success: false, error: 'Missing required fields. Ensure `prompt` and `componentId` are provided.' }, 400);
      }

      let { prompt } = body;

      const model = resolveAgentModel(body.model);

      const streamJsonForPreview = shouldStreamJsonForPreview(body);
      const clientComponentId = String(body.componentId).slice(0, 400);
      const componentId = clientComponentId.replace(/[^A-Za-z0-9-_]/g, '_').slice(0, 200) || 'component';
      const timestamp = Date.now();
      const generationId = `${componentId}-${timestamp}`;

      ensureTempDir();
      currentChatLogPath = path.join(TEMP_DIR, `chat-${componentId}-${timestamp}.txt`);

      const providerName = AGENT_DISPLAY_NAME;
      const header = [
        `=== Generation started at ${new Date().toISOString()} ===`,
        `Provider: ${providerName}`,
        `Component: ${clientComponentId}`,
        ...(model ? [`Model: ${model}`] : []),
        ``,
        `=== Prompt ===`,
        prompt,
        ``,
        `=== Agent Output ===`,
        ...(streamJsonForPreview
          ? [
              '(Raw stream-json is not written to this file.)',
              '',
            ]
          : ['']),
      ].join('\n');

      fs.writeFileSync(currentChatLogPath, header);
      currentLogStream = openLogStream(currentChatLogPath);

      isGenerating = true;

      try {
        // Tool-event tracking for this run: tool_use id → file path.
        const pendingToolUses = new Map<string, string>();

        currentProcess = spawnAgent({
          model,
          effort: body.effort as 'low' | 'medium' | 'high' | 'max' | undefined,
          claudeDetailedStdout: body.claudeDetailedStdout !== false,
        }, process.cwd());

        if (currentProcess.pid) {
          writeLockfile(currentProcess.pid, componentId);
        }

        startGenerationTimer(() => {
          if (currentProcess && !currentProcess.killed) {
            currentLogStream?.write(`\n=== Generation timed out after ${GENERATION_TIMEOUT_MS / 60000} minutes at ${new Date().toISOString()} ===\n`);
            currentProcess.kill('SIGTERM');
            setTimeout(() => {
              if (currentProcess && !currentProcess.killed) {
                currentProcess.kill('SIGKILL');
              }
            }, 2000);
          }
        });

        let stderr = '';
        const stdoutLinesForErrors: string[] = [];

        // assistantPreview accumulates the agent's streamed text; used for
        // error messages and session-id extraction below.
        const assistantPreview = { value: '' };
        let agentSessionId: string | null = null;
        let stdoutLineBuf = '';

        currentProcess.stdout?.on('data', (data: Buffer) => {
          const chunk = data.toString('utf8');
          if (!streamJsonForPreview) {
            currentLogStream?.write(data);
            return;
          }
          stdoutLineBuf += chunk;
          const parts = stdoutLineBuf.split('\n');
          stdoutLineBuf = parts.pop() ?? '';
          for (const part of parts) {
            if (part.trim()) stdoutLinesForErrors.push(part);
          }
          const parsed = appendAssistantTextFromClaudeJsonlLines(parts, assistantPreview);
          if (!agentSessionId && parsed.sessionId) {
            agentSessionId = parsed.sessionId;
            currentLogStream?.write(`\nClaude Session ID: ${agentSessionId}\n`);
          }
          const toolEvents = extractToolEventsFromClaudeJsonlLines(parts, pendingToolUses);
          for (const evt of toolEvents) {
            const numMatch = /iteration-(\d+)/.exec(evt.filePath);
            syncIterationsIndexForToolEvent(evt.filePath);
            emitIterationAdded({
              filePath: evt.filePath,
              iterationNumber: numMatch ? Number(numMatch[1]) : undefined,
            });
          }
        });

        currentProcess.stderr?.on('data', (data: Buffer) => {
          const text = data.toString();
          stderr += text;
          currentLogStream?.write(`[STDERR] ${text}`);
        });

        currentProcess.stdin?.write(prompt);
        currentProcess.stdin?.end();

        currentProcess.on('close', (code) => {
          clearGenerationTimer();
          if (streamJsonForPreview && stdoutLineBuf.trim().length > 0) {
            stdoutLinesForErrors.push(stdoutLineBuf);
            const parsed = appendAssistantTextFromClaudeJsonlLines([stdoutLineBuf], assistantPreview);
            if (!agentSessionId && parsed.sessionId) {
              agentSessionId = parsed.sessionId;
              currentLogStream?.write(`\nClaude Session ID: ${agentSessionId}\n`);
            }
            const closeToolEvents = extractToolEventsFromClaudeJsonlLines([stdoutLineBuf], pendingToolUses);
            for (const evt of closeToolEvents) {
              const numMatch = /iteration-(\d+)/.exec(evt.filePath);
              syncIterationsIndexForToolEvent(evt.filePath);
              emitIterationAdded({
                filePath: evt.filePath,
                iterationNumber: numMatch ? Number(numMatch[1]) : undefined,
              });
            }
            stdoutLineBuf = '';
          }
          currentLogStream?.write(`\n=== Generation ended with code ${code} at ${new Date().toISOString()} ===\n`);
          closeLogStream();
          removeLockfile();
          emitGenerationDone();

          isGenerating = false;
          currentProcess = null;

          if (code === 0) {
            resolveResponse(c.json({
              success: true,
              generationId,
              claudeSessionId: agentSessionId,
              message: 'Generation completed successfully',
            }));
          } else {
            const streamError = streamJsonForPreview
              ? extractStreamJsonError(stdoutLinesForErrors)
              : null;
            const previewError = assistantPreview.value.trim();
            const errorMessage = formatAgentErrorMessage(
              stderr,
              streamError,
              previewError,
              code,
              providerName,
            );
            resolveResponse(c.json({
              success: false,
              error: errorMessage,
              generationId,
              claudeSessionId: agentSessionId,
            }, 500));
          }
        });

        currentProcess.on('error', (error) => {
          clearGenerationTimer();
          if (streamJsonForPreview && stdoutLineBuf.trim().length > 0) {
            const parsed = appendAssistantTextFromClaudeJsonlLines([stdoutLineBuf], assistantPreview);
            if (!agentSessionId && parsed.sessionId) {
              agentSessionId = parsed.sessionId;
              currentLogStream?.write(`\nClaude Session ID: ${agentSessionId}\n`);
            }
            stdoutLineBuf = '';
          }
          const errorMessage = error.message.includes('ENOENT')
            ? AGENT_NOT_FOUND_MESSAGE
            : error.message;

          currentLogStream?.write(`\n=== Error: ${errorMessage} ===\n`);
          closeLogStream();
          removeLockfile();
          emitGenerationDone();

          isGenerating = false;
          currentProcess = null;

          resolveResponse(c.json({ success: false, error: errorMessage }, 500));
        });

      } catch (spawnError) {
        clearGenerationTimer();
        closeLogStream();
        removeLockfile();
        // SSE subscribers only learn about termination via `done` — without
        // this, a spawn failure leaves the EventSource hanging.
        emitGenerationDone();
        isGenerating = false;
        currentProcess = null;

        const message = spawnError instanceof Error ? spawnError.message : `Failed to spawn ${providerName} agent`;
        resolveResponse(c.json({ success: false, error: message }, 500));
      }

    } catch (error) {
      clearGenerationTimer();
      closeLogStream();
      removeLockfile();
      emitGenerationDone();
      isGenerating = false;
      const message = error instanceof Error ? error.message : 'Unknown error in generate route';
      console.error('[Playground][generate] POST error:', error);
      resolveResponse(c.json({ success: false, error: message }, 500));
    }

    return await responsePromise;
  });

  app.delete('/api/generate', async (c) => {
    if (!isGenerating || !currentProcess) {
      return c.json({ success: false, error: 'No generation currently running' }, 400);
    }

    try {
      currentProcess.kill('SIGTERM');

      setTimeout(() => {
        if (currentProcess && !currentProcess.killed) {
          currentProcess.kill('SIGKILL');
        }
      }, 2000);

      currentLogStream?.write(`\n=== Cancelled by user at ${new Date().toISOString()} ===\n`);

      return c.json({ success: true, message: 'Generation cancelled' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel generation';
      return c.json({ success: false, error: message }, 500);
    }
  });

  app.get('/api/generate', async (c) => {
    const action = c.req.query('action');

    if (action === 'download-chat') {
      if (!fs.existsSync(TEMP_DIR)) {
        return c.json({ success: false, error: 'No chat logs available' }, 404);
      }

      const files = fs.readdirSync(TEMP_DIR)
        .filter(f => f.startsWith('chat-') && f.endsWith('.txt'))
        .sort()
        .reverse();

      if (files.length === 0) {
        return c.json({ success: false, error: 'No chat logs available' }, 404);
      }

      const latestLog = path.join(TEMP_DIR, files[0]);
      const content = fs.readFileSync(latestLog, 'utf-8');

      c.header('Content-Type', 'text/plain');
      c.header('Content-Disposition', `attachment; filename="${files[0]}"`);
      return c.body(content);
    }

    if (action === 'events') {
      const status = getGenerationStatus();
      return streamGenerationEvents(c, status.generationActive);
    }

    if (action === 'status') {
      return c.json(getGenerationStatus());
    }

    return c.json({
      success: false,
      error: 'Unsupported action. Use ?action=download-chat, ?action=events, or ?action=status',
    }, 400);
  });

  return app;
}
