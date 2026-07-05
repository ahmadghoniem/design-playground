# Cleanup: drop URL-embed, strip canvas chrome, instant Add with inline props, source-only iterations

Decisions locked in by the user against the "pre-flight" decision doc
(`docs/how-it-works.html`). This plan is grounded in the actual code as of
2026-07-04 — every change below cites the exact file/line it targets.

**Explicitly out of scope for this pass:** making the discovery scan
deterministic (AI-1 in the decision doc). Leave `server/routes/discover.ts`'s
`POST /api/discover` (the scan) and `prompts/discovery.prompt.ts` untouched —
only the `analyze` half changes here (see Track 2).

**Order of work:** Track 1 → Track 3 → Track 2, in that order. Track 3 (delete
`data/`) is a prerequisite for Track 2's registry.tsx rewrite, so do it first.
Track 1 is fully independent and can happen in parallel.

---

## Track 1 — UI

### 1.1 Toolbar tooltip consistency (mechanical, no design decision)

`components/canvas/PlaygroundCanvasToolbar.tsx` has four buttons using the
native `title=` attribute (sidebar toggle line 60, select line 75, text line
99, image line 108), while `components/canvas/ShapeToolGroup.tsx` (lines 3,
112-123) already uses the project's custom `Tooltip`/`TooltipTrigger`/
`TooltipContent` from `components/ui/tooltip.tsx` with `side="right"`.

**Change:** wrap all four buttons in `PlaygroundCanvasToolbar.tsx` with the
same `<Tooltip><TooltipTrigger asChild>{button}</TooltipTrigger><TooltipContent
side="right">{label}</TooltipContent></Tooltip>` pattern used in
`ShapeToolGroup.tsx`. Import `Tooltip`, `TooltipContent`, `TooltipTrigger` from
`../ui/tooltip`. Drop the `title=` props once replaced. Tooltip copy: "Toggle
sidebar", "Select (V)", "Text (T)", "Image" — reuse the existing `title` text
that's already there today.

### 1.2 Remove the URL-embed ("import a web page") feature

**Decision:** paste a URL → no special handling, treated as plain text (no
UI feature). **Backlog note for later, not part of this pass:** auto-fetching
an OG-image/screenshot of the pasted URL and dropping it in as an image
reference node was considered and rejected for now — revisit if this comes up
again.

Remove render mode `"embed"` end-to-end:

