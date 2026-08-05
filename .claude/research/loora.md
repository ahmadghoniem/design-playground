# Loora — research notes

Loora (`lassejlv/loora`, local clone read-only) is a cloud SaaS design canvas
where Claude, Codex, Cursor, or opencode edit a shared document over MCP:
Bun/TanStack Start/Drizzle+Neon/Better Auth/Polar/oRPC, multiplayer, DB-backed
branches. We cloned it because it is the closest existing prior art to
`design-playground` for a canvas an agent can edit — its document model, its
three-way merge, and its agent-facing skill are worth reading closely even
though almost none of its service infrastructure applies to us. Loora is
**AGPL-3.0-or-later** (see `LICENSE`, `package.json` `"license"`); nothing
below quotes more than a few lines of source, and any approach we later borrow
needs its own clean-room implementation, not a port.

The asymmetry is worth stating once and then not repeating: Loora is a
multi-tenant cloud product with its own database, its own auth, its own
billing, and a document model that exists so a *remote* agent (over MCP, with
no filesystem access) can describe a UI it cannot otherwise touch. We are a
single-player local dev tool where Claude Code already runs inside the host's
own git repo with full filesystem access — the problem Loora's document model
and MCP surface solve does not exist for us. What follows filters for the
~15% that's about how they represent and merge a canvas, not the ~85% that's
about running a cloud service.

## 1. Architecture

Bun workspaces monorepo, `apps/*` and `packages/*` (`package.json` workspaces
field). Layout, from `README.md` and directory inspection:

| Path | Role |
|---|---|
| `apps/web` | TanStack Start app: routes, API handlers, editor shell |
| `apps/mcp` | Remote + stdio MCP server (`mcp.loora.design`) |
| `apps/ws` | Realtime service (websocket hub, presence) |
| `apps/desktop` | Deno desktop shell wrapping the hosted web app |
| `packages/canvas` | Document model, engine (operation application), merge, HTML/JSX/PNG export, HTML import |
| `packages/editor` | Editor shell, panels, client sync |
| `packages/ui` | Shared design-system primitives |
| `packages/agent` | Shared canvas tool vocabulary (zod schemas + pure operation builders) used by MCP and any other agent entry point |
| `packages/rpc` | oRPC router: designs, drafts/branches, versions, assets, handoff tokens |
| `packages/db` | Drizzle schema, Neon client, migrations |
| `packages/auth`, `packages/billing`, `packages/realtime`, `packages/email` | Better Auth, Polar entitlements, wire protocol/connection tickets, transactional email |

Dependency direction: `apps/mcp` depends on `@loora/canvas` (document types,
merge, export), `@loora/agent` (tool schemas + operation builders — the same
schemas the web app's own AI panel would use), `@loora/rpc` (design/draft
persistence), and `@loora/billing` (usage metering). `packages/agent` depends
only on `@loora/canvas` — it is genuinely a shared vocabulary layer, not
MCP-specific, which is why the MCP server (`apps/mcp/src/server.ts`) is mostly
wiring: it imports zod schemas and pure `*Operations`/`*Transaction` builder
functions from `packages/agent/src/canvas-tools.ts`, then hands the resulting
`CanvasOperation[]` to `applyCanvasTransactions` (defined in
`apps/mcp/src/designs.ts:335`, wrapping `applyCanvasTransactionsInternal` at
`designs.ts:178`), which is the piece that loads/saves the design row and
applies the operations through `packages/canvas/src/engine.ts`.

The files that carry the real weight, by line count (`wc -l`):

