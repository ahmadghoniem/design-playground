# Handoff — light tab strip + Wonder-style collapsible flanks

You are picking up an in-progress UI change in a **static HTML/CSS/Alpine.js prototype**. Everything
below has already been built and is running. Your job is to review it with fresh eyes, not to
rebuild it. Read the code before forming an opinion — the descriptions here are a map, not a
substitute.

## What this prototype is

`design-playground` is a local-dev-only design canvas that embeds into a host React app: you drag
components onto an infinite canvas and use an agent CLI to generate layout and style variations.

**The React app is not what you are looking at.** `.claude/prototype/` is a separate, self-contained
HTML mock used to settle interaction design before anything is built for real. It uses Alpine.js +
Tailwind v4, has its own `package.json`, and shares no code with the app. Changes here are cheap and
reversible. Do not port anything into the React source.

Repo root: `C:\Users\Ahmed Ibrahim\Documents\GitHub\design-playground`
Read `AGENTS.md` first — house rules, especially: simplest thing that meets the requirement, no
speculative abstraction, no backward-compatibility layers, and a writing rule about not documenting
absences.

## Run it

```
cd .claude/prototype
npx tailwindcss -i src/app.css -o dist/app.css   # build (or `npm run serve` for watch + server)
npx serve . -p 3456 -n
```

Open **`http://localhost:3456/variant-single-sidebar.html`** — that is the layout under review.
Several sibling `variant-*.html` files exist and share the same partials; `index.html` is a
different composition. If you change a shared partial, check you have not broken the others.

`src/main.js` loads `[data-partial]` slots in a `while` loop, so partials nested inside partials
resolve. Editing CSS requires a rebuild — the page loads `dist/app.css`, not `src/app.css`.

## Files touched by this change

| File | What happened |
|---|---|
| `src/app.css` | Tab-strip tokens, flank-card + pill recipe, toolbar shift; deleted `.side-rail`, `.chg-*`, `.dp-reopen` |
| `src/partials/single-sidebar.html` | Rewritten — rail and diff view removed, Agent panel + collapsed pill |
| `src/partials/design-panel.html` | Vertical reopen sliver replaced with a matching pill |
| `src/partials/canvas.html` | One class binding: `'flank-left-open': $store.ui.panelOpen` |
| `src/components/chat.js` | Removed `openPanel()` from the `ui` store (it existed only for the deleted rail) |

## Decisions already made by the product owner — treat as fixed

Do not relitigate these. If you think one is wrong, say so once in a sentence and move on.

1. **The app is light-only.** Dark chrome is out. The owner explicitly rejected "keep a dark field
   to create a contrast illusion" — they supplied a light-theme browser-tab reference (pale tinted
   field, lighter active tab) as the target.
2. **The workspace tab strip runs uninterrupted across the top.** Panels begin below it.
3. **The narrow left icon rail is deleted** — mark, Agent button, Changes button, design-panel
   toggle. Gone, not restyled.
4. **The Changes / git-diff view is removed from the UI.** Agent is the panel's only view. This is
   a UI removal for now; the diff *concept* still lives in `fabulous.html` §3.
5. **Both flanks use the "Wonder" mechanism** — each keeps a persistent affordance that survives
   collapse and carries its own show/hide toggle. That affordance is the only way to reopen a
   closed panel.
6. **Agent panel stays LEFT. Design panel stays RIGHT.**
7. **Specs are deliberately out of sync.** `.claude/specs/shell-and-layout.md` still describes a
   "280px, docked, no collapse" sidebar. The owner said to ignore the specs while prototyping. Do
   not "fix" the spec and do not treat it as the source of truth for this layout.

## What was built

**Light tab strip.** The black was a single token, `--ct-field`, formerly `#292524` on
`.canvas-wrap`. It is now `#dedcda` — one soft step *below* the `#ebebeb` canvas — and both it and
`--ct-h` were hoisted to `:root` so the flank overlays can offset against the strip height. The
Chrome-style concave fillet merge still works untouched, because the active tab was always painted
in `--pgc-canvas` and fillets into `.canvas-face`; only the field around it changed polarity.
Inactive tab colour went `rgba(250,250,248,.5)` → `--pgc-muted-fg`; hover and the `+` button went
from white-on-dark washes to `rgba(0,0,0,.045)` / `rgba(0,0,0,.05)`. Tab height `38px → 34px`.

**Flanks as overlay cards.** `.ctx-panel` and `.design-panel` share one rule block: `position:
absolute`, `top: calc(var(--ct-h) + var(--flank-inset))`, `bottom: var(--flank-inset)`, `width:
var(--flank-w)` (276px), `z-index: 6`. They are absolute children of `.app-single .app-body`
(`position: relative`), so `.stage-single` now fills the full width and nothing clips the tab strip.

**One elevation language.** The card surface — white, `1px --pgc-border`, `0 2px 8px rgba(0,0,0,.08)`,
rounded — is lifted verbatim from the existing `.canvas-toolbar`. Panels, pills, toolbar and zoom
pill now read as one family. That shared recipe is load-bearing: it is what makes the collapsed pill
legible as *the panel folded up* rather than as a separate control.

**Collapsed state is a pill per corner.** `.flank-pill.left` = `[icon] Agent`;
`.flank-pill.right` = `[icon] PriceCard`, which keeps naming the design panel's current subject so
the closed state stays informative. A vertical or multi-icon collapsed affordance was rejected on
purpose — two stacked icons is the deleted rail returning through the side door. Since Changes is
gone, the left side genuinely has one thing to open.

**Toolbar steps aside.** `.canvas-toolbar` shifts to `left: calc(var(--flank-w) + var(--flank-inset)
* 2 + 6px)` when the Agent panel is open, 220ms ease, scoped to `.app-single` so the other variants
are unaffected. Rationale: the canvas stays live beside the panel — you read the agent thread while
poking at nodes — so losing Select/Hand during exactly that moment is a real cost.

## Known open item

The design panel defaults to `designOpen: true` and now **overlays** rather than reserving layout
space, so on load roughly 290px of board sits underneath it. `.board` has a fixed
`padding: 28px 28px 100px 74px`. The obvious fix is right-padding keyed to `designOpen`, mirroring
the toolbar-shift pattern. It was left alone rather than guessed at — decide whether it needs
doing, and whether the left flank has the same problem when opened.

## What to look at

1. **Does the light tab strip actually hold up?** `#dedcda` field against `#ebebeb` canvas is a
   13-point step. Verify in a browser at real size that the active tab still reads as continuous
   with the canvas and the fillets do not become visible artifacts. This was flagged in advance as
   the riskiest part of going light; confirm or refute it with your eyes, not by reasoning about
   hex values.
2. **Pill placement under load.** Both pills sit at `top: calc(var(--ct-h) + var(--flank-inset))`.
   With many workspace tabs open, or a long subject name, check nothing collides or overflows —
   `.flank-pill` caps at `max-width: var(--flank-w)` with ellipsis, but verify.
3. **Cross-variant damage.** `canvas.html`, `design-panel.html` and `app.css` are shared. Load
   `index.html` and the other `variant-*.html` files and confirm nothing regressed.
4. **Store coherence.** `ui.rightTab` still exists and is still used by `design-agents.html` (a
   different layout), but in the single-sidebar layout it no longer switches anything. Decide
   whether that is acceptable separation or leftover coupling worth cutting.
5. **Anything the shared elevation recipe now makes inconsistent** — other floating chrome that did
   not get the same treatment and now looks out of family.

Report what you find. Do not make changes without saying what and why first.
