import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import {
  TEMP_DIR_RELATIVE,
  GENERATION_LOCKFILE_FILENAME,
  HTML_TREE_DIR,
  HTML_TREE_FILENAME,
  CANVAS_ITERATION_FILENAME_PATTERN,
} from '../../lib/constants';
import type { ProviderId } from '../../lib/providers';
import {
  spawnAgent,
  getProviderNotFoundMessage,
  getProviderDisplayName,
  resolveAgentModel,
} from '../../lib/providers';
import { readDesignMd, buildSystemPromptAddon } from '../../lib/design-md-helpers';

import {
  resolvePlaygroundDirRelative,
  resolveCanvasComponentsDir,
  resolveIterationsDirs,
} from '../../lib/resolve-playground-dir';
import { syncPublicFrameGitignoreSafe } from '../../lib/sync-host-gitignore';
import { readJson } from '../lib/hono-helpers';

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
const LOCKFILE_PATH = path.join(TEMP_DIR, GENERATION_LOCKFILE_FILENAME);

// Maximum generation duration (10 minutes)
const GENERATION_TIMEOUT_MS = 10 * 60 * 1000;

// Global state for managing the running generation
let currentProcess: ChildProcess | null = null;
let currentChatLogPath: string | null = null;
let currentLogStream: fs.WriteStream | null = null;
let isGenerating = false;
let generationTimer: NodeJS.Timeout | null = null;

let wasCancelled = false;
let timedOut = false;
let genFirstIterationAt: number | null = null;
const currentIterationFiles = new Set<string>();

// ---------------------------------------------------------------------------
// File-watching event emitter for progressive iteration detection
// ---------------------------------------------------------------------------
const generationEvents = new EventEmitter();
const fileWatchers: fs.FSWatcher[] = [];
let htmlFileWatcher: fs.FSWatcher | null = null;
let htmlTreeWatcher: fs.FSWatcher | null = null;
let jsxFileWatcher: fs.FSWatcher | null = null;

function startFileWatcher(htmlPageFolder?: string, jsxFile?: string) {
  stopFileWatcher();
  let debounceTimer: NodeJS.Timeout | null = null;
  const emitIterationAdded = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      generationEvents.emit('iteration-added');
    }, 500);
  };

  for (const iterationsDir of resolveIterationsDirs()) {
    try {
      const watcher = fs.watch(iterationsDir, (_eventType, filename) => {
        if (filename === 'tree.json' || (filename && filename.endsWith('.tsx'))) {
          if (filename && filename.endsWith('.tsx')) {
            currentIterationFiles.add(path.join(iterationsDir, filename));
          }
          emitIterationAdded();
        }
      });
      watcher.on('error', () => {
        // iterations dir might not exist yet — ignore
      });
      fileWatchers.push(watcher);
    } catch {
      // iterations dir might not exist yet
    }
  }

  if (htmlPageFolder) {
    const htmlDir = path.join(process.cwd(), 'public', htmlPageFolder);
    let htmlDebounceTimer: NodeJS.Timeout | null = null;
    try {
      htmlFileWatcher = fs.watch(htmlDir, { recursive: true }, (_eventType, filename) => {
        if (!filename) return;
        const norm = filename.replace(/\\/g, '/');
        if (!norm.endsWith('.html')) return;
        if (!/iteration-\d+/.test(norm)) return;
        currentIterationFiles.add(path.join(htmlDir, norm));
        if (htmlDebounceTimer) clearTimeout(htmlDebounceTimer);
        htmlDebounceTimer = setTimeout(() => {
          generationEvents.emit('iteration-added');
        }, 500);
      });
      htmlFileWatcher.on('error', () => {
        // dir might not exist yet — ignore
      });
    } catch {
      // dir might not exist yet
    }

    const treeDir = path.join(process.cwd(), 'public', HTML_TREE_DIR);
    let treeDebounceTimer: NodeJS.Timeout | null = null;
    try {
      htmlTreeWatcher = fs.watch(treeDir, (_eventType, filename) => {
        if (!filename) return;
        const base = path.basename(filename.replace(/\\/g, '/'));
        if (base !== HTML_TREE_FILENAME) return;
        if (treeDebounceTimer) clearTimeout(treeDebounceTimer);
        treeDebounceTimer = setTimeout(() => {
          generationEvents.emit('iteration-added');
        }, 500);
      });
      htmlTreeWatcher.on('error', () => {
        // .playground dir might not exist yet
      });
    } catch {
      // tree dir might not exist yet
    }
  }

  if (jsxFile) {
    const canvasDir = resolveCanvasComponentsDir();
    let jsxDebounceTimer: NodeJS.Timeout | null = null;
    try {
      jsxFileWatcher = fs.watch(canvasDir, (_eventType, filename) => {
        if (filename && CANVAS_ITERATION_FILENAME_PATTERN.test(filename)) {
          currentIterationFiles.add(path.join(canvasDir, filename));
          if (jsxDebounceTimer) clearTimeout(jsxDebounceTimer);
          jsxDebounceTimer = setTimeout(() => {
            generationEvents.emit('iteration-added');
          }, 500);
        }
      });
      jsxFileWatcher.on('error', () => {
        // dir might not exist yet — ignore
      });
    } catch {
      // dir might not exist yet
    }
  }
}

