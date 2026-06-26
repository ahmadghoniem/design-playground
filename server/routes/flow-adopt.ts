import { Hono } from 'hono';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolvePlaygroundDir } from '../../lib/resolve-playground-dir';
import { findFlowDescriptorById } from '../../lib/flows/registry';
import { readJson } from '../lib/hono-helpers';

const execFileP = promisify(execFile);

interface AdoptRequestBody {
  descriptorId: string;
  canonicalIterationByStage: Record<string, string>;
}

interface StageDiff {
  stageId: string;
  stageLabel: string;
  originalPath: string;
  iterationFilename: string;
  unifiedDiff: string;
}

function matchSourceFile(sourceFiles: string[], iterationFilename: string): string | null {
  const base = iterationFilename.split('.iteration-')[0];
  if (!base) return null;
  return (
    sourceFiles.find((f) => path.basename(f, path.extname(f)) === base) ?? null
  );
}

async function diffStrings(
  original: string,
  modified: string,
  originalPath: string,
): Promise<string> {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'flow-adopt-'));
  const aDir = path.join(tmpRoot, 'a', path.dirname(originalPath));
  const bDir = path.join(tmpRoot, 'b', path.dirname(originalPath));
  const aPath = path.join(tmpRoot, 'a', originalPath);
  const bPath = path.join(tmpRoot, 'b', originalPath);
  try {
    await fs.mkdir(aDir, { recursive: true });
    await fs.mkdir(bDir, { recursive: true });
    await writeFile(aPath, original, 'utf-8');
    await writeFile(bPath, modified, 'utf-8');
    let stdout = '';
    try {
      const result = await execFileP('git', [
        'diff',
        '--no-index',
        '--src-prefix=a/',
        '--dst-prefix=b/',
        '--',
        path.join('a', originalPath),
        path.join('b', originalPath),
      ], {
        cwd: tmpRoot,
        maxBuffer: 10 * 1024 * 1024,
      });
      stdout = result.stdout;
    } catch (err) {
      const e = err as { code?: number; stdout?: string };
      if (e.code === 1 && typeof e.stdout === 'string') {
        stdout = e.stdout;
      } else {
        throw err;
      }
    }
    return stdout;
  } finally {
    await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
  }
}

export function flowAdoptRoutes() {
  const app = new Hono();

  app.post('/api/flow-adopt', async (c) => {
    const body = (await readJson<AdoptRequestBody>(c)) as AdoptRequestBody;
    const descriptor = findFlowDescriptorById(body?.descriptorId);
    if (!descriptor) {
      return c.json({ error: 'Unknown descriptor' }, 400);
    }

    const projectRoot = process.cwd();
    const playgroundDir = resolvePlaygroundDir();
    const iterationsDir = path.join(playgroundDir, 'iterations');

    const perStageDiffs: StageDiff[] = [];
    const errors: string[] = [];

    for (const stage of descriptor.stages) {
      if (stage.synthetic) continue;
      const iterationFilename = body.canonicalIterationByStage[stage.id];
      if (!iterationFilename) continue;

      const originalRel = matchSourceFile(descriptor.sourceFiles, iterationFilename);
      if (!originalRel) {
        errors.push(`No source file matches iteration ${iterationFilename}`);
        continue;
      }
      const originalAbs = path.join(projectRoot, originalRel);
      const iterationAbs = path.join(iterationsDir, iterationFilename);

      try {
        const originalContent = await fs.readFile(originalAbs, 'utf-8');
        const iterationContent = await fs.readFile(iterationAbs, 'utf-8');
        const unifiedDiff = await diffStrings(
          originalContent,
          iterationContent,
          originalRel,
        );
        perStageDiffs.push({
          stageId: stage.id,
          stageLabel: stage.label,
          originalPath: originalRel,
          iterationFilename,
          unifiedDiff,
        });
      } catch (err) {
        errors.push(`Failed to diff stage ${stage.id}: ${(err as Error).message}`);
      }
    }

    const combinedDiff = perStageDiffs.map((d) => d.unifiedDiff).join('\n');

    let patchPath: string | null = null;
    if (combinedDiff.trim()) {
      const contextDir = path.join(projectRoot, '.context');
      await fs.mkdir(contextDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      patchPath = path.join('.context', `flow-adopt-${descriptor.id}-${stamp}.patch`);
      await fs.writeFile(
        path.join(projectRoot, patchPath),
        combinedDiff,
        'utf-8',
      );
    }

    return c.json({
      descriptorId: descriptor.id,
      perStageDiffs,
      combinedDiff,
      patchPath,
      errors,
    });
  });

  return app;
}
