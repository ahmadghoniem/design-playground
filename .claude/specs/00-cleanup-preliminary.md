# Cleanup — preliminary

The `master`-branch cleanup that lands before any feature spec, so every feature branches off a clean
base. Lands on `master` alone, then gets pushed.

**Scope: master as it stands, plus the cnfast port.** Only the items below — each blocks a feature
spec or is a flagged bug; nothing is pulled in opportunistically. Items that exist only on
`feat/layers-sidebar` (the discovery scan's primitives-naming fix, the `/api/discover/analyze` route)
belong to whichever branch reintroduces discovery, not here.

**Landed this pass:** cnfast, the constants tidy, and the element-selection fixes.
**Remaining:** Base UI, the comment-sweep trims, the density-preset read. **Deferred:** de-arbitrary
Tailwind.

## Work

- **Radix UI → Base UI** for the four primitives in use — `alert-dialog`, `dialog`, `slot`, `tooltip`.
  Same public API, so an implementation swap, not a new abstraction; Base UI is shadcn's default as of
  July 2026. Manual migration is viable at four primitives (or `skills add shadcn/ui` →
  *"migrate dialog to base-ui"*, with commands adapted to Bun). Base UI's `Portal` takes a `container`
  prop that traps the overlay in the preview card's DOM subtree — but a `position: fixed` overlay still
  paints over the viewport, so overlay/portal primitives stay listed-but-not-mounted in the registry,
  as today.

- **clsx + tailwind-merge → cnfast.** `shared/lib/utils.ts` re-exports `cn` + `ClassValue` from
  `cnfast` (byte-identical output, ~3.8× faster), matching the host's `src/utils/styling.ts`. `cnfast`
  is a `package.json` dependency; `bun.lock` is gitignored here (nested install, local-dev only), so a
  fresh clone resolves it through `setup.mjs`'s `bun install` — there is no lockfile to commit.

- **De-arbitrary Tailwind** — deferred; picks up when the source markdown lands.

- **Density preset from `components.json`.** `shadcn/create` (Dec 2025) and CLI v4 (Mar 2026) replaced
  the `default`/`new-york` binary with five density presets — Vega, Nova, Maia, Lyra, Mira — each a full
  Tailwind config governing radius, shadow, spacing, and typography, not a CSS skin. Read the host's
  density from `components.json` rather than hardcoding; **Mira** is the preferred default. The tool's
  own chrome takes no preset (chrome is always light — see `shell-and-layout.md`). The parsing itself is
  `discovery-engine.md` / `sidebar-tokens.md` territory.

- **Tidy `shared/lib/constants.ts`.** Payload interfaces move to their real homes: `ChatSubmitPayload`
  → `shared/lib/chat-submit-payload.ts` (in `shared/` rather than beside the composer, because a
  feature — generation — consumes it and features may not import each other);
  `Generation{Start,Complete,Error}Payload` → `generation-events.ts`, which emits them. `SIZE_CONFIG` +
  `getDisplayDimensions` + `ComponentSize` stay together as the single `ComponentSize` home. Rename
  `STORAGE_KEY` → `CANVAS_STATE_STORAGE_KEY` — identifier only; the persisted string
  `'playground-canvas-state'` and the project-scoped/legacy reads are unchanged.

- **Element-selection bug fixes.**
  - `getReactComponentName` (`element-context.ts`) checks `displayName` first and unwraps
    `forwardRef`/`memo`, so shadcn components resolve to their own name, not an ancestor's; one shared
    copy, called from `useElementSelection` too.
  - `ElementHighlight` and the `DockedChatBar` element chips show the per-element resolved name
    (`context.displayName`), not the enclosing node's name.

- **Comment-sweep trims.** Delete the unwritten `gridPositions` field in `canvas-persistence.ts`; trim
  the past-tense route reference in `vite-plugin.ts:34` to present tense.

## Verification

`tsc -p tsconfig.app.json --noEmit` from the host (with `"@pg/*": ["./src/app/playground/*"]` in its
`paths`), `bun run check:boundaries`, `bun run check:knip`. The host's own `type-check` script silently
checks zero files — don't trust it.