- **`hooks/useCanvasPaste.ts`** — delete the entire `if (intent.kind ===
  "url")` branch (lines 184-204: builds a `url-embed:` component id, node with
  `renderMode: "embed"`, `embedUrl`). After removal, a URL paste falls through
  to the existing HTML-paste branch below it (it'll get wrapped as a HTML
  frame) — **check `lib/canvas-paste.ts`'s `classifyClipboard`** (the `{
  kind: 'url' }` case, referenced at line 17 there) and change it so a
  single-line URL classifies as `{ kind: 'none' }` instead of `{ kind: 'url'
  }`, so paste truly does nothing rather than silently becoming an HTML
  frame.
- **`nodes/ComponentNode.tsx`** — remove `renderMode: "embed"` from the
  `data` type union (line 62) and the `embedUrl` field (line 68); remove
  `isEmbed` and the iframe-src branch that uses it (lines ~565, 583-585,
  600-606); remove the `isEmbed ? "ring-teal-400"` case from the selection
  ring className (line 560).
- **`lib/constants.ts`** — remove `'embed'` from the `renderMode` union on
  `ChatSubmitPayload` (line 538) and remove `embedUrl` from the
  `referenceNodes[]` field (line 531).
- **`prompts/shared-sections.ts`** — in `formatReferenceNodesSection`
  (lines 111-182): remove the `embedUrl` field from the node param type
  (line 121), the `isUrlEmbed` computation (lines 137-139), the `'url embed'`
  typeLabel branch (lines 147-149), and the trailing "for url embed rows, rely
  on the URL and screenshot" sentence (line 178) — once embed nodes can't
  exist, every reference node has a real `sourcePath` (component/iteration) or
  `imagePath`/`imageUrl` (image) or `textContent` (text). No node type is
  left with neither.
- **`hooks/useChatSubmit.ts`** — remove the early-return guard at lines
  92-97 (`if (payload.renderMode === "embed" ...)`) — dead once `"embed"` can't
  occur.
- **`lib/captureAndSaveScreenshot.ts`** — the `getScreenshotFilename`
  URL-hash branch (lines 127-134, `url-embed-${hash}.png`) becomes dead. (This
  whole file is deleted anyway in Track 2.3 — no separate action needed here,
  just don't worry about that branch specifically.)
- Grep for any remaining `embedUrl` / `renderMode.*embed` / `isEmbed`
  references after the above (e.g. `hooks/useNodeSelection.ts`,
  `hooks/useChatAttachments.ts` showed up in an earlier search) and remove
  each — those are secondary read-sites of the same field, not new logic.

### 1.3 Strip the canvas's own padding/shadow chrome

**Decision:** the Tailwind-scan gap (`docs/how-it-works.html` §6) is already
fixed on your end (host `index.css` now imported) — no action needed there.
Only the canvas-added wrapper chrome remains.

- **`nodes/ComponentNode.tsx:675`** (the "auto" intrinsic-sizing branch):
  currently `className={\`grid place-items-center p-4 ${...}\`}`. Remove the
  `p-4`.
- **Also assess removing the wrapper `<div>` entirely** (the
  `grid place-items-center` wrapper at line 674-679): it exists to center
  content when the node's intrinsic size differs from the component's
  rendered size. Check whether `Component` (line 627-630,
  `<ComponentErrorBoundary><Component {...effectiveProps} /></ComponentErrorBoundary>`)
  can render as a direct child of the outer frame div (line 552) without this
  extra grid wrapper — i.e. does removing it break centering/sizing for any
  existing registry component, or was the wrapper only ever there to add the
  padding you're now removing? Test with a few registered components
  (`Card`, `Header`, a full-page one like `SettingsDashboard`) before
  deciding; if centering still holds without it, delete the wrapper div and
  render `Component` directly. If some components rely on it for layout,
  keep the wrapper but drop the `p-4` only.
- Note: the **other** three render branches in the same file (`isFillMode`
  at line 616 uses `p-[5%]`, `isPreset` at lines 637-671 has no padding,
  `isHtml/isEmbed/isDesignSystem` at 565 has no padding) are untouched — this
  decision only concerns the default "auto" mode, which is what a freshly
  Added registry component renders in.

---

## Track 3 — File system

### 3.1 Delete `data/*.mockData.ts` and the `data/` directory

22 files today (`data/App.mockData.ts` … `data/DailyRecapView.mockData.ts`,
full list in `registry.tsx:63-84`). Per the user: no directory or file should
exist solely to carry props — props live inline in `registry.tsx` from now
on.

**Migration (do this before Track 2's registry.tsx prompt rewrite, so the
existing 22 registered components don't regress):**

1. For each `data/<Name>.mockData.ts`, take its `export const mockData = {
   ... }` object literal and inline it directly into the corresponding
   `props:` field of that component's entry in `registry.tsx` (replacing
   `props: <camelCaseName>MockData as Record<string, unknown>` with `props: {
   ...literal... } as Record<string, unknown>`).
2. Remove the corresponding `import { mockData as ... } from "./data/....
   mockData"` line (`registry.tsx:63-84`).
3. Delete the entire `data/` directory once every entry has been inlined.
4. Update the comment at `registry.tsx:120-122` ("Each entry has its own
   data/<ComponentName>.mockData.ts file. To add a new component, run
   discovery → analyze...") to describe the new inline-props shape instead.

This is purely mechanical (move, don't regenerate) — the values already exist
and are already realistic; just relocate them.

---

## Track 2 — AI generation

### 2.1 Discovery scan determinism — deferred

Do not touch `prompts/discovery.prompt.ts` or the `POST /api/discover` scan
path in `server/routes/discover.ts`. Revisit later.

### 2.2 Instant Add, inline props, no mock-data files

**Decision:** Option C (instant deterministic first paint, AI refines after) —
but simplified, and with no new directory/file/component created just to hold
props (ties directly into Track 3.1: props now live inline in `registry.tsx`,
never in a separate file).

**Design call made here (flag for review before handing to Opus if you want
it done differently):** "instant" is only achievable without AI judgment for
the common case — a **standalone component** (`type: 'component'` in
`discovery.json`), where the import path is already known from the discovery
scan and doesn't need the "is this safe to import, page vs. delegate"
reasoning the AI currently does for pages. So:

- **`type: 'component'` entries** get the fast/instant path below.
- **`type: 'page'` entries** keep today's behavior unchanged (single AI call
  determines what to import, same as now) — because that judgment (server-only
  code detection, page → presentational-component delegation) is real
  reasoning work, not something to fake deterministically. Don't try to make
  pages instant in this pass.

**New flow for `type: 'component'` entries (`POST /api/discover/analyze`,
`server/routes/discover.ts`):**

1. **Synchronous, no AI call:** on receiving the analyze request for a
   `component`-type entry, immediately:
   - Read the component's source file (`componentPath`) to determine
     default vs. named export — a cheap regex/string check (e.g. does the
     file contain `export default function <Name>` / `export default <Name>`
     vs. `export function <Name>` / `export const <Name>`), not a new
     AST-parsing subsystem. This is the one piece of "structure" we can get
     for free without AI.
   - Insert a new entry into `registry.tsx`'s `pages.children` array with:
     the real import (`import <Name> from '<componentPath>'` or `import {
     <Name> } from '<componentPath>'`), `props: {}` (empty object, inline —
     no file), `sourcePath: componentPath`, `size: 'default'`,
     `propsInterface` left as a placeholder comment (`// pending AI
     refinement`), and `parentId` if provided.
   - Mark the `discovery.json` entry `status: 'added'` right away.
   - Return success immediately — the client can render the component on the
     canvas now, with whatever it does with empty props (may look sparse for
     components with required props; that's accepted, not treated as a bug,
     per "don't over-engineer").
2. **Background, unchanged mechanism:** kick off the existing
   `discoveryAnalyzePrompt` AI call exactly as today (fetch props snapshot via
   `fetchPropsSnapshot`, spawn the agent), but its job shrinks: instead of
   "create a mock-data file and add a new registry.tsx entry", it now
   **edits the `props: {}` already sitting in the registry.tsx entry we just
   inserted**, replacing it with realistic inline values, and fills in the
   real `propsInterface` string. See prompt changes below.
3. When the background call finishes, the same `resolve(c.json({ success:
   true, entry, childEntries }))` shape as today lets the client re-fetch/
   re-render the now-refined component — no new event plumbing needed beyond
   what already re-syncs the canvas after analyze completes today.

**For `type: 'page'` entries:** unchanged — the full `discoveryAnalyzePrompt`
run happens before the entry exists at all, same as today, just with the
prompt's Step 2/3 rewritten per below (no mock-data file, either way).

**`prompts/discovery-analyze.prompt.ts` rewrite:**

- Delete "Step 2: Create the mock data file" entirely (lines 74-93).
- Rewrite "Step 3: Add an entry to registry.tsx" (lines 95-133):
  - For pages (no pre-existing entry): same as today, but the entry's
    `props:` field is now a literal inline object (`props: { key: value, ...
    } as Record<string, unknown>`) instead of `props: <camelCaseName>MockData`
    — drop the "3a — add the mock data import" sub-step (lines 105-109)
    entirely; keep "add a static import for the component itself."
  - For components (pre-existing placeholder entry from the instant path):
    change the instruction to "find the entry you already registered for
    `<id>` in `registry.tsx` (it currently has `props: {}`) and replace that
    object literal in place with realistic values; also fill in
    `propsInterface`." Do not create a second entry.
- Update "Rules" (lines 190-197): add "Do NOT create a `data/` directory or
  any `*.mockData.ts` file — props are always inline object literals in
  `registry.tsx`."
- `server/routes/discover.ts`: remove the `DATA_DIR` mkdir (lines 412-415),
  the `expectedDataFile`/`mockDataExists` logging (lines 492-500), and the
  `data/<Name>.mockData.ts` unlink in the `DELETE /api/discover/analyze`
  handler (lines 603-608) — replace deletion there with resetting the
  registry.tsx entry's `props` back to `{}` (or, simpler: on remove, delete
  the whole registry.tsx entry that was added, matching "no Add" state
  exactly, which is closer to today's actual delete semantics anyway since
  today's DELETE doesn't touch registry.tsx either — check this: today's
  DELETE handler only resets `discovery.json` status and deletes the mock
  file, it does **not** remove the registry.tsx entry or its component
  import. Decide alongside Opus whether DELETE should now also strip the
  registry.tsx entry it added, since there's no more "orphaned mock file" to
  signal the entry is stale — recommend yes, for symmetry, but flagging since
  it's a behavior change beyond what's strictly asked).

### 2.3 Iterations: source-as-context only, cut the screenshot path entirely

**Decision:** drop the html-to-image screenshot mechanism completely — no
opt-in fallback. Every iteration prompt already instructs the agent to read
the real source file (`{{sourcePath}}` for registry components,
`public/{{pageFolder}}/{{sourceIterationFolder}}/index.html` for HTML
iterations, the base `.tsx` file for JSX iterations) **before** the optional
screenshot section — so removing the screenshot changes nothing about how the
agent understands current state, it just removes a redundant, costly step.
(One data point confirming this is already the direction of travel:
`hooks/useDragToIterate.ts` already passes `undefined` instead of a captured
screenshot for registry-component iterations — lines 365/376 have it
commented out. This finishes that migration everywhere else.)

**Delete entirely:**
- `lib/captureAndSaveScreenshot.ts` (both `captureAndSaveScreenshot` and
  `getScreenshotFilename`).
- `server/routes/screenshot.ts`, and its mount in `server/index.ts` (`import {
  screenshotRoutes } from './routes/screenshot'` and `router.route('/',
  screenshotRoutes())` — lines 32 and 54).
- `prompts/shared-sections.ts`'s `formatScreenshotSection` function (lines
  102-109).
