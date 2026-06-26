import { Hono } from 'hono';
import fs from 'fs';
import path from 'path';
import { resolvePlaygroundDir } from '../../lib/resolve-playground-dir';

const REGISTRY_FILE = path.join(resolvePlaygroundDir(), 'registry.tsx');
const APP_DIR = path.join(process.cwd(), 'src/app');

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

interface PagesGroupBounds {
  groupOpen: number;
  childrenOpen: number;
  childrenClose: number;
}

function locatePagesGroup(source: string): PagesGroupBounds | null {
  const groupMatch = /id:\s*['"]pages['"][\s\S]*?children:\s*\[/.exec(source);
  if (!groupMatch) return null;
  const groupOpen = groupMatch.index;
  const childrenOpen = groupMatch.index + groupMatch[0].length;

  let depth = 1;
  let pos = childrenOpen;
  while (pos < source.length && depth > 0) {
    const ch = source[pos];
    if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) break;
    }
    pos++;
  }
  if (depth !== 0) return null;
  return { groupOpen, childrenOpen, childrenClose: pos };
}

function findLeafBounds(source: string, slug: string, bounds: PagesGroupBounds): [number, number] | null {
  const childrenSlice = source.slice(bounds.childrenOpen, bounds.childrenClose);
  const idRegex = new RegExp(`id:\\s*['"]${slug.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}['"]`);
  const idMatch = idRegex.exec(childrenSlice);
  if (!idMatch) return null;
  const idPos = bounds.childrenOpen + idMatch.index;

  let openPos = idPos;
  let openDepth = 0;
  while (openPos > bounds.childrenOpen) {
    openPos--;
    const ch = source[openPos];
    if (ch === '}') openDepth++;
    else if (ch === '{') {
      if (openDepth === 0) break;
      openDepth--;
    }
  }
  if (source[openPos] !== '{') return null;

  let closePos = openPos;
  let closeDepth = 0;
  while (closePos < bounds.childrenClose) {
    const ch = source[closePos];
    if (ch === '{') closeDepth++;
    else if (ch === '}') {
      closeDepth--;
      if (closeDepth === 0) break;
    }
    closePos++;
  }
  if (source[closePos] !== '}') return null;

  let endPos = closePos + 1;
  while (endPos < source.length && (source[endPos] === ',' || source[endPos] === ' ' || source[endPos] === '\t')) endPos++;
  if (source[endPos] === '\n') endPos++;

  let startPos = openPos;
  while (startPos > 0 && (source[startPos - 1] === ' ' || source[startPos - 1] === '\t')) startPos--;

  return [startPos, endPos];
}

function removeDynamicImportLine(source: string, slug: string): string {
  const escaped = slug.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const importRegex = new RegExp(
    `^[ \\t]*const\\s+\\w+\\s*=\\s*dynamic\\(\\s*\\(\\)\\s*=>\\s*import\\(\\s*['"]@/app/${escaped}/page['"]\\s*\\)[\\s\\S]*?;\\s*\\n`,
    'gm',
  );
  return source.replace(importRegex, '');
}

export function pagesRoutes() {
  const app = new Hono();

  app.delete('/api/pages', async (c) => {
    const slug = (c.req.query('slug') || '').trim();

    if (!slug || !SLUG_PATTERN.test(slug)) {
      return c.json({ success: false, error: 'Invalid slug' }, 400);
    }

    if (!fs.existsSync(REGISTRY_FILE)) {
      return c.json({ success: false, error: 'Registry file not found' }, 500);
    }

    const source = fs.readFileSync(REGISTRY_FILE, 'utf-8');
    const bounds = locatePagesGroup(source);
    if (!bounds) {
      return c.json({ success: false, error: 'Pages group not found in registry' }, 500);
    }

    const leafBounds = findLeafBounds(source, slug, bounds);
    if (!leafBounds) {
      return c.json({ success: false, error: `Slug '${slug}' not found in Pages group — refusing to delete` }, 404);
    }

    const withoutLeaf = source.slice(0, leafBounds[0]) + source.slice(leafBounds[1]);
    const finalSource = removeDynamicImportLine(withoutLeaf, slug);
    fs.writeFileSync(REGISTRY_FILE, finalSource, 'utf-8');

    const pageDir = path.join(APP_DIR, slug);
    if (fs.existsSync(pageDir)) {
      try {
        fs.rmSync(pageDir, { recursive: true, force: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove page directory';
        return c.json({ success: false, error: `Registry updated but failed to remove ${pageDir}: ${message}` }, 500);
      }
    }

    return c.json({ success: true, slug });
  });

  return app;
}
