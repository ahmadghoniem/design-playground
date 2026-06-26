#!/usr/bin/env node
/**
 * link.mjs — TRUE live-link of the design-playground repo into one or more host
 * apps via directory junctions (Windows) / symlinks (POSIX). Edit the repo, hit
 * save, the host dev server HMRs it — no file-copy step, no ~100ms delay.
 *
 * Run from inside the design-playground repo:
 *   node link.mjs ../Rewynd               # link
 *   node link.mjs ../Rewynd ../OtherApp   # link several hosts
 *   node link.mjs --unlink ../Rewynd      # remove the link (repo untouched)
 *   node link.mjs --status ../Rewynd      # report what's currently linked
 *
 * ── Why a naive whole-folder symlink failed, and why this works ───────────────
 * Node and Vite resolve modules from a file's REAL path, not the symlink
 * location (this is `preserveSymlinks: false`, the default — and it MUST stay
 * default, or the host's own pnpm/npm resolution breaks). The playground keeps
 * its own deps nested in `node_modules/` (resolved from the real repo path —
 * fine), but its peerDependencies — react, react-dom, tailwindcss, vite — are
 * intentionally NOT nested. In the file-copy model they resolve UP the host
 * tree to the host's single copy. Through a bare folder symlink the "up" walk
 * climbs the REPO's tree instead, so the peer deps simply vanish (the original
 * "Can't resolve 'tailwindcss'" failure).
 *
 * The fix is one level deep: inject those peer deps into the repo's OWN
 * `node_modules/` as junctions pointing at the host's copies. Now every
 * consumer — including deeply-nested transitive deps that declare react as a
 * peer — resolves UP to `node_modules/<peer>` and lands on the host's single
 * copy. That preserves the React singleton (no "invalid hook call"), needs no
 * `preserveSymlinks`, and therefore leaves the host's pnpm resolution alone.
 * It does NOT "fail to scale": N transitive consumers still share the same 4
 * junctions at one node_modules level.
 *
 * ── The one required host-side change (besides designPlaygroundPlugin) ───────
 * Vite's `server.fs.allow` must include the design-playground repo path,
 * because the mount's real path lives outside the host root. This script
 * detects whether that's wired and prints the exact snippet if not.
 */

