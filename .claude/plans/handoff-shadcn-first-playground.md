# Handoff prompt — ShadcnUI-first playground + Tailwind inspector

**Use this as the system/task prompt for the next agent.**  
**Goal:** Pivot `design-playground` into a **ShadcnUI-first** local React playground: left project/layers rail, **right Tailwind class inspector** (main focus), chat as a **sidebar panel** (not a floating bottom dock). Scan everything Shadcn-related before writing code.

---

## Product intent (lock this)

You are building a **local-dev-only** design canvas for hosts that use **shadcn/ui** (Radix + Tailwind v4).

**North star UX (target layout):**

```
┌─────────────────┬──────────────────────────────┬─────────────────┐
│ Left sidebar    │ Canvas                       │ Right panel     │
│ (project /      │ (live React components,      │ Tailwind        │
│  layers /       │  NOT iframes)                │ inspector       │
│  primitives)    │                              │ (Figma-like,    │
│                 │                              │  but classes)   │
├─────────────────┴──────────────────────────────┴─────────────────┤
│ Chat / agent panel (docked as a sidebar region — NOT bottom HUD) │
└──────────────────────────────────────────────────────────────────┘
```

**Main focus now:** the **right Tailwind editor/inspector** — edit a selected component’s visuals the way Figma edits tokens, but the medium is **Tailwind utility classes**.

**Hard constraints (do not violate):**
- Zero host `package.json` / lockfile churn (nested install under playground).
- Claude Code only agent.
- **Never write host source for identity stamps** (Vite transform only if stamping).
- **Radix overlays** (Dialog, Sheet, Popover, Tooltip, DropdownMenu, Select, …): **list in tree, never live-mount** until a portal containment story exists.
- Features never import other features; compose in `app/`; promote to `shared/` only when 2+ consumers need it.
- No LLM component scan. Deterministic discovery only.
- Playground chrome stays light; preview light/dark is a separate control (`preview-color-scheme-store`).

---

## What “ShadcnUI-first” means in this repo

1. **Host UI dir** comes from shadcn’s `components.json` → `aliases.ui` (already read in `server/lib/static-discovery/host-config.ts`).
2. **Primitives tab / scan** = files under that UI dir + CVA variant extraction (`scan.ts` / `extractCva`).
3. **CSS variables / `@theme inline`** = Tailwind v4 token story (`tokens.ts`). Dark mode is typically `.dark` class + CSS variable swaps — **not** a second Tailwind build.
4. **Overlay policy** is a shadcn/Radix fact of life (`OVERLAY_PRIMITIVES` in `scan.ts`).
5. Future Tailwind inspector must speak **utility semantics**, not invent a parallel token system. Examples the product must explain/edit:

| Tailwind | What it really does |
|----------|---------------------|
| `tracking-*` | letter-spacing (typesetting “tracking”) |
| `leading-*` | line-height (print “leading”) |
| `proportional-nums` / `tabular-nums` | `font-variant-numeric` shortcuts |
| `space-x/y-*` | sibling-selector margins (not native CSS) |
| `divide-x/y-*` | borders between siblings only |
| `truncate` | overflow + ellipsis + nowrap bundle |
| `rounded-*` | border-radius, friendlier name |
| `shadow-*` | box-shadow without the “box” |
| `ring-*` | engineered box-shadow stack mimicking outline that follows radius |

**Dark theme (host / shadcn):** usually CSS variables under `:root` and `.dark` (or `data-theme`), mapped through `@theme inline`. Playground chrome must **not** follow host dark; only preview nodes do (see Part 3 plan).

---

## Your first job: SCAN (read-only), then report

Do **not** implement the Tailwind inspector yet. Produce a structured scan report.

### A. Inventory every Shadcn touchpoint

Search and open (repo root = design-playground package):

| Area | Paths / patterns |
|------|------------------|
| Host config | `server/lib/static-discovery/host-config.ts` (`components.json`, aliases, cssPath, iconLibrary) |
| Primitive scan | `server/lib/static-discovery/scan.ts` (`scanPrimitives`, `OVERLAY_PRIMITIVES`, CVA) |
| Tokens | `server/lib/static-discovery/tokens.ts` |
| Discover API | `server/routes/discover.ts` |
| Client scan hook | `features/registry-sidebar/useStaticScan.ts` |
| Sidebar UI | `app/PlaygroundSidebar.tsx`, `features/registry-sidebar/*` |
| Registry pipeline | `discovered-registry.json`, `discovered-registry.gen.tsx`, `registry.tsx`, `registry-types.ts`, `server/lib/discovered-registry.ts` |
| Live mount | `features/canvas/nodes/ComponentNode.tsx` (inline React, `data-iframe-overlay` is a **click catcher name**, not an iframe) |
| Selection | `features/canvas/hooks/useElementSelection.ts`, `shared/lib/element-context.ts` |
| Preview theme | `shared/stores/preview-color-scheme-store.ts` |
| Plans | `.claude/plans/2-discovery-engine.md`, `.claude/plans/3-sidebar-and-ui.md`, `CLAUDE.md` |
| Host (if available) | Host `components.json`, `src/components/ui/*`, CSS entry with `@theme` / `.dark` |

