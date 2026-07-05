Stack: TypeScript + Hono + Node. Key files: server/routes/discover.ts, prompts/discovery-analyze.prompt.ts. These two edits MUST land together (the prompt's `type` param and its only call site are removed atomically) or an intermediate type error exists.

TASK: Collapse the discovery `type` union from `'page' | 'component'` to `'component'` only, and remove the page-specific branch from the analyze prompt. After this, the analyze flow treats every discovered entry as a standalone component.

DETAILS — server/routes/discover.ts:
1. `DiscoveryEntry` interface: change `type: 'page' | 'component';` → `type: 'component';`
2. The `POST /api/discover/analyze` request-body type: change `type?: 'page' | 'component';` → `type?: 'component';`
3. In the `discoveryAnalyzePrompt({ ... })` call, remove the `type,` argument line. (Leave `type` in the destructure `const { id, name, type, model, parentId } = body;` and in the `analyzeLog(... type=${type} ...)` line — it is still logged; do not create an unused-var error.)
4. Child-entry creation already uses `type: 'component'` — leave it.

DETAILS — prompts/discovery-analyze.prompt.ts:
1. Remove `type: 'page' | 'component';` from the `DiscoveryAnalyzeParams` interface.
2. Remove `type,` from the destructured function params.
3. Delete the entire `const pageInstructions = ` template-literal block (the "This is a page component (`page.tsx`)…" string, through its closing backtick+semicolon).
4. Keep the `const componentInstructions = ` block unchanged.
5. In the returned template, change `${type === 'page' ? pageInstructions : componentInstructions}` → `${componentInstructions}`.
6. Remove the `- **Type**: ${type}` line from the "## Component to register" section.

CONSTRAINTS:
- Do NOT rewrite Step 2 (mock data) or Step 3 (registry entry) here — those are handled by chunk 09 (delete test components) and chunk 10 (instant Add / inline props). This chunk removes ONLY the page/component branching.
- Do not touch the discovery SCAN prompt here (that is chunk 06).

VERIFY:
- `grep -rn "'page'\|pageInstructions\|type === 'page'" server/routes/discover.ts prompts/discovery-analyze.prompt.ts` returns NOTHING.
- Real typecheck from the host passes: `npx tsc -p tsconfig.app.json --noEmit`.