import {
  existsSync,
  lstatSync,
  symlinkSync,
  rmSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from 'fs';
import { join, resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = __dirname;
const IS_WIN = process.platform === 'win32';
const LINK_TYPE = IS_WIN ? 'junction' : 'dir';

// peerDependencies are the deps NOT nested in our node_modules — exactly the
// set that has to be borrowed from the host through the link.
const PEER_DEPS = Object.keys(
  JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).peerDependencies ?? {}
);

// ── CLI parsing ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const mode = args.includes('--unlink')
  ? 'unlink'
  : args.includes('--status')
    ? 'status'
    : 'link';
const hostRoots = args.filter((a) => !a.startsWith('--')).map((p) => resolve(p));

if (hostRoots.length === 0) {
  console.error('Usage: node link.mjs [--unlink|--status] <host-root> [<host-root> ...]');
  console.error('  e.g. node link.mjs ../Rewynd');
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isLink(p) {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/** Remove a path. A junction/symlink is unlinked WITHOUT touching its target
 *  (verified: rmSync on a junction leaves the referent intact). A real dir is
 *  deleted outright — that's the stale snapshot copy we're replacing. */
function removePath(p) {
  if (!existsSync(p) && !isLink(p)) return;
  rmSync(p, { recursive: true, force: true });
}

function makeLink(target, linkPath) {
  mkdirSync(dirname(linkPath), { recursive: true });
  removePath(linkPath);
  symlinkSync(target, linkPath, LINK_TYPE);
}

/** Where the host mounts the playground. */
function mountDir(hostRoot) {
  const candidates = [
    join(hostRoot, 'src', 'app', 'playground'),
    join(hostRoot, 'app', 'playground'),
  ];
  return candidates.find((c) => existsSync(c)) ?? candidates[0];
}

/** Best-effort check that vite.config wires server.fs.allow for the repo. */
function fsAllowHint(hostRoot) {
  const cfg = ['vite.config.ts', 'vite.config.js', 'vite.config.mts']
    .map((f) => join(hostRoot, f))
    .find((f) => existsSync(f));
  if (!cfg) return null;
  const src = readFileSync(cfg, 'utf8');
  if (src.includes('fs:') && src.includes('allow')) return null; // looks wired
  return cfg;
}

// ── Status ────────────────────────────────────────────────────────────────────
function reportStatus(hostRoot) {
  const mount = mountDir(hostRoot);
  const linked = isLink(mount);
  console.log(`\n[${hostRoot.split(/[\\/]/).at(-1)}]`);
  console.log(`  mount       ${mount}`);
  console.log(`  state       ${linked ? 'LINKED (junction → repo)' : existsSync(mount) ? 'real dir (copy/snapshot)' : 'absent'}`);
  for (const dep of PEER_DEPS) {
    const p = join(REPO, 'node_modules', dep);
    console.log(`  peer ${dep.padEnd(12)} ${isLink(p) ? 'linked → host' : existsSync(p) ? 'PRESENT (unexpected — should be a link)' : 'absent'}`);
  }
}

// ── Link ──────────────────────────────────────────────────────────────────────
function link(hostRoot) {
  const hostName = hostRoot.split(/[\\/]/).at(-1);
  const hostModules = join(hostRoot, 'node_modules');
  if (!existsSync(hostModules)) {
    console.error(`[link] ${hostName}: no node_modules — install the host's deps first.`);
    process.exit(1);
  }

  // 1. Mount the repo into the host as a junction (replaces any snapshot copy).
  const mount = mountDir(hostRoot);
  if (isLink(mount)) {
    console.log(`[link] ${hostName}: mount already a junction, refreshing`);
  } else if (existsSync(mount)) {
    console.log(`[link] ${hostName}: replacing snapshot copy with a junction`);
  }
  makeLink(REPO, mount);
  console.log(`[link] ${hostName}: ${relative(hostRoot, mount)} → repo`);

  // 2. Inject the host's peer deps into the repo's own node_modules so every
  //    consumer resolves them up to the host's single copy.
  for (const dep of PEER_DEPS) {
    const target = join(hostModules, dep);
    if (!existsSync(target)) {
      console.error(`[link] ${hostName}: host is missing peer dep '${dep}' (${target}). Skipping.`);
      continue;
    }
    makeLink(target, join(REPO, 'node_modules', dep));
    console.log(`[link] ${hostName}: node_modules/${dep} → host`);
  }

  // 3. Remind about the one host-side requirement.
  const cfg = fsAllowHint(hostRoot);
  if (cfg) {
    console.log(`\n[link] ${hostName}: add server.fs.allow to ${relative(hostRoot, cfg)} so Vite may serve the repo (its real path is outside the host root):\n`);
    console.log(`        server: {`);
    console.log(`          fs: { allow: ['.', ${JSON.stringify(REPO)}] },`);
    console.log(`        },`);
    console.log(`\n        (Do NOT set resolve.preserveSymlinks — it breaks pnpm hosts.)`);
  }
}

// ── Unlink ────────────────────────────────────────────────────────────────────
function unlink(hostRoot) {
  const hostName = hostRoot.split(/[\\/]/).at(-1);

  // Remove the peer-dep junctions from the repo's node_modules.
  for (const dep of PEER_DEPS) {
    const p = join(REPO, 'node_modules', dep);
    if (isLink(p)) {
      removePath(p);
      console.log(`[unlink] node_modules/${dep} link removed`);
    }
  }

  // Replace the mount junction with an empty real dir so the host's gitignored
  // path still exists (re-run watch.mjs or link.mjs to repopulate).
  const mount = mountDir(hostRoot);
  if (isLink(mount)) {
    removePath(mount);
    mkdirSync(mount, { recursive: true });
    console.log(`[unlink] ${hostName}: mount junction removed (empty dir left at ${relative(hostRoot, mount)})`);
  } else {
    console.log(`[unlink] ${hostName}: mount was not a junction — left as-is`);
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────
for (const root of hostRoots) {
  if (mode === 'status') reportStatus(root);
  else if (mode === 'unlink') unlink(root);
  else link(root);
}

if (mode === 'link') {
  console.log(`\n[link] done. Start the host dev server and open /playground. Edits in`);
  console.log(`       ${REPO} now HMR live — no watcher needed.`);
}
