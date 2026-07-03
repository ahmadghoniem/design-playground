# Build the Understand-Anything knowledge graph for design-playground

Stack: TypeScript/React + Vite + Hono (Node 22, Bun-based project). Windows host, but use the **Bash tool / Git Bash** for shell — POSIX syntax works.

## OBJECTIVE (single goal)
Produce a valid `.understand-anything/knowledge-graph.json` for this repo by executing the
Understand-Anything workflow **autonomously as one agent**. You are NOT Claude Code and have NO
"Task" subagents — wherever the spec says "dispatch a subagent using agent X", you instead
**read that agent's definition file and perform its role yourself, inline**, writing the same
output file the spec names.

## AUTHORITATIVE SPEC
Follow the phase workflow in this file exactly (it documents inputs/outputs/script usage):
`C:/Users/Ahmed Ibrahim/.claude/plugins/cache/understand-anything/understand-anything/2.8.1/skills/understand/SKILL.md`

Agent role definitions (read the relevant one before doing that phase's reasoning):
`C:/Users/Ahmed Ibrahim/.claude/plugins/cache/understand-anything/understand-anything/2.8.1/agents/`
  - project-scanner.md, file-analyzer.md, architecture-analyzer.md, tour-builder.md, graph-reviewer.md, assemble-reviewer.md

## RESOLVED VARIABLES (Phase 0 is already done — do NOT redo it)
- PROJECT_ROOT = `C:/Users/Ahmed Ibrahim/Documents/GitHub/design-playground`
- PLUGIN_ROOT  = `C:/Users/Ahmed Ibrahim/.claude/plugins/cache/understand-anything/understand-anything/2.8.1`
- SKILL_DIR    = `$PLUGIN_ROOT/skills/understand`
- Git commit hash = `dbf93c7d652391ce7c20ac34d9ce9b7d6757e533`
- This is a FULL analysis (no existing graph).
- The core package is already built (`$PLUGIN_ROOT/packages/core/dist/index.js` exists). Do not rebuild it.
- Output dirs already exist: `$PROJECT_ROOT/.understand-anything/intermediate` and `/tmp`.
- `.understand-anything/.understandignore` is already configured (artifact/generated dirs excluded). Do NOT regenerate it. Respect it.
- Project: **design-playground** — a local-dev-only React/Vite design canvas embedding into a host app, with a Hono backend mounted into Vite. Entry point: `dev-entry.tsx`. Languages: TypeScript/TSX, CSS. Read `README.md` and `CLAUDE.md` for context.

## BUNDLED SCRIPTS (use these — do NOT re-implement their logic)
All in `$SKILL_DIR`. If unsure of a script's CLI args, run it with no args or read its source first.
- `scan-project.mjs` — deterministic file scan (Phase 1). Read its source to learn invocation; it writes `.understand-anything/intermediate/scan-result.json`.
- `compute-batches.mjs $PROJECT_ROOT` — writes `intermediate/batches.json` (Phase 1.5).
- `extract-structure.mjs` / `extract-import-map.mjs` — deterministic structural extraction the file-analyzer role uses per batch. Read source for usage.
- `merge-batch-graphs.py $PROJECT_ROOT` — merges all `intermediate/batch-*.json` → `intermediate/assembled-graph.json` (Phase 2 end). Capture its stderr.
- `build-fingerprints.mjs <fingerprint-input.json>` — Phase 7 baseline; MUST succeed before writing meta.json.

## EXECUTION ORDER (per SKILL.md)
1. **Phase 1 SCAN** — run `scan-project.mjs` deterministically; read `scan-result.json`. If >100 files, just proceed (note it).
2. **Phase 1.5 BATCH** — run `compute-batches.mjs`.
3. **Phase 2 ANALYZE** — for each batch in `batches.json`: read `file-analyzer.md`, run the structural extraction script for that batch's files, then add LLM summaries/tags/semantic edges, and write `intermediate/batch-<batchIndex>.json` (or `-part-<k>.json`). **Output filename MUST be `batch-<batchIndex>.json`** — the merge regex drops anything else. Then run `merge-batch-graphs.py`.
4. **Phase 3 ASSEMBLE REVIEW** — read `assemble-reviewer.md`, sanity-check `assembled-graph.json`, recover obvious dropped/cross-batch edges. (Lightweight — don't block on it.)
5. **Phase 4 ARCHITECTURE** — read `architecture-analyzer.md`; produce `intermediate/layers.json`, then normalize per SKILL.md (array of {id,name,description,nodeIds}; every file-level node in exactly one layer).
6. **Phase 5 TOUR** — read `tour-builder.md`; produce `intermediate/tour.json` (array of {order,title,description,nodeIds}).
7. **Phase 6 REVIEW** — assemble the full KnowledgeGraph object (version 1.0.0, project metadata with the commit hash above, nodes, edges, layers, tour). Run the inline deterministic validator described in SKILL.md Phase 6 "Default path" (write the `.cjs` validator it gives, run it, read `review.json`). Apply the automated fixes it lists for any issues.
8. **Phase 7 SAVE** — write `.understand-anything/knowledge-graph.json`; build the fingerprint baseline via `build-fingerprints.mjs` (must print `Fingerprints baseline:` and exit 0 BEFORE meta.json); write `meta.json` with lastAnalyzedAt, the commit hash, version 1.0.0, analyzedFiles. Do the trash-dir cleanup but **preserve `intermediate/scan-result.json`**. Do NOT auto-launch any dashboard.

## SCHEMA (must match — see SKILL.md "Reference: KnowledgeGraph Schema")
- 13 node types: file, function, class, module, concept, config, document, service, table, endpoint, pipeline, schema, resource — with the ID conventions in SKILL.md (e.g. `file:<relative-path>`, `function:<rel>:<name>`).
- 26 edge types (imports, exports, contains, calls, depends_on, tested_by, configures, related, etc.) with the weight conventions in SKILL.md.
- Every node needs id, type, name, summary, non-empty tags. Every edge's source/target must reference an existing node id.

## CONSTRAINTS
- Do NOT modify any project source files. Only write under `$PROJECT_ROOT/.understand-anything/` and `$PROJECT_ROOT/.claude/`.
- Do NOT rebuild the plugin or run `pnpm install`. The core dist is already built.
- Do NOT regenerate `.understandignore`. Honor its exclusions.
- Use the bundled scripts for scan/batch/merge/fingerprints — do not hand-roll them.
- Save PARTIAL results if a phase fails; never abort with nothing written. A partial graph beats no graph.
- Generate all textual content in English.

## VERIFY (final, must all pass)
1. `test -f "$PROJECT_ROOT/.understand-anything/knowledge-graph.json"` and it is valid JSON.
2. grep for `"nodes"` and `"edges"` and `"layers"` and `"tour"` in `knowledge-graph.json` — all four keys present and non-empty arrays.
3. `test -f "$PROJECT_ROOT/.understand-anything/meta.json"` containing `dbf93c7d652391ce7c20ac34d9ce9b7d6757e533`.
4. Report node count, edge count, layer count, tour step count, and any phases that produced warnings or were skipped.
