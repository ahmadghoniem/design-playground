#!/usr/bin/env node

/**
 * Playground Setup Script
 *
 * Installs the playground's dependencies NESTED under src/app/playground/node_modules
 * (declared in this folder's own package.json), so the host project's package.json and
 * lockfile are never touched. Uses Bun (`bun install`) and only installs what's missing.
 * Configures the host .gitignore so playground files stay out of git.
 *
 * Requires Bun (https://bun.sh). The nested install reads bunfig.toml in this folder,
 * which disables peerDependency installation so react/react-dom/tailwindcss/vite resolve
 * up to the host's single copy.
 *
 * Usage:
 *   node src/app/playground/setup.mjs
 *   node src/app/playground/setup.mjs --untrack   # stop tracking already-committed playground files
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import {
  ensureHostGitignore,
} from './lib/host-gitignore.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Colors (ANSI) ──────────────────────────────────────────────────────────
const bold  = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red   = (s) => `\x1b[31m${s}\x1b[0m`;
const dim   = (s) => `\x1b[2m${s}\x1b[0m`;
const cyan  = (s) => `\x1b[36m${s}\x1b[0m`;

// ── Find project root ──────────────────────────────────────────────────────
function findProjectRoot(startDir) {
  let dir = startDir;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'package.json'))) return dir;
    dir = dirname(dir);
  }
  return null;
}

function hasBinary(bin) {
  try {
    execSync(`${process.platform === 'win32' ? 'where' : 'which'} ${bin}`, {
      stdio: 'ignore',
      timeout: 1500,
    });
    return true;
  } catch {
    return false;
  }
}

function configureGitignore(hostRoot) {
  const untrack = process.argv.includes('--untrack');

  try {
    const result = ensureHostGitignore(hostRoot, { untrack });
    console.log('');
    console.log(bold('  Git:'));
    console.log(`    ${green('+')} Updated .gitignore (playground + artifacts)`);
    if (result.untracked) {
      console.log(`    ${green('+')} Removed previously tracked playground files from git index`);
    } else if (result.trackedWarning) {
      const relSetup = relative(hostRoot, join(__dirname, 'setup.mjs')).split('\\').join('/');
      console.log(`    ${dim('!')} Some playground files are still tracked by git.`);
      console.log(dim(`      Run: node ${relSetup} --untrack`));
    }
    console.log(dim('  Note: setup makes no changes to your host package.json or lockfile —'));
    console.log(dim('  dependencies install nested under src/app/playground/node_modules/ (gitignored).'));
  } catch (err) {
    console.log('');
    console.log(bold('  Git:'));
    console.log(`    ${red('x')} Could not update .gitignore: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function finishSetup(hostRoot) {
  configureGitignore(hostRoot);
  console.log('');
  console.log(green('  Done! Start your dev server and visit /playground'));
  console.log('');
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log(bold('  Playground Setup'));
  console.log(dim('  ─────────────────────────────────'));

  // 1. The playground folder owns its deps — read THIS folder's package.json.
  //    Dependencies install nested here; the host package.json is never touched.
  const installDir = __dirname;
  const manifestPath = join(installDir, 'package.json');
  if (!existsSync(manifestPath)) {
    console.log(red('  Error: src/app/playground/package.json not found.'));
    console.log(dim('  The playground ships its own package.json so its deps install nested.'));
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const required = Object.keys(manifest.dependencies || {});
  const assumed  = Object.keys(manifest.peerDependencies || {});

  // 2. Find the HOST root (first package.json ABOVE the playground folder).
  //    Used only for prerequisite checks + .gitignore — never written to.
  const hostRoot = findProjectRoot(dirname(installDir));
  if (!hostRoot) {
    console.log(red('  Error: Could not find the host project root above the playground.'));
    process.exit(1);
  }

  // 3. Read the HOST package.json (to confirm prerequisites like react/tailwind).
  const hostPkg = JSON.parse(readFileSync(join(hostRoot, 'package.json'), 'utf-8'));
  const hostDeps = {
    ...hostPkg.dependencies,
    ...hostPkg.devDependencies,
  };

  // 4. Check assumed prerequisites
  console.log('');
  console.log(bold('  Prerequisites:'));
  let prerequisitesMet = true;
  for (const dep of assumed) {
    if (hostDeps[dep]) {
      console.log(`    ${green('+')} ${dep}`);
    } else {
      console.log(`    ${red('x')} ${dep} ${red('(not found — please install it first)')}`);
      prerequisitesMet = false;
    }
  }

  if (!prerequisitesMet) {
    console.log('');
    console.log(red('  Some prerequisites are missing. Install them first, then re-run this script.'));
    process.exit(1);
  }

  // 4b. Check for agent CLI providers (at least one needed for generation)
  console.log('');
  console.log(bold('  Agent CLI Providers:'));

  const providers = [
    { name: 'Cursor', cmd: 'cursor --version', installHint: 'https://cursor.com/docs/cli/installation' },
    { name: 'Claude Code', cmd: 'claude --version', installHint: 'npm install -g @anthropic-ai/claude-code' },
    { name: 'Codex', cmd: 'codex --version', installHint: 'npm install -g @openai/codex — then run `codex login`' },
  ];

  let anyProviderFound = false;
  for (const p of providers) {
    let found = false;
    try {
      execSync(p.cmd, { encoding: 'utf-8', timeout: 5000 });
      found = true;
    } catch {
      // not in PATH or not installed
    }
    if (found) {
      console.log(`    ${green('+')} ${p.name} (found)`);
      anyProviderFound = true;
    } else {
      console.log(`    ${dim('-')} ${p.name} ${dim('(not found)')}`);
    }
  }

  if (!anyProviderFound) {
    console.log('');
    console.log(dim('  At least one agent CLI provider is required for generating variations.'));
    console.log(dim('  Install one of:'));
    for (const p of providers) {
      console.log(dim(`    - ${p.name}: ${p.installHint}`));
    }
    console.log('');
  }

  // 5. Find missing dependencies — check the NESTED node_modules, not host deps.
  const isInstalledNested = (dep) =>
    existsSync(join(installDir, 'node_modules', dep, 'package.json'));
  const missing = required.filter((dep) => !isInstalledNested(dep));

  if (missing.length === 0) {
    console.log('');
    console.log(bold('  Dependencies:'));
    console.log(`    ${green('+')} All ${required.length} packages already installed (nested).`);
    await finishSetup(hostRoot);
    process.exit(0);
  }

  // 6. Install NESTED into the playground folder with Bun. A bare `bun install`
  //    reads this folder's package.json and bunfig.toml; the latter disables
  //    peerDependency installation so react/react-dom/tailwindcss/vite stay out
  //    of the nested tree and resolve up to the host's single copy.
  if (!hasBinary('bun')) {
    console.log('');
    console.log(red('  Error: Bun is required but was not found in PATH.'));
    console.log(dim('  Install it from https://bun.sh, then re-run this script.'));
    process.exit(1);
  }
  const installCmd = 'bun install';
  const relInstall = relative(hostRoot, installDir).split('\\').join('/');

  console.log('');
  console.log(bold('  Dependencies:'));
  for (const dep of required) {
    if (missing.includes(dep)) {
      console.log(`    ${cyan('~')} ${dep} ${dim('(installing)')}`);
    } else {
      console.log(`    ${green('+')} ${dep}`);
    }
  }

  console.log('');
  console.log(dim(`  Running: ${installCmd}  (in ${relInstall}/)`));
  console.log('');

  try {
    execSync(installCmd, { cwd: installDir, stdio: 'inherit' });
  } catch {
    console.log('');
    console.log(red('  Installation failed. Try running manually:'));
    console.log(`    cd ${relInstall} && ${installCmd}`);
    process.exit(1);
  }

  await finishSetup(hostRoot);
}

main();
