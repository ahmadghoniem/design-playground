/**
 * Host-relative POSIX paths under the playground root for prompts, edit
 * targets, and agent instructions. Callers must not hardcode the root or
 * subdirectory folklore.
 *
 * Resolution order (Vite-only product):
 *   1. Explicit override (`setPlaygroundRelativeRoot`) — tests
 *   2. Vite-injected `__PG_RELATIVE_ROOT__` (plugin `define` from disk)
 *   3. Server-side `resolvePlaygroundDirRelative()` when `process.cwd` is real
 *   4. Default `src/app/playground`
 */

import { resolvePlaygroundDirRelative } from './resolve-playground-dir';

const DEFAULT_RELATIVE_ROOT = 'src/app/playground';

/** Injected by `designPlaygroundPlugin` via Vite `define`. */
declare const __PG_RELATIVE_ROOT__: string | undefined;

let relativeRootOverride: string | null = null;

function normalizeRoot(root: string): string {
  return root.replace(/\\/g, '/').replace(/\/+$/, '');
}

function injectedRoot(): string | null {
  try {
    if (typeof __PG_RELATIVE_ROOT__ === 'string' && __PG_RELATIVE_ROOT__.length > 0) {
      return normalizeRoot(__PG_RELATIVE_ROOT__);
    }
  } catch {
    /* not defined in this environment */
  }
  return null;
}

/** Set the cached relative root (tests / rare manual bootstrap). */
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
    typeof window === 'undefined'
  );
}

export function relativeRoot(): string {
  if (relativeRootOverride) return relativeRootOverride;
  const injected = injectedRoot();
  if (injected) return injected;
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
 * Cache the Vite-injected (or disk) root for the session. Synchronous — call
 * once at client boot. No HTTP; the product always runs under Vite.
 */
export function hydratePlaygroundRelativeRoot(): string {
  if (relativeRootOverride) return relativeRootOverride;
  const root = relativeRoot();
  relativeRootOverride = root;
  return root;
}

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