| File | Lines | What it is |
|---|---|---|
| `packages/canvas/src/model.ts` | 2552 | Node/document types, validation, node constructors, child-index/tree helpers |
| `packages/canvas/src/export.ts` | 2046 | Compiles a document to standalone HTML / Tailwind JSX / plain JSX |
| `packages/canvas/src/import.ts` | 1428 | HTML → document import |
| `packages/agent/src/canvas-tools.ts` | 1543 | Zod input schemas + pure operation-builder functions for every agent-facing mutation |
| `apps/mcp/src/server.ts` | 1301 | ~33 `registerTool` calls wiring schemas/operations to persistence, usage metering, and activity tracking |
| `packages/canvas/src/engine.ts` | 1528 | Applies `CanvasOperation`s to a document (insert/patch/move/delete, token/theme/animation upsert) |
| `apps/mcp/src/designs.ts` | 752 | Design CRUD, canvas-target resolution, transaction application |
| `packages/rpc/src/branches.ts` | 602 | Draft/branch lifecycle: create, save, propose, apply (3-way merge), close, reopen |
| `packages/canvas/src/motion.ts` | 542 | Animation/transition types and validation |

`packages/canvas/src/model.ts` has no runtime dependency on React, a
database, or MCP — it's pure data + pure functions (`assertDocument`,
`buildChildIndex`, `mergeLayout`, node constructors like `createPageNode`).
That's the one piece of the repo that would port cleanly if we ever wanted a
real cross-component document model; everything downstream (`engine.ts`,
`merge.ts`, `export.ts`) is built on top of it as pure transforms, not services.

## 2. Mechanisms behind features we might copy

### Document model: flat map + parentId + fractional order

`CanvasDocument.nodes` is `Record<NodeId, CanvasNode>` (`model.ts:388`) — a
flat, un-nested map keyed by id. Every node carries `parentId: NodeId | null`
and a numeric `order` (`model.ts:280-281`). There is no nested `children[]`
array anywhere in the schema; tree shape is entirely derived at read time.

Two derivation functions do all the work (`model.ts:622-655`):

- `buildChildIndex(document)` does one pass over `Object.values(document.nodes)`,
  grouping into a `Map<NodeId | null, CanvasNode[]>` keyed by `parentId`, then
  sorts each sibling list by `bySiblingOrder` (`order` ascending, id as
  tiebreak). This is the index anything touching more than a couple of parents
  is expected to build once and reuse — the doc comment on `orderedChildren`
  is explicit that skipping the index makes a full-tree walk quadratic.
- `orderedChildren(document, parentId, index?)` either reads from a passed-in
  index or falls back to an unindexed `Object.values().filter().sort()` scan
  for one-off lookups.

Ordering is fractional, not integer-adjacent: `DEFAULT_ORDER_STEP = 1024` and
`MIN_ORDER_GAP = 1e-7` (`model.ts:21-22`) — new siblings get spaced 1024 apart
so most inserts/reorders can pick a midpoint without renumbering the whole
list; the tiny minimum gap is presumably the threshold at which a rebalance
becomes necessary. Page/component nodes are enforced as roots (`parentId ===
null`) and everything else is enforced as non-root; cycles are checked
explicitly (`model.ts:2308`, `'Node hierarchy contains a cycle'`).

This shape — flat record, derived tree, indexed-when-it-matters — is the part
of Loora closest to how `@xyflow/react` already represents our canvas (flat
node array/map, no nested children), so it's more a confirmation of a known
good pattern than a novel idea for us.

### `packages/canvas/src/merge.ts` — three-way merge

215 lines total, and it's genuinely one small idea applied recursively. The
core is `mergeValue(base, left, right, context)` (`merge.ts:48-94`), a
value-level diff3 with an early-exit chain before it ever looks at structure:

1. `same(left, right)` → return `left` (both sides agree, no conflict).
2. `same(base, left)` → return `right` (only right changed).
3. `same(base, right)` → return `left` (only left changed).
4. Otherwise, if `left` and `right` are both plain objects (and `base` is
   either a plain object or genuinely absent — tracked with a `Symbol('missing')`
   sentinel so "the key didn't exist" is distinguishable from
   "the key was explicitly `undefined`"), recurse key-by-key, unioning the
   keyspace of `base ∪ left ∪ right` and appending the key to `context.path`.
5. Only at a genuine leaf disagreement (both sides changed the same
   non-object value, or the shapes diverge) does it push a
   `CanvasMergeConflict` and consult `resolutions[conflictId]`, defaulting to
   `left` when unresolved.

