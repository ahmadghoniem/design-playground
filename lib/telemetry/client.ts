'use client';

// ============================================================================
// Client-side telemetry helper. Never talks to PostHog — only to the local
// /playground/api/telemetry route, which validates against the schema
// allowlist and forwards server-side. No-ops entirely in production builds
// (NODE_ENV is inlined → dead code).
// ============================================================================

import { TELEMETRY_ROUTE, type TelemetryEventName } from './constants';

let cachedEnabled: boolean | null = null;

/** Fire-and-forget client event (validated + forwarded by the local route). */
export function captureClient(
  name: TelemetryEventName,
  props?: Record<string, unknown>,
): void {
  try {
    if (process.env.NODE_ENV !== 'development') return;
    if (typeof window === 'undefined') return;
    if (cachedEnabled === false) return;
    void fetch(TELEMETRY_ROUTE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // keepalive lets tab-hide/unload flushes (time_summary) complete.
      keepalive: true,
      body: JSON.stringify({ event: name, props: props ?? {} }),
    }).catch(() => {});
  } catch {
    // Telemetry must never break the product.
  }
}

/** Current enabled/debug status from the server (cached per page load). */
export async function fetchTelemetryStatus(): Promise<{
  enabled: boolean;
  debug: boolean;
} | null> {
  try {
    if (process.env.NODE_ENV !== 'development') return null;
    const res = await fetch(TELEMETRY_ROUTE, { method: 'GET' });
    if (!res.ok) return null;
    const data = (await res.json()) as { enabled?: boolean; debug?: boolean };
    cachedEnabled = data.enabled === true;
    return { enabled: data.enabled === true, debug: data.debug === true };
  } catch {
    return null;
  }
}