function stopFileWatcher() {
  for (const watcher of fileWatchers) {
    watcher.close();
  }
  fileWatchers.length = 0;
  if (htmlFileWatcher) {
    htmlFileWatcher.close();
    htmlFileWatcher = null;
  }
  if (htmlTreeWatcher) {
    htmlTreeWatcher.close();
    htmlTreeWatcher = null;
  }
  if (jsxFileWatcher) {
    jsxFileWatcher.close();
    jsxFileWatcher = null;
  }
  syncPublicFrameGitignoreSafe();
}

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Lockfile-based process recovery (survives HMR)
// ---------------------------------------------------------------------------

interface LockfileData {
  pid: number;
  componentId: string;
  startTime: number;
}

interface LockfileStatus {
  lockfilePresent: boolean;
  lockPid: number | null;
  lockPidAlive: boolean;
}

function writeLockfile(pid: number, componentId: string) {
  ensureTempDir();
  const data: LockfileData = { pid, componentId, startTime: Date.now() };
  fs.writeFileSync(LOCKFILE_PATH, JSON.stringify(data), 'utf-8');
}

function removeLockfile() {
  try {
    if (fs.existsSync(LOCKFILE_PATH)) {
      fs.unlinkSync(LOCKFILE_PATH);
    }
  } catch {
    // ignore
  }
}

function cleanupOrphanedProcess() {
  try {
    if (!fs.existsSync(LOCKFILE_PATH)) return;

    const raw = fs.readFileSync(LOCKFILE_PATH, 'utf-8');
    const data: LockfileData = JSON.parse(raw);

    try {
      process.kill(data.pid, 0);
      console.warn(`[Playground][generate] Killing orphaned generation process PID=${data.pid} (component: ${data.componentId})`);
      process.kill(data.pid, 'SIGTERM');
      setTimeout(() => {
        try { process.kill(data.pid, 'SIGKILL'); } catch { /* already dead */ }
      }, 2000);
    } catch {
      // Process is already dead, just clean up lockfile
    }

    removeLockfile();
  } catch (e) {
    console.error('[Playground][generate] Error cleaning up orphaned process:', e);
    removeLockfile();
  }
}

