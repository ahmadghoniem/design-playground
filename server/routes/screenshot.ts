import { Hono } from 'hono';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { resolvePlaygroundDir } from '../../lib/resolve-playground-dir';
import { readJson } from '../lib/hono-helpers';

const IMAGES_DIR = path.join(
  resolvePlaygroundDir(),
  'iterations',
  'iterations-images',
);

async function ensureImagesDir() {
  if (!fsSync.existsSync(IMAGES_DIR)) {
    await fs.mkdir(IMAGES_DIR, { recursive: true });
  }
}

const SAFE_FILENAME_RE = /^[A-Za-z0-9._-]+\.png$/;

export function screenshotRoutes() {
  const app = new Hono();

  app.get('/api/screenshot', async (c) => {
    const filename = c.req.query('filename');

    if (!filename || !SAFE_FILENAME_RE.test(filename)) {
      return c.json({ exists: false, error: 'Invalid or missing filename' }, 400);
    }

    const filePath = path.join(IMAGES_DIR, filename);
    const relativePath = path.relative(process.cwd(), filePath);

    if (fsSync.existsSync(filePath)) {
      return c.json({ exists: true, path: relativePath });
    }

    return c.json({ exists: false });
  });

  app.post('/api/screenshot', async (c) => {
    try {
      const body = await readJson<{
        imageBase64?: string;
        filename?: string;
      }>(c);

      if (!body?.imageBase64 || !body?.filename) {
        return c.json({ success: false, error: 'Missing imageBase64 or filename' }, 400);
      }

      const { imageBase64, filename } = body;

      if (!SAFE_FILENAME_RE.test(filename)) {
        return c.json({
          success: false,
          error: 'Invalid filename. Use alphanumeric, dashes, dots, ending in .png',
        }, 400);
      }

      const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      await ensureImagesDir();
      const filePath = path.join(IMAGES_DIR, filename);
      await fs.writeFile(filePath, buffer);

      const relativePath = path.relative(process.cwd(), filePath);

      return c.json({ success: true, path: relativePath });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Playground][screenshot] POST error:', error);
      return c.json({ success: false, error: message }, 500);
    }
  });

  return app;
}
