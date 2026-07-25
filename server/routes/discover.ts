import { Hono } from 'hono';
import fs from 'fs';
import path from 'path';
import { DISCOVERY_MANIFEST_FILENAME } from '../../shared/lib/constants';
import { resolvePlaygroundDir } from '../../shared/lib/resolve-playground-dir';
import { discoveryAnalyzePrompt } from '../../features/generation/prompts/discovery-analyze.prompt';
import { AGENT_DISPLAY_NAME, AGENT_NOT_FOUND_MESSAGE } from '../../shared/lib/agent-config';
import { spawnAgent } from '../../shared/lib/spawn-agent';
import { readJson } from '../lib/hono-helpers';
import {
  readManifest,
  writeManifest,
  regenerateModule,
  ensureModuleExists,
  type DiscoveredRegistryEntry,
} from '../lib/discovered-registry';

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

log(` Playground dir resolved to: ${PLAYGROUND_DIR}`);
log(` Discovery JSON path: ${DISCOVERY_JSON_PATH}`);

// Make sure the generated registry module exists on a fresh project so the
// static import in registry.tsx always resolves (Vite fails on a missing one).
ensureModuleExists(PLAYGROUND_DIR);

// ---------------------------------------------------------------------------
// Global state
// ---------------------------------------------------------------------------

// Track in-progress analyses to prevent duplicates
const analyzingIds = new Set<string>();

interface DiscoveryEntry {
  id: string;
  name: string;
  path: string;
  type: 'component';
  status: string;
  parentId?: string;
  childComponents?: { name: string; path: string }[];
  analysis?: {
    discoveredFilename?: string;
    componentName?: string;
    registryId?: string;
    [key: string]: unknown;
  };
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

export function discoverRoutes() {
  const app = new Hono();

  // -------------------------------------------------------------------------
  // POST /api/discover/analyze — analyze a specific discovered component
  // -------------------------------------------------------------------------
  app.post('/api/discover/analyze', async (c) => {
    const body = await readJson<{
      id?: string;
      path?: string;
      name?: string;
      type?: 'component';
      model?: string;
      parentId?: string;
    }>(c);

    if (!body?.id || !body?.path || !body?.name || !body?.type) {
      return c.json({ success: false, error: 'Missing required fields: id, path, name, type' }, 400);
    }

    const { id, name, type, model, parentId } = body;
    const componentPath = body.path;

    analyzeLog(` POST — analyzing component "${name}" (id=${id}, type=${type})`);
    analyzeLog(`   Source: ${componentPath}`);

    if (analyzingIds.has(id)) {
      console.warn(`${ANALYZE_LOG_PREFIX} Analysis already in progress for "${name}" — rejecting`);
      return c.json({ success: false, error: `Analysis already in progress for "${name}"` }, 409);
    }

    const playgroundRelPath = path.relative(process.cwd(), PLAYGROUND_DIR).replace(/\\/g, '/');

    const prompt = discoveryAnalyzePrompt({
      id,
      name,
      componentPath,
      playgroundDir: playgroundRelPath,
      parentId,
    });

    analyzeLog(` Generated analysis prompt (${prompt.length} chars)`);

    analyzingIds.add(id);

    const providerName = AGENT_DISPLAY_NAME;
    if (model) analyzeLog(` Using model: ${model}`);
    analyzeLog(` Using provider: ${providerName}`);

    const startTime = Date.now();

    return await new Promise<Response>((resolve) => {
    try {
      const agentProcess = spawnAgent({
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
          try {
            // The agent writes a data entry into the discovered-registry manifest.
            // Confirm it landed, then regenerate the module and update discovery.json
            // ourselves (status + analysis) so bookkeeping stays server-owned.
            const manifest = readManifest(PLAYGROUND_DIR);
            const manifestEntry = manifest.entries.find((e) => e.discoveryId === id);

            if (!manifestEntry) {
              console.error(`${ANALYZE_LOG_PREFIX} Agent completed but no manifest entry for "${id}"`);
              resolve(c.json({
                success: false,
                error: 'Agent completed but did not write a discovered-registry.json entry.',
              }, 500));
              return;
            }

            regenerateModule(PLAYGROUND_DIR);
            analyzeLog(` Regenerated discovered-registry module for "${manifestEntry.id}"`);

            const data = JSON.parse(fs.readFileSync(DISCOVERY_JSON_PATH, 'utf-8'));
            const entry = (data.entries || []).find((e: DiscoveryEntry) => e.id === id);

            if (entry) {
              entry.status = 'added';
              entry.analysis = {
                showcasePath: manifestEntry.sourcePath,
                componentName: manifestEntry.componentName,
                registryId: manifestEntry.id,
                size: manifestEntry.size,
              };
              analyzeLog(` Marked "${name}" added — registryId=${manifestEntry.id}`);
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
            }

            // Persist the status/analysis update plus any promoted children.
            fs.writeFileSync(DISCOVERY_JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
            if (childEntries.length > 0) {
              analyzeLog(` Wrote ${childEntries.length} child entries to discovery.json`);
            }

            resolve(c.json({
              success: true,
              entry: entry || null,
              childEntries,
            }));
          } catch (e) {
            console.error(`${ANALYZE_LOG_PREFIX} Error updating discovery.json after analysis:`, e);
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
          ? AGENT_NOT_FOUND_MESSAGE
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

      // New discoveries live in the playground-owned manifest — remove from there
      // and regenerate the module. Legacy entries that were machine-added into the
      // hand-written registry.tsx (before the manifest existed) are not in the
      // manifest; those are valid user code now, so fail gracefully instead of
      // regex-stripping someone's source.
      const manifest = readManifest(PLAYGROUND_DIR);
      const idx = manifest.entries.findIndex((e: DiscoveredRegistryEntry) => e.discoveryId === id);

      if (idx === -1) {
        if (entry.status === 'added') {
          const registryId = (entry.analysis?.registryId as string | undefined) || id;
          analyzeLog(` "${id}" is a legacy registry.tsx entry — refusing to strip`);
          return c.json({
            success: false,
            error: `"${entry.name}" was added directly to registry.tsx (registry id "${registryId}"). Remove it there — the playground no longer edits registry.tsx.`,
          }, 409);
        }
        console.warn(`${ANALYZE_LOG_PREFIX} No manifest entry for "${id}" — nothing to remove`);
        return c.json({ success: false, error: `Entry "${id}" is not a managed discovered component` }, 404);
      }

      manifest.entries.splice(idx, 1);
      writeManifest(PLAYGROUND_DIR, manifest);
      regenerateModule(PLAYGROUND_DIR);
      analyzeLog(` Removed "${id}" from manifest and regenerated module`);

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
