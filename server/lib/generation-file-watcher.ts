import fs from 'fs';
import path from 'path';
import {
  HTML_TREE_DIR,
  HTML_TREE_FILENAME,
  CANVAS_ITERATION_FILENAME_PATTERN,
} from '../../lib/constants';
import {
  resolveCanvasComponentsDir,
  resolveIterationsDirs,
} from '../../lib/resolve-playground-dir';
import { syncPublicFrameGitignoreSafe } from '../../lib/sync-host-gitignore';

/**
 * File-watching for progressive iteration detection during generation.
 *
 * Watches the iterations dir(s), the optional HTML page folder + tree.json,
 * and the optional canvas-components JSX file, debouncing bursts of fs
 * events into a single `onChange()` call per ~500ms window.
 */

const fileWatchers: fs.FSWatcher[] = [];
let htmlFileWatcher: fs.FSWatcher | null = null;
let htmlTreeWatcher: fs.FSWatcher | null = null;
let jsxFileWatcher: fs.FSWatcher | null = null;

export function startFileWatcher(
  onChange: () => void,
  onIterationFile?: (filePath: string) => void,
  htmlPageFolder?: string,
  jsxFile?: string,
): void {
  stopFileWatcher();
  let debounceTimer: NodeJS.Timeout | null = null;
  const emitIterationAdded = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onChange();
    }, 500);
  };

  for (const iterationsDir of resolveIterationsDirs()) {
    try {
      const watcher = fs.watch(iterationsDir, (_eventType, filename) => {
        if (filename === 'tree.json' || (filename && filename.endsWith('.tsx'))) {
          if (filename && filename.endsWith('.tsx')) {
            onIterationFile?.(path.join(iterationsDir, filename));
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
        onIterationFile?.(path.join(htmlDir, norm));
        if (htmlDebounceTimer) clearTimeout(htmlDebounceTimer);
        htmlDebounceTimer = setTimeout(() => {
          onChange();
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
          onChange();
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
          onIterationFile?.(path.join(canvasDir, filename));
          if (jsxDebounceTimer) clearTimeout(jsxDebounceTimer);
          jsxDebounceTimer = setTimeout(() => {
            onChange();
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

export function stopFileWatcher(): void {
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
