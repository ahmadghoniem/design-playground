/**
 * Hono server for the design-playground API.
 *
 * Every route under the old `api/**\/route.ts` tree is mounted here at the same
 * path, with handler bodies ported nearly verbatim — only the request/response
 * plumbing changes (Express req/res -> Hono Context). Hono handlers receive a
 * native Web `Request` via `c.req.raw`, so no compatibility shim is needed for
 * shared `lib/` helpers.
 *
 * Usage:
 *   - Standalone: `bun server/index.ts` listens on PORT (default 4319). Use Bun
 *     (not plain `node`) so tsconfig `paths` (`@pg/*`) resolve at runtime.
 *   - Embedded: `import { createPlaygroundServer } from './server'` and serve
 *     `createPlaygroundServer().fetch`, or mount it into a host dev server (see
 *     server/vite-plugin.ts, which uses `@hono/node-server`'s getRequestListener).
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';

import { designRoutes } from './routes/design';
import { discoverRoutes } from './routes/discover';
import { generateRoutes } from './routes/generate';
import { imagesRoutes } from './routes/images';
import { iterationsRoutes } from './routes/iterations';
import { modelsRoutes } from './routes/models';
import { openInRoutes } from './routes/open-in';
import { playgroundRootRoutes } from './routes/playground-root';
import { projectIdRoutes } from './routes/project-id';
import { skillsRoutes } from './routes/skills';

/**
 * Build the Hono app exposing every ported playground API route. Each route
 * module already registers its handlers at `/api/...`, matching the paths the
 * old Next.js/Express app used, so they mount at the root of this app.
 */
export function createPlaygroundRouter(): Hono {
  const router = new Hono();

  router.route('/', designRoutes());
  router.route('/', discoverRoutes());
  router.route('/', generateRoutes());
  router.route('/', imagesRoutes());
  router.route('/', iterationsRoutes());
  router.route('/', modelsRoutes());
  router.route('/', openInRoutes());
  router.route('/', playgroundRootRoutes());
  router.route('/', projectIdRoutes());
  router.route('/', skillsRoutes());
  return router;
}

/** Lazily-constructed singleton router, exported for direct mounting. */
export const playgroundRouter: Hono = createPlaygroundRouter();

/**
 * Build a standalone Hono app with CORS + a large body limit and the playground
 * router mounted at `/playground`. Routes inside the router are registered at
 * `/api/...`, so the full served path is `/playground/api/...` — the path every
 * client fetch() call in this package already expects. The 50 MB limit
 * accommodates base64-encoded image/screenshot payloads.
 */
export function createPlaygroundServer(): Hono {
  const app = new Hono();
  app.use('*', cors());
  app.use('*', bodyLimit({ maxSize: 50 * 1024 * 1024 }));
  app.route('/playground', playgroundRouter);
  return app;
}

// Standalone entry: only runs when this module is executed directly (`bun server/index.ts`).
// Bun loads this file as ESM, so the CJS `require.main === module` check is always false
// there — `import.meta.main` is the guard that works for the documented standalone path.
const isMain =
  ('main' in import.meta && (import.meta as { main?: boolean }).main === true) ||
  (typeof require !== 'undefined' &&
    typeof module !== 'undefined' &&
    require.main === module);

if (isMain) {
  const port = Number(process.env.PORT) || 4319;
  // Imported lazily so the embedded path (Vite plugin) never needs @hono/node-server's serve().
  void import('@hono/node-server').then(({ serve }) => {
    const app = createPlaygroundServer();
    serve({ fetch: app.fetch, port }, () => {
      console.log(`[design-playground] server listening on http://localhost:${port}`);
    });
  });
}
