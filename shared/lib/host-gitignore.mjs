/**
 * Host-project .gitignore management for Design Playground.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { execSync } from 'child_process';
import { PLAYGROUND_CANDIDATE_RELATIVE_DIRS } from './resolve-playground-dir.ts';

export const MARKERS = {
  staticStart: '# BEGIN design-playground',
  staticEnd: '# END design-playground',
};

const TEMP_DIR_RELATIVE = '.playground-temp';

const PLAYGROUND_DIRS = [...PLAYGROUND_CANDIDATE_RELATIVE_DIRS];

/**
 * @param {string} scriptDir - Absolute path to the playground folder (setup.mjs dir)
 * @param {string} root - Host project root
 */
export function getPlaygroundRelPathFromScriptDir(scriptDir, root) {
  return relative(root, scriptDir).split('\\').join('/');
}

/**
 * @returns {string[]}
 */
export function getStaticIgnoreLines() {
  return [
    '# Design Playground — local dev tool; installed via setup.mjs',
    ...PLAYGROUND_DIRS.map((d) => `/${d}/`),
    `/${TEMP_DIR_RELATIVE}/`,
    '/skills-lock.json',
    '/.claude/skills/',
    '/public/untitled-*/',
  ];
}

/**
 * @param {string} root
 * @param {string} markerStart
 * @param {string} markerEnd
 * @param {string[]} innerLines
 */
export function upsertGitignoreBlock(root, markerStart, markerEnd, innerLines) {
  const gitignorePath = join(root, '.gitignore');
  const blockContent = [markerStart, ...innerLines, markerEnd].join('\n');

  let content = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf-8') : '';
  const startIdx = content.indexOf(markerStart);
  const endIdx = content.indexOf(markerEnd);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = content.slice(0, startIdx);
    const after = content.slice(endIdx + markerEnd.length);
    content = `${before}${blockContent}${after}`;
  } else {
    if (content.length > 0 && !content.endsWith('\n')) content += '\n';
    if (content.length > 0) content += '\n';
    content += `${blockContent}\n`;
  }

  content = content.replace(/\n{3,}/g, '\n\n');
  if (!content.endsWith('\n')) content += '\n';
  writeFileSync(gitignorePath, content, 'utf-8');
}

/**
 * @param {string} root
 * @returns {string[]}
 */
function getAllIgnoredPaths(root) {
  return [
    ...PLAYGROUND_DIRS,
    TEMP_DIR_RELATIVE,
    'skills-lock.json',
    '.claude/skills',
  ];
}

/**
 * @param {string} root
 */
export function untrackIgnoredPaths(root) {
  if (!existsSync(join(root, '.git'))) return;
  try {
    execSync('git --version', { stdio: 'ignore' });
  } catch {
    return;
  }

  for (const p of getAllIgnoredPaths(root)) {
    try {
      execSync(`git rm -r --cached --ignore-unmatch -- "${p}"`, {
        cwd: root,
        stdio: 'pipe',
      });
    } catch {
      /* best-effort */
    }
  }
}

/**
 * @param {string} root
 * @returns {boolean}
 */
export function hasTrackedIgnoredPaths(root) {
  if (!existsSync(join(root, '.git'))) return false;
  try {
    execSync('git --version', { stdio: 'ignore' });
  } catch {
    return false;
  }

  for (const p of getAllIgnoredPaths(root)) {
    try {
      const out = execSync(`git ls-files -- "${p}"`, {
        cwd: root,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      if (out.trim().length > 0) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

/**
 * @param {string} root
 * @param {{ untrack?: boolean }} [opts]
 * @returns {{ untracked: boolean, trackedWarning: boolean }}
 */
export function ensureHostGitignore(root, opts = {}) {
  const { untrack = false } = opts;

  upsertGitignoreBlock(
    root,
    MARKERS.staticStart,
    MARKERS.staticEnd,
    getStaticIgnoreLines(),
  );

  if (untrack) {
    untrackIgnoredPaths(root);
    return { untracked: true, trackedWarning: false };
  }

  return {
    untracked: false,
    trackedWarning: hasTrackedIgnoredPaths(root),
  };
}
