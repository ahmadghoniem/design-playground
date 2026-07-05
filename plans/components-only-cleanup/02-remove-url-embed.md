Stack: TypeScript + React 18 (Vite host). Key files: hooks/useCanvasPaste.ts, lib/canvas-paste.ts, nodes/ComponentNode.tsx, lib/constants.ts, prompts/shared-sections.ts, hooks/useChatSubmit.ts.

TASK: Remove the URL-embed ("import a web page") feature end-to-end. After this, pasting a bare URL onto the canvas does nothing (treated as plain text / no-op), and render mode `"embed"` no longer exists anywhere.

DETAILS:
- **hooks/useCanvasPaste.ts**: delete the entire `if (intent.kind === "url")` branch (builds a `url-embed:` component id, a node with `renderMode: "embed"` and `embedUrl`).
- **lib/canvas-paste.ts** — `classifyClipboard`: change a single-line URL so it classifies as `{ kind: 'none' }` instead of `{ kind: 'url' }`, so a URL paste truly does nothing rather than falling through to the HTML-frame branch.
- **nodes/ComponentNode.tsx**: remove `renderMode: "embed"` from the `data` type union and the `embedUrl` field; remove `isEmbed` and the iframe-src branch that uses it; remove the `isEmbed ? "ring-teal-400"` case from the selection-ring className.
- **lib/constants.ts**: remove `'embed'` from the `renderMode` union on `ChatSubmitPayload`; remove `embedUrl` from the `referenceNodes[]` field.
- **prompts/shared-sections.ts** — `formatReferenceNodesSection`: remove the `embedUrl` field from the node param type, the `isUrlEmbed` computation, the `'url embed'` typeLabel branch, and the trailing "for url embed rows, rely on the URL and screenshot" sentence.
- **hooks/useChatSubmit.ts**: remove the early-return guard `if (payload.renderMode === "embed" …)` (dead once embed can't occur).
- **Grep sweep**: `grep -rn "embedUrl\|renderMode.*embed\|isEmbed\|url-embed" nodes hooks lib prompts` and remove any remaining read-sites (e.g. hooks/useNodeSelection.ts, hooks/useChatAttachments.ts).

CONSTRAINTS:
- Backlog note (do NOT implement): auto-fetching an OG-image/screenshot of a pasted URL was considered and rejected for now.
- shared-sections.ts, lib/constants.ts, and hooks/useChatSubmit.ts are ALSO edited by chunk 03 (screenshot removal). Do chunk 02 BEFORE 03 — each removes a different branch of the same functions/types.

VERIFY:
- `grep -rn "embed" nodes hooks lib/constants.ts prompts` shows no `renderMode`/`embedUrl`/`isEmbed` references.
- Pasting a bare URL onto the canvas creates no node.
