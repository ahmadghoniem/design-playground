import fs from 'fs';
import path from 'path';

/**
 * Candidate playground locations, in preference order, as POSIX paths relative
 * to the host project root. Shared with PlaygroundPaths.
 */
export const PLAYGROUND_CANDIDATE_RELATIVE_DIRS = [
  'src/app/playground',
  'app/playground',
] as const;

/**
 * Same candidates as platform-specific path segments for fs joins.
 *
 * Computed lazily (not at module top level) so importing this module in a
 * browser bundle never touches `path.join` — Vite externalizes `path`, so a
 * top-level access would throw even though these fns are only called server-side.
 */
function candidateRelativeDirs(): string[] {
  return PLAYGROUND_CANDIDATE_RELATIVE_DIRS.map((d) => path.join(...d.split('/')));
}

/**
 * Files that only exist in a *real* playground install (the app shell), never
 * in a sparse directory that an agent may have created just to drop a single
 * generated artifact. Used to disambiguate when more than one candidate exists.
 */
const APP_SHELL_SENTINELS = ['PlaygroundClient.tsx', 'registry.tsx'];

function hasAppShell(dir: string): boolean {
  return APP_SHELL_SENTINELS.some((f) => fs.existsSync(path.join(dir, f)));
}

/**
 * Resolve the playground directory, handling both `src/app/playground` and
 * `app/playground` Next.js layouts.
 *
 * Prefers the candidate that actually contains the playground app shell (so a
 * sparse, generated-artifacts-only directory never wins over the real one).
 * When both candidates contain the shell, prefers `app/playground` over
 * `src/app/playground` so the non-src layout wins on tie.
 */
export function resolvePlaygroundDir(): string {
  const root = process.cwd();
  const candidates = candidateRelativeDirs().map((d) => path.join(root, d));

  const withShell = candidates.filter((dir) => fs.existsSync(dir) && hasAppShell(dir));
  if (withShell.length === 1) return withShell[0];
  if (withShell.length > 1) {
    const appDir = path.join(root, 'app', 'playground');
    if (withShell.includes(appDir)) return appDir;
    return withShell[0];
  }

  const existing = candidates.filter((dir) => fs.existsSync(dir));
  if (existing.length > 0) return existing[0];

  return candidates[0];
}

/**
 * The resolved playground directory as a POSIX path relative to the host
 * project root (e.g. `"src/app/playground"` or `"app/playground"`).
 *
 * Use this anywhere a path needs to be embedded in a string handed to the
 * coding agent (prompts) or to the browser, so generated files land in the
 * real playground directory regardless of the host layout.
 */
export function resolvePlaygroundDirRelative(): string {
  const rel = path.relative(process.cwd(), resolvePlaygroundDir());
  return rel.split(path.sep).join('/');
}

/**
 * Every candidate playground directory that currently exists on disk, with the
 * resolved (canonical) directory first. Useful for defensive scanning so that
 * files stranded in a sparse directory from a prior buggy run still surface.
 */
export function listPlaygroundDirs(): string[] {
  const root = process.cwd();
  const resolved = resolvePlaygroundDir();
  const existing = candidateRelativeDirs()
    .map((d) => path.join(root, d))
    .filter((dir) => fs.existsSync(dir));
  return [resolved, ...existing.filter((dir) => dir !== resolved)];
}

function resolveAllPlaygroundDirs(): string[] {
  const root = process.cwd();
  return candidateRelativeDirs()
    .map((d) => path.join(root, d))
    .filter((dir) => fs.existsSync(dir));
}

export function resolveIterationsDirs(): string[] {
  return listPlaygroundDirs()
    .map((dir) => path.join(dir, 'iterations'))
    .filter((dir) => fs.existsSync(dir));
}
