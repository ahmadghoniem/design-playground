import { Hono } from 'hono';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { readJson } from '../lib/hono-helpers';

const IMAGES_DIR = path.join(process.cwd(), 'public/.playground/images');

async function ensureImagesDir() {
  if (!fsSync.existsSync(IMAGES_DIR)) {
    await fs.mkdir(IMAGES_DIR, { recursive: true });
  }
}

const SAFE_FILENAME_RE = /^[A-Za-z0-9._-]+\.(png|jpg|jpeg|gif|webp|svg)$/i;

function sanitizeFilename(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, '-').replace(/-+/g, '-');
}

export function imagesRoutes() {
  const app = new Hono();

  app.get('/api/images', async (c) => {
    try {
      await ensureImagesDir();
      const files = await fs.readdir(IMAGES_DIR);
      const images = files
        .filter((f) => SAFE_FILENAME_RE.test(f))
        .map((filename) => ({
          filename,
          url: `/.playground/images/${filename}`,
        }));
      return c.json({ images });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ images: [], error: message }, 500);
    }
  });

  app.post('/api/images', async (c) => {
    try {
      const body = await readJson<{
        imageBase64?: string;
        originalName?: string;
      }>(c);

      if (!body?.imageBase64 || !body?.originalName) {
        return c.json({ success: false, error: 'Missing imageBase64 or originalName' }, 400);
      }

      const { imageBase64, originalName } = body;

      let ext = path.extname(originalName).toLowerCase();
      if (!ext) {
        const mimeMatch = imageBase64.match(/^data:image\/(\w+);/);
        ext = mimeMatch ? `.${mimeMatch[1] === 'jpeg' ? 'jpg' : mimeMatch[1]}` : '.png';
      }

      const baseName = sanitizeFilename(path.basename(originalName, path.extname(originalName)));
      const filename = `${Date.now()}-${baseName}${ext}`;

      if (!SAFE_FILENAME_RE.test(filename)) {
        return c.json({ success: false, error: 'Invalid filename after sanitization' }, 400);
      }

      const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      await ensureImagesDir();
      const filePath = path.join(IMAGES_DIR, filename);
      await fs.writeFile(filePath, buffer);

      const relativePath = path.relative(process.cwd(), filePath);

      return c.json({
        success: true,
        filename,
        path: relativePath,
        url: `/.playground/images/${filename}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Playground][images] POST error:', error);
      return c.json({ success: false, error: message }, 500);
    }
  });

  app.delete('/api/images', async (c) => {
    try {
      const body = await readJson<{ filename?: string }>(c);

      if (!body?.filename) {
        return c.json({ success: false, error: 'Missing filename' }, 400);
      }

      const { filename } = body;

      if (!SAFE_FILENAME_RE.test(filename)) {
        return c.json({ success: false, error: 'Invalid filename' }, 400);
      }

      const filePath = path.join(IMAGES_DIR, filename);

      if (fsSync.existsSync(filePath)) {
        await fs.unlink(filePath);
      }

      return c.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Playground][images] DELETE error:', error);
      return c.json({ success: false, error: message }, 500);
    }
  });

  return app;
}
