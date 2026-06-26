import { Hono } from 'hono';
import fs from 'fs';
import path from 'path';
import { HTML_TREE_DIR, HTML_TREE_FILENAME } from '../../lib/constants';
import type { HtmlPageInfo } from '../../lib/constants';
import { syncPublicFrameGitignoreSafe } from '../../lib/sync-host-gitignore';
import { readJson } from '../lib/hono-helpers';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const TREE_DIR = path.join(PUBLIC_DIR, HTML_TREE_DIR);
const TREE_PATH = path.join(TREE_DIR, HTML_TREE_FILENAME);

interface TreeManifest {
  version: number;
  entries: Record<string, { parent: string }>;
}

function readTreeManifest(): TreeManifest {
  try {
    if (fs.existsSync(TREE_PATH)) {
      return JSON.parse(fs.readFileSync(TREE_PATH, 'utf-8'));
    }
  } catch { /* ignore */ }
  return { version: 1, entries: {} };
}

function writeTreeManifest(manifest: TreeManifest) {
  if (!fs.existsSync(TREE_DIR)) {
    fs.mkdirSync(TREE_DIR, { recursive: true });
  }
  fs.writeFileSync(TREE_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
}

function normalizePageFolderName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

function isValidStoredPageFolder(value: string): boolean {
  return value.length > 0 && value === normalizePageFolderName(value);
}

function resolvePageDir(folder: string): string | null {
  if (!isValidStoredPageFolder(folder)) return null;
  const resolved = path.resolve(PUBLIC_DIR, folder);
  return resolved.startsWith(PUBLIC_DIR + path.sep) ? resolved : null;
}

function scanHtmlPages(): HtmlPageInfo[] {
  if (!fs.existsSync(PUBLIC_DIR)) return [];

  const entries = fs.readdirSync(PUBLIC_DIR, { withFileTypes: true });
  const manifest = readTreeManifest();
  const pages: HtmlPageInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === HTML_TREE_DIR) continue;
    if (entry.name.startsWith('.')) continue;

    const pageDir = path.join(PUBLIC_DIR, entry.name);
    const indexPath = path.join(pageDir, 'index.html');

    if (!fs.existsSync(indexPath)) continue;

    const iterations: { folder: string; number: number }[] = [];
    try {
      const subEntries = fs.readdirSync(pageDir, { withFileTypes: true });
      for (const sub of subEntries) {
        if (!sub.isDirectory()) continue;
        const match = sub.name.match(/^iteration-(\d+)$/);
        if (match) {
          const iterIndex = path.join(pageDir, sub.name, 'index.html');
          if (fs.existsSync(iterIndex)) {
            iterations.push({ folder: sub.name, number: parseInt(match[1], 10) });
          }
        }
      }
    } catch { /* ignore */ }

    iterations.sort((a, b) => a.number - b.number);

    pages.push({
      id: `html:${entry.name}`,
      label: entry.name,
      folder: entry.name,
      iterations,
    });
  }

  return pages;
}