`same()` is `JSON.stringify` equality — a real limitation (key order and
`undefined` handling ride on `JSON.stringify` semantics) but it keeps the
whole merge dependency-free and it's consistent since both sides go through
the same serializer.

Two outer layers use this: `mergeCollection` (`merge.ts:96-117`) merges
`document.nodes` and `document.tokens` as collections — union the id set,
`mergeValue` each id's full record against base/left/right, drop entries that
resolve to `missing` (i.e., a deletion that isn't contested). `mergeDocuments`
(`merge.ts:133-210`) then merges each top-level document field (`name`,
`breakpoints`, `themes`, `activeThemeId`) individually, calls
`mergeCollection` for `nodes` and `tokens`, and re-validates the merged result
with `assertDocument` before returning it. Conflict ids are
`"scope:targetId:path"` (e.g. `node:hero:layout.x`, confirmed in
`merge.test.ts:36`) — stable, human-diffable strings a caller can map straight
to a `"left" | "right"` resolution and hand back on retry.

The granularity is the interesting part: because recursion goes field-by-field
through nested objects, two edits to *different* fields on the *same node*
never conflict (`merge.test.ts:17-27`, one side moves `layout.x`, the other
renames — both apply cleanly). Only a genuine same-field, both-sides-changed
collision surfaces as a conflict, scoped to that exact path.

`mergeDocuments` is called from `packages/rpc/src/branches.ts` at
`applyDraft` time (`branches.ts:465-476`): it's a three-way merge of
`baseDocument`/`mainDocument`/`draftDocument`, run against the caller-supplied
`resolutions` map, and if `unresolved.length > 0` the apply is rejected and
the conflicts are returned instead of committing anything
(`branches.ts:492-498`) — merge and commit are two separate calls, not one.

### Agent-facing skill: `skills/loora-design-guide/`

Structure: `SKILL.md` (124 lines) is a thin dispatcher, not a rulebook — it
states a 9-step core loop (orient → protect target → form a direction →
establish system → build in batches → inspect → refine → verify structure →
finish deliberately), a short list of "preserve Canvas semantics" invariants,
an efficiency section, and a failure table, then explicitly defers depth to
four references and tells the agent *not* to load all of them for a small
edit:

- `references/tool-workflows.md` (238 lines) — target model (`designId`/
  `draftId`), a full tool-to-purpose table split into four groups
  (orientation, structured authoring, visual/delivery, lifecycle), a
  numbered "create a new design" / "edit an existing design" / "use branches
  safely" procedure, screenshot usage constraints, hard numeric limits
  (`searchNodes` caps at 200 matches, `createPage`/`insertNodes` at 5000
  descriptors, `patchNodes`/`moveNodes`/`deleteNodes` at 1000, tree depth
  capped at 10/20), and a **failure table** (`tool-workflows.md:224-237`)
  mapping exact signals to responses, e.g. `CANVAS_UNAVAILABLE` → "choose/
  create a structured design", `Branch is read-only` → "Reopen only if the
  user wants to continue editing", `Main or branch changed` → "Re-run
  `compareBranch` and use fresh revisions". SKILL.md's own "Handle failure
  without thrashing" section is a prose duplicate of the same table, aimed at
  read order rather than lookup.
- `references/canvas-authoring.md` — schema-level authoring reference (node
  descriptors, NodeRefs, tokens, responsive overrides, interactions,
  components, motion); loaded only "before constructing unfamiliar node
  descriptors."
- `references/design-craft.md` (239 lines) — this is the design-taste
  content the prompt asked to verify. It opens with "Choose a direction":
  reduce the brief to audience/job/feeling/density/domain-cues/constraints,
  then write **one internal sentence** ("A quiet, editorial analytics
  workspace with strong numeric hierarchy...") and use that sentence to
  reject incoherent choices later. A named **"Avoid generic agent output"**
  section (`design-craft.md:146-166`) lists concrete smells — "a large
  gradient heading plus three identical cards regardless of product,"
  "excessive rounded pills," "iconless buttons with vague labels such as
  'Get Started'," "purple/blue gradients chosen without direction," "empty
  charts or fake metrics" — and its fix is "replace generic patterns with
  domain evidence," giving three worked substitutions (deployment tool →
  topology/logs/environments; writing tool → pages/revisions/margins; finance
  → ledger density). A **refinement order** closes the doc
  (`design-craft.md:224-238`): fix broken structure/clipping first, then
  hierarchy/primary action, then page grid, then typography, then contrast/
  tokens, then component/interaction consistency, then imagery, then motion
  last — "avoid polishing a shadow while the hero's reading order is still
  wrong."
- `references/worked-examples.md` — concrete payload patterns, loaded only to
  avoid schema guesswork.
- `agents/openai.yaml` — a four-line manifest (`display_name`,
  `default_prompt`, an MCP tool dependency pointing at
  `https://mcp.loora.design/mcp`) for whatever runner consumes non-Claude
  skill manifests; not Claude-Code-specific.

The `avoid-generic-output` and `refinement-order` content is genuinely
reusable *prose* — it doesn't depend on Loora's tool surface, and some of its
smell-list overlaps with what our own `ui-collisions` skill already tracks. It
would be legitimate to write our own version of this guidance from scratch
(same ideas, our own words) for a design-craft note aimed at Claude Code
generating variations; copying Loora's wording verbatim is not permitted
under AGPL-3.0 regardless of it feeling low-stakes.

### A related, smaller mechanism worth noting: self-healing layout repair

`packages/agent/src/repair-layout.ts` (85 lines) is not in the original
candidate list but is worth flagging: it's a narrow, well-reasoned heuristic
for one specific LLM authoring mistake. When an agent inserts nodes without
specifying flow, they default to absolute-positioned at `(0,0)`, and every
section stacks on top of each other. `repairStackedLayout` finds nodes with
`layout.position === 'absolute'` and `x === y === 0`
(`repair-layout.ts:19-26`), and — only when the parent already arranges
children itself (flex/grid) or when at least two siblings are piled at the
same origin (`repair-layout.ts:64-68`, so a deliberate lone absolute overlay
is left untouched) — rewrites them back into normal flow, and drops the
320×200 placeholder box on text nodes that never got a real size
(`repair-layout.ts:69,77-79`). It's a good illustration of a general
principle: encode a known agent failure mode as a narrow, reversible,
conservative structural fix rather than a prompt instruction hoping the model
won't make the mistake — a pattern relevant to us independent of Loora's
document model, since it applies to any code an agent generates.

### Streaming / structuring agent output: doesn't beat our stream-json parser

Checked directly rather than assumed: Loora's MCP server does not stream
anything resembling the assistant's reasoning or tool-call trace to a
watcher. Two things exist and neither is a token-level stream:

- Tool *results* go back as compact single-line JSON
  (`apps/mcp/src/server.ts` `json()` helper — `JSON.stringify` with no
  indentation, with a comment noting indentation was "~30% extra tokens on
  every read"), plus an optional `_meta['loora/usage']` envelope carrying
  remaining metered usage. That's a minor, sensible detail (strip
  indentation from JSON fed back into a model) but it's about response
  *payload* shape, not about streaming.
- `apps/mcp/src/agent-activity.ts` (174 lines) is realtime *presence*, not a
  parse of agent output: on every `registerTool` call, `trackAgentActivity`
  looks up a static `TOOL_LABELS` map (tool name → human label like
  `"Editing elements"`), extracts the node ids the call's *arguments*
  mention (`agentActivityNodeIds`, reading `args.changes[].ref`,
  `args.nodeIds`, etc. — read from arguments so it can fire before the call
  resolves), and publishes a `{ phase: 'working' | 'settled' }` event over
  the websocket hub so a human watching the editor sees a badge and a ringed
  node while the agent is mid-edit. Concurrent calls against the same
  document share one logical "run" via a depth counter
  (`agent-activity.ts:118,141,160-161`) so parallel tool calls don't flicker
  the badge on and off.

Neither mechanism gives finer-grained visibility into what the agent is
*doing* than our own `server/lib/claude-jsonl.ts` Tier-3 parsing of
`tool_use`/`tool_result` events from Claude Code's own `stream-json` output —
if anything it's coarser (one static label per tool name, chosen for a
five-word badge, not per-argument detail). The structural reason is that
Loora's agent connects over MCP, which exposes only discrete request/response
tool calls — the protocol has no channel for the agent's own token stream,
so nothing on Loora's side *could* beat a direct stdout parse of the CLI's own
stream-json. This is the one candidate from the brief that verification ruled
out rather than confirmed.

