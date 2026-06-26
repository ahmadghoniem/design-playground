# Task 11 — Deepen `components/modals/DesignSystemModal.tsx` (1604 LOC)

**Type:** deepening · **Risk:** medium · **Depends on:** none · **Blast radius:** internal + new files under `components/modals/design-system/`

## The problem

One 1604-line file holds the modal shell, a `Section` state machine (`'home' | 'preview' | 'edit' | 'check' | 'history' | 'export' | 'spec'`), **all** section bodies, **and** the CLI/status plumbing. The section components (`HomeSection`, `EditSection`, `ActionSection`, `ExportSection`, `SpecSection`, `PreviewSection`, plus card leaves `ColorCard`, `TypographyCard`, `ShowcaseCard`, `FormatCard`, `ResultCard`, `ReadyBadge`, `Switch`, `SectionShell`, `CircleIcon`) are all inlined. The CLI calls (`/playground/api/design/*` for status/setup/preview/export) are interleaved with rendering. 38 hooks in one file.

This is shallow-by-accumulation: a wide interface (every section + every card + every CLI call) with no internal seams.

## Dependency classification

- Section rendering: **in-process** (pure presentational, given data + callbacks).
- CLI/status: **local-API** (`fetch('/playground/api/design/...')`). One adapter → keep direct `fetch` behind a hook; no port needed.

## Target seams

1. **`useDesignSystemCli` hook** (`components/modals/design-system/useDesignSystemCli.ts`) — the deep one. Absorb status polling, `setup`, `preview` fetch, `export`, and the `StatusResponse`/`CliResult` lifecycle. Interface: `{ status, loading, runSetup(), runExport(fmt), result, ... }`. Sections consume this; none of them call `fetch` directly.
2. **One file per section** under `components/modals/design-system/`: `HomeSection.tsx`, `EditSection.tsx`, `ActionSection.tsx`, `ExportSection.tsx`, `SpecSection.tsx`, `PreviewSection.tsx`. Each takes props from the modal + the CLI hook.
3. **`components/modals/design-system/cards.tsx`** — the leaf cards (`ColorCard`, `TypographyCard`, `ShowcaseCard`, `FormatCard`, `ResultCard`, `ReadyBadge`, `Switch`, `SectionShell`, `CircleIcon`). Small, presentational, shared by sections.
4. **`DesignSystemModal.tsx` becomes the shell** — owns the `Section` router (`PRIMARY_NAV`/`SECONDARY_NAV`), the `useDesignSystemCli` instance, and renders the active section. Target: under ~250 LOC.

## Method

- Move the CLI/status logic into the hook **first**; have the existing inline code call the hook. Confirm the modal still works. Then split sections into files, passing the hook's values down.
- Sections must be **presentational + callbacks** — no `fetch` inside a section. That is the seam: the CLI hook is the single place I/O happens (locality).

## Extraction gate (run after each new file)

Every section/card/hook you move into `components/modals/design-system/` sits one level deeper than the original — its relative imports change depth (`'../../lib/x'` → `'../../../lib/x'`, `'./cards'` stays sibling). Fix them **to the end of each moved block** (Operating Rule 1 — don't stop partway), then:
```
git grep -nE "from '\.\.?/(lib|nodes|prompts|hooks|components|server|ui|registry|skills|data)" -- components/modals/design-system/
```
Every hit must resolve. Then confirm `DesignSystemModal.tsx` **imports** each section/hook (it didn't keep a copy) and shrank.

## Verification

- Open the Design System modal. Walk every nav item: Home, Preview, Edit, Check, History, Export, Spec. Each renders as before.
- Run Setup (calls `/playground/api/design/setup`), generate a Preview, run an Export. Status badge updates. Result cards render success/error identically.
- No section component issues a `fetch` (`git grep -n "fetch(" components/modals/design-system/*Section.tsx` → empty).

## Done when

The modal is a thin section-router over a deep CLI hook and per-section files, all I/O localized in `useDesignSystemCli`, behaviour unchanged.

## Do NOT

- Do not change the `/playground/api/design/*` request/response contract.
- Do not merge sections into a mega-switch; keep them as separate deep-ish modules.
