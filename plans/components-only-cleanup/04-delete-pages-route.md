Stack: TypeScript + Hono (server mounted into Vite host). Key files: server/routes/pages.ts, server/index.ts.

TASK: Delete the `/api/pages` route entirely. It is the "delete a registered page" affordance — it removes a page's entry from registry.tsx AND physically deletes the host `src/app/<slug>/` directory. Pages are being removed from the playground, so this route has no remaining caller after chunk 08.

DETAILS — delete file:
- server/routes/pages.ts (delete the whole file).

DETAILS — server/index.ts:
1. Remove the import line: `import { pagesRoutes } from './routes/pages';`
2. Remove the mount line: `router.route('/', pagesRoutes());`

CONSTRAINTS:
- Do NOT touch any other route import or mount (htmlPagesRoutes, oncanvasComponentsRoutes, discoverRoutes, etc. all stay — they are different features).
- Do not touch registry.tsx here.

VERIFY:
- `grep -rn "pagesRoutes\|routes/pages\|'/api/pages'\|\"/api/pages\"" server/` returns NOTHING.
- The file server/routes/pages.ts no longer exists.
- Server still boots (`bun dev` in the host, GET /playground → 200).
