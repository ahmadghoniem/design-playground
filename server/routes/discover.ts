import { Hono } from 'hono';
import { ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  TEMP_DIR_RELATIVE,
  DISCOVERY_LOCKFILE_FILENAME,
  DISCOVERY_MANIFEST_FILENAME,
} from '../../lib/constants';
import { resolvePlaygroundDir } from '../../lib/resolve-playground-dir';
import { discoveryPrompt } from '../../prompts/discovery.prompt';
import { discoveryAnalyzePrompt } from '../../prompts/discovery-analyze.prompt';
import { fetchPropsSnapshot } from '../../lib/props-fetchers.server';
import type { ProviderId } from '../../lib/providers';
import { spawnAgent, getProviderNotFoundMessage, getProviderDisplayName } from '../../lib/providers';
import { readJson } from '../lib/hono-helpers';

const LOG_PREFIX = '[Playground][discover]';
const DEBUG = process.env.NODE_ENV !== 'production';
const log = (...args: unknown[]) => { if (DEBUG) console.log(LOG_PREFIX, ...args); };

const ANALYZE_LOG_PREFIX = '[Playground][analyze]';
const analyzeLog = (...args: unknown[]) => { if (DEBUG) console.log(ANALYZE_LOG_PREFIX, ...args); };

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

const PLAYGROUND_DIR = resolvePlaygroundDir();
const DISCOVERY_JSON_PATH = path.join(PLAYGROUND_DIR, DISCOVERY_MANIFEST_FILENAME);
const DATA_DIR = path.join(PLAYGROUND_DIR, 'data');
const TEMP_DIR = path.join(process.cwd(), TEMP_DIR_RELATIVE);
const LOCKFILE_PATH = path.join(TEMP_DIR, DISCOVERY_LOCKFILE_FILENAME);

log(` Playground dir resolved to: ${PLAYGROUND_DIR}`);
log(` Discovery JSON path: ${DISCOVERY_JSON_PATH}`);

// ---------------------------------------------------------------------------
// Global state
// ---------------------------------------------------------------------------

let currentProcess: ChildProcess | null = null;
let isScanning = false;
let scanCancelled = false;

// Track in-progress analyses to prevent duplicates
const analyzingIds = new Set<string>();

interface DiscoveryEntry {
  id: string;
  name: string;
  path: string;
  type: 'page' | 'component';
  status: string;
  parentId?: string;
  childComponents?: { name: string; path: string }[];
  analysis?: {
    discoveredFilename?: string;
    componentName?: string;
    [key: string]: unknown;
  };
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
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
  startTime: number;
}

function writeLockfile(pid: number) {
  ensureTempDir();
  const data: LockfileData = { pid, startTime: Date.now() };
  fs.writeFileSync(LOCKFILE_PATH, JSON.stringify(data), 'utf-8');
  log(` Wrote lockfile for PID=${pid}`);
}

function removeLockfile() {
  try {
    if (fs.existsSync(LOCKFILE_PATH)) {
      fs.unlinkSync(LOCKFILE_PATH);
      log(` Removed lockfile`);
    }
  } catch { /* ignore */ }
}

function cleanupOrphanedProcess() {
  try {
    if (!fs.existsSync(LOCKFILE_PATH)) return;
    const data: LockfileData = JSON.parse(fs.readFileSync(LOCKFILE_PATH, 'utf-8'));
    try {
      process.kill(data.pid, 0);
      console.warn(`${LOG_PREFIX} Killing orphaned scan process PID=${data.pid} (started at ${new Date(data.startTime).toISOString()})`);
      process.kill(data.pid, 'SIGTERM');
      setTimeout(() => {
        try { process.kill(data.pid, 'SIGKILL'); } catch { /* already dead */ }
      }, 2000);
    } catch {
      log(` Orphaned process PID=${data.pid} already dead, cleaning up lockfile`);
    }
    removeLockfile();
  } catch {
    removeLockfile();
  }
}

