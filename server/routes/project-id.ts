import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { Hono } from 'hono';

/**
 * Stable id for the project this dev server runs in. localStorage is scoped by
 * origin (http://localhost:<port>), so two projects that reuse a port would
 * otherwise share canvas state; this id keeps each project's canvas separate.
 */
export function projectIdRoutes() {
  const app = new Hono();

  app.get('/api/project-id', (c) => {
    const cwd = process.cwd();
    const projectId = `${basename(cwd)}-${createHash('sha1').update(cwd).digest('hex').slice(0, 8)}`;
    return c.json({ projectId });
  });

  return app;
}
