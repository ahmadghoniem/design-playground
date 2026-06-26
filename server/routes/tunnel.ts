import { Hono } from 'hono';
import { spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { captureFromRequest } from '../../lib/telemetry/server';
import { readJson } from '../lib/hono-helpers';

// ---------------------------------------------------------------------------
// tunnel/config — rendezvous file check (separate from the SSH tunnel below)
// ---------------------------------------------------------------------------

type ConfigSource = 'agent' | 'env' | 'none';

const RENDEZVOUS_FILE = path.join(os.tmpdir(), 'playground-app-tunnel.json');

interface Rendezvous {
  agent: 'playground-app';
  pid: number;
  port: number;
  url: string;
}

function readRendezvous(): Rendezvous | null {
  try {
    const raw = fs.readFileSync(RENDEZVOUS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Rendezvous>;
    if (
      parsed.agent !== 'playground-app' ||
      typeof parsed.pid !== 'number' ||
      typeof parsed.port !== 'number' ||
      typeof parsed.url !== 'string'
    ) {
      return null;
    }
    try {
      process.kill(parsed.pid, 0);
    } catch {
      return null;
    }
    return parsed as Rendezvous;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// tunnel — SSH tunnel via localhost.run
// ---------------------------------------------------------------------------

const PID_FILE = path.join(os.tmpdir(), 'aiverse-tunnel.pid');
const URL_FILE = path.join(os.tmpdir(), 'aiverse-tunnel.url');
const PORT_FILE = path.join(os.tmpdir(), 'aiverse-tunnel.port');

function readPidFile(): number | null {
  try {
    const raw = fs.readFileSync(PID_FILE, 'utf8').trim();
    const pid = parseInt(raw, 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readUrlFile(): string | null {
  try { return fs.readFileSync(URL_FILE, 'utf8').trim() || null; } catch { return null; }
}

function readPortFile(): number | null {
  try {
    const raw = fs.readFileSync(PORT_FILE, 'utf8').trim();
    const p = parseInt(raw, 10);
    return isNaN(p) ? null : p;
  } catch { return null; }
}

function writePidFiles(pid: number, url: string, port: number) {
  fs.writeFileSync(PID_FILE, String(pid), 'utf8');
  fs.writeFileSync(URL_FILE, url, 'utf8');
  fs.writeFileSync(PORT_FILE, String(port), 'utf8');
}

function clearPidFiles() {
  for (const f of [PID_FILE, URL_FILE, PORT_FILE]) {
    try { fs.unlinkSync(f); } catch { /* already gone */ }
  }
}

function killOrphan() {
  const pid = readPidFile();
  if (pid && isProcessAlive(pid)) {
    try { process.kill(pid, 'SIGTERM'); } catch { /* already dead */ }
  }
  clearPidFiles();
}

let tunnelProcess: ChildProcess | null = null;
let tunnelUrl: string | null = null;
let tunnelPort: number | null = null;

(function recoverOnModuleLoad() {
  const pid = readPidFile();
  if (pid && isProcessAlive(pid)) {
    tunnelUrl = readUrlFile();
    tunnelPort = readPortFile();
  } else {
    clearPidFiles();
  }
})();

function registerShutdownOnce() {
  const handler = () => {
    killOrphan();
    if (tunnelProcess && !tunnelProcess.killed) tunnelProcess.kill('SIGTERM');
    process.exit(0);
  };
  process.once('SIGTERM', handler);
  process.once('SIGINT', handler);
}
registerShutdownOnce();

function tunnelDelete() {
  killOrphan();
  if (tunnelProcess && !tunnelProcess.killed) {
    tunnelProcess.kill('SIGTERM');
  }
  tunnelProcess = null;
  tunnelUrl = null;
  tunnelPort = null;
}

export function tunnelRoutes() {
  const app = new Hono();

  // tunnel/config
  app.get('/api/tunnel/config', async (c) => {
    if (readRendezvous()) {
      return c.json({ hasToken: true, source: 'agent' satisfies ConfigSource });
    }
    if (process.env.NGROK_AUTHTOKEN) {
      return c.json({ hasToken: true, source: 'env' satisfies ConfigSource });
    }
    return c.json({ hasToken: false, source: 'none' satisfies ConfigSource });
  });

  // tunnel
  app.get('/api/tunnel', async (c) => {
    const pid = readPidFile();
    if (pid && !isProcessAlive(pid)) {
      clearPidFiles();
      tunnelProcess = null;
      tunnelUrl = null;
      tunnelPort = null;
    }
    return c.json({ url: tunnelUrl, port: tunnelPort });
  });

  app.post('/api/tunnel', async (c) => {
    const body = (await readJson<{ port: number }>(c)) ?? ({} as { port: number });
    const { port } = body;

    const alivePid = readPidFile();
    if (tunnelUrl && tunnelPort === port && alivePid && isProcessAlive(alivePid)) {
      return c.json({ url: tunnelUrl, port });
    }

    killOrphan();
    if (tunnelProcess && !tunnelProcess.killed) {
      tunnelProcess.kill('SIGTERM');
    }
    tunnelProcess = null;
    tunnelUrl = null;
    tunnelPort = null;

    const proc = spawn('ssh', [
      '-tt',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=60',
      '-R', `80:localhost:${port}`,
      'nokey@localhost.run',
    ]);

    tunnelProcess = proc;
    tunnelPort = port;

    // Bridge the callback/event-driven SSH startup into a single awaited Response.
    return await new Promise<Response>((resolve) => {
      let resolved = false;

      const onData = (chunk: Buffer) => {
        const text = chunk.toString();
        const match = text.match(/(https:\/\/[a-zA-Z0-9-]+\.lhr\.life)/);
        if (match && !resolved) {
          resolved = true;
          tunnelUrl = match[1];
          if (proc.pid) writePidFiles(proc.pid, tunnelUrl, port);
          captureFromRequest(c.req.raw, 'feature_used', { feature: 'tunnel_started' });
          resolve(c.json({ url: tunnelUrl, port }));
        }
      };

      proc.stdout?.on('data', onData);
      proc.stderr?.on('data', onData);

      proc.on('close', () => {
        tunnelProcess = null;
        tunnelUrl = null;
        tunnelPort = null;
        clearPidFiles();
      });

      proc.on('error', (err) => {
        tunnelProcess = null;
        tunnelUrl = null;
        tunnelPort = null;
        clearPidFiles();
        if (!resolved) {
          resolved = true;
          resolve(c.json({ error: `Failed to start tunnel: ${err.message}` }, 500));
        }
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(c.json({ error: 'Tunnel connection timed out (15 s)' }, 504));
        }
      }, 15_000);
    });
  });

  app.delete('/api/tunnel', async (c) => {
    tunnelDelete();
    return c.json({ ok: true });
  });

  // tunnel/beacon — proxies to the same DELETE logic (sendBeacon only supports POST)
  app.post('/api/tunnel/beacon', async (c) => {
    tunnelDelete();
    return c.json({ ok: true });
  });

  return app;
}