- The `html-to-image` dependency from `package.json:17` (`bun remove
  html-to-image` from the playground's nested install).

**Remove `screenshotPath`/`screenshotSection` plumbing from every call site
and signature:**

- `registry.tsx` — `generateIterationPrompt` (param at line 504, usage at
  line 542), `generateIterationFromIterationPrompt` (param line 560, usage
  line 602), `generateElementIterationPrompt` (param line 620), and
  `generateElementIterationFromIterationPrompt` (param line 674) — drop the
  `screenshotPath?: string` parameter and the `screenshotSection:
  formatScreenshotSection(screenshotPath)` line from each.
- `lib/html-prompts.ts` — `generateHtmlIterationPrompt` and
  `generateHtmlIterationFromIterationPrompt` — same removal (params + the
  `formatScreenshotSection` import).
- `lib/jsx-prompts.ts` — `generateJsxIterationPrompt` and
  `generateJsxIterationFromIterationPrompt` — same removal.
- `prompts/edit.prompt.ts` — drop `screenshotPath` from `EditPromptOptions`
  (line 9) and the "Current Screenshot" section (lines 47-51).
- `prompts/shared-sections.ts`'s `formatReferenceNodesSection` — drop the
  `screenshotPath` field from the node param type (line 117) and the `else
  if (node.screenshotPath)` branch (lines 169-171) — combined with 1.2's
  removal of the `embedUrl`/url-embed branch, every reference node now
  resolves to exactly one of: text content, image path/URL, or a real source
  path.
- **Prompt templates** — remove the `{{screenshotSection}}` placeholder line
  and the `screenshotSection?: string` field from the `*Vars` interface in
  all seven: `prompts/iteration.prompt.ts` (line 31, var at line 88),
  `prompts/iteration-from-iteration.prompt.ts` (line 37, var 92),
  `prompts/html-iteration.prompt.ts`, `prompts/html-iteration-from-iteration.
  prompt.ts` (line 14, var 55), `prompts/jsx-iteration.prompt.ts`,
  `prompts/jsx-iteration-from-iteration.prompt.ts`,
  `prompts/element-iteration.prompt.ts`.
- `lib/constants.ts` — drop `screenshotPath?: string` from the
  `referenceNodes[]` field (line 526) on `ChatSubmitPayload`.

**Call sites that capture screenshots — remove the capture, keep everything
else about the flow unchanged:**

- `hooks/useDragToIterate.ts` — remove the `captureAndSaveScreenshot` call
  and `screenshotPath`/`getScreenshotFilename` usage (lines ~299-307), and
  stop passing `screenshotPath` into the HTML/JSX prompt builders (lines
  320-351 currently still pass it live; the registry-component branches
  already pass `undefined`, just delete the now-dead commented-out arguments
  there too for cleanliness).
- `hooks/useChatSubmit.ts` — four sites: edit-mode target screenshot (lines
  160-168, feeds into `editPrompt`'s `screenshotPath`), edit-mode reference-
  node screenshots (lines 176-221, the `captureAndSaveScreenshot` call inside
  the `refNodes.map` for non-text/non-image nodes), main iterate-with-target
  screenshot (lines 509-518), and main-path reference-node screenshots
  (lines 374-419, same per-node capture as the edit-mode version). Remove the
  capture calls; keep the `sourcePath` resolution via `resolveRegistryItem`
  that already runs alongside them (that's the real context now) and the
  text/image node handling (unaffected — those never used screenshots).
- `nodes/shared/IterateDialog.tsx` — `handleRunWithCursor` currently
  re-captures a screenshot and rebuilds the prompt with it (lines 429-507,
  "Capture screenshot and rebuild prompt with the image path" /
  `promptWithScreenshot`). Delete that entire re-build step — the `generatedPrompt`
  from the `useMemo` above (lines 317-391, which never included a screenshot)
  is already correct; just submit `generatedPrompt` directly instead of
  `promptWithScreenshot || generatedPrompt`.

---

## Suggested execution order for whoever implements this

1. Track 1.1 (tooltip) — trivial, zero risk, do first to get it out of the
   way.
2. Track 1.2 (embed removal) — self-contained.
3. Track 3.1 (delete `data/`, inline into `registry.tsx`) — do before 2.2,
   since 2.2's prompt rewrite assumes inline props already exist.
4. Track 1.3 (padding/wrapper) — after 3.1 so you're testing the final
   registry.tsx shape when checking centering behavior.
5. Track 2.2 (instant Add / inline-props analyze flow) — depends on 3.1.
6. Track 2.3 (screenshot removal) — independent of the others; can happen any
   time, but doing it last means fewer moving parts to keep track of while
   3.1/2.2 are in flight.

## Verification checklist

- [ ] Pasting a bare URL onto the canvas does nothing (no node created).
- [ ] `renderMode: "embed"` no longer exists anywhere in the codebase (grep
      for `embed` in `nodes/`, `hooks/`, `lib/constants.ts`, `prompts/`).
- [ ] All five toolbar buttons show the same custom tooltip style on hover.
- [ ] A freshly Added `type: 'component'` entry appears on canvas
      immediately (before the background AI call resolves), then its props
      visibly refine a few seconds later without a page reload.
- [ ] `data/` directory no longer exists; `registry.tsx` has zero imports
      from `./data/...`; all 22 previously-registered components still
      render with their original (now inline) mock data.
- [ ] Generating an iteration (drag-to-iterate, chat, and the Iterate
      dialog) no longer triggers a screenshot capture (check the Network
      tab — no `POST /playground/api/screenshot` call) and no longer costs
      an image encode; the resulting prompt still tells the agent to read
      the real source file.
- [ ] `bun.lock`/nested `node_modules` no longer include `html-to-image`.
- [ ] A newly Added component in the "auto" size mode sits flush (or with
      the agreed minimal gap) inside its node — no stray 16px padding.
