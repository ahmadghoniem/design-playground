import { Hono } from 'hono';
import {
  capture,
  getSessionEnrichment,
  getTelemetryStatus,
  isLocalRequest,
  setTelemetryEnabled,
} from '../../lib/telemetry/server';
import {
  CLIENT_ALLOWED_EVENTS,
  runSanitizerSelfTest,
  sanitizeEvent,
} from '../../lib/telemetry/schema';
import { readJson } from '../lib/hono-helpers';

function isDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function telemetryRoutes() {
  const app = new Hono();

  app.post('/api/telemetry', async (c) => {
    if (!isDev()) {
      return c.body(null, 404);
    }
    // Always 204 regardless of drop reason — no oracle for probing the gates.
    try {
      if (!isLocalRequest(c.req.raw)) {
        return c.body(null, 204);
      }

      const body = (await readJson<{ event?: unknown; props?: unknown }>(c)) ?? {};
      if (typeof body.event !== 'string') {
        return c.body(null, 204);
      }

      if (!(CLIENT_ALLOWED_EVENTS as readonly string[]).includes(body.event)) {
        return c.body(null, 204);
      }

      const sanitized = sanitizeEvent(body.event, body.props);
      if (!sanitized) {
        return c.body(null, 204);
      }

      if (sanitized.name === 'error_occurred' && sanitized.props.area !== 'component_render') {
        return c.body(null, 204);
      }

      if (sanitized.name === 'session_started') {
        const enrichment = await getSessionEnrichment();
        capture('session_started', { ...sanitized.props, ...enrichment });
      } else {
        capture(sanitized.name, sanitized.props);
      }
    } catch {
      // Malformed body / aborted request — drop silently.
    }
    return c.body(null, 204);
  });

  app.get('/api/telemetry', async (c) => {
    if (!isDev()) {
      return c.body(null, 404);
    }

    if (c.req.query('action') === 'selftest') {
      const failures = runSanitizerSelfTest();
      return c.json({ pass: failures.length === 0, failures }, failures.length === 0 ? 200 : 500);
    }

    return c.json(getTelemetryStatus());
  });

  app.patch('/api/telemetry', async (c) => {
    if (!isDev()) {
      return c.body(null, 404);
    }
    if (!isLocalRequest(c.req.raw)) {
      return c.body(null, 404);
    }
    try {
      const body = (await readJson<{ enabled?: unknown }>(c)) ?? {};
      if (typeof body.enabled !== 'boolean') {
        return c.json({ error: 'enabled must be boolean' }, 400);
      }
      await setTelemetryEnabled(body.enabled);
      return c.json(getTelemetryStatus());
    } catch {
      return c.json({ error: 'invalid body' }, 400);
    }
  });

  return app;
}
