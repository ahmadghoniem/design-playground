# Branch model

The git branch flow, and the Worktree and Branch labels on the Composer.

## Settled

- **Governing fact.** A git branch shows one version of a file at a time; the canvas exists
  to show several at once. That's why iteration files exist and why they stay. No git
  integration exists today — everything below is new surface.

- **Phase 1: explore in files, branch when you Adopt one.** Variations are separate files
  side by side on the canvas, with no branch involved. Git holds outcomes, not scratch
  work.
  - **Only files the playground touched go on the branch.** Unrelated work in progress is
    not swept in. Accepted trade: the tool chooses what to stage, in exchange for a
    reviewable diff.
  - **The agent proposes the branch name from the prompt; the user can edit it before
    creation** — `pg/calmer-pricing-card` from "make the pricing card calmer, less chrome".
  - **Rejected: one branch per variation** — it loses side-by-side, which is the product.
  - **Reserved: a git worktree per variation** — real branches and real side-by-side, at
    the cost of a dev server per worktree. Not chosen for phase 1; revisit only if
    variations need to be fully live apps.

- **Worktree and Branch are read-only labels.** You pick a Worktree by launching the app
  in it. Branch sits beside Worktree. Both report; neither switches. You change branch with
  git, and the app follows. There is no workspace concept and no picker — see
  `shell-and-layout.md` for why the old "branch picker is the workspace" framing is dead.
  The project control is dropped (single-project playground per session).

- **The worktree question, assessed.** Running the agent in a dedicated git worktree is
  technically feasible: `git worktree add` gives a second checkout on its own branch,
  sharing one `.git`, and it never touches the user's main tree. That cleanly answers safe
  rollback — a failed branch/apply/stage/commit sequence never leaves the user's own
  checkout in a half-finished state — and two writers, one dev server — the panel and the
  agent no longer contend for the same working tree.

  **The cost:** the playground preview is served by the host's Vite dev server, and there is
  no standalone playground server. A worktree the preview can actually see needs a **second
  host dev server rooted in the worktree, on another port.**

  **Decision for v1:** read-only Worktree and Branch labels only. Actually spinning up a
  worktree plus a second dev server is deferred to research — the labels exist so the
  Composer's final shape does not need reworking later, but they do nothing beyond reporting
  yet.

  **Branch strategy:** park `feat/layers-sidebar`; cut the cleanup branch off `master`.

- **Prototype scope note.** The mock stopped drawing branch creation, staging scope, commit
  message, dirty-tree stop, and one-click stash. That is a scope decision about the
  prototype, not a change to the flow above — `branch-model.md` keeps every one of those
  mechanics.

- **Composer layout beyond these two labels** → `composer.md`.

## As the code is today

- No git integration exists anywhere in the codebase: no `simple-git`, no `isomorphic-git`,
  nothing shelling out to `git`. Confirmed by reading — this isn't an inference from absence
  of a mention.
- **No Worktree or Branch labels in the Composer.** `features/chat/DockedChatBar.tsx` and
  `features/chat/ChatComposerControls.tsx` carry no git context row. The composer's current
  control shape (model cycle, Edit/Explore, skills) is documented in `composer.md`.
- `feat/layers-sidebar` is the parked branch referenced above — it currently holds the
  Layers/Primitives/Tokens sidebar tabs and host-token parsing, unrelated to branch-model
  mechanics itself, but it is the concrete reason the branch strategy calls out parking it
  explicitly rather than merging or deleting it.

## Open

- **Worktree-per-session + second-dev-server orchestration.** The v1 labels
  report only; making them actually spin up a worktree and a second host Vite dev server on
  another port is deferred research, not a phase-1 deliverable.
- **Per-component Adopt this version.** A branch-per-component action gets cumbersome once
  several components are edited in one pass. Phase 2; does not block phase 1.
- **Dirty-tree stop + one-click stash.** Same open question as above — what happens when the
  branch operation hits a working tree that isn't clean. Phase 2; does not block phase 1.
