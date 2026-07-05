Stack: React 19 + TS. `@/` alias + shared/ + prior features exist. Client imports are `@/`-absolute.

TASK: Create `features/skills/` and move the skills catalog + skill-picker subsystem into it (including the three skill-specific UI files intentionally left in components/ui by plan 02), updating all `@/`-import references.

`git mv` into `features/skills/`:
- `components/modals/SkillsCatalogModal.tsx`      → `features/skills/SkillsCatalogModal.tsx`
- `components/ui/impeccable-skill-picker.tsx`     → `features/skills/impeccable-skill-picker.tsx`
- `components/ui/impeccable-demote-menu.tsx`      → `features/skills/impeccable-demote-menu.tsx`
- `components/ui/skill-bubble-helpers.ts`         → `features/skills/skill-bubble-helpers.ts`
- `hooks/useSkills.ts`                            → `features/skills/useSkills.ts`
- `hooks/useImpeccableSkillPicker.ts`             → `features/skills/useImpeccableSkillPicker.ts`
- `lib/impeccable-skill.ts`                       → `features/skills/impeccable-skill.ts`
- `lib/featured-skills.ts`                        → `features/skills/featured-skills.ts`
- `lib/load-default-skill-prompt.ts`             → `features/skills/load-default-skill-prompt.ts`

Then update every reference repo-wide:
- `@/components/modals/SkillsCatalogModal` → `@/features/skills/SkillsCatalogModal`
- `@/components/ui/impeccable-skill-picker` → `@/features/skills/impeccable-skill-picker`
- `@/components/ui/impeccable-demote-menu` → `@/features/skills/impeccable-demote-menu`
- `@/components/ui/skill-bubble-helpers` → `@/features/skills/skill-bubble-helpers`
- `@/hooks/useSkills` → `@/features/skills/useSkills`
- `@/hooks/useImpeccableSkillPicker` → `@/features/skills/useImpeccableSkillPicker`
- `@/lib/impeccable-skill` → `@/features/skills/impeccable-skill`
- `@/lib/featured-skills` → `@/features/skills/featured-skills`
- `@/lib/load-default-skill-prompt` → `@/features/skills/load-default-skill-prompt`

CONSTRAINTS:
- If any of the three former `components/ui/` skill files turn out to be imported by a NON-skills
  file (generic use), STOP and report before moving it — it would then belong in shared/ui, not here.
- No server import references these files — do NOT touch server in this plan.
- No logic change. `git mv` only.

VERIFY:
- `grep -rn "@/components/modals/SkillsCatalogModal\|@/components/ui/impeccable\|@/components/ui/skill-bubble\|@/hooks/useSkills\|@/hooks/useImpeccableSkillPicker\|@/lib/impeccable-skill\|@/lib/featured-skills\|@/lib/load-default-skill-prompt" --include=*.ts --include=*.tsx .` → no matches.
- `ls features/skills` shows the 9 moved files.
