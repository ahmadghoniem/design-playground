Stack: React 19 + TS. `@/` alias + shared/ + prior features exist. Client imports are `@/`-absolute.

TASK: Create `features/discovery/` and move the component-discovery + sidebar subsystem into it, updating all `@/`-import references.

`git mv` into `features/discovery/`:
- `components/modals/DiscoveryModal.tsx`          → `features/discovery/DiscoveryModal.tsx`
- `components/canvas/PlaygroundSidebar.tsx`       → `features/discovery/PlaygroundSidebar.tsx`
- `components/canvas/sidebar/ComponentPreviewCard.tsx`  → `features/discovery/sidebar/ComponentPreviewCard.tsx`
- `components/canvas/sidebar/TreeNode.tsx`              → `features/discovery/sidebar/TreeNode.tsx`
- `components/canvas/sidebar/useSidebarDiscoverySync.ts`→ `features/discovery/sidebar/useSidebarDiscoverySync.ts`
- `lib/registry-tree.ts`                          → `features/discovery/registry-tree.ts`

Then update every reference repo-wide:
- `@/components/modals/DiscoveryModal` → `@/features/discovery/DiscoveryModal`
- `@/components/canvas/PlaygroundSidebar` → `@/features/discovery/PlaygroundSidebar`
- `@/components/canvas/sidebar/ComponentPreviewCard` → `@/features/discovery/sidebar/ComponentPreviewCard`
- `@/components/canvas/sidebar/TreeNode` → `@/features/discovery/sidebar/TreeNode`
- `@/components/canvas/sidebar/useSidebarDiscoverySync` → `@/features/discovery/sidebar/useSidebarDiscoverySync`
- `@/lib/registry-tree` → `@/features/discovery/registry-tree`

CONSTRAINTS:
- `components/canvas/sidebar/DesignSystemPreviewCard.tsx` is NOT moved here — it moves to
  `features/design-system/` in plan 08. Leave it in place for now.
- No server import references these files — do NOT touch server in this plan.
- No logic change. `git mv` only.

VERIFY:
- `grep -rn "@/components/modals/DiscoveryModal\|@/components/canvas/PlaygroundSidebar\|@/components/canvas/sidebar/\(ComponentPreviewCard\|TreeNode\|useSidebarDiscoverySync\)\|@/lib/registry-tree" --include=*.ts --include=*.tsx .` → no matches.
- `ls features/discovery features/discovery/sidebar` shows the moved files.
