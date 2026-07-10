Stack: React 19 + TS. `@/` alias exists; all client imports are already `@/`-absolute (plan 01 done).

TASK: Create the `shared/` layer and move the cross-feature primitives, helpers, and stores into it, updating every `@/`-import that references a moved file.

Use `git mv` for every move. After moving `@/<old>` → `@/<new>`, find/replace ALL references repo-wide.

--- shared/ui (shadcn + generic primitives) ---
`git mv` every file under `components/ui/` to `shared/ui/` EXCEPT the three skill-specific ones listed below (they move later in plan 09). Move:
- alert-dialog, button, chat-bits, dialog, inline-reference.tsx,
  inline-reference/ (context.tsx, dom-engine.ts), playground-nav-icons, tooltip
- DO NOT move (leave in components/ui for now): impeccable-skill-picker.tsx, impeccable-demote-menu.tsx, skill-bubble-helpers.ts
- Then update all references: `@/components/ui/<x>` → `@/shared/ui/<x>` for every moved file.

--- shared/lib (used by 2+ features or framework-generic) ---
`git mv` these from `lib/` to `shared/lib/`:
- utils, constants, element-context, generation-body, generation-events, html-prompts, jsx-prompts,
  iframe-bridge, iframe-bridge-child, iframe-bridge-types, iteration-scan, model-catalog, model-icons,
  oid-stamp, props-fetchers.server, resolve-playground-dir, sync-host-gitignore, drag-ghost-grid
- Update all references `@/lib/<x>` → `@/shared/lib/<x>` for each.

--- shared/stores (cross-feature state) ---
`git mv stores/preview-color-scheme-store.ts shared/stores/preview-color-scheme-store.ts`
- Update `@/stores/preview-color-scheme-store` → `@/shared/stores/preview-color-scheme-store` everywhere.

CONSTRAINTS:
- Only the files listed here move in this plan. The remaining `lib/`, `stores/`, `components/`,
  `hooks/`, `nodes/` files stay put — later feature plans move them.
- No logic/JSX changes. Pure move + import-path update.
- After plan 01, server references these client files via `@/` too (e.g. `@/lib/constants`,
  `@/lib/props-fetchers.server`, `@/lib/resolve-playground-dir`, `@/lib/sync-host-gitignore`,
  and `@/lib/oid-stamp` from `server/routes/html-pages.ts`).
  Update those server `@/` specifiers to the new `@/shared/lib/...` path as well — this is a
  string-only edit; do NOT change any other server code.
- `git mv` only (preserve history).

VERIFY:
- `grep -rn "@/components/ui/\(alert-dialog\|button\|dialog\|tooltip\)" --include=*.ts --include=*.tsx .` → no matches (all moved to shared/ui).
- `grep -rn "@/lib/\(utils\|constants\|generation-body\|model-catalog\)" --include=*.ts --include=*.tsx .` → no matches.
- `grep -rn "@/stores/preview-color-scheme-store" --include=*.ts --include=*.tsx .` → no matches.
- `grep -rn "@/lib/\(constants\|resolve-playground-dir\|sync-host-gitignore\|props-fetchers\)" --include=*.ts server` → no matches (server refs updated to @/shared/lib).
- `ls shared/ui shared/lib shared/stores` shows the moved files.
- `git status --short | grep -c "^R"` shows the renames were tracked.
