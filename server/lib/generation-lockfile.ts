import fs from 'fs';
import path from 'path';
import { TEMP_DIR_RELATIVE, GENERATION_LOCKFILE_FILENAME } from '../../lib/constants';

/**
 * Lockfile-based generation process recovery (survives HMR / host restarts).
 *
 * A single generation lockfile records the PID of the running agent process.
 * On module load, `reclaimOrphan()` should be called once to kill/clean up
 * any stale lock left behind by a previous process that died without
 * releasing it (e.g. the dev server was killed mid-generation).
 */

const TEMP_DIR = path.join(process.cwd(), TEMP_DIR_RELATIVE);
const LOCKFILE_PATH = path.join(TEMP_DIR, GENERATION_LOCKFILE_FILENAME);

interface LockfileData {
  pid: number;
  componentId: string;
  startTime: number;
}

export interface LockfileStatus {
  lockfilePresent: boolean;
  lockPid: number | null;
  lockPidAlive: boolean;
}

function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function writeLockfile(pid: number, componentId: string): void {
  ensureTempDir();
  const data: LockfileData = { pid, componentId, startTime: Date.now() };
  fs.writeFileSync(LOCKFILE_PATH, JSON.stringify(data), 'utf-8');
}

export function removeLockfile(): void {
  try {
    if (fs.existsSync(LOCKFILE_PATH)) {
      fs.unlinkSync(LOCKFILE_PATH);
    }
  } catch {
    // ignore
  }
}

export function getLockfileStatus(): LockfileStatus {
  if (!fs.existsSync(LOCKFILE_PATH)) {
    return {
      lockfilePresent: false,
      lockPid: null,
      lockPidAlive: false,
    };
  }

  try {
    const raw = fs.readFileSync(LOCKFILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<LockfileData>;
    const pid = typeof parsed.pid === 'number' && Number.isFinite(parsed.pid) ? parsed.pid : null;
    const alive = pid !== null ? isPidAlive(pid) : false;
    return {
      lockfilePresent: true,
      lockPid: pid,
      lockPidAlive: alive,
    };
  } catch {
    return {
      lockfilePresent: true,
      lockPid: null,
      lockPidAlive: false,
    };
  }
}

/**
 * Kill (or clean up after) an orphaned generation process left behind by a
 * stale lockfile, then remove the lockfile. Intended to run once at module
 * load of the generation route.
 */
export function cleanupOrphanedProcess(): void {
  try {
    if (!fs.existsSync(LOCKFILE_PATH)) return;

    const raw = fs.readFileSync(LOCKFILE_PATH, 'utf-8');
    const data: LockfileData = JSON.parse(raw);

    try {
      process.kill(data.pid, 0);
      console.warn(`[Playground][generate] Killing orphaned generation process PID=${data.pid} (component: ${data.componentId})`);
      process.kill(data.pid, 'SIGTERM');
      setTimeout(() => {
        try { process.kill(data.pid, 'SIGKILL'); } catch { /* already dead */ }
      }, 2000);
    } catch {
      // Process is already dead, just clean up lockfile
    }

    removeLockfile();
  } catch (e) {
    console.error('[Playground][generate] Error cleaning up orphaned process:', e);
    removeLockfile();
  }
}
