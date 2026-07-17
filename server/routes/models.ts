import { Hono } from 'hono';
import { AGENT_MODELS } from '../../shared/lib/agent-config';

export function modelsRoutes() {
  const app = new Hono();

  // Claude Code has no CLI model listing — serve the static catalog directly.
  app.get('/api/models', (c) => {
    return c.json({
      success: true,
      models: AGENT_MODELS,
      source: 'static',
    });
  });

  return app;
}
