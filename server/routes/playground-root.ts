import { Hono } from 'hono';
import { resolvePlaygroundDirRelative } from '../../shared/lib/resolve-playground-dir';

/**
 * Relative playground root for the host layout (`src/app/playground` or
 * `app/playground`). The browser caches this so prompts/edit paths match disk
 * without a generate-route string rewrite.
 */
export function playgroundRootRoutes() {
  const app = new Hono();

  app.get('/api/playground-root', (c) => {
    return c.json({ relativeRoot: resolvePlaygroundDirRelative() });
  });

  return app;
}
