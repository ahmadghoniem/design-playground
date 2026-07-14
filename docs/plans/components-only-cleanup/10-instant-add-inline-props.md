Stack: TypeScript + React 18 + Hono + Node. Key files: app/PlaygroundClient.tsx (+ the sidebar component grid), server/routes/discover.ts (`DELETE /api/discover/analyze`), prompts/discovery-analyze.prompt.ts. Depends on chunk 05 (page branch already removed — every entry is a component) and chunk 09 (no more mock-data files).

TASK: Make "Add" feel instant via an OPTIMISTIC SKELETON, without changing who writes registry.tsx. The AI agent stays the sole writer of registry.tsx (as today); the client just shows a placeholder card immediately and swaps it for the real render when the agent finishes and Vite HMR reloads registry.tsx. Props move INLINE into registry.tsx (no mock-data file).

WHY this shape (design decision, locked): registry.tsx uses STATIC imports, so having the SERVER synchronously insert a guessed import would risk breaking the entire registry module (white-screen) on a wrong path. Keeping the AI as the only writer avoids that, avoids export-detection guessing, and avoids registry write races — while a skeleton still feels instant and never renders a broken component. (The rejected server-sync-insert variant is documented in the review at ~/.claude/plans/when-it-comes-to-zazzy-seal.md.)

CLIENT — app/PlaygroundClient.tsx + the sidebar component grid:
1. Add already sets `addingIds` (see `handleAddComponent`). Use that to render a **skeleton/placeholder** card in the pending entry's slot the moment Add is clicked — do NOT block the UI on the POST response.
2. When the analyze POST resolves (the AI has written the registry entry and HMR has reloaded, or is about to), remove the skeleton so the live component render shows. `notifySidebar()` already fires on success — the swap should hang off the same success path / the registry HMR update.
3. Keep the existing loading toast and child-component handling unchanged.

SERVER — server/routes/discover.ts, `POST /api/discover/analyze`:
- UNCHANGED analyze flow. The spawned AI agent remains the sole writer of registry.tsx. No server-side fs insertion, no default-vs-named export regex, no registry write mutex — none are needed under this approach.

PROMPT — prompts/discovery-analyze.prompt.ts (keep this rewrite; it is orthogonal to the skeleton):
- Delete "Step 2: Create the mock data file" entirely.
- Rewrite "Step 3: Add an entry to registry.tsx": the entry's `props:` is a literal inline object (`props: { key: value, … } as Record<string, unknown>`), NOT `props: <camelCaseName>MockData`. Drop the "3a — add the mock data import" sub-step; KEEP "add a static import for the component itself." Fill `propsInterface` inline.
- Update "Rules": add "Do NOT create a `data/` directory or any `*.mockData.ts` file — props are always inline object literals in registry.tsx."

DELETE HANDLER — server/routes/discover.ts, `DELETE /api/discover/analyze`:
- Remove the `data/<Name>.mockData.ts` unlink (chunk 09 deletes `DATA_DIR`; there is no mock file to remove).
- ADD: strip the entry from registry.tsx — remove both the registry entry (matched strictly by the analysis `registryId`/`id`) AND its component import line — then reset the `discovery.json` entry back to `status: 'discovered'` (delete its `analysis`). This is REQUIRED, not optional: today's DELETE leaves the registry entry in place and only deleted the mock file; post-chunk-09 that would leave a dangling entry. Stripping returns the canvas to the exact pre-Add state.

CONSTRAINTS:
- Do not reintroduce a server-side registry insert, export-detection regex, `props: {}` placeholder entry, or write mutex — those belonged to the rejected variant.
- Keep `fetchPropsSnapshot`, child-component promotion, and the `resolve(c.json({ success, entry, childEntries }))` response shape working as today.

VERIFY:
- Add a component with required props: the first frame is a SKELETON (never the error boundary), then the real card appears once the AI writes inline props and HMR applies.
- Add two components in quick succession: both register cleanly (AI is the only writer — no clobbering).
- No `data/` directory or `*.mockData.ts` file is ever created by an Add.
- Remove an added component: registry.tsx returns to pre-Add state (entry + import gone, no dangling `./data/` reference) and the card disappears.
- Real typecheck from the host passes: `npx tsc -p tsconfig.app.json --noEmit`.