## 3. What they do that we deliberately won't

| Loora mechanism | Why it doesn't fit us |
|---|---|
| **MCP tool surface** (`apps/mcp`, ~33 `registerTool` calls, remote OAuth 2.1 resource server at `mcp.loora.design` plus a local stdio variant in `stdio.ts`) | MCP exists to give a *remote* agent, with no filesystem access, a way to describe a UI it can't otherwise touch. Claude Code already runs inside the host's own repo with full read/write filesystem access — there is nothing across a process/network boundary to bridge. Standing up an MCP server (plus its own OAuth resource-server metadata endpoints, session verification against a shared DB, `Streamable HTTP` transport) would add an entire indirection layer to reach state Claude Code can already touch directly with `Edit`/`Write`/`Bash`. |
| **Database-backed branching/versioning** (`packages/rpc/src/branches.ts`: `designDraft` rows with `status: active/proposed/applied/closed`, `revision`-based optimistic concurrency on every write, `applyDraft` running `mergeDocuments` against exact expected revisions, `designVersion` snapshots written before/after apply) | We live inside the host's real git repository and use plain git branches (per our own architecture doc). Git already gives us history, diff, and branch isolation; a parallel Postgres-backed draft/version system would duplicate what git does for free, and it requires a database and a persistent server process — both explicitly ruled out by our "zero footprint on the host, no database, no server process of its own" constraint. Loora needs this machinery *because* it has no git to lean on (the canvas document is the only source of truth, stored in Neon). |
| **Realtime multiplayer presence** (`apps/ws`, `agent-activity.ts` publishing over a websocket hub, `packages/realtime` wire protocol/connection tickets) | We're explicitly single-player (solo builders); there's no second viewer to show a "the agent is editing this node" badge to. This is infrastructure (a whole `apps/ws` service plus Redis-backed bus per `redis-bus.test.ts`) purely in service of multiplayer, which we don't have. |
| **Chromium-based screenshot rendering** (`apps/mcp/src/screenshot.ts`: compiles the document to standalone HTML via `compileStandaloneHtml`, then screenshots it through a pooled, concurrency-gated headless `playwright-core` Chromium instance, with its own idle-resource lifecycle and byte/dimension caps) | This exists because Loora's document model is a synthetic representation that has to be *compiled* to something renderable before it can be seen. Our previews render live in the real DOM inside the host app (React DOM, no iframe, no synthetic export) — there's nothing to compile and nothing to screenshot; what the agent would screenshot is already on-canvas and already real host markup. Adding a headless-Chromium dependency and a browser-pool lifecycle would be pure infrastructure weight solving a problem we don't have. |
| **Usage metering / billing gating on every tool call** (`McpUsageController`, `McpUsageLimitError`, `PlanLimitError` wrapping every `registerTool` handler in `server.ts`) | Multi-tenant SaaS concern (weekly MCP allowance, plan limits) with no analog in a local, single-user dev tool with no accounts or plans. |

Everything in this table is specifically wrong *for us* because it solves a
problem (remote agent access without filesystem rights, no git to rely on,
multiple simultaneous viewers, a non-real preview surface, paying customers)
that our constraints mean we don't have — not because the mechanisms
themselves are poorly built. Loora's MCP tool schemas, merge algorithm, and
skill structure are the parts worth having read closely; the service shell
around them is not.
