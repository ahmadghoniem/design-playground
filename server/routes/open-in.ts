import { Hono } from 'hono';
import path from 'path';

const PROJECT_PATH = process.cwd();
const PROJECT_NAME = path.basename(PROJECT_PATH);

export function openInRoutes() {
  const app = new Hono();

  app.get('/api/open-in', async (c) => {
    return c.json({
      projectName: PROJECT_NAME,
      projectPath: PROJECT_PATH,
      platform: process.platform,
    });
  });

  return app;
}