Also grep: `cva(`, `components.json`, `aliases.ui`, `OVERLAY_`, `data-iframe-overlay`, `previewScheme`, `@theme`, `.dark`.

### B. Answer these scan questions (required)

1. What does the host’s `components.json` declare (style, rsc, aliases, cssVariables, iconLibrary)?
2. Which primitives are flagged `overlay: true` today? Is the list complete for this host?
3. How are light/dark CSS variables structured in the host? Where would a Tailwind inspector read “current computed utilities” vs “source className string”?
4. Where does a selected DOM node’s `className` become available today (element selection path)? What’s missing for a class editor?
5. Gap: scan → `writeManifest` → `regenerateModule` — still unwired. What exportKind/prop defaults would shadcn primitives need to mount safely?
6. Chat is `features/chat/DockedChatBar.tsx` (bottom proximity dock). What must move to make it a **sidebar chat panel** without breaking submit / skills / pills?
7. Right edge is free once chat leaves the bottom — confirm nothing else claims it (`PlaygroundCanvasToolbar` position).
8. List every file that assumes “bottom docked chat” layout (CSS, proximity hook, PlaygroundClient flex).

### C. Tailwind inspector — design brief (do not build yet; propose)

Propose a **deep module** interface (codebase-design vocabulary):

- **Input:** selected canvas node + optional Alt-selected element context.
- **Output:** proposed className edits (and eventually a write path — out of scope for v1 unless specified).
- **Groups:** Typography & sizing · Layout & spacing · Visuals & borders (include the semantic table above).
- **Non-goals for v1:** writing host source; full Figma auto-layout; editing overlay primitives live.

Prefer **one inspector module** with a small public API over a pile of one-control files.

### D. Cleanup debt to fold into the same pass (approved)

| Item | Action |
|------|--------|
| `ModelSettingsModal` **max turns** field | **Delete** from UI + stop sending `maxTurns` if unused (confirm `agent-config` / generate body). |
| `ComponentPreviewCard.tsx` | **Rename** — it’s a drag row, not a preview card (e.g. `RegistryDragRow` / `ComponentListItem`). |
| `shared/lib/model-icons.ts` | **Done** — deleted; CSS `.claude-agent-mark` only. |
| Re-exports | Drop `GenerationCoordination` re-export from `useGenerationCoordination.ts`; drop `CanvasRelation` re-export from `canvas-relations.ts` if unused. |
| `fill-template.ts` | Prefer inlining `{{key}}` replace next to prompt builders **or** one shared helper colocated with prompts — user does not want a lone 10-line file forever; lean prompts further (see companion HTML). |
| `FrameHoverHint` | **Fixed** (pointerdown hide + window pointermove). Re-verify after layout moves. |
| `SizeButtons.tsx` | Rename to something like `PreviewViewportButtons` / `NodeViewportSizeControl`. |

### E. Explicit non-goals

- Do not reintroduce LLM discovery / analyze routes.
- Do not iframe previews “to fix overlays” without an explicit containment design.
- Do not implement Onlook-style host source rewriting / `data-oid`.
- Do not build runtime bippy enrichment in this pass.

---

## Deliverable format for the scan agent

1. **Verdict** (5 sentences): is the repo ready for a Shadcn-first + Tailwind inspector bet?
2. **Shadcn map** — table of files → role → inspector relevance (high/med/low).
3. **Dark / tokens story** — how host + playground preview themes work today.
4. **Layout migration checklist** — DockedChatBar → sidebar chat; right inspector shell.
5. **Risks** — overlays, HMR, className vs CVA variants, write-back ambiguity.
6. **Recommended first PR slice** — smallest shippable inspector shell (read-only class display) + renames + maxTurns deletion.

**Companion explainers (human):**
- `.claude/plans/codebase-end-to-end.html` — full file map
- `.claude/plans/handoff-before-after.html` — cleanup before/after
- `.claude/plans/qa-shadcn-tailwind.html` — plain-English answers to open questions

**Reference plans:** `.claude/plans/2-discovery-engine.md`, `.claude/plans/3-sidebar-and-ui.md`, `CLAUDE.md`.
