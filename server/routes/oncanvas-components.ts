import { Hono } from 'hono';
import fs from 'fs';
import path from 'path';
import { readJson } from '../lib/hono-helpers';
import {
  CANVAS_COMPONENT_FILENAME_PATTERN,
  CANVAS_ITERATION_FILENAME_PATTERN,
  CANVAS_ITERATION_PARSE_PATTERN,
  JSX_ID_PREFIX,
  type JsxComponentInfo,
  type JsxIterationInfo,
} from '../../lib/constants';
import { resolvePlaygroundDir, listPlaygroundDirs } from '../../lib/resolve-playground-dir';

const CANVAS_COMPONENTS_DIR = path.join(resolvePlaygroundDir(), 'canvas-components');
const INDEX_FILE = path.join(CANVAS_COMPONENTS_DIR, 'index.ts');

function canvasComponentDirs(): string[] {
  return listPlaygroundDirs()
    .map((dir) => path.join(dir, 'canvas-components'))
    .filter((dir) => fs.existsSync(dir));
}

function readMatchingAcrossDirs(pattern: RegExp): string[] {
  const seen = new Set<string>();
  for (const dir of canvasComponentDirs()) {
    for (const f of fs.readdirSync(dir)) {
      if (pattern.test(f)) seen.add(f);
    }
  }
  return [...seen];
}

