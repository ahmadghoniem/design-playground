# Branch model

The git branch flow, and the chat composer controls it drives.

---

## Settled

- **Governing fact.** A git branch shows one version of a file at a time; the canvas exists to show
  several at once. That's why iteration files exist and why they stay. No git integration exists
  today — everything below is new surface.

- **Phase 1: explore in files, branch when you keep one.** Variations are separate files side by
  side on the canvas, with no branch involved. Git holds outcomes, not scratch work.
  - **Only files the playground touched go on the branch.** Unrelated work in progress is not swept
    in. Accepted trade: the tool chooses what to stage, in exchange for a reviewable diff.
  - **The agent proposes the branch name from the prompt; the user can edit it before creation** —
    `pg/calmer-pricing-card` from "make the pricing card calmer, less chrome".
  - **Rejected: one branch per variation** — it loses side-by-side, which is the product.
  - **Reserved: a git worktree per variation** — real branches and real side-by-side, at the cost of
    a dev server per worktree. Not chosen for phase 1; revisit only if variations need to be fully
    live apps.

- **The chat composer reduces to a worktree control and a branch label.** This supersedes `spec.md`
  §6's three-control bar (project + branch + where-the-agent-runs) — that shape does not get
  rebuilt:
  - **The project control is dropped.** Single-project playground per session, so there is nothing
    for it to select between.
  - **The branch picker is the workspace.** One canvas; going back and forth between git
    branches is how you change boards. The picker stays on the composer. Tabs, pills, and
    stash/restore stay parked.
  - **The worktree control *is* "where the agent runs"** — it replaces the separate
    where-the-agent-runs control rather than sitting beside it.
  - Model, Edit/Explore, and skills stay as they are today.

- **The worktree question, assessed** (previously flagged unaddressed at `spec.md` §7.4/§7.5).
  Running the agent in a dedicated git worktree is technically feasible: `git worktree add` gives a
  second checkout on its own branch, sharing one `.git`, and it never touches the user's main tree.
  That cleanly answers §7.4 (safe rollback — a failed branch/apply/stage/commit sequence never
  leaves the user's own checkout in a half-finished state) and §7.5 (two writers, one dev server —
  the panel and the agent no longer contend for the same working tree).

  **The cost:** the playground preview is served by the host's Vite dev server, and there is no
  standalone playground server. A worktree the preview can actually see needs a **second host dev
  server rooted in the worktree, on another port.**

  **Decision for v1:** the worktree control is a forward-looking selector that **defaults to the
  current checkout**. Actually spinning up a worktree plus a second dev server is deferred to
  research — the control exists in the UI now so the composer's final shape doesn't need reworking
  later, but it does nothing beyond the default yet.

  **Branch strategy:** park `feat/layers-sidebar`; cut the cleanup branch off `master`.

## As the code is today

- No git integration exists anywhere in the codebase: no `simple-git`, no `isomorphic-git`, nothing
  shelling out to `git`. Confirmed by reading — this isn't an inference from absence of a mention.
- The chat composer that exists (`features/chat/DockedChatBar.tsx` +
  `features/chat/ChatComposerControls.tsx`) carries a model bubble + short name (click to cycle), an
  Edit/Explore toggle with an iteration-count dragger (shown only with a selection), and a skill
  picker (`ImpeccableSkillPicker`). There is no project control, no branch control, and no worktree
  control in the code today — `spec.md` §6's "the chat bar carries the git branch, alongside project
  and where the agent runs" was recorded as settled there but was never built; the composer this
  spec describes is still new surface, not a revision of working code.
- `feat/layers-sidebar` is the parked branch referenced above — it currently holds the Layers/
  Primitives/Tokens sidebar tabs and host-token parsing, unrelated to branch-model mechanics itself,
  but it is the concrete reason the branch strategy calls out parking it explicitly rather than
  merging or deleting it.

## Open → ROADMAP

- **Worktree-per-session + second-dev-server orchestration** (§7.4/§7.5). The v1 control defaults to
  the current checkout and does nothing further; making it actually spin up a worktree and a second
  host Vite dev server on another port is deferred research, not a phase-1 deliverable.
- **Per-component "Keep this version."** A branch-per-component action gets cumbersome once several
  components are edited in one pass. Phase 2; does not block phase 1.
- **Dirty-tree stop + one-click stash.** Same open question as above — what happens when the branch
  operation hits a working tree that isn't clean. Phase 2; does not block phase 1.

## Context absorbed (sources below were folded in, then retired in this docs restructure)

`.claude/plans/cozy-hatching-ember.md` (A4, `branch-model.md` bullet) is this spec's authority.
`spec.md` §4 (the branch flow) and §7.4/§7.5 (branch-apply-stage-commit rollback; two writers, one
dev server) are folded in above, with §4's separate handling of "where the agent runs" as a distinct
composer control now answered by the worktree control and §6's three-control bar explicitly
superseded. `journey.md`'s "branch model — phase 1" section states the same phase-1 decisions and is
consistent with the above. `features/chat/DockedChatBar.tsx` and
`features/chat/ChatComposerControls.tsx` were read directly to confirm what the composer carries
today.
