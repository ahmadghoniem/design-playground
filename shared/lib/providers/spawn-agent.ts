import { spawn, type ChildProcess } from 'child_process';
import type { ProviderId, AgentSpawnOptions } from './types';
import { getProvider } from './registry';

/**
 * Spawn an agent process for the given provider.
 *
 * This is a thin wrapper — it only handles provider-specific argument construction.
 * Process lifecycle management (lockfiles, log streams, event emitters) is the
 * caller's responsibility, since it varies by route.
 */
/** Mask a secret-ish value for logging: keep first/last 2 chars, redact the rest. */
function maskSecret(v: string | undefined): string {
  if (!v) return '(empty)';
  if (v.length <= 6) return '***';
  return `${v.slice(0, 2)}…${v.slice(-2)} (len ${v.length})`;
}

export function spawnAgent(
  providerId: ProviderId,
  opts: AgentSpawnOptions,
  cwd: string,
): ChildProcess {
  const config = getProvider(providerId);
  const args = config.buildAgentArgs(opts);

  if (process.env.NODE_ENV !== 'production') {
    // Diagnostics: what binary/args we run and which auth-relevant env the
    // child inherits (values masked). Helps distinguish an env/auth misroute
    // from a genuine account-side rate limit.
    const authKeys = Object.keys(process.env)
      .filter((k) => /^(ANTHROPIC_|CLAUDE|HTTP_PROXY|HTTPS_PROXY|NO_PROXY)/i.test(k))
      .sort();
    const authEnv = authKeys.length
      ? authKeys.map((k) => `${k}=${/TOKEN|KEY|SECRET/i.test(k) ? maskSecret(process.env[k]) : process.env[k]}`).join(', ')
      : '(none)';
    console.log(`[Playground][spawn-agent] ${config.binary} ${args.join(' ')}`);
    console.log(`[Playground][spawn-agent] auth env → ${authEnv}`);
  }

  return spawn(config.binary, args, {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });
}

/** Get the user-facing error message for when a provider CLI is not found (ENOENT). */
export function getProviderNotFoundMessage(providerId: ProviderId): string {
  return getProvider(providerId).notFoundMessage;
}

/** Get the human-readable display name for a provider (e.g. "Claude Code"). */
export function getProviderDisplayName(providerId: ProviderId): string {
  return getProvider(providerId).displayName;
}
