Stack: TypeScript (prompt template string). Key file: prompts/discovery.prompt.ts.

TASK: Make the discovery SCAN classify everything as `"component"` and stop surfacing `page.tsx` route files. Pages are being removed for now (reintroduced later), so no entry should ever get `type: "page"` or a `route` field.

NOTE: This supersedes the original cleanup plan's carve-out that said "leave discovery.prompt.ts untouched" — the user has explicitly lifted it for the pages removal.

DESIGN DECISION baked in here: `page.tsx` files are SKIPPED (not discovered), not reclassified as components. Rationale: the analyze prompt's page-import safety reasoning (server-only code detection) was just deleted in chunk 05, so blindly importing a full-route `page.tsx` as a component is unsafe. Skip them until pages return.

DETAILS — prompts/discovery.prompt.ts:
1. In the INCLUDE list: DELETE the bullet `- Per-route convention: every \`page.tsx\` … → type \`"page"\`.`
2. In the SKIP list: ADD a bullet: `- Route entry files (\`page.tsx\`) — pages are out of scope for now; they will be reintroduced later.`
3. The `App.tsx` INCLUDE bullet: change `→ type \`"component"\` (no route)` to `→ type \`"component"\``.
4. Step 3 `name` bullet: remove the "Pages: mechanical from the route (…)" clause; keep only the Components naming guidance.
5. Step 3 `type` bullet: change to `- \`type\`: always \`"component"\`.`
6. Step 3: DELETE the entire `- \`route\`: pages only …` bullet.
7. Step 4 sanity-check line: remove `pages have \`route\`, components do not;` and change `\`type\` is \`"page"|"component"\`` → `\`type\` is \`"component"\``.
8. Output JSON example: DELETE the first entry (the `"id": "home" … "type": "page", "route": "/"` line). Keep only the component example entry.

CONSTRAINTS:
- Do NOT touch the `POST /api/discover` scan handler in server/routes/discover.ts (only the prompt text here).
- Keep everything else (candidate discovery, childComponents, preserveClause) intact.

VERIFY:
- `grep -n "page\.tsx\|\"page\"\|route" prompts/discovery.prompt.ts` shows only the new SKIP bullet mentioning `page.tsx` — no `type "page"`, no `route` field.