cleanupOrphanedProcess();

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getLockfileStatus(): LockfileStatus {
  if (!fs.existsSync(LOCKFILE_PATH)) {
    return {
      lockfilePresent: false,
      lockPid: null,
      lockPidAlive: false,
    };
  }

  try {
    const raw = fs.readFileSync(LOCKFILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<LockfileData>;
    const pid = typeof parsed.pid === 'number' && Number.isFinite(parsed.pid) ? parsed.pid : null;
    const alive = pid !== null ? isPidAlive(pid) : false;
    return {
      lockfilePresent: true,
      lockPid: pid,
      lockPidAlive: alive,
    };
  } catch {
    return {
      lockfilePresent: true,
      lockPid: null,
      lockPidAlive: false,
    };
  }
}

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

function clearGenerationTimer() {
  if (generationTimer) {
    clearTimeout(generationTimer);
    generationTimer = null;
  }
}

function startGenerationTimer() {
  clearGenerationTimer();
  generationTimer = setTimeout(() => {
    if (currentProcess && !currentProcess.killed) {
      timedOut = true;
      currentLogStream?.write(`\n=== Generation timed out after ${GENERATION_TIMEOUT_MS / 60000} minutes at ${new Date().toISOString()} ===\n`);
      currentProcess.kill('SIGTERM');
      setTimeout(() => {
        if (currentProcess && !currentProcess.killed) {
          currentProcess.kill('SIGKILL');
        }
      }, 2000);
    }
  }, GENERATION_TIMEOUT_MS);
}

const AGENT_PREVIEW_MAX_CHARS = 14_000;
const JSONL_PARSE_MAX_LINE_CHARS = 512_000;

function shouldStreamJsonForPreview(
  body: { claudeDetailedStdout?: boolean },
): boolean {
  return body.claudeDetailedStdout !== false;
}

const readJsonString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const findSessionId = (value: unknown, depth = 0): string | null => {
  if (depth > 4 || value == null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findSessionId(item, depth + 1);
      if (nested) return nested;
    }
    return null;
  }
  if (typeof value !== 'object') return null;

  const obj = value as Record<string, unknown>;
  const direct =
    readJsonString(obj.session_id) ??
    readJsonString(obj.sessionId) ??
    readJsonString(obj.conversation_id) ??
    readJsonString(obj.conversationId) ??
    readJsonString(obj.thread_id) ??
    readJsonString(obj.threadId) ??
    readJsonString(obj.chat_id) ??
    readJsonString(obj.chatId);
  if (direct) return direct;

  const messageObj = obj.message;
  if (messageObj && typeof messageObj === 'object' && !Array.isArray(messageObj)) {
    const messageId = readJsonString((messageObj as Record<string, unknown>).id);
    if (messageId) return messageId;
  }

  for (const nestedValue of Object.values(obj)) {
    const nested = findSessionId(nestedValue, depth + 1);
    if (nested) return nested;
  }
  return null;
};

function trimAssistantPreview(assistantPreview: { value: string }): void {
  if (assistantPreview.value.length > AGENT_PREVIEW_MAX_CHARS) {
    assistantPreview.value = assistantPreview.value.slice(-AGENT_PREVIEW_MAX_CHARS);
  }
}

function appendAssistantTextFromClaudeJsonlLines(
  lines: string[],
  assistantPreview: { value: string },
): { textChanged: boolean; sessionId: string | null } {
  let changed = false;
  let discoveredSessionId: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || !trimmed.startsWith('{')) continue;
    if (trimmed.length > JSONL_PARSE_MAX_LINE_CHARS) continue;
    try {
      const obj = JSON.parse(trimmed) as {
        type?: string;
        event?: {
          type?: string;
          delta?: { type?: string; text?: string };
        };
      };
      if (
        obj.type === 'stream_event' &&
        obj.event?.type === 'content_block_delta' &&
        obj.event.delta?.type === 'text_delta' &&
        typeof obj.event.delta.text === 'string'
      ) {
        assistantPreview.value += obj.event.delta.text;
        changed = true;
      }
      if (!discoveredSessionId) {
        discoveredSessionId = findSessionId(obj);
      }
    } catch {
      /* ignore non-JSON or unexpected shape */
    }
  }
  trimAssistantPreview(assistantPreview);
  return { textChanged: changed, sessionId: discoveredSessionId };
}

