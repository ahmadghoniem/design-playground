Stack: TypeScript + React 18 (Vite host). Key file: nodes/ComponentNode.tsx.

TASK: Strip the canvas-added padding chrome from the default "auto" component render branch. Drop the `p-4`; KEEP the centering wrapper for now. (Per the user: do the `p-4` removal and ALSO include the test guide below for later deciding whether the wrapper itself can go.)

DETAILS — nodes/ComponentNode.tsx:
1. In the "auto" intrinsic-sizing branch (line ~675, `className={\`grid place-items-center p-4 ${…}\`}`), remove the `p-4`. Keep the `grid place-items-center` wrapper div.
2. Do NOT touch the other three render branches: `isFillMode` (line ~616, uses `p-[5%]`), `isPreset` (no padding), `isHtml` (no padding). This change concerns ONLY the default "auto" mode a freshly Added registry component renders in.

CONSTRAINTS:
- This chunk does NOT remove the wrapper div — only the `p-4`. Wrapper removal is a separate, tested decision (guide below).

VERIFY:
- A newly Added component in "auto" size mode sits flush inside its node — no stray 16px padding — and is still centered.
- Real typecheck from the host passes: `npx tsc -p tsconfig.app.json --noEmit`.

---

## Appendix (for the human, NOT for composer to execute): wrapper-removal smoke test

Later, to decide whether the `grid place-items-center` wrapper can also be deleted
(rendering `<Component/>` as a direct child of the outer frame div). Since the 22
fixture components are gone (chunk 09), test with a **freshly-Added** component:

1. Always drop `p-4` first (this chunk) — safe, keep the wrapper. Ship that.
2. To test removing the wrapper: temporarily render `<Component/>` as a direct child of
   the outer frame div (delete the `grid place-items-center` div).
3. Add 2 components with different sizing: one intrinsically small (a Button/Card) and
   one that fills its box (a full dashboard).
4. Look for three regressions: (a) small component snaps to top-left instead of centered,
   (b) component stretches to fill the node when it shouldn't, (c) node collapses to
   near-zero height.
5. Verdict: if EVERY component you render already fills its own box, the wrapper is dead
   weight → remove it. If any renders smaller than its node and you want it centered →
   keep the wrapper (just without `p-4`). The whole point of `place-items-center` is
   centering a smaller-than-node child; if that case never happens, it does nothing.
