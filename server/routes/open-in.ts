import { Hono } from 'hono';
import path from 'path';
import { execFile } from 'child_process';
import { readJson } from '../lib/hono-helpers';

type OpenInTarget = 'finder' | 'cursor' | 'antigravity' | 'codex' | 'github-desktop';

const PROJECT_PATH = process.cwd();
const PROJECT_NAME = path.basename(PROJECT_PATH);

function runOpen(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    execFile('open', args, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function getOpenArgs(target: OpenInTarget): string[] {
  switch (target) {
    case 'finder':
      return ['-R', PROJECT_PATH];
    case 'cursor':
      return ['-a', 'Cursor', PROJECT_PATH];
    case 'antigravity':
      return ['-a', 'Antigravity', PROJECT_PATH];
    case 'codex':
      return ['-a', 'Codex', `codex://threads/new?path=${encodeURIComponent(PROJECT_PATH)}`];
    case 'github-desktop':
      return ['-a', 'GitHub Desktop', PROJECT_PATH];
    default:
      return [];
  }
}

export function openInRoutes() {
  const app = new Hono();

  app.get('/api/open-in', async (c) => {
    return c.json({
      projectName: PROJECT_NAME,
      projectPath: PROJECT_PATH,
      platform: process.platform,
    });
  });

  app.post('/api/open-in', async (c) => {
    if (process.platform !== 'darwin') {
      return c.json({ success: false, error: 'Open In menu is only supported on macOS.' }, 400);
    }

    const body = await readJson<{ target?: OpenInTarget }>(c);
    const target = body?.target;
    if (
      target !== 'finder' &&
      target !== 'cursor' &&
      target !== 'antigravity' &&
      target !== 'codex' &&
      target !== 'github-desktop'
    ) {
      return c.json({
        success: false,
        error: 'Invalid target. Expected finder, cursor, antigravity, codex, or github-desktop.',
      }, 400);
    }

    try {
      await runOpen(getOpenArgs(target));
      return c.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to open ${target}`;
      return c.json({ success: false, error: message }, 500);
    }
  });

  return app;
}
