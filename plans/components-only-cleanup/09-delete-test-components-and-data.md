Stack: TypeScript + React 18 (Vite host). Key files: registry.tsx, the data/ directory, lib/props-fetchers.server.ts.

TASK: Delete the 22 pre-registered test components ENTIRELY — they were only fixtures for testing. (Per the user: do NOT migrate their mock data inline; just remove them.) The registry starts empty; real components are added later via the discovery "Add" flow (chunk 10). This replaces the original plan's "inline the mock data into registry.tsx" idea.

DETAILS — registry.tsx:
1. In the group `id: "pages"` → `children: [ … ]` array (line ~127), DELETE all 22 component entries, leaving `children: []`.
2. Delete the 22 mock-data import lines: every `import { mockData as … } from "./data/…"`.
3. Delete the 22 component import lines that those entries referenced (the fixture component imports).
4. Update the comment near the top of that group (the one describing the old `data/<ComponentName>.mockData.ts` convention and "run discovery → analyze…") to describe the new shape: props live inline on each entry, added by the discovery Add flow — no `data/` files.

DETAILS — delete directory:
- Delete the entire `data/` directory (all 22 `*.mockData.ts` files).

DETAILS — lib/props-fetchers.server.ts:
- Remove any `propsFetchers` entries keyed to the deleted fixture components (if present), and any imports that become unused. Leave the map and file valid (an empty or near-empty `propsFetchers` object is fine).

CONSTRAINTS:
- Keep the registry types/structure intact (`RegistryGroup`, `RegistryItem`, the `id: "pages"` group container with now-empty `children`).
- Do NOT touch the design-system showcase or any non-fixture registry machinery.
- The sidebar already has an empty-registry state ("Add components") — an empty registry is expected and handled.

NOTE: Prerequisite for chunk 10 — the instant-Add prompt rewrite assumes inline props and no `data/` mock-data files already exist.

OPTIONAL (nice-to-have, not required): the registry group is still keyed `id: "pages"` though it now holds only components. Renaming it to `"components"` would ripple through `flattenLeaves`/sidebar and is left as a separate follow-up — do NOT rename it here.

VERIFY:
- The `data/` directory no longer exists.
- `grep -n "./data/" registry.tsx` returns NOTHING.
- registry.tsx compiles; the `pages` group has `children: []`.
- Real typecheck from the host passes: `npx tsc -p tsconfig.app.json --noEmit`.
