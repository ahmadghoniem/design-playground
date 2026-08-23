# Primitives fold

The **Primitives** fold of the Library: a flat listing of the host's shadcn primitives, with CVA
variants exposed as expandable drag sources. The Library container itself is `shell-and-layout.md`'s
subject; this file covers only the Primitives fold body.

## Settled

- **Flat `aliases.ui` listing.** Every file under the directory `components.json` → `aliases.ui`
  declares is a row. This is a separate query against a separate source, not a filtered view of the
  Layers tree — a file either lives in that folder or it doesn't, so nothing needs to classify it.
- **Label = the PascalCase export, not the filename.** `button.tsx` shows `Button`, not `button`.
  Multi-export files (`card.tsx` → `Card`, `CardHeader`, `CardTitle`, …) list the primary export as
  the row, the rest on expand.
- **CVA variants expandable.** A primitive whose file contains a `cva(...)` call expands to show each
  variant group (`variant`, `size`, …) as a child row of option chips. `defaultVariants` marks the
  default chip. `compoundVariants` suppress option combinations the component doesn't actually
  support, rather than offering every option as if freely combinable.
- **The `cva` flag is not surfaced as a badge on the row.** It still decides which rows expand into
  variant/size chips — the expansion arrow already says the row has more in it.
- **Dragging a variant pre-sets its props.** Dropping a variant chip onto the canvas creates the node
  with that group's option already set, not a bare default instance.
- **`components.json` is the host contract.** `aliases.ui` (this fold's source), `tailwind.css`
  (Variables' source), `aliases.utils` (where `cn` lives), and `style` (density) are read from it, never
  hardcoded — this is what makes the package host-agnostic.

## As the code is today

Read from `feat/layers-sidebar` (deleted 2026-08-23 at `6c685a8`)
(`server/lib/static-discovery/scan.ts`,
`server/lib/static-discovery/host-config.ts`, `features/discovery/PrimitivesList.tsx`,
`features/discovery/useStaticScan.ts`).

- **Naming bug confirmed — labels are filenames.** `scanPrimitives()` in `scan.ts` does
  `f.replace(/\.(tsx|jsx)$/, '')` on each file under `cfg.uiDir` — rows read `button`, `checkbox`,
  not `Button`, `Checkbox`. There is no export parsing anywhere in `scan.ts`; the settled fix (parse
  the file's exports, take the primary PascalCase one) is not built.
- **The naming fix and overlay tagging are coupled — this is a trap.** Overlay matching was
  `OVERLAY_PRIMITIVES.has(kebab(name))` where `name` is the *filename stem*. It works only because
  of the naming bug above. Rename rows to the PascalCase export without keeping a kebab lookup
  against the filename and **overlay tagging silently stops**: the `Ban` icon disappears and
  portal-based primitives become draggable again. Two settled decisions, one shared assumption.

- **Multi-export split — not built.** Because each `uiDir` file becomes exactly one `PrimitiveEntry`,
  a file like `card.tsx` is one row with one (wrong) name; there is no mechanism to list a primary
  export with secondary exports on expand.
- **CVA variants — built, except `compoundVariants`.** `extractCva()` walks the file's AST for a
  `cva(base, { variants, defaultVariants })` call and returns `{ groups, defaults }`; `PrimitivesList`
  renders each group as an expandable child with the default chip styled filled-dark
  (`p.cva?.defaults[group] === opt`). `compoundVariants` is never read — nothing in `scan.ts` or
  `PrimitivesList.tsx` references it, so invalid combinations are not suppressed.
- **Drag pre-set — built.** A variant chip's `onDragStart` writes `${p.name}?${group}=${opt}` under
  `DND_DATA_KEY`, one group/option pair per chip drag (there is no combined multi-group drag; each
  chip carries only its own group).
- **Overlay primitives — built.** `OVERLAY_PRIMITIVES` (`scan.ts`) flags portal-based primitives
  (`dialog`, `popover`, `select`, …); `PrimitivesList` renders them with a muted label, a `Ban` icon,
  `draggable={false}`, and a tooltip explaining the portal can't preview inside a canvas card yet.
- **CVA extraction is narrower than "a file containing a `cva(...)` call".** The callee had to be
  an `Identifier` spelled exactly `cva`, so `import { cva as cv }` was invisible; the config had to
  be argument two *and* already an object literal, so a hoisted `const config` yielded nothing;
  `variants`/`defaultVariants` had to be `Identifier` keys; option names came from the keys of the
  nested objects; and `defaultVariants` values were read **only** when the initializer was a string
  literal - so a numeric or identifier default silently dropped and the filled-dark default chip
  rendered on the wrong option.

- **`components.json` contract — partially read.** `readHostConfig()` (`host-config.ts`) reads
  `aliases.ui` (→ `uiDir`), `tailwind.css` (→ `cssPath`), `style`, `iconLibrary`, and
  `tailwind.cssVariables`. `aliases.utils` and `baseColor`/`rsc` are named in the contract this spec
  settles on but are not read by any field on `HostConfig` today.

## Open

- **Overlay primitive disabled treatment is temporary.** The muted label, `Ban` icon,
  `draggable={false}`, and portal warning tooltip exist because preview containment is not built —
  blocked on containment landing. Once containment lands, overlay primitives become ordinary draggable
  rows. This is not a decision that overlay primitives stay disabled forever; `shell-and-layout.md`
  separately settles that they are listed but never mounted live until containment exists.
- **Fitting primitive cards in a 280px panel.** The built version uses an indented chip row for
  variants, which works but was never checked against a design mockup for the panel width.
- **The `shadcn info` spike.** CLI v4's `shadcn info` reports framework version, CSS variables,
  installed components, and doc links "for agent context." If machine-readable, it could replace the
  hand-written `host-config.ts` parser — spike `bunx shadcn@latest info` against the host before
  designing around it.
- **The agent-output panel.** A separate right-edge surface (streaming assistant text/tool calls from
  generation runs) that only becomes buildable once the canvas toolbar moves off the right edge — not
  part of this fold, but the two are sequenced together in the source plan.
