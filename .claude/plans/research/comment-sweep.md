# TASK: Audit code comments for stale claims — report only, do not edit

Stack: TypeScript + React 19 + Vite (host-compiled, no build step here), Hono server.
Repo: `design-playground`, branch `chore/cleanup`. Windows host — use Git Bash for shell.

## OBJECTIVE

Find comments that **describe behavior the code no longer has**, and report them. This codebase is
read by LLM agents that trust its comments; a confidently-worded stale comment sends them down a
path that no longer exists. That is the bug class you are hunting.

**You produce a report. You do not change any file.** No edits, no renames, no refactors, no
reformatting, no adding comments. One deliverable: `tasks/comment-sweep-report.md`.

## SCOPE

Read every block comment (`/** … */`, `/* … */`) and every multi-line `//` comment in:

```
app/**/*.{ts,tsx}
features/**/*.{ts,tsx}
shared/**/*.{ts,tsx}
server/**/*.{ts,tsx}
```

Skip: `iterations/`, `discovered-registry.gen.tsx` (generated), `node_modules/`, `.claude/`,
`skills/`, and any `*.md`. Skip single-line comments that only label a section
(`// ---- Types ----`) or restate the next line.

## METHOD

For each comment that makes a **factual claim**, verify it:

1. **Claims about this file** — check the code below/around it. Does the function still do that?
   Do the named variables still exist? Is the ordering it describes still the ordering?
2. **Claims about other files or symbols** — grep for them. Does the path exist? Does the symbol
   still get exported/imported?
3. **Historical claims** ("previously X", "this replaced Y", "used to Z") — run
   `git log -p --follow -- <file>` and check the claim is (a) true and (b) still worth saying. A
   historical note that is true but useless is a weaker finding than one that is false; grade it
   `low`.
4. **Claims about behavior under conditions** ("survives HMR", "runs before X", "never called when
   Y") — trace the actual call sites. These are the highest-value findings because they are the
   ones grep cannot catch and a reader cannot spot-check.

**Only report what you have verified.** If you cannot determine whether a claim holds, list it in a
separate "unverified" section with what you'd need to resolve it. Do not guess. A wrong finding in
this report costs more than a missed one, because I will act on it.

## KNOWN TRUE POSITIVES (already found and fixed — use to calibrate)

These four were caught by grepping for dead identifiers. They are already fixed; do not re-report
them. They show the shape of what counts:

| File | The claim | Why it was false |
|---|---|---|
| `CONTEXT.md:11` | Relative root is "fetched once from the server" | It is a Vite `define` injection. The route that served it was deleted. |
| `shared/lib/constants.ts:113` | Module regenerated "on every add/remove" | There is no add/remove flow any more. |
| `shared/ui/playground-nav-icons.tsx:47` | Points at `nodes/shared/iterate-dialog/icons.tsx` | Path has not existed for two refactors. |
| `shared/lib/model-selection.ts:6` | "Previously `shared/ui/iterate-dialog/parts.tsx`" | True, but archaeology git already records. |

I have already grepped the whole tree for the vocabulary of removed concepts: `DiscoveryModal`,
`discovery.prompt`, `props-fetchers`, `fetchPropsSnapshot`, `propsInterface`, `iterate-dialog`,
`react-router`, `penpal`, `SizeButtons`, `ComponentPreviewCard`, `registry-tree`, `playground-root`,
`model-icons`, `inline-css`, `StylingMode`, `maxTurns`, `baseRegistry`, `data-iframe-overlay`,
`DEFAULT_PROVIDER_ID`, `ProviderId`. **Those came back clean.** Do not spend time re-running that
sweep — your value is in the comments those greps cannot reach.

## CONTEXT: what changed recently (so you know what claims to distrust)

- **No router.** `react-router-dom` was removed. `dev-entry.tsx` is a bare `createRoot`.
- **No iframes, no penpal.** Previews render inline in the same document; element selection is
  plain DOM traversal.
- **Claude Code is the only agent.** The multi-provider seam is gone — no `providers/` directory.
- **The registry is discovery-fed.** `registry.tsx` has no hardcoded entries. Static discovery
  (`server/lib/static-discovery/`) replaced an LLM scan.
- **The per-component "Add to Playground" flow was deleted**, along with its serial agent spawns.
- **`server/routes/playground-root.ts` was deleted**; the root is injected by the Vite plugin.
- **Max turns** was removed from the agent options and spawn args.
- **`registry.tsx` gained a real `import.meta.hot.accept`** — comments claiming HMR works there are
  now *true*; do not report them as stale.
- **Constants were pulled out of `shared/lib/constants.ts`** into their single consumers.

## AREAS MOST LIKELY TO YIELD

Spend your time here first:

1. `features/generation/` and `features/iterations/` — the lifecycle/coordination/SSE comments.
   Several describe a polling reconciliation loop that was deleted.
2. `server/routes/generate.ts` and `server/lib/` — process handling, lockfile recovery, the
   stream-json parser. Comments about what triggers what.
3. `features/canvas/hooks/` — several hooks changed ownership of state during the refactor; check
   comments describing who owns what.
4. `shared/lib/canvas-persistence.ts` — comments about the persisted shape and legacy migration.
5. Any comment containing: "always", "never", "only", "before", "after", "guaranteed", "survives",
   "prevents". Absolute claims are the ones that rot.

## REPORT FORMAT

Write `tasks/comment-sweep-report.md`:

```markdown
# Comment sweep — findings

## Confirmed stale (N)

### 1. `path/to/file.ts:42` — severity: high|medium|low
**Claims:** <quote the comment, trimmed>
**Reality:** <what the code actually does>
**Evidence:** <the line numbers / grep / git commit that proves it>
**Suggested wording:** <one line, or "delete">

## Unverified (N)
| File:line | Claim | What I'd need to resolve it |

## Checked and correct (count only)
<a number, plus a one-line note on any comment that surprised you by being accurate>
```

Severity: **high** = would send a reader to a nonexistent file or a deleted code path.
**medium** = describes behavior that changed but is recoverable from context.
**low** = true but useless archaeology.

Sort confirmed findings by severity, highest first.

## HARD RULES

- **Do not edit any source file.** The only file you create is the report.
- Do not report style opinions ("this comment is too long", "this should be a docblock").
- Do not report missing comments. Absence is not the target.
- Do not report a comment as stale because it is *vague*. Only because it is *wrong*.
- If a comment is accurate, say nothing about it — just include it in the count.
- Quote comments verbatim. Do not paraphrase in the "Claims" field.
