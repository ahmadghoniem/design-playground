import { Hono } from 'hono';
import { MODELS_CACHE_TTL_MS, type ModelOption } from '../../lib/constants';
import type { ProviderId } from '../../lib/providers';
import { getProvider } from '../../lib/providers';

const modelCache = new Map<ProviderId, { models: ModelOption[]; timestamp: number }>();

export function modelsRoutes() {
  const app = new Hono();

  app.get('/api/models', async (c) => {
    const providerId = (c.req.query('provider') || 'claude-code') as ProviderId;
    const config = getProvider(providerId);
    const modelListArgs = config.buildModelListArgs();

    // Claude Code has no CLI model listing — serve static catalog directly.
    if (!modelListArgs) {
      return c.json({
        success: true,
        models: config.fallbackModels,
        source: 'static',
      });
    }

    const now = Date.now();
    const cached = modelCache.get(providerId);
    if (cached && now - cached.timestamp < MODELS_CACHE_TTL_MS) {
      return c.json({
        success: true,
        models: cached.models,
        source: 'cache',
      });
    }

    try {
      const models = await new Promise<ModelOption[]>((resolve, reject) => {
        const { execFile } = require('child_process') as typeof import('child_process');
        execFile(config.binary, modelListArgs, { timeout: 15000 }, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(
              error.message.includes('ENOENT')
                ? config.notFoundMessage
                : `${config.binary} ${modelListArgs.join(' ')} failed: ${stderr || error.message}`
            ));
            return;
          }
          const parsed = config.parseModelOutput!(String(stdout));
          if (parsed.length <= 1) {
            reject(new Error(`No models parsed from ${config.binary} output`));
            return;
          }
          resolve(parsed);
        });
      });

      modelCache.set(providerId, { models, timestamp: Date.now() });
      return c.json({ success: true, models, source: `${providerId}-cli` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[Playground][models] ${config.displayName} CLI fetch failed:`, message);
      return c.json({
        success: true,
        models: config.fallbackModels,
        source: 'fallback',
        warning: message,
      });
    }
  });

  return app;
}
