# Impeccable skill — removal assessment

Assessment only. No product code was removed. Verified against the tree on 2026-07-14.

## A. Current state

### Premise check

| Premise | Status |
|---|---|
| Synthetic client-side picker entry, not a skill on disk | **Confirmed** — `IMPECCABLE_PARENT_ITEM` is a hardcoded constant (`shared/lib/impeccable-skill.ts:46–51`), prepended to the API-derived list (`shared/lib/useImpeccableSkillPicker.ts:35`). Line 29 filters out any real skill with `id === 'impeccable'` so the synthetic entry wins. |
| Surfaced in exactly one place: DockedChatBar `/` slash menu | **Confirmed** — imports `ImpeccableSkillPicker` / `ImpeccableDemoteMenu` / `useImpeccableSkillPicker` / `impeccablePromptFromSegment` (`features/chat/DockedChatBar.tsx:12–15`); hook at `:100`; picker `:676–681`; demote menu `:683–695`; impeccable branch in `extractPayload` `:221–231`. |
| Two-level menu of 19 commands | **Confirmed** — `IMPECCABLE_COMMANDS` has 19 entries (`shared/lib/impeccable-skill.ts:15–35`); categories Create / Evaluate / Refine / Simplify / Harden. |
| DOM attr round-trip via `PILL_IMPECCABLE_CMD_ATTR` | **Confirmed** — set in `shared/ui/inline-reference/dom-engine.ts:40–41`, `:107–110`, `:147–155`; cleared of command in `shared/ui/inline-reference.tsx:421`. |
| Pointer prompt on submit | **Confirmed** — `buildImpeccableSkillPrompt` (`shared/lib/impeccable-skill.ts:38–42`) emits the 3-line “IMPECCABLE SKILL / Read {root}/…” text via `impeccablePromptFromSegment` (`:67–75`). |
| Does not affect `stylingMode` | **Confirmed** — only `skillIds?.includes("no-bound-explore")` switches `tailwind` → `inline-css` (`app/useChatSubmit.ts:285–289`). Impeccable is not mentioned there. |

### Does `skills/impeccable/` exist? Is it in `skills-lock.json`?

- **`skills/impeccable/` does not exist.** Builtin skills under `skills/` are: `design-variations`, `frontend-design`, `make-interfaces-feel-better`, `no-bound-explore`, `nothing-design`, `stick-to-design-system`, `ux-variation-designer` (plus `skills/index.ts`). No `impeccable` directory.
- **`skills-lock.json` has no `"impeccable"` key.** A grep for `impeccable` in that file returns no matches. The lockfile lists mattpocock-sourced skills only.

### What does the emitted prompt point at today?

When no API skill resolves for id `impeccable`, `skillsById.get("impeccable")?.skillPath` is undefined (`features/chat/DockedChatBar.tsx:221–224`). Then:

```ts
// shared/lib/impeccable-skill.ts:38–42
const root = skillSkillPath?.replace(/\/SKILL\.md$/i, '') ?? 'skills/impeccable';
return `IMPECCABLE SKILL
Read ${root}/SKILL.md and ${root}/reference/${command}.md.
After creating each iteration file, follow the "${command}" command flow...`;
```

So every impeccable command today emits a dangling pointer at:

1. `skills/impeccable/SKILL.md` — **does not exist**
2. `skills/impeccable/reference/{command}.md` — **does not exist** (19 variants)

The agent is instructed to read files that are not on disk.

---

## B. If installed

### Discovery path

[`server/routes/skills.ts`](../server/routes/skills.ts):

- `BUILTIN_SKILLS_DIR` = `<playground>/skills` (`:7`)
- `USER_SKILLS_DIR` = `path.join(process.cwd(), '.claude', 'skills')` (`:8`) — host-cwd install via `npx skills add`
- `GET /api/skills` loads both dirs (`:110–112`), merges user-first over builtin (`:117–120`)
- Skill id = YAML frontmatter `name` or parent directory name (`:89`)
- `skillPath` = cwd-relative path to `SKILL.md` with forward slashes (`:91–97`)

If a real skill were installed at `<host>/.claude/skills/impeccable/SKILL.md` (frontmatter `name: impeccable` or directory named `impeccable`):

1. The skills API would return it with `id: 'impeccable'` and a real `skillPath` (e.g. `.claude/skills/impeccable/SKILL.md`).
2. `useImpeccableSkillPicker` would still **filter out** that API skill (`:29`) and prepend the synthetic parent (`:35`) — UI stays the synthetic submenu, not a plain skill row.
3. On submit, `skillsById.get("impeccable")?.skillPath` **would** resolve (`DockedChatBar.tsx:223`), so `{root}` becomes the real path minus `/SKILL.md` (`impeccable-skill.ts:39`).

### What the skill must ship for all 19 commands

Under that root:

- `SKILL.md` (required for the first Read line)
- `reference/<command>.md` for each of: `polish`, `critique`, `audit`, `craft`, `delight`, `animate`, `bolder`, `colorize`, `layout`, `typeset`, `overdrive`, `quieter`, `adapt`, `clarify`, `distill`, `harden`, `optimize`, `onboard`, `shape` (`IMPECCABLE_COMMANDS` at `impeccable-skill.ts:15–35`)