export function htmlPagesRoutes() {
  const app = new Hono();

  // PUT — Create a new HTML page with a starter template
  app.put('/api/html-pages', async (c) => {
    try {
      const body = await readJson<{ name?: string; content?: string }>(c);

      if (!body?.name) {
        return c.json({ success: false, error: 'Missing page name' }, 400);
      }

      const name = normalizePageFolderName(body.name);

      if (!name) {
        return c.json({ success: false, error: 'Invalid page name' }, 400);
      }

      const pageDir = path.join(PUBLIC_DIR, name);
      const indexPath = path.join(pageDir, 'index.html');

      if (fs.existsSync(indexPath)) {
        return c.json({ success: false, error: `Page "${name}" already exists` }, 409);
      }

      fs.mkdirSync(pageDir, { recursive: true });

      const template = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fafaf9;
      color: #1c1917;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 2rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    p {
      color: #78716c;
      font-size: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${name}</h1>
    <p>Edit this page or iterate on it from the playground.</p>
  </div>
</body>
</html>`;

      const htmlContent = body.content || template;
      fs.writeFileSync(indexPath, htmlContent, 'utf-8');

      syncPublicFrameGitignoreSafe();

      return c.json({
        success: true,
        page: {
          id: `html:${name}`,
          label: name,
          folder: name,
          iterations: [],
        },
      });
    } catch (error) {
      console.error('[html-pages] PUT error:', error);
      return c.json({ success: false, error: 'Failed to create HTML page' }, 500);
    }
  });

  // GET — List HTML pages and their iterations
  app.get('/api/html-pages', async (c) => {
    try {
      const pages = scanHtmlPages();
      return c.json({ pages });
    } catch (error) {
      console.error('[html-pages] GET error:', error);
      return c.json({ pages: [], error: 'Failed to scan HTML pages' }, 500);
    }
  });

  // POST — Rebuild html-tree.json manifest
  app.post('/api/html-pages', async (c) => {
    try {
      const pages = scanHtmlPages();
      const existing = readTreeManifest();
      const entries = { ...existing.entries };

      for (const page of pages) {
        for (const iter of page.iterations) {
          const key = `${page.folder}/${iter.folder}`;
          if (!entries[key]) {
            entries[key] = { parent: `html:${page.folder}` };
          }
        }
      }

      writeTreeManifest({ version: 1, entries });
      syncPublicFrameGitignoreSafe();
      return c.json({ success: true });
    } catch (error) {
      console.error('[html-pages] POST error:', error);
      return c.json({ success: false, error: 'Failed to rebuild manifest' }, 500);
    }
  });

  // PATCH — Rename an HTML page folder
  app.patch('/api/html-pages', async (c) => {
    try {
      const body = await readJson<{
        pageFolder?: string;
        newName?: string;
      }>(c);

      if (!body?.pageFolder || !body?.newName) {
        return c.json({ success: false, error: 'Missing pageFolder or newName' }, 400);
      }

      const oldFolder = body.pageFolder.trim();
      const newFolder = normalizePageFolderName(body.newName);

      if (!isValidStoredPageFolder(oldFolder) || !newFolder) {
        return c.json({ success: false, error: 'Invalid page name' }, 400);
      }

      if (newFolder === oldFolder) {
        return c.json({
          success: true,
          page: {
            id: `html:${newFolder}`,
            label: newFolder,
            folder: newFolder,
            iterations: [],
          },
        });
      }

      const oldDir = resolvePageDir(oldFolder);
      const newDir = resolvePageDir(newFolder);
      if (!oldDir || !newDir) {
        return c.json({ success: false, error: 'Invalid path' }, 400);
      }

      const oldIndex = path.join(oldDir, 'index.html');
      const newIndex = path.join(newDir, 'index.html');

      if (!fs.existsSync(oldIndex)) {
        return c.json({ success: false, error: `Page "${oldFolder}" not found` }, 404);
      }
      if (fs.existsSync(newIndex)) {
        return c.json({ success: false, error: `Page "${newFolder}" already exists` }, 409);
      }

      fs.renameSync(oldDir, newDir);

      const manifest = readTreeManifest();
      const nextEntries: TreeManifest['entries'] = {};
      for (const [key, value] of Object.entries(manifest.entries)) {
        const nextKey =
          key === oldFolder
            ? newFolder
            : key.startsWith(`${oldFolder}/`)
              ? `${newFolder}${key.slice(oldFolder.length)}`
              : key;

        const nextParent =
          value.parent === `html:${oldFolder}`
            ? `html:${newFolder}`
            : value.parent === oldFolder
              ? newFolder
              : value.parent.startsWith(`${oldFolder}/`)
                ? `${newFolder}${value.parent.slice(oldFolder.length)}`
                : value.parent;

        nextEntries[nextKey] = { parent: nextParent };
      }
      writeTreeManifest({ version: manifest.version ?? 1, entries: nextEntries });

      syncPublicFrameGitignoreSafe();

      const pages = scanHtmlPages();
      const page = pages.find((p) => p.folder === newFolder);
      return c.json({
        success: true,
        page: page ?? {
          id: `html:${newFolder}`,
          label: newFolder,
          folder: newFolder,
          iterations: [],
        },
      });
    } catch (error) {
      console.error('[html-pages] PATCH error:', error);
      return c.json({ success: false, error: 'Failed to rename HTML page' }, 500);
    }
  });

  // DELETE — Remove an iteration folder
  app.delete('/api/html-pages', async (c) => {
    try {
      const body = await readJson<{
        pageFolder?: string;
        iterationFolder?: string;
      }>(c);

      if (!body?.pageFolder) {
        return c.json({ success: false, error: 'Missing pageFolder' }, 400);
      }

      const pageFolder = body.pageFolder.trim();
      const { iterationFolder } = body;

      const pageDir = resolvePageDir(pageFolder);
      if (!pageDir) {
        return c.json({ success: false, error: 'Invalid path' }, 400);
      }

      if (iterationFolder) {
        const iterDirResolved = path.resolve(pageDir, iterationFolder);
        if (
          !iterDirResolved.startsWith(pageDir + path.sep) ||
          path.basename(iterDirResolved) !== iterationFolder
        ) {
          return c.json({ success: false, error: 'Invalid path' }, 400);
        }

        const iterDir = path.join(pageDir, iterationFolder);
        if (fs.existsSync(iterDir)) {
          fs.rmSync(iterDir, { recursive: true });
        }

        const manifest = readTreeManifest();
        const removedKey = `${pageFolder}/${iterationFolder}`;
        const removedParent = manifest.entries[removedKey]?.parent;
        delete manifest.entries[removedKey];

        if (removedParent) {
          for (const [key, value] of Object.entries(manifest.entries)) {
            if (value.parent === removedKey || value.parent === iterationFolder) {
              manifest.entries[key] = { parent: removedParent };
            }
          }
        }

        writeTreeManifest(manifest);
      } else {
        if (fs.existsSync(pageDir)) {
          fs.rmSync(pageDir, { recursive: true });
        }

        const manifest = readTreeManifest();
        for (const key of Object.keys(manifest.entries)) {
          if (key === pageFolder || key.startsWith(`${pageFolder}/`)) {
            delete manifest.entries[key];
          }
        }
        writeTreeManifest(manifest);
      }

      syncPublicFrameGitignoreSafe();

      return c.json({ success: true });
    } catch (error) {
      console.error('[html-pages] DELETE error:', error);
      return c.json({ success: false, error: 'Failed to delete iteration' }, 500);
    }
  });

  return app;
}
