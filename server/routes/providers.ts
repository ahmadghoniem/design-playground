import { Hono } from 'hono';
import {
  checkCursorAuth,
  startCursorLogin,
} from '../../lib/providers/cursor-auth';
import { isLocalRequest } from '../../lib/telemetry/server';

export function providersRoutes() {
  const app = new Hono();

  app.get('/api/providers/cursor/auth', async (c) => {
    try {
      const status = await checkCursorAuth();
      const local = isLocalRequest(c.req.raw);
      return c.json({
        success: true,
        cliInstalled: status.cliInstalled,
        authenticated: status.authenticated,
        email: local ? status.email : null,
        ...(status.error ? { error: status.error } : {}),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({
        success: false,
        cliInstalled: false,
        authenticated: false,
        email: null,
        error: message,
      }, 500);
    }
  });

  app.post('/api/providers/cursor/auth', async (c) => {
    if (!isLocalRequest(c.req.raw)) {
      return c.json({
        success: false,
        error: 'Cursor sign-in is only available on localhost.',
      }, 403);
    }

    const result = startCursorLogin();

    if (result.alreadyInProgress) {
      return c.json({ success: true, started: false, alreadyInProgress: true });
    }

    if (!result.started) {
      return c.json({
        success: false,
        error: result.error ?? 'Failed to start Cursor sign-in.',
      }, 500);
    }

    return c.json({ success: true, started: true });
  });

  return app;
}
