/**
 * Host-relative POSIX paths under the playground root for prompts, edit
 * targets, and agent instructions. Callers must not hardcode the root or
 * subdirectory folklore.
 *
 * On the server, the root resolves from disk via resolvePlaygroundDirRelative.
 * In the browser, call ensurePlaygroundRelativeRoot() once at startup (or
 * setPlaygroundRelativeRoot) so prompts match the host layout.
 */

import { resolvePlaygroundDirRelative } from './resolve-playground-dir';

const DEFAULT_RELATIVE_ROOT = 'src/app/playground';

let relativeRootOverride: string | null = null;

function normalizeRoot(root: string): string {
  return root.replace(/\\/g, '/').replace(/\/+$/, '');
}

/** Set the cached relative root (browser bootstrap). */
export function setPlaygroundRelativeRoot(root: string): void {
  relativeRootOverride = normalizeRoot(root);
}

/** Clear override — mainly for tests. */
export function clearPlaygroundRelativeRoot(): void {
  relativeRootOverride = null;
}

function canResolveFromDisk(): boolean {
  return (
    typeof process !== 'undefined' &&
    typeof process.cwd === 'function' &&
    // Vite client bundles often define process without a real cwd.
    typeof window === 'undefined'
  );
}

/**
 * Playground root relative to the host project (e.g. `src/app/playground`).
 */
export function relativeRoot(): string {
  if (relativeRootOverride) return relativeRootOverride;
  if (canResolveFromDisk()) {
    try {
      return normalizeRoot(resolvePlaygroundDirRelative());
    } catch {
      /* fall through */
    }
  }
  return DEFAULT_RELATIVE_ROOT;
}

/**
 * Fetch and cache the relative root from the playground API.
 * Safe to call multiple times; no-ops when already set from a successful fetch.
 */
export async function ensurePlaygroundRelativeRoot(): Promise<string> {
  if (relativeRootOverride) return relativeRootOverride;
  try {
    const res = await fetch('/playground/api/playground-root');
    if (res.ok) {
      const data = (await res.json()) as { relativeRoot?: string };
      if (typeof data.relativeRoot === 'string' && data.relativeRoot.length > 0) {
        setPlaygroundRelativeRoot(data.relativeRoot);
        return relativeRootOverride!;
      }
    }
  } catch {
    /* keep default until next attempt */
  }
  return relativeRoot();
}

/** Join segments under the playground root (POSIX). */
export function playgroundJoin(...parts: string[]): string {
  const cleaned = parts
    .flatMap((p) => p.split('/'))
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && p !== '.');
  return [relativeRoot(), ...cleaned].join('/');
}

export function iterationsFile(name: string): string {
  return playgroundJoin('iterations', name);
}

export function iterationsIndex(): string {
  return playgroundJoin('iterations', 'index.ts');
}

export function iterationsTree(): string {
  return playgroundJoin('iterations', 'tree.json');
}

export function iterationsGuide(): string {
  return playgroundJoin('features', 'generation', 'prompts', 'iterations-guide.mdc');
}
