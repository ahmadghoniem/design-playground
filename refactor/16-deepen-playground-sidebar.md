# Task 16 — Deepen `components/canvas/PlaygroundSidebar.tsx` (868 LOC)

**Type:** deepening · **Risk:** medium · **Depends on:** none · **Blast radius:** internal + new files under `components/canvas/sidebar/`

## The problem

The sidebar file holds: registry-tree helpers (`buildChildrenMap`, `flattenLeaves`, `pickPreviewViewport`, `slugFromSourcePath`, `focusNodeOnCanvas`), several card/tree components (`ComponentPreviewCard`, `DesignSystemPreviewCard`, `TreeNode`), and the `PlaygroundSidebar` itself with **32 hooks** plus discovery-refresh event wiring. Multiple responsibilities, one file.

## Dependency classification

- Tree building, viewport picking, slug derivation: **in-process** pure → extract and test directly.
- Preview cards: **in-process** presentational.
- Discovery refresh: **in-process** (listens for the `playground:discovery-updated` CustomEvent) + **local-API** read.

## Target seams

1. **`lib/registry-tree.ts`** — pure functions: `buildChildrenMap`, `flattenLeaves`, `pickPreviewViewport`, `slugFromSourcePath`. These are pure transforms over registry items → test directly with sample registry trees. Highest leverage.
2. **`components/canvas/sidebar/ComponentPreviewCard.tsx`** and **`DesignSystemPreviewCard.tsx`** — the preview-card leaves.
3. **`components/canvas/sidebar/TreeNode.tsx`** — the recursive tree node (it takes `childrenMap`, `pendingChildren`, context-menu callbacks).
4. **`useSidebarDiscoverySync` hook** — the `playground:discovery-updated` listener + refresh logic (so the sidebar reacts to discovery without inlining the event plumbing). `focusNodeOnCanvas` can move to a small canvas-focus helper.
5. **`PlaygroundSidebar.tsx` becomes the shell** — layout, the discovery-sync hook, the empty-state, and the `onOpenDiscovery` button. Target: under ~300 LOC.

## Method

- Extract `lib/registry-tree.ts` first (pure, tested), then the card/tree components, then the discovery-sync hook. The shell composes them.

## Extraction gate (run after each new file)

Cards/tree moved into `components/canvas/sidebar/` sit one level deeper than `components/canvas/` (imports gain a `../`); `lib/registry-tree.ts` moves to the `lib/` depth. Fix every carried import **to the end of the moved block** (Operating Rule 1 — don't stop partway), then:
```
git grep -nE "from '\.\.?/(lib|nodes|prompts|hooks|components|server|ui|registry|skills|data)" -- components/canvas/sidebar/ lib/registry-tree.ts
```
Every hit must resolve. `PlaygroundSidebar.tsx` must **import** the new modules (no leftover copy) and shrink.

## Verification

- Discover/add components → they appear in the sidebar tree with correct nesting (`buildChildrenMap`/`TreeNode`), preview cards render at the right viewport (`pickPreviewViewport`).
- The Design System preview card renders.
- Clicking a tree item focuses its node on the canvas (`focusNodeOnCanvas`).
- After a discovery scan completes elsewhere, the sidebar refreshes (the `playground:discovery-updated` event → `useSidebarDiscoverySync`).
- Empty state and the "discover" buttons still work (coordinate with Task 02, which only removes *auto*-scan — the buttons stay).

## Done when

Tree math is a tested pure module, cards/tree-node are their own files, discovery-sync is a hook, and the sidebar shell composes them with unchanged behaviour.

## Do NOT

- Do not remove the sidebar discovery buttons (`onOpenDiscovery`) — Task 02 keeps on-demand discovery.
