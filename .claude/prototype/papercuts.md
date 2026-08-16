# papercuts.md — traps in this prototype's stack

**This is not spec material.** Everything here is about building *this* mock — Alpine.js 3 +
Tailwind v4, no bundler, partials fetched at runtime. None of it survives the port to React,
and none of it belongs in `.claude/specs/`. It lives here so the next agent working in
`.claude/prototype/` does not rediscover it the same way we did.

The common thread: **every one of these fails silently.** No console error, no warning — just
a control that never appears, a tooltip that never shows, or a column that quietly measures
zero. That is why they are worth writing down; a loud failure would not have needed a file.

---

## Alpine

**`x-for` renders exactly ONE root element per template.** Sibling roots are dropped without
a word. This ate the help popover's two button rows (`<a>` + `<button>` as siblings — only
the links rendered) *and* every UNDEF token row. Wrap branches in one layout-neutral root
(`display: contents`) or merge them into a single element driven by `:class`.

**`x-tip` values are JavaScript expressions**, so a static label has to be quoted *inside*
the attribute: `x-tip.top="'Zoom in'"`. Unquoted, `Zoom in` is a syntax error and `Auto` is
an undefined identifier — either way the tooltip simply never appears. Bare identifiers stay
unquoted when they really are expressions (`x-tip.bottom="title"`).

**`$nextTick` alone will not focus an element revealed by `x-show`.** The display flip has
not landed yet, so `focus()` silently no-ops. Use
`$nextTick(() => requestAnimationFrame(() => el.focus()))`.

**`loadPartials()` must loop** until no `[data-partial]` slots remain, because partials nest
(the composer lives inside both the canvas dock and the agents panel). A single pass leaves
the nested ones empty — this is what made the Composer invisible.

## CSS

**Absolutely-positioned grid children stop occupying cells.** Collapsing a flank to
`position: absolute` made the canvas auto-place into column 1 and inherit its zeroed width —
a 0px canvas. Pin `grid-column` explicitly on every child. **Any grid whose children can go
abspos needs explicit placement, not auto-placement.**

**Attribute selectors outrank plain classes.** `.pg-tip[data-side="top"]` is (0,2,0) and beat
`.pg-tip-visible` at (0,1,0), so bottom/left/right tooltips never settled and sat permanently
8px off in their entry direction. A state class that has to win must match the same weight —
hence `.pg-tip.pg-tip-visible`.

**A collapsed flank must hide *every* body-level child, not just the obvious one.** The
Library footer rode along inside the collapsed pill and made it two rows tall, colliding with
the toolbar rail underneath.

**An upward-opening menu needs its submenus to grow upward too.** `.ctx-menu.up`'s submenu
was `top: 0`-aligned, which was fine for three model rows and ran off the bottom of the
viewport at nine. `.ctx-menu.up .ctx-submenu { top: auto; bottom: 0; }`.

**`backdrop-filter` over a flat colour blurs nothing,** and any opaque child defeats it. If a
frosted surface looks like plain translucency, check what is behind it before tuning the blur.

## Method

**Diff the visible controls, not the markup, before merging two pages.** Enumerating every
button on both pages via CDP and diffing the two lists found a control gated three files away
from the shell — reading the markup would have missed it.
