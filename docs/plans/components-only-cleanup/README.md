# Components-only cleanup

A single ordered set of small, composer-2.5-ready chunks that takes the playground to a
**components-only** state. Supersedes the narrative plan `plans/cleanup-embed-styling-props-source.md`
and folds in the Plannotator review feedback (drop `p-4` + wrapper test guide; delete the
22 test components instead of inlining their mock data; remove pages entirely).

Two distinct "pages" are removed: the discovery `type: 'page'` classification
(scan → analyze → modal) and the registered `page.tsx` card's right-click delete
affordance in the sidebar (+ its `/api/pages` route that deleted host `src/app/<slug>/`).

Hand these to composer 2.5 **in number order**. Each chunk is self-contained; where a
transient type error would otherwise exist, the chunk edits the coupled files atomically
(05, 10). End every chunk with the real host typecheck.

| # | Chunk | Origin | Files |
|---|-------|--------|-------|
| 01 | Toolbar tooltip consistency | Track 1.1 | `PlaygroundCanvasToolbar.tsx` |
| 02 | Remove URL-embed | Track 1.2 | `useCanvasPaste.ts`, `canvas-paste.ts`, `ComponentNode.tsx`, `constants.ts`, `shared-sections.ts`, `useChatSubmit.ts` |
| 03 | Remove screenshot mechanism | Track 2.3 | `captureAndSaveScreenshot.ts` (del), `screenshot.ts` (del), `index.ts`, `registry.tsx`, `html-prompts.ts`, `jsx-prompts.ts`, `edit.prompt.ts`, `shared-sections.ts`, 7 prompt templates, `constants.ts`, `useDragToIterate.ts`, `useChatSubmit.ts`, `IterateDialog.tsx`, `package.json` |
| 04 | Delete `/api/pages` route | pages | `pages.ts` (del), `index.ts` |
| 05 | Discovery `type` → component-only | pages | `discover.ts`, `discovery-analyze.prompt.ts` |
| 06 | Scan prompt: components-only, skip `page.tsx` | pages | `discovery.prompt.ts` |
| 07 | Discovery modal: single list | pages | `DiscoveryModal.tsx` |
| 08 | Sidebar: remove page context-menu | pages | `PlaygroundSidebar.tsx`, `ComponentPreviewCard.tsx`, `registry-tree.ts` |
| 09 | Delete 22 test components + `data/` | Track 3.1 (+ feedback #2) | `registry.tsx`, `data/` (del), `props-fetchers.server.ts` |
| 10 | Instant Add (optimistic skeleton) + inline props | Track 2.2 (simplified) | `PlaygroundClient.tsx` (+ sidebar grid), `discover.ts`, `discovery-analyze.prompt.ts` |
| 11 | Canvas padding: drop `p-4`, keep wrapper | Track 1.3 (+ feedback #1) | `ComponentNode.tsx` |
| 12 | Remove `app/page.tsx` entry wrapper | Next.js vestige | `dev-entry.tsx`, `app/page.tsx` (del) |

## Ordering rationale / dependencies
- **01–03** are independent UI/prompt cleanups (safe anytime). 02 before 03 (both edit
  `shared-sections.ts`, `constants.ts`, `useChatSubmit.ts` — different branches).
- **04–08** are the pages removal. 05 and 06 rewrite the analyze/scan prompts' page bits.
- **09 before 10** — the instant-Add prompt assumes no mock-data files / inline props.
- **05 before 10** — 10 further rewrites the analyze prompt; the page branch must be gone first.
- **11 after 09** — test the padding/wrapper against the final (empty→freshly-Added) registry.
- **12 last** — `dev-entry.tsx` can import `PlaygroundClient` directly once all other edits land.

## Judgment calls baked in (override anytime)
1. `type` field kept but narrowed to `'component'` (reversible when pages return) — not deleted.
2. Scan **SKIPs `page.tsx`** rather than reclassifying it as a component (the server-only
   import safety reasoning was deleted with the page branch). Flip chunk 06 if you'd rather
   surface `page.tsx` files as plain components.
3. Chunk 10 uses an **optimistic skeleton** (AI stays the sole `registry.tsx` writer), NOT
   a server-side sync insert — chosen to avoid a wrong server-written static import
   white-screening the whole registry. See the review at
   `~/.claude/plans/when-it-comes-to-zazzy-seal.md`.
4. Chunk 10's `DELETE /api/discover/analyze` now also strips the registry entry + import
   (required, since chunk 09 removes the mock files today's DELETE relied on).

## Final verification (after all 12)
- `git grep -in "type: 'page'\|type: \"page\"\|=== \"page\"\|frameType\|/api/pages\|entry.route\|renderMode.*embed\|isEmbed\|screenshotPath\|captureAndSaveScreenshot\|./data/\|DELETE_FRAME_EVENT\|PlaygroundPage\|app/page" -- '*.ts' '*.tsx'` returns NOTHING (outside this plan folder).
- `html-to-image` gone from `package.json` + nested lockfile.
- Real host typecheck: `npx tsc -p tsconfig.app.json --noEmit`.
- `/playground` boots (`dev-entry.tsx` routes to `PlaygroundClient` directly); Add scans → lists components → skeleton → real card on HMR; cards
  have no delete menu; freshly-Added component sits flush (no 16px padding).
