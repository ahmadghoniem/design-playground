import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { TEMP_DIR_RELATIVE } from '../../lib/constants';
import type { ProviderId } from '../../lib/providers';
import {
  spawnAgent,
  getProviderNotFoundMessage,
  getProviderDisplayName,
  resolveAgentModel,
} from '../../lib/providers';
import { readDesignMd, buildSystemPromptAddon } from '../../lib/design-md-helpers';
import { syncPublicFrameGitignoreSafe } from '../../lib/sync-host-gitignore';

import { resolvePlaygroundDirRelative } from '../../lib/resolve-playground-dir';
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

// ---------------------------------------------------------------------------
// File-watching event emitter for progressive iteration detection
// ---------------------------------------------------------------------------
const generationEvents = new EventEmitter();

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
        provider?: ProviderId;
        effort?: string;
        maxBudgetUsd?: number;
        maxTurns?: number;
        claudeDetailedStdout?: boolean;
        htmlFolder?: string;
        jsxFile?: string;
        source?: string;
        skillIds?: string[];
      }>(c);

      if (!body || !body.prompt || !body.componentId) {
        return c.json({ success: false, error: 'Missing required fields. Ensure `prompt` and `componentId` are provided.' }, 400);
      }

      let { prompt } = body;

      const playgroundRelativeDir = resolvePlaygroundDirRelative();
      if (prompt && playgroundRelativeDir !== 'src/app/playground') {
        prompt = prompt.split('src/app/playground/').join(`${playgroundRelativeDir}/`);
      }

      const providerId: ProviderId = body.provider ?? 'claude-code';
      const model = resolveAgentModel(providerId, body.model);

      const cookieHeader = c.req.header('cookie') ?? '';
      const designInjectEnabled = /(?:^|;\s*)pg-design-inject=1(?:;|$)/.test(cookieHeader);
      if (designInjectEnabled) {
        const md = readDesignMd();
        if (md) {
          prompt = buildSystemPromptAddon(md) + '\n' + prompt;
        }
      }
      const streamJsonForPreview = shouldStreamJsonForPreview(body);
      const clientComponentId = String(body.componentId).slice(0, 400);
      const componentId = clientComponentId.replace(/[^A-Za-z0-9-_]/g, '_').slice(0, 200) || 'component';
      const timestamp = Date.now();
      const generationId = `${componentId}-${timestamp}`;

      ensureTempDir();
      currentChatLogPath = path.join(TEMP_DIR, `chat-${componentId}-${timestamp}.txt`);

      const providerName = getProviderDisplayName(providerId);
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

        currentProcess = spawnAgent(providerId, {
          model,
          effort: body.effort as 'low' | 'medium' | 'high' | 'max' | undefined,
          maxBudgetUsd: body.maxBudgetUsd,
          maxTurns: body.maxTurns,
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
            generationEvents.emit('iteration-added', {
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
              generationEvents.emit('iteration-added', {
                filePath: evt.filePath,
                iterationNumber: numMatch ? Number(numMatch[1]) : undefined,
              });
            }
            stdoutLineBuf = '';
          }
          currentLogStream?.write(`\n=== Generation ended with code ${code} at ${new Date().toISOString()} ===\n`);
          closeLogStream();
          removeLockfile();
          syncPublicFrameGitignoreSafe();
          generationEvents.emit('done');

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
            ? getProviderNotFoundMessage(providerId)
            : error.message;

          currentLogStream?.write(`\n=== Error: ${errorMessage} ===\n`);
          closeLogStream();
          removeLockfile();
          syncPublicFrameGitignoreSafe();
          generationEvents.emit('done');

          isGenerating = false;
          currentProcess = null;

          resolveResponse(c.json({ success: false, error: errorMessage }, 500));
        });

      } catch (spawnError) {
        clearGenerationTimer();
        closeLogStream();
        removeLockfile();
        isGenerating = false;
        currentProcess = null;

        const message = spawnError instanceof Error ? spawnError.message : `Failed to spawn ${providerName} agent`;
        resolveResponse(c.json({ success: false, error: message }, 500));
      }

    } catch (error) {
      clearGenerationTimer();
      closeLogStream();
      removeLockfile();
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
      // SSE stream for progressive iteration detection.
      const status = getGenerationStatus();

      return streamSSE(c, async (stream) => {
        if (!status.generationActive) {
          await stream.writeSSE({ data: '{"type":"done"}' });
          return;
        }

        await new Promise<void>((resolve) => {
          const onIteration = (payload?: { filePath?: string; iterationNumber?: number }) => {
            stream.writeSSE({ data: JSON.stringify({ type: 'iteration-added', filePath: payload?.filePath, iterationNumber: payload?.iterationNumber }) }).catch(() => {});
          };

          const onDone = () => {
            stream.writeSSE({ data: '{"type":"done"}' }).catch(() => {});
            cleanup();
            resolve();
          };

          const cleanup = () => {
            generationEvents.removeListener('iteration-added', onIteration);
            generationEvents.removeListener('done', onDone);
          };

          generationEvents.on('iteration-added', onIteration);
          generationEvents.on('done', onDone);

          // Client disconnect — mirror the old req.on('close') cleanup.
          stream.onAbort(() => {
            cleanup();
            resolve();
          });
        });
      });
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
