# Agents tab

The RightPanel's Agents tab: how the Agent's output is laid out. How the Agent speaks →
`agent-vocabulary.md` (cross-reference rather than restate). Composer placement at the
bottom of this tab → `composer.md`.

## Settled

- **The RunHeader** sits above the Thread: title, Worktree, Branch, a progress indicator,
  and a one-line summary of the current Generation.

- **A timeline of tool events** between the RunHeader and the Thread — one line per event
  with a status glyph, a short description, and a relative timestamp; successes, failures
  and plain steps are distinguishable. It collapses to a few rows with a "Show more" control.

- **The Thread** is the conversation for the current Generation: the user's prompt, then the
  Agent's steps, each with a heading and a body.

- **The Composer lives at the bottom of this tab** when it is showing — see `composer.md`.

## As the code is today

Read from `master` (`features/chat/`, `server/lib/claude-jsonl.ts`,
`shared/lib/generation-events.ts`).

- **No Agents tab UI exists.** There is no RunHeader, tool-event timeline, or Thread
  component in the codebase. The RightPanel itself is not built (`shell-and-layout.md`).
- **Generation lifecycle is event-driven, not rendered as a Thread.** `generation-events.ts`
  exposes typed channels (`start`, `complete`, `error`, `editComplete`) consumed by canvas
  hooks such as `useGenerationLifecycle.ts` — skeleton nodes, toasts, iteration detection.
  Nothing subscribes to build a conversational Thread view.
- **Stream parsing exists server-side.** `claude-jsonl.ts` parses `claude` `--output-format
  stream-json` stdout for live preview text and tool-use detection during a Generation. That
  parsed output is not surfaced as a RunHeader, timeline, or Thread in any client component
  today.
- **The only prompt surface is the Composer.** `DockedChatBar.tsx` handles prompt input and
  submit; it does not display Agent steps after send.

## Open

- **Handing a Run off from one Agent to another.** Concept only, recorded so it gets looked
  into rather than re-invented: a Thread started under one Agent — Codex, say — continues
  under another, Claude Code or Cursor, without the user restarting the task. The appeal is
  that the Agents differ in what they are good at, and today switching means abandoning the
  Run and re-describing it. Everything about it is unexamined: what crosses the boundary
  (the prompt alone, the Thread transcript, the tool events, the files already written), how
  the receiving Agent is told what happened before it, whether the handoff is a control in
  the ModelPicker or a distinct action, and what the Worktree does when the Agent behind it
  changes. Nothing here is settled — the entry exists to hold the idea.

- **The RunHeader's progress indicator.** That one exists is settled; what it shows is not.
  A Generation's progress has no natural denominator — an Explore run knows it wants N
  iterations, an Edit run finishes when the agent stops — so a determinate bar may be
  claiming precision the run does not have.
