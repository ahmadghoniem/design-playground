import type { Plugin } from 'vite';
import { getRequestListener } from '@hono/node-server';
import { createPlaygroundServer } from './index';

/**
 * Mounts the design-playground Hono app directly into Vite's dev server
 * middleware stack, so the host app doesn't need to run (or proxy to) a
 * second server process.
 *
 * `getRequestListener` adapts the Hono `fetch` handler into a Node
 * `(req, res)` listener that Vite's connect-style middleware stack expects.
 *
 * Usage in vite.config.ts:
 *   import { designPlaygroundPlugin } from 'design-playground/server/vite-plugin';
 *   export default defineConfig({ plugins: [react(), designPlaygroundPlugin()] });
 */
export function designPlaygroundPlugin(): Plugin {
  return {
    name: 'design-playground',
    configureServer(server) {
      // The Hono app is a catch-all that answers (404s) every request, so it
      // must only see paths it actually owns — `/playground/api/*`. Everything
      // else (the host's own pages, the `/playground.html` entry, Vite's module
      // graph) has to fall through to Vite's middleware via next().
      const handle = getRequestListener(createPlaygroundServer().fetch);
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        if (url === '/playground/api' || url.startsWith('/playground/api/')) {
          handle(req, res);
        } else {
          next();
        }
      });
    },
  };
}
