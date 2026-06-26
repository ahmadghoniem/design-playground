import { Hono } from 'hono';
import { execFile } from 'child_process';
import { MODELS_CACHE_TTL_MS, type ModelOption } from '../../lib/constants';
import type { ProviderId } from '../../lib/providers';
import { getProvider } from '../../lib/providers';
import { filterCursorModelsFromCli } from '../../lib/model-catalog';

const modelCache = new Map<ProviderId, { models: ModelOption[]; timestamp: number }>();
const CACHE_TTL_MS = MODELS_CACHE_TTL_MS;

function fetchModelsFromCLI(binary: string, args: string[], parse: (stdout: string) => ModelOption[]): Promise<ModelOption[]> {
  return new Promise((resolve, reject) => {
    execFile(binary, args, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        const config = getProvider('cursor');
        reject(new Error(
          error.message.includes('ENOENT')
            ? config.notFoundMessage
            : `${binary} ${args.join(' ')} failed: ${stderr || error.message}`
        ));
        return;
      }

      const models = parse(stdout);

      if (models.length <= 1) {
        reject(new Error(`No models parsed from ${binary} ${args.join(' ')} output`));
        return;
      }

      resolve(models);
    });
  });
}

function postProcessModels(providerId: ProviderId, models: ModelOption[]): ModelOption[] {
  if (providerId === 'cursor') {
    return filterCursorModelsFromCli(models);
  }
  return models;
}

export function modelsRoutes() {
  const app = new Hono();

  app.get('/api/models', async (c) => {
    const providerId = c.req.query('provider') || 'cursor';
    const provider = providerId as ProviderId;

    const config = getProvider(provider);
    const modelListArgs = config.buildModelListArgs();

    if (!modelListArgs) {
      return c.json({
        success: true,
        models: config.fallbackModels,
        source: 'static',
      });
    }

    const now = Date.now();
    const cached = modelCache.get(provider);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return c.json({
        success: true,
        models: cached.models,
        source: 'cache',
      });
    }

    try {
      const rawModels = await fetchModelsFromCLI(
        config.binary,
        modelListArgs,
        config.parseModelOutput!,
      );
      const models = postProcessModels(provider, rawModels);

      modelCache.set(provider, { models, timestamp: Date.now() });

      return c.json({
        success: true,
        models,
        source: `${provider}-cli`,
      });
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