function toPascalCase(s: string): string {
  return s.split(/[-.]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

function buildIterationInfo(filename: string): JsxIterationInfo | null {
  const match = filename.match(CANVAS_ITERATION_PARSE_PATTERN);
  if (!match) return null;
  const baseName = match[1];
  const iterationNumber = parseInt(match[2], 10);
  const label = filename.replace('.tsx', '');
  return {
    id: `${JSX_ID_PREFIX}${label}`,
    label,
    filename,
    baseFilename: `${baseName}.tsx`,
    iterationNumber,
  };
}

function buildComponentInfo(filename: string, iterations: JsxIterationInfo[]): JsxComponentInfo {
  const label = filename.replace('.tsx', '');
  return { id: `${JSX_ID_PREFIX}${label}`, label, filename, iterations };
}

function scanBaseFiles(): string[] {
  return readMatchingAcrossDirs(CANVAS_COMPONENT_FILENAME_PATTERN)
    .sort((a, b) => {
      const na = parseInt(a.match(/(\d+)/)?.[1] ?? '0', 10);
      const nb = parseInt(b.match(/(\d+)/)?.[1] ?? '0', 10);
      return na - nb;
    });
}

function scanIterationFiles(): string[] {
  return readMatchingAcrossDirs(CANVAS_ITERATION_FILENAME_PATTERN)
    .sort((a, b) => {
      const parseA = a.match(CANVAS_ITERATION_PARSE_PATTERN);
      const parseB = b.match(CANVAS_ITERATION_PARSE_PATTERN);
      const baseA = parseA?.[1] ?? '';
      const baseB = parseB?.[1] ?? '';
      if (baseA !== baseB) return baseA.localeCompare(baseB);
      return parseInt(parseA?.[2] ?? '0', 10) - parseInt(parseB?.[2] ?? '0', 10);
    });
}

function scanAllFiles(): string[] {
  return [...scanBaseFiles(), ...scanIterationFiles()];
}

const EMPTY_INDEX = `// Auto-generated — do not edit manually
'use client';
import { ComponentType } from 'react';

export const canvasComponents: Record<string, ComponentType<any>> = {};

export function getOnCanvasComponent(filename: string): ComponentType<any> | undefined {
  return canvasComponents[filename];
}
`;

function regenerateIndex(): void {
  fs.mkdirSync(CANVAS_COMPONENTS_DIR, { recursive: true });
  const files = scanAllFiles();

  if (files.length === 0) {
    fs.writeFileSync(INDEX_FILE, EMPTY_INDEX, 'utf-8');
    return;
  }

  const importLines = files.map(f => {
    const name = f.replace('.tsx', '');
    const varName = toPascalCase(name);
    return `import ${varName} from './${name}';`;
  });

  const mapEntries = files.map(f => {
    const name = f.replace('.tsx', '');
    const varName = toPascalCase(name);
    return `  '${f}': ${varName} as ComponentType<any>,`;
  });

  const content = `// Auto-generated — do not edit manually
'use client';
import { ComponentType } from 'react';

${importLines.join('\n')}

export const canvasComponents: Record<string, ComponentType<any>> = {
${mapEntries.join('\n')}
};

export function getOnCanvasComponent(filename: string): ComponentType<any> | undefined {
  return canvasComponents[filename];
}
`;
  fs.writeFileSync(INDEX_FILE, content, 'utf-8');
}

export function oncanvasComponentsRoutes() {
  const app = new Hono();

  // GET — list all on-canvas components with their iterations
  app.get('/api/oncanvas-components', async (c) => {
    if (!fs.existsSync(INDEX_FILE)) {
      regenerateIndex();
    }

    const baseFiles = scanBaseFiles();
    const iterFiles = scanIterationFiles();

    const iterByBase = new Map<string, JsxIterationInfo[]>();
    for (const f of iterFiles) {
      const info = buildIterationInfo(f);
      if (!info) continue;
      const list = iterByBase.get(info.baseFilename) || [];
      list.push(info);
      iterByBase.set(info.baseFilename, list);
    }

    const components: JsxComponentInfo[] = baseFiles.map(f =>
      buildComponentInfo(f, iterByBase.get(f) || [])
    );

    return c.json({ components });
  });

  // POST — regenerate barrel index (call after agent writes files directly)
  app.post('/api/oncanvas-components', async (c) => {
    regenerateIndex();
    return c.json({ success: true });
  });

  // PUT — write a new component or iteration file
  app.put('/api/oncanvas-components', async (c) => {
    const body = await readJson<{ filename?: string; content?: string }>(c);
    if (!body) {
      return c.json({ error: 'Invalid JSON' }, 400);
    }

    const { filename, content } = body;

    const isBase = filename && CANVAS_COMPONENT_FILENAME_PATTERN.test(filename);
    const isIteration = filename && CANVAS_ITERATION_FILENAME_PATTERN.test(filename);

    if (!filename || (!isBase && !isIteration)) {
      return c.json({ error: 'Invalid filename — must match frame-N.tsx or frame-N.iteration-M.tsx' }, 400);
    }
    if (!content || typeof content !== 'string') {
      return c.json({ error: 'content is required' }, 400);
    }

    fs.mkdirSync(CANVAS_COMPONENTS_DIR, { recursive: true });

    const filePath = path.join(CANVAS_COMPONENTS_DIR, filename);
    if (fs.existsSync(filePath)) {
      return c.json({ error: `Component "${filename}" already exists` }, 409);
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    regenerateIndex();

    if (isIteration) {
      const info = buildIterationInfo(filename);
      return c.json({ success: true, iteration: info });
    }

    const component = buildComponentInfo(filename, []);
    return c.json({ success: true, component });
  });

  // DELETE — remove a component or iteration file
  app.delete('/api/oncanvas-components', async (c) => {
    const body = await readJson<{ filename?: string }>(c);
    if (!body) {
      return c.json({ error: 'Invalid JSON' }, 400);
    }

    const { filename } = body;

    const isBase = filename && CANVAS_COMPONENT_FILENAME_PATTERN.test(filename);
    const isIteration = filename && CANVAS_ITERATION_FILENAME_PATTERN.test(filename);

    if (!filename || (!isBase && !isIteration)) {
      return c.json({ error: 'Invalid filename' }, 400);
    }

    const filePath = path.join(CANVAS_COMPONENTS_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (isBase) {
      const baseName = filename.replace('.tsx', '');
      const iterFiles = scanIterationFiles().filter(f => f.startsWith(`${baseName}.iteration-`));
      for (const f of iterFiles) {
        const iterPath = path.join(CANVAS_COMPONENTS_DIR, f);
        if (fs.existsSync(iterPath)) fs.unlinkSync(iterPath);
      }
    }

    regenerateIndex();
    return c.json({ success: true });
  });

  return app;
}
