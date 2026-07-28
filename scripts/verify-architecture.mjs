#!/usr/bin/env bun
/**
 * Architecture guardrails for design-playground.
 *
 * 1. dependency-cruiser (feature/shared/server boundaries)
 * 2. knip (unused files/exports) — triage findings; do not auto-delete
 * 3. Print the host typecheck command (peerDeps mean in-package tsc is incomplete)
 *
 * Usage: bun scripts/verify-architecture.mjs
 *        bun scripts/verify-architecture.mjs --skip-knip
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skipKnip = process.argv.includes('--skip-knip');

function run(label, cmd, args) {
  console.log(`\n=== ${label} ===\n`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    console.error(`\n[verify-architecture] ${label} failed (exit ${result.status})`);
    process.exit(result.status ?? 1);
  }
}

// Pin typescript@5.x so path resolution for @pg/ works (plain bunx depcruise is a false pass).
run(
  'dependency-cruiser',
  'bunx',
  [
    '--bun',
    'dependency-cruiser@16',
    '--config',
    '.dependency-cruiser.cjs',
    '--ts-config',
    'tsconfig.json',
    'app/**/*.{ts,tsx}',
    'features/**/*.{ts,tsx}',
    'shared/**/*.{ts,tsx}',
    'server/**/*.{ts,tsx}',
    'registry.tsx',
    'registry-types.ts',
    'dev-entry.tsx',
  ],
);

if (!skipKnip) {
  console.log('\n=== knip (triage — non-fatal) ===\n');
  const knip = spawnSync('bunx', ['knip', '--config', 'knip.json'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  if (knip.status !== 0) {
    console.warn(
      '\n[verify-architecture] knip reported findings — triage before deleting (CSS peers, host @/ imports, and intentional public APIs are often false positives).\n',
    );
  }
}

console.log(`
=== host typecheck (manual) ===

Peer react/vite resolve only inside the host. From the host app (Rewynd), with
"@pg/*": ["./src/app/playground/*"] in tsconfig.app.json paths:

  npx tsc -p tsconfig.app.json --noEmit --listFiles | findstr /i "app\\\\playground"
  npx tsc -p tsconfig.app.json --noEmit 2>&1 | findstr /i playground

Do NOT trust the host's "type-check" npm script if it is a solution-style
tsconfig without --build (it silently checks zero files).

=== verify-architecture OK ===
`);