function extractStreamJsonError(lines: string[]): string | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i]?.trim();
    if (!trimmed?.startsWith('{')) continue;
    try {
      const obj = JSON.parse(trimmed) as {
        type?: string;
        is_error?: boolean;
        result?: string;
        error?: string | { message?: string };
        message?: string | { content?: Array<{ type?: string; text?: string }> };
      };

      if (obj.type === 'result' && obj.is_error && typeof obj.result === 'string') {
        return obj.result.trim() || null;
      }
      if (obj.type === 'assistant' && obj.error && obj.message && typeof obj.message === 'object' && Array.isArray(obj.message.content)) {
        const text = obj.message.content
          .filter((c) => c.type === 'text' && typeof c.text === 'string')
          .map((c) => c.text)
          .join('')
          .trim();
        if (text) return text;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function formatAgentErrorMessage(
  stderr: string,
  streamError: string | null,
  previewError: string,
  exitCode: number | null,
  providerName: string,
): string {
  const fallback = `${providerName} agent exited with code ${exitCode}`;
  return stderr.trim() || streamError || previewError || fallback;
}

function readNewFileLineTotals(paths: Set<string>): { lines: number; files: number } {
  let lines = 0;
  let files = 0;
  for (const filePath of paths) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      files += 1;
      lines += content.split('\n').length;
    } catch {
      // moved/deleted mid-read — skip
    }
  }
  return { lines, files };
}

function combineLineStat(deltaValue: number | null, extra: number): number | null {
  if (deltaValue === null && extra === 0) return null;
  return (deltaValue ?? 0) + extra;
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

      wasCancelled = false;
      timedOut = false;
      genFirstIterationAt = null;
      currentIterationFiles.clear();

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
              '(Raw stream-json is not written to this file. Live assistant text appears in the presence-bubble tooltip.)',
              '',
            ]
          : ['']),
      ].join('\n');

      fs.writeFileSync(currentChatLogPath, header);
      currentLogStream = openLogStream(currentChatLogPath);

      isGenerating = true;

      try {
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

        startFileWatcher(body.htmlFolder, body.jsxFile);

        startGenerationTimer();

        let stderr = '';
        const stdoutLinesForErrors: string[] = [];

        const assistantPreview = { value: '' };
        let agentSessionId: string | null = null;
        let stdoutLineBuf = '';
        let previewThrottleTimer: ReturnType<typeof setTimeout> | null = null;

        const flushAgentPreview = () => {
          generationEvents.emit('agent-preview', {
            componentId: clientComponentId,
            text: assistantPreview.value,
          });
        };

        const scheduleAgentPreview = () => {
          if (previewThrottleTimer) return;
          previewThrottleTimer = setTimeout(() => {
            previewThrottleTimer = null;
            flushAgentPreview();
          }, 80);
        };

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
          if (parsed.textChanged) {
            scheduleAgentPreview();
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
            stdoutLineBuf = '';
          }
          if (previewThrottleTimer) {
            clearTimeout(previewThrottleTimer);
            previewThrottleTimer = null;
          }
          if (streamJsonForPreview) {
            flushAgentPreview();
          }

          currentLogStream?.write(`\n=== Generation ended with code ${code} at ${new Date().toISOString()} ===\n`);
          closeLogStream();
          removeLockfile();
          stopFileWatcher();
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
          if (previewThrottleTimer) {
            clearTimeout(previewThrottleTimer);
            previewThrottleTimer = null;
          }
          if (streamJsonForPreview) {
            flushAgentPreview();
          }

          const errorMessage = error.message.includes('ENOENT')
            ? getProviderNotFoundMessage(providerId)
            : error.message;

          currentLogStream?.write(`\n=== Error: ${errorMessage} ===\n`);
          closeLogStream();
          removeLockfile();
          stopFileWatcher();
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
      wasCancelled = true;
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
          const onIteration = () => {
            stream.writeSSE({ data: '{"type":"iteration-added"}' }).catch(() => {});
          };

          const onDone = () => {
            stream.writeSSE({ data: '{"type":"done"}' }).catch(() => {});
            cleanup();
            resolve();
          };

          const onAgentPreview = (payload: { componentId: string; text: string }) => {
            stream.writeSSE({
              data: JSON.stringify({
                type: 'agent-preview',
                componentId: payload.componentId,
                text: payload.text,
              }),
            }).catch(() => {});
          };

          const cleanup = () => {
            generationEvents.removeListener('iteration-added', onIteration);
            generationEvents.removeListener('done', onDone);
            generationEvents.removeListener('agent-preview', onAgentPreview);
          };

          generationEvents.on('iteration-added', onIteration);
          generationEvents.on('done', onDone);
          generationEvents.on('agent-preview', onAgentPreview);

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