Missing any `reference/<command>.md` leaves that command’s pointer dangling even after install.

### Correct but uninstalled, or broken?

- **Plumbing is coherent** — install path → API → `skillsById` → `{root}` replacement works as designed.
- **In this repo today: broken at runtime** — every impeccable pick ships a read path to nonexistent files.
- **Best label:** “correct but uninstalled” (and therefore currently a dangling-pointer feature until the skill + full reference set are present). Installing incompleteness would still leave individual commands broken.

---

## C. Removal surface

**Critical nuance:** [`shared/ui/impeccable-skill-picker.tsx`](../shared/ui/impeccable-skill-picker.tsx) is also the **general** skill picker — it renders `InlineReferenceList` for all skills (`:48–50`) and the “Add a skill…” affordance (`:57–72`). Removal is **not** a wholesale delete of that file; strip impeccable-specific branches and keep (likely rename to) a plain skill picker.

Consumers of `shared/lib/impeccable-skill.ts` and `shared/lib/useImpeccableSkillPicker.ts` (grep):

| Export / symbol | Consumer |
|---|---|
| `IMPECCABLE_ITEM_ID`, `IMPECCABLE_PARENT_ITEM`, `buildImpeccableCommandItems` | `useImpeccableSkillPicker.ts` |
| `IMPECCABLE_COMMANDS` | `impeccable-demote-menu.tsx:2` |
| `impeccablePromptFromSegment` | `DockedChatBar.tsx:15, :221` |
| `IMPECCABLE_ITEM_ID` | `impeccable-skill-picker.tsx:9` |
| `useImpeccableSkillPicker`, `ImpeccableDemoteState` | `DockedChatBar.tsx:14`, `impeccable-demote-menu.tsx:3` |

No other consumers. Generation core and server routes do not import these modules.

### (1) Delete outright

- `shared/lib/impeccable-skill.ts`
- `shared/lib/useImpeccableSkillPicker.ts`
- `shared/ui/impeccable-demote-menu.tsx`

### (2) Strip impeccable branches; KEEP (and likely rename)

- `shared/ui/impeccable-skill-picker.tsx` → e.g. `skill-picker.tsx`: remove parent submenu header (`:29–46`), command-row / `isImpeccableParent` / `impeccableCategory` rendering (`:83–136`); keep list + empty + “Add a skill…”
- `features/chat/DockedChatBar.tsx`: drop impeccable imports (`:12–15`), hook (`:90–100`), demote-menu open query (`:191`), `extractPayload` impeccable branch (`:221–231`), `<ImpeccableSkillPicker>` impeccable props (`:676–681`), `<ImpeccableDemoteMenu>` (`:683–695`), `onImpeccableCommandCleared` / `updateImpeccablePill` wiring (`:648–652`, `:687–691`)
- Replace hook with a thin `useSkillPicker(skills)` that maps API skills → `InlineReferenceItemData[]` with no synthetic prepend
- `shared/ui/inline-reference.tsx`: remove `updateImpeccablePill` (`:45`, `:174–178`, `:217`), `onImpeccableCommandCleared` (`:53`, `:66`, `:198`, `:211`, `:427`), backspace stages for impeccable command clear (`:399–427`)
- `shared/ui/inline-reference/dom-engine.ts`: remove `PILL_IMPECCABLE_CMD_ATTR` / `PILL_IMPECCABLE_CLEARED_ATTR` (`:40–41`), set-on-create (`:107–110`), `updateImpeccablePillElement` (`:147+`)
- `shared/ui/inline-reference/context.tsx`: remove `onImpeccableCommandCleared` (`:38`)
- `styles/playground-global.css`: remove `.impeccable-cmd-category` (`:633–644` region) and any leftover `[data-command-cleared]` styling only used by the impeccable demote path if unused after strip (`:629–631` — verify after; skill pending-delete may still need related styles)

### (3) Must not touch

- `server/routes/skills.ts` — generic skill discovery
- Core slash-menu mechanics of `inline-reference` (`trigger="/"`, pill insert, segment reading) for **non-impeccable** skills
- `app/useChatSubmit.ts` stylingMode / `no-bound-explore` logic (`:285–289`)
- `features/chat/useSkills.ts` and the skills API client path
- Builtin skill content under `skills/` (unrelated packages)

---

## D. Verdict

**Safe to remove:** yes. Isolated synthetic UI layer; no server generate route or prompt-template core depends on it. Roughly **3 file deletes** + branch stripping across **~5 shared/chat files** + CSS + a rename — on the order of **400–500 LOC** of impeccable-specific code.

**Capability lost:** the one-click 19-command polish submenu (Create / Evaluate / Refine / Simplify / Harden) and the demote/re-pick flow when backspacing a command off an impeccable pill.

**Still covered by the plain skill picker:** `/` continues to list every API-discovered skill. Users can still attach any installed skill (e.g. `frontend-design`) by id. That does **not** reproduce the hardcoded 19-command taxonomy unless those commands ship as a real skill with `reference/<command>.md` files and are selected as ordinary skill pills (or the feature is reinstalled and left in place).

**Recommendation:** removal is product-safe if the dangling-pointer UX is undesirable; alternatively, keep the UI and install the real `impeccable` skill with a full `reference/` tree so the pointers resolve.
