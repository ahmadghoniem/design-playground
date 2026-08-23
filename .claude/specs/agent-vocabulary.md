# Agent vocabulary

The prompt-builder vocabulary object, its delivery mechanism, and the surrounding agent-facing
surface: the node-kind vocabulary, the agent-written commit message, lean-prompts consolidation, and
the skills installer. Design judgment (named failures, fix order) is `agent-failures.md`, not this
file.

---

## Settled

- **Prompt builders import the vocabulary rather than describing it.** One data object holding the
  node kinds we actually have — component, iteration, image, text — with the label and source-path
  rule for each. The prompt builder and the canvas badge both read the same object, so they cannot
  drift apart. Scoped to the node kinds on the roadmap, not to a general verb set.

- **The agent writes the commit message.** After a generation it already knows what it was trying to
  do — ask for one line describing intent, not files. This goes into the initial prompt sent on every
  new chat session.

- **Delivery: parse the output stream we already read** (`claude-jsonl.ts`) for a block of named
  actions, rather than starting with a new file. Graduate to an agent-appended file the canvas
  watches only once the vocabulary has proven itself in the stream-parsing form.

- **Lean-prompts consolidation.** One explore template with flags (`fromIteration`,
  `elementSelections`) assembled in `prompt-builders.ts`, replacing today's four separately-named
  explore-shaped templates; delete the duplicate template files once the shared sections cover the
  differences between them. Adopt stays separate (already moved to
  `features/iterations/adopt-prompt.ts`), because it isn't an explore variant.

- **Inline `fill-template`.** The current dedicated module is too thin to justify its own file
  (`{{key}}` replace, nothing else) — inline the replace next to the builders, or as a private helper
  in `prompt-builders.ts` / `adopt-prompt.ts`. No standalone `fill-template.ts` module.

- **Skills installer as a package manager, not a CRUD editor.** `source` is a package coordinate —
  `owner/repo` or `owner/repo@skill` — not a name/description/body triple; `update` carries only an
  id, meaning "re-fetch from where this came from." It fetches from GitHub / skills.sh and an
  installed skill becomes agent instructions injected into generation prompts, so installing one from
  an arbitrary repo is executing someone else's prompt. **`preview` is a security control, not a
  convenience** — mandatory in the UI, not optional, and it must never write to disk.

- **Lifecycle / coordination / SSE — working now, orientation only, don't fix.** Coordination
  (`useGenerationCoordination`) is the shared blackboard answering "is something generating," what
  was requested, and the latest nodes list, so scan/lifecycle/chat don't fight each other. A mutex /
  scan lock keeps only one "look for new iteration files" pass active at a time, queuing one more if
  a request arrives mid-scan, to prevent double-placing the same card. Lifecycle
  (`useGenerationLifecycle`) drops skeleton cards on start, subscribes to progress, and runs a final
  scan + cleanup on complete/error. Server SSE watches Claude's tool stream and pushes "file written"
  events so the browser updates without waiting for the whole job. The two event buses — server SSE
  and the client's `generationEvents` — are intentionally separate; similar names on purpose after a
  rename, don't merge them casually.

## As the code is today

- **The vocabulary is duplicated inline, not shared.** `formatReferenceNodesSection()`
  (`features/generation/prompts/shared-sections.ts`) already hardcodes exactly the four settled node
  kinds — `'component' | 'iteration' | 'image' | 'text'` — with an inline `typeLabel` switch (`'text
  note'`, `'image reference'`, `'iteration'`, `'component'`) and inline per-type path resolution
  (`imagePath`/`imageUrl` for image, `sourcePath` or `iterationsFile(sourceFilename)` for
  component/iteration, none for text). This is exactly the logic a shared vocabulary object would
  hold — today it lives only in this one formatter. Canvas node components (`ComponentNode.tsx`,
  `IterationNode.tsx`, `ImageNode.tsx`, `TextNode.tsx`) each render their own label/badge
  independently; nothing reads a shared object on that side either, so there is currently no single
  point that could drift *from* — the drift risk the vocabulary object is meant to close doesn't yet
  have two call sites to keep in sync, it has one.

- **No agent-written commit message exists anywhere.** None of the four iteration prompt builders in
  `prompt-builders.ts` (`generateIterationPrompt`, `generateIterationFromIterationPrompt`,
  `generateElementIterationPrompt`, `generateElementIterationFromIterationPrompt`) or their templates
  reference a commit message. New surface.

