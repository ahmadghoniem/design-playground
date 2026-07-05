Stack: TypeScript + React 18 + Hono (Vite host). Broad, mechanical removal across prompt builders and call sites.

TASK: Delete the html-to-image screenshot mechanism completely — no fallback. Every iteration prompt already instructs the agent to read the real source file before the (optional) screenshot section, so removing screenshots changes nothing about how the agent understands current state; it just drops a redundant, costly step.

DELETE ENTIRELY:
- `lib/captureAndSaveScreenshot.ts` (both `captureAndSaveScreenshot` and `getScreenshotFilename`).
- `server/routes/screenshot.ts`, plus its mount in `server/index.ts` (the `import { screenshotRoutes } …` line and `router.route('/', screenshotRoutes())`).
- `prompts/shared-sections.ts` → the `formatScreenshotSection` function.
- The `html-to-image` dependency from `package.json` (`bun remove html-to-image` in the playground's nested install).

REMOVE `screenshotPath`/`screenshotSection` FROM SIGNATURES & TEMPLATES:
- `registry.tsx`: `generateIterationPrompt`, `generateIterationFromIterationPrompt`, `generateElementIterationPrompt`, `generateElementIterationFromIterationPrompt` — drop the `screenshotPath?: string` param and the `screenshotSection: formatScreenshotSection(screenshotPath)` line from each.
- `lib/html-prompts.ts`: `generateHtmlIterationPrompt`, `generateHtmlIterationFromIterationPrompt` — same removal (params + the `formatScreenshotSection` import).
- `lib/jsx-prompts.ts`: `generateJsxIterationPrompt`, `generateJsxIterationFromIterationPrompt` — same.
- `prompts/edit.prompt.ts`: drop `screenshotPath` from `EditPromptOptions` and the "Current Screenshot" section.
- `prompts/shared-sections.ts` → `formatReferenceNodesSection`: drop the `screenshotPath` field from the node param type and the `else if (node.screenshotPath)` branch.
- Prompt templates — remove the `{{screenshotSection}}` line and the `screenshotSection?: string` field from the `*Vars` interface in all seven: `iteration.prompt.ts`, `iteration-from-iteration.prompt.ts`, `html-iteration.prompt.ts`, `html-iteration-from-iteration.prompt.ts`, `jsx-iteration.prompt.ts`, `jsx-iteration-from-iteration.prompt.ts`, `element-iteration.prompt.ts`.
- `lib/constants.ts`: drop `screenshotPath?: string` from the `referenceNodes[]` field on `ChatSubmitPayload`.

REMOVE THE CAPTURE CALLS (keep the rest of each flow unchanged):
- `hooks/useDragToIterate.ts`: remove the `captureAndSaveScreenshot`/`getScreenshotFilename` usage and stop passing `screenshotPath` into the HTML/JSX prompt builders (also delete the now-dead commented-out `undefined` args on the registry-component branches).
- `hooks/useChatSubmit.ts`: four sites — edit-mode target screenshot, edit-mode reference-node screenshots (inside `refNodes.map`), main iterate-with-target screenshot, and main-path reference-node screenshots. Remove the capture calls; KEEP the `sourcePath` resolution via `resolveRegistryItem` and the text/image node handling (those never used screenshots).
- `nodes/shared/IterateDialog.tsx`: in `handleRunWithCursor`, delete the "capture screenshot and rebuild prompt" step (`promptWithScreenshot`) and submit `generatedPrompt` directly.

CONSTRAINTS:
- Do chunk 02 (embed removal) BEFORE this — both edit `formatReferenceNodesSection`, `ChatSubmitPayload.referenceNodes`, and `useChatSubmit.ts`. After both, every reference node resolves to exactly one of: text content, image path/URL, or a real source path.

VERIFY:
- `grep -rn "screenshotPath\|screenshotSection\|captureAndSaveScreenshot\|formatScreenshotSection\|getScreenshotFilename" .` returns NOTHING (outside this plan folder).
- Generating an iteration (drag, chat, Iterate dialog) fires no `POST /playground/api/screenshot`.
- `html-to-image` is gone from `package.json` and the nested lockfile.
- Real typecheck from the host passes: `npx tsc -p tsconfig.app.json --noEmit`.
