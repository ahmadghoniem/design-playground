Stack: React 19 + TS. `@/` alias + shared/ + features/{providers,generation,iterations} exist. Client imports are `@/`-absolute.

TASK: Create `features/chat/` and move the docked chat + model-selection subsystem into it, updating all `@/`-import references.

`git mv` into `features/chat/`:
- `components/chat/DockedChatBar.tsx`     → `features/chat/DockedChatBar.tsx`
- `components/modals/ModelSettingsModal.tsx` → `features/chat/ModelSettingsModal.tsx`
- `hooks/useChatSubmit.ts`                → `features/chat/useChatSubmit.ts`
- `hooks/useChatAttachments.ts`           → `features/chat/useChatAttachments.ts`
- `hooks/useChatDockProximity.ts`         → `features/chat/useChatDockProximity.ts`
- `hooks/useModelCycle.ts`                → `features/chat/useModelCycle.ts`
- `stores/model-settings-store.ts`        → `features/chat/model-settings-store.ts`

Then update every reference repo-wide:
- `@/components/chat/DockedChatBar` → `@/features/chat/DockedChatBar`
- `@/components/modals/ModelSettingsModal` → `@/features/chat/ModelSettingsModal`
- `@/hooks/useChatSubmit` → `@/features/chat/useChatSubmit`
- `@/hooks/useChatAttachments` → `@/features/chat/useChatAttachments`
- `@/hooks/useChatDockProximity` → `@/features/chat/useChatDockProximity`
- `@/hooks/useModelCycle` → `@/features/chat/useModelCycle`
- `@/stores/model-settings-store` → `@/features/chat/model-settings-store`

CONSTRAINTS:
- `model-catalog` and `model-icons` already live in `@/shared/lib/` (moved in plan 02) since
  they're used by chat + iterations + providers — do NOT move them here.
- No server import references these files — do NOT touch server in this plan.
- No logic change. `git mv` only.

VERIFY:
- `grep -rn "@/components/chat/\|@/components/modals/ModelSettingsModal\|@/hooks/useChat\|@/hooks/useModelCycle\|@/stores/model-settings-store" --include=*.ts --include=*.tsx .` → no matches.
- `ls features/chat` shows the 7 moved files.