if (typeof globalThis !== 'undefined' && process.env.NODE_ENV !== 'production') {
  cleanupOrphanedProcess();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readDiscoveryJson(): Record<string, unknown> | null {
  try {
    if (fs.existsSync(DISCOVERY_JSON_PATH)) {
      const raw = fs.readFileSync(DISCOVERY_JSON_PATH, 'utf-8');
      const data = JSON.parse(raw);
      const entryCount = Array.isArray(data?.entries) ? data.entries.length : 0;
      log(` Read discovery.json — ${entryCount} entries, scanned at ${data?.scannedAt || 'unknown'}`);
      return data;
    }
  } catch (e) {
    console.error(`${LOG_PREFIX} Error reading discovery.json:`, e);
  }
  return null;
}

function getPlaygroundRelativePath(): string {
  const root = process.cwd();
  return path.relative(root, PLAYGROUND_DIR).replace(/\\/g, '/');
}

export function discoverRoutes() {
  const app = new Hono();

  // -------------------------------------------------------------------------
  // GET /api/discover — return cached discovery or "not_scanned"
  // -------------------------------------------------------------------------
  app.get('/api/discover', async (c) => {
    log(` GET request — isScanning=${isScanning}, discoveryExists=${fs.existsSync(DISCOVERY_JSON_PATH)}`);

    if (isScanning) {
      log(` Returning status=scanning`);
      return c.json({ status: 'scanning' });
    }

    const data = readDiscoveryJson();
    if (data) {
      log(` Returning cached discovery`);
      return c.json({ status: 'complete', ...data });
    }

    log(` No discovery.json found — returning not_scanned`);
    return c.json({ status: 'not_scanned' });
  });

  // -------------------------------------------------------------------------
  // POST /api/discover — run AI discovery scan
  // -------------------------------------------------------------------------
  app.post('/api/discover', async (c) => {
    log(` POST request — starting discovery scan`);

    if (isScanning) {
      console.warn(`${LOG_PREFIX} Scan already in progress — rejecting`);
      return c.json({ success: false, error: 'A discovery scan is already in progress.' }, 409);
    }

    let model: string | undefined;
    let providerId: ProviderId = 'claude-code';
    const reqBody = await readJson<{ model?: string; provider?: ProviderId }>(c);
    model = reqBody?.model;
    if (reqBody?.provider) providerId = reqBody.provider;

    const existing = readDiscoveryJson() as { entries?: { id: string; status: string }[] } | null;
    const preserveIds = (existing?.entries ?? [])
      .filter((e) => e.status === 'added')
      .map((e) => e.id);

    if (preserveIds.length > 0) {
      log(` Preserving ${preserveIds.length} already-added entries: ${preserveIds.join(', ')}`);
    }

    const playgroundRelPath = getPlaygroundRelativePath();
    const prompt = discoveryPrompt({
      playgroundDir: playgroundRelPath,
      existingEntryIds: preserveIds.length > 0 ? preserveIds : undefined,
    });

    log(` Generated discovery prompt (${prompt.length} chars)`);
    log(` Playground relative path: ${playgroundRelPath}`);

    isScanning = true;

    const providerName = getProviderDisplayName(providerId);
    if (model) log(` Using model: ${model}`);
    log(` Using provider: ${providerName}`);

    scanCancelled = false;

    return await new Promise<Response>((resolve) => {
    try {
      currentProcess = spawnAgent(providerId, {
        model,
        claudeDetailedStdout: false,
      }, process.cwd());

      if (currentProcess.pid) {
        writeLockfile(currentProcess.pid);
        log(` Agent process started — PID=${currentProcess.pid}`);
      }

      let stdout = '';
      let stderr = '';

      currentProcess.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        const lines = chunk.trim().split('\n');
        for (const line of lines) {
          if (line.trim()) log(` [stdout] ${line}`);
        }
      });

      currentProcess.stderr?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        const lines = chunk.trim().split('\n');
        for (const line of lines) {
          if (line.trim()) log(` [stderr] ${line}`);
        }
      });

      currentProcess.stdin?.write(prompt);
      currentProcess.stdin?.end();
      log(` Prompt written to stdin and closed`);

      currentProcess.on('close', (code) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        log(` Agent exited — code=${code}, elapsed=${elapsed}s, stdout=${stdout.length} chars, stderr=${stderr.length} chars`);

        removeLockfile();
        isScanning = false;
        currentProcess = null;

        if (code === 0) {
          const data = readDiscoveryJson();
          if (data) {
            const entries = (data as { entries?: unknown[] }).entries;
            log(` Scan complete — ${Array.isArray(entries) ? entries.length : 0} entries discovered`);
            resolve(c.json({ success: true, status: 'complete', ...data }));
          } else {
            console.error(`${LOG_PREFIX} Agent completed but discovery.json was not created`);
            resolve(c.json({ success: false, error: 'Agent completed but discovery.json was not created.' }, 500));
          }
        } else {
          console.error(`${LOG_PREFIX} Agent failed — code=${code}, stderr: ${stderr.slice(0, 500)}`);
          resolve(c.json({ success: false, error: stderr || `${providerName} agent exited with code ${code}` }, 500));
        }
      });

      currentProcess.on('error', (error) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`${LOG_PREFIX} Agent process error after ${elapsed}s:`, error.message);

        removeLockfile();
        isScanning = false;
        currentProcess = null;

        const message = error.message.includes('ENOENT')
          ? getProviderNotFoundMessage(providerId)
          : error.message;

        resolve(c.json({ success: false, error: message }, 500));
      });
    } catch (spawnError) {
      console.error(`${LOG_PREFIX} Failed to spawn agent:`, spawnError);
      removeLockfile();
      isScanning = false;
      currentProcess = null;
      const message = spawnError instanceof Error ? spawnError.message : `Failed to spawn ${providerName} agent`;
      resolve(c.json({ success: false, error: message }, 500));
    }
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/discover — cancel running scan
  // -------------------------------------------------------------------------
  app.delete('/api/discover', async (c) => {
    log(` DELETE request — cancelling scan`);

    if (!isScanning || !currentProcess) {
      console.warn(`${LOG_PREFIX} No scan running to cancel`);
      return c.json({ success: false, error: 'No scan currently running' }, 400);
    }

    try {
      scanCancelled = true;
      log(` Sending SIGTERM to PID=${currentProcess.pid}`);
      currentProcess.kill('SIGTERM');
      setTimeout(() => {
        if (currentProcess && !currentProcess.killed) {
          log(` Force killing PID=${currentProcess.pid}`);
          currentProcess.kill('SIGKILL');
        }
      }, 2000);

      return c.json({ success: true, message: 'Scan cancelled' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel scan';
      console.error(`${LOG_PREFIX} Error cancelling:`, message);
      return c.json({ success: false, error: message }, 500);
    }
  });

  // -------------------------------------------------------------------------
  // POST /api/discover/analyze — analyze a specific discovered component
  // -------------------------------------------------------------------------
  app.post('/api/discover/analyze', async (c) => {
    const body = await readJson<{
      id?: string;
      path?: string;
      name?: string;
      type?: 'page' | 'component';
      model?: string;
      parentId?: string;
      provider?: ProviderId;
    }>(c);

    if (!body?.id || !body?.path || !body?.name || !body?.type) {
      return c.json({ success: false, error: 'Missing required fields: id, path, name, type' }, 400);
    }

    const { id, name, type, model, parentId } = body;
    const providerId: ProviderId = body.provider ?? 'claude-code';
    const componentPath = body.path;

    analyzeLog(` POST — analyzing component "${name}" (id=${id}, type=${type})`);
    analyzeLog(`   Source: ${componentPath}`);

    if (analyzingIds.has(id)) {
      console.warn(`${ANALYZE_LOG_PREFIX} Analysis already in progress for "${name}" — rejecting`);
      return c.json({ success: false, error: `Analysis already in progress for "${name}"` }, 409);
    }

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      analyzeLog(` Created data directory`);
    }

    const playgroundRelPath = path.relative(process.cwd(), PLAYGROUND_DIR).replace(/\\/g, '/');

    let propsSnapshot: Record<string, unknown> | undefined;
    try {
      const snapshot = await fetchPropsSnapshot(id);
      if (snapshot) {
        propsSnapshot = snapshot;
        analyzeLog(` Got real props snapshot for "${id}" — injecting into prompt`);
      }
    } catch (e) {
      console.warn(`${ANALYZE_LOG_PREFIX} Props snapshot fetch failed for "${id}" — continuing without it:`, e);
    }

    const prompt = discoveryAnalyzePrompt({
      id,
      name,
      componentPath,
      type,
      playgroundDir: playgroundRelPath,
      propsSnapshot,
      parentId,
    });

    analyzeLog(` Generated analysis prompt (${prompt.length} chars)`);

    analyzingIds.add(id);

    const providerName = getProviderDisplayName(providerId);
    if (model) analyzeLog(` Using model: ${model}`);
    analyzeLog(` Using provider: ${providerName}`);

    const startTime = Date.now();

    return await new Promise<Response>((resolve) => {
    try {
      const agentProcess = spawnAgent(providerId, {
        model,
        claudeDetailedStdout: false,
      }, process.cwd());

      analyzeLog(` Agent process started — PID=${agentProcess.pid}`);

      let stdout = '';
      let stderr = '';

      agentProcess.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        const lines = chunk.trim().split('\n');
        for (const line of lines) {
          if (line.trim()) analyzeLog(` [stdout] ${line}`);
        }
      });

      agentProcess.stderr?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        const lines = chunk.trim().split('\n');
        for (const line of lines) {
          if (line.trim()) analyzeLog(` [stderr] ${line}`);
        }
      });

      agentProcess.stdin?.write(prompt);
      agentProcess.stdin?.end();
      analyzeLog(` Prompt written to stdin and closed`);

      agentProcess.on('close', (code) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        analyzeLog(` Agent exited — code=${code}, elapsed=${elapsed}s`);
        analyzeLog(`   stdout: ${stdout.length} chars, stderr: ${stderr.length} chars`);

        analyzingIds.delete(id);

        if (code === 0) {
          const cleanName = name.replace(/\s+/g, '');
          const expectedDataFile = path.join(DATA_DIR, `${cleanName}.mockData.ts`);
          const mockDataExists = fs.existsSync(expectedDataFile);
          analyzeLog(` Expected mock data file: ${expectedDataFile} — exists=${mockDataExists}`);

          if (fs.existsSync(DATA_DIR)) {
            const files = fs.readdirSync(DATA_DIR);
            analyzeLog(` Data dir contents: [${files.join(', ')}]`);
          }

          try {
            const data = JSON.parse(fs.readFileSync(DISCOVERY_JSON_PATH, 'utf-8'));
            const entry = (data.entries || []).find((e: DiscoveryEntry) => e.id === id);

            if (entry) {
              analyzeLog(` Updated entry for "${name}" — status=${entry.status}, analysis=${JSON.stringify(entry.analysis || {})}`);
            } else {
              console.warn(`${ANALYZE_LOG_PREFIX} Entry "${id}" not found in discovery.json after analysis`);
            }

            const childEntries: DiscoveryEntry[] = [];
            if (entry?.childComponents && entry.childComponents.length > 0) {
              const existingIds = new Set((data.entries || []).map((e: DiscoveryEntry) => e.id));
              for (const child of entry.childComponents) {
                const childId = `${id}--${toKebabCase(child.name)}`;
                if (!existingIds.has(childId)) {
                  const childEntry: DiscoveryEntry = {
                    id: childId,
                    name: child.name,
                    path: child.path,
                    type: 'component',
                    parentId: id,
                    status: 'discovered',
                  };
                  data.entries.push(childEntry);
                  childEntries.push(childEntry);
                  existingIds.add(childId);
                  analyzeLog(` Promoted child component "${child.name}" as "${childId}"`);
                }
              }
              if (childEntries.length > 0) {
                fs.writeFileSync(DISCOVERY_JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
                analyzeLog(` Wrote ${childEntries.length} child entries to discovery.json`);
              }
            }

            resolve(c.json({
              success: true,
              entry: entry || null,
              childEntries,
            }));
          } catch (e) {
            console.error(`${ANALYZE_LOG_PREFIX} Error reading discovery.json after analysis:`, e);
            resolve(c.json({
              success: true,
              entry: null,
              message: 'Analysis completed but could not read updated entry',
            }));
          }
        } else {
          console.error(`${ANALYZE_LOG_PREFIX} Analysis failed for "${name}" — code=${code}`);
          if (stderr) console.error(`${ANALYZE_LOG_PREFIX} stderr: ${stderr.slice(0, 1000)}`);
          resolve(c.json({ success: false, error: stderr || `${providerName} agent exited with code ${code}` }, 500));
        }
      });

      agentProcess.on('error', (error) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`${ANALYZE_LOG_PREFIX} Agent process error after ${elapsed}s:`, error.message);

        analyzingIds.delete(id);
        const message = error.message.includes('ENOENT')
          ? getProviderNotFoundMessage(providerId)
          : error.message;
        resolve(c.json({ success: false, error: message }, 500));
      });
    } catch (spawnError) {
      console.error(`${ANALYZE_LOG_PREFIX} Failed to spawn agent:`, spawnError);
      analyzingIds.delete(id);
      const message = spawnError instanceof Error ? spawnError.message : `Failed to spawn ${providerName} agent`;
      resolve(c.json({ success: false, error: message }, 500));
    }
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/discover/analyze — remove a discovered component
  // -------------------------------------------------------------------------
  app.delete('/api/discover/analyze', async (c) => {
    const body = await readJson<{ id?: string }>(c);

    if (!body?.id) {
      return c.json({ success: false, error: 'Missing required field: id' }, 400);
    }

    const { id } = body;
    analyzeLog(` DELETE — removing discovered component "${id}"`);

    try {
      if (!fs.existsSync(DISCOVERY_JSON_PATH)) {
        return c.json({ success: false, error: 'discovery.json not found' }, 404);
      }

      const data = JSON.parse(fs.readFileSync(DISCOVERY_JSON_PATH, 'utf-8'));
      const entry = (data.entries || []).find((e: DiscoveryEntry) => e.id === id);

      if (!entry) {
        console.warn(`${ANALYZE_LOG_PREFIX} Entry "${id}" not found for deletion`);
        return c.json({ success: false, error: `Entry "${id}" not found` }, 404);
      }

      const cleanName = (entry.name as string).replace(/\s+/g, '');
      const mockDataPath = path.join(DATA_DIR, `${cleanName}.mockData.ts`);
      if (fs.existsSync(mockDataPath)) {
        fs.unlinkSync(mockDataPath);
        analyzeLog(` Deleted mock data file: ${cleanName}.mockData.ts`);
      }

      entry.status = 'discovered';
      delete entry.analysis;

      fs.writeFileSync(DISCOVERY_JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      analyzeLog(` Reset entry "${id}" to discovered`);

      return c.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove component';
      console.error(`${ANALYZE_LOG_PREFIX} Error removing component:`, message);
      return c.json({ success: false, error: message }, 500);
    }
  });

  return app;
}
