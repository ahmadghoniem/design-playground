# AGENTS.md

## Say only what is present and works

Whatever you write — response, note, spec, commit message — state only what exists and works. An absence no one would look for carries no information, and stating one costs a longer, harder-to-parse sentence than the fact deserves. Two absences still earn a line: one a reader would otherwise hunt for, and an idea worth stopping someone from re-proposing.

Example: I hand you a mock or snippet and say "use X from it; don't include Y." Y exists only in that supplied context — nowhere in the codebase or docs. Replying "I added X and made sure to remove Y" announces the removal of something that never existed. The same failure shows up in the wild as "removed X because of Y" comments written into source (anthropics/claude-code#65961); uncontextualized negation is slower to parse and uninformative (Nordmeyer & Frank, CogSci 2014).

## Changes

- Keep changes focused: no unrelated edits, unnecessary abstractions, or low-signal tests.
- Choose a simple implementation that fully meets current requirements — no speculative abstraction, configuration, or indirection.

## Dependencies

- Reach for libraries already in the project before writing your own or adding packages.
- Prefer established, well-maintained libraries over reimplementing common functionality, unless there is a clear reason.
- Check a library's docs and types before assuming it lacks a capability.

## Context economy

- Filter noisy command output on routine runs — quiet flags, last-N per shell (PowerShell `Select-Object -Last 20`, bash `tail -n 20`) — because output is re-sent to the model every turn. If a filtered run fails, re-run it unfiltered: the error is the payload.
- Shells differ by tool: Claude Code uses Git Bash if Git for Windows is installed (else PowerShell); Codex and Cursor Agent default to PowerShell. Match the syntax to the shell; don't assume one.
- When a command floods the session, name the flag that would have quieted it next time — the goal isn't silence, it's a tighter context window: flooded output is re-sent to the model every turn.
- If the user names a file you had to search for, note that @-mentioning attaches it directly. Report what finding it cost; don't estimate savings.

## Writing things down

**A delta needs both sides.** Before recording "X was A, now B", verify A is recorded in the project — spec, docs, or code. A change measured against a prototype draft is prototype history, not a spec delta — filing it as one smuggles in a decision nobody made.

## Reporting

- Report meaningful blockers, outcomes, and evidence — no play-by-play progress.
- Keep responses brief and focused. Disclaimers and caveats short; spend the response on the answer.

## Never

- Never undo work you didn't do — a deleted file, a reverted edit, a removed feature is intentional until told otherwise. If it looks like a mistake, flag it; don't reverse it.
- Never take destructive, production, or external actions (force-push, deploy, publish, send, deleting anything outside the current change) without the user naming the action. Approval of the task is not approval of the operation.
- Never preserve backward compatibility unless the user asks. When your change replaces a path, delete the old one in the same change instead of adding compatibility layers, fallbacks, or migrations — shims hide the current design and tax every future change.
- Never read DRAFT.md; it is a personal scratchpad.

## If rules conflict

- Take the safer action and flag the conflict instead of silently picking one.