- **`claude-jsonl.ts` today has no concept of a named-action block.** It's four pure functions over
  arrays of stdout lines: `appendAssistantTextFromClaudeJsonlLines` (accumulates assistant text
  deltas + finds a session id), `extractStreamJsonError` (pulls the last error out of a `result` or
  errored `assistant` line), `extractToolEventsFromClaudeJsonlLines` (matches `Write`/`Edit`/
  `MultiEdit` `tool_use` blocks against their `tool_result` via a caller-owned `pendingToolUses` map,
  emitting `{ filePath }` once the result confirms success), and `formatAgentErrorMessage`. The
  `tool_use`/`tool_result` pairing pattern `extractToolEventsFromClaudeJsonlLines` already uses is the
  natural place a named-action block would slot in — same pairing mechanics, different tool/payload
  shape — but nothing today looks for one.

- **There is no skills installer, and there will not be one.** Installing a skill means fetching
  someone else's prompt off GitHub and writing it where the Agent reads it — a job every Agent's own
  tooling already does. `server/routes/skills.ts` is read-only: `GET /api/skills` reads `SKILL.md`
  files from a builtin dir shipped with the package and a user dir at `.claude/skills/`, tags each
  `source: 'builtin' | 'user'`, and de-duplicates by name with **user skills shadowing builtins**
  (`[...user, ...builtin]` iteration order). The in-app catalog that once POSTed to
  `/api/skills/{add,update,remove,preview}` is deleted, along with its featured-skills list and the
  header entry point that opened it.

- **Lean-prompts consolidation is not done.** `features/generation/prompts/` still holds separate
  `iteration.prompt.ts`, `element-iteration.prompt.ts`, `freeform-reference.prompt.ts`, and
  `edit.prompt.ts` files alongside `shared-sections.ts`. `adopt-prompt.ts` has already been split out
  to `features/iterations/`, matching the "keep adopt separate" half of the decision.

- **`fill-template` has not been inlined.** `shared/lib/fill-template.ts` still exists as its own
  8-line module (`fillTemplate(template, vars)` — replaces `{{key}}` placeholders, missing keys
  become `''`), imported by `element-iteration.prompt.ts`, `freeform-reference.prompt.ts`,
  `iteration.prompt.ts`, and `features/iterations/adopt-prompt.ts`.

- **Two events named in an earlier CustomEvents count are gone; the file naming them is stale.**
  `shared/lib/generation-events.ts`'s own header comment still claims to replace "the window
  CustomEvent bus (`GENERATION_*_EVENT`)" in the present tense; grepping current source for the six
  event names a still-open refactor note once listed
  (`ITERATION_FETCH_EVENT`, `COMPONENT_SIZE_CHANGE_EVENT`, `ITERATION_COLLAPSE_TOGGLE_EVENT`,
  `EDIT_COMPLETE_EVENT`, `OPEN_SKILLS_CATALOG_EVENT`, `SKILLS_CHANGED_EVENT`) finds none of them —
  `CLAUDE.md` confirms directly: "nothing in the source dispatches [a window CustomEvent]; the last
  four were removed in `95710ae`." The migration this file's roadmap item names is already done.

- **Agent spawn failures report the wrong stream.** `feat/layers-sidebar` carried a
  `buildAgentErrorMessage()` that fell back to **stdout** when stderr was empty, because the CLI
  prints its real failure there - `API Error: Unable to connect to API (ConnectionRefused)` - and
  then appended a hint pointing at a stale `ANTHROPIC_BASE_URL` or `HTTP(S)_PROXY` in the dev
  server's environment. `master` has no equivalent in `generate.ts`, `spawn-agent.ts` or
  `agent-config.ts`, so a connection failure currently surfaces as an empty error. Restoring it is
  a small, known-good change; the branch it came from was deleted 2026-08-23 at `6c685a8`.

## Open

- **The window-CustomEvents migration decision — already resolved, not open.** The decision this
  item names was whether a typed emitter buys anything over `window` events, given that one end of
  every surviving event was a React Flow node that can't receive a callback prop. Current source has
  zero `window` `CustomEvent` dispatches left (verified above), so there's nothing left to decide —
  the removal happened. Left here as a pointer so the closed item isn't rediscovered as "still open"
  from an older plan record; the one real loose end is `generation-events.ts`'s own header comment,
  which still describes the migration as a replacement in progress rather than a completed one.
