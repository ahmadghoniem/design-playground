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
        const pathname = url.split('?')[0];

        // 1. API requests → the embedded Hono app.
        if (pathname === '/playground/api' || pathname.startsWith('/playground/api/')) {
          handle(req, res);
          return;
        }

        // 2. Clean-URL entry. Serve the `playground.html` MPA entry for
        //    `/playground` and any client-routed deep link beneath it (e.g.
        //    `/playground/iterations/:slug`), so the playground is reachable at
        //    `/playground` with no `.html` suffix. This is an INTERNAL rewrite —
        //    the browser URL stays clean; Vite reads + transforms the HTML.
        //    NB: the host's react-router `basename` must be `/playground` to
        //    match (the only host-side change this requires).
        const method = req.method ?? 'GET';
        const isDocumentRequest = method === 'GET' || method === 'HEAD';
        if (
          isDocumentRequest &&
          (pathname === '/playground' || pathname.startsWith('/playground/'))
        ) {
          req.url = '/playground.html' + url.slice(pathname.length);
        }

        next();
      });
    },
  };
}
