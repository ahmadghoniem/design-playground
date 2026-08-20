# Composer

The prompt input that composes the next Agent turn: layout, ModelPicker, SkillPicker,
attachments, annotations, and Permission mode. Shell placement → `shell-and-layout.md`.
Worktree and Branch labels → `branch-model.md`.

## Settled

- **One Composer, two placements.** On the canvas floor, or at the bottom of the Agents tab
  when that tab is showing. Placement is state, not identity — expanding continues the same
  Thread rather than opening an empty surface.

- **Top-to-bottom layout:** context row, attachments, input, then a **flat footer** — no
  divider, no tint. Annotations and Permission mode on the left; ModelPicker and send on
  the right.

- **The context row shows only when the Composer is on the canvas floor.** Inside the
  Agents tab the RunHeader already states Worktree and Branch, so repeating them is noise.

- **Attachments have no header label** — bare chips.

- **Permission mode is a one-word chip** (~67px, down from a 131px `✋ Ask for approval`
  pill), tinted by blast radius **redundantly with the word, never colour alone**. Chip and
  menu row carry the *same* word; the explaining sentence is the tooltip and the accessible
  name. Ask, Auto, Full and Read stay separate states. Their menu explanations are **one
  line each** — at two lines a four-item list reads as a paragraph stack.

- **Effort is per-Model.** One shared ordered ladder — minimal, low, medium, high, max — of
  which each Model declares the subset it supports; the picker is rebuilt from the chosen
  Model. Catalogue shape is `{ id, label, efforts[], defaultEffort }` per Model, not a
  global enum.

- **The ModelPicker groups Models by the Agent that runs them** (Claude Code / Cursor /
  Codex), the heading naming the Agent so rows do not repeat it. Each row carries
  that Model's own default Effort, dimmed; picking a Model applies it and moves the Effort
  checkmark. A search field sits at the top, focused on open. **The closed trigger always
  names the Model** — the Effort word is an addition to it, never a substitute.

- **Fast mode is a per-Model capability, not a rung on the effort ladder.** Some Models
  have a faster-output variant of the same Model; most do not. So it is a **toggle row in
  the ModelPicker under an `Options` heading** — present for every Model and **disabled,
  never hidden**, on Models without the variant, with the tooltip naming the Model that
  lacks it. Turning it on does not change which Model runs. Like Effort, it does not
  survive a switch: leaving a Model clears it, so Fast reads as a setting on the composer
  applying to the current Model rather than a property each Model remembers. Catalogue
  shape gains `fast: boolean` alongside `efforts[]` and `defaultEffort`.

  Its switch sits at the **right edge of the row**, in line with the value column of the
  Model and Effort rows above it, so the menu reads as one column of labels and one column
  of current state rather than a switch floating mid-row.

  *The one-click main-menu row is deliberate.* Cursor puts its Fast toggle in a per-Model
  panel two clicks deep, reached by hovering a Model row — a shape forced on it by merging
  two existing Model entries into one. We are not merging anything, and a toggle that only
  appears once you go looking for it can never show its own disabled state, which is where
  the "which Model lacks this" tooltip does its work.

- **The trigger is one shape closed and two segments open.** Model on the left; its current
  state — Effort, plus `Fast` when on — on the right. Closed, the two abut and read as a
  single pill. On open, a channel carves between them and the corners flare **concave**
  where it meets the trigger's top and bottom edges, so expanding reads as one shape
  splitting rather than a pill that merely got wider. Both segments belong to **one
  control**: clicking anywhere opens the same ModelPicker. The split is shape, not a second
  target — two targets in a footer chip this size would be a coin toss to hit.

- **`Fast` takes the Effort word's treatment**, same size and same dim colour, separated by
  a space: `medium Fast`. Both are state on the running Model and neither outranks the
  other. It was accent-coloured, which made a capability toggle read as a selection, and a
  middot between them punctuated two words that are already one phrase.

- **The Effort list marks its default rung `(default)`** rather than carrying a control that
  returns to it. The marker sits beside the Effort word it qualifies; the checkmark still
  owns the right edge, so "which rung is default" and "which rung am I on" stay two separate
  readings of the same row.

  *There was a "Reset effort to default" row and it is gone.* Codex has a row by that name,
  which is where ours came from, but it does something else: it resets the **Model and the
  Effort together** back to the product default — from `5.6 Luna` to `5.6 Terra Medium` —
  and it is the Model choice you came to the picker to make. Ours was rescoped to Effort
  alone, which left a control that is dimmed in the state where a user most needs to know
  what the default is, and silent about what it would reset *to*. The `(default)` marker
  answers that question before the override rather than after it. Picking a Model already
  re-applies that Model's default Effort, so nothing else is lost.

- **The SkillPicker is the `/` menu.** It is a flat list of the Agent's own skills, each row
  a name and a description. Picking one inserts the literal token `/<name> ` at the cursor
  and the Agent resolves it — the app never loads a skill's body, never nests a skill's
  sub-commands into a second menu, and offers no way to install one. Installing skills is
  the Agent's job, done through the Agent; a picker row for it would be a second, worse
  install path.

- **ComposerMode is Edit or Explore**, Explore asking for several iterations from one prompt.

- **`--max-budget-usd` is deliberately not exposed** — the flag exists in the CLI, but the
  budget config was removed from the settings modal, the request body, and `buildAgentArgs`.
  `--effort` stays.

## As the code is today

Read from `master` (`features/chat/`, `shared/ui/skill-picker.tsx`,
`shared/lib/agent-config.ts`, `app/ModelSettingsModal.tsx`).

- **Placement — canvas floor only.** `DockedChatBar.tsx` is fixed bottom-centre. It
  collapses to a slim pill when idle and expands on focus or proximity. No Agents-tab
  placement exists because the RightPanel Agents tab is not built.
- **Layout — not the settled shape.** Controls float *above* the pill, not in a flat footer
  inside it. `ChatComposerControls.tsx` renders a model bubble + short name (click to cycle)
  bottom-left above the pill, and an Edit/Explore cluster with iteration-count dragger
  bottom-right above the pill when a selection is present. The send button sits inline on the
  input row, not in a footer. There is no context row, no Permission mode chip, and no
  annotations control.
- **Model selection — cycle, not ModelPicker.** `useModelCycle` advances through enabled
  models on click. `ModelSettingsModal.tsx` (opened from the header today) holds effort
  (`low` / `medium` / `high` / `max` — no `minimal`) and detailed-stdout toggles globally,
  not per-Model in a grouped picker. `agent-config.ts` exposes a flat Claude Code catalog
  only; Agents beyond Claude Code are not built.
- **ComposerMode — built.** Edit/Explore toggle with iteration count (1–4) when a canvas
  selection allows edit/explore; freeform "raw" mode when nothing is selected.
- **Attachments — bare chips, no header label.** Target, element-inspection, and reference
  node chips render inside the pill when expanded — matches the settled no-label rule.
- **SkillPicker — built, flat.** `/` opens `SkillPicker` via the mention-input
  contenteditable pipeline. `GET /playground/api/skills` returns each skill's name and
  description; picking a row inserts `/<name> ` as plain text. Rows carry no description in
  the UI yet, and the picker has no argument hint.
- **Permission mode — not built.** Generation spawns with
  `--dangerously-skip-permissions` hardcoded in `buildAgentArgs`; there is no Ask/Auto/Full/Read
  UI.
- **Fast mode — not built.** Nothing in `agent-config.ts` or `model-catalog.ts` records
  which Models have a fast variant, and `buildAgentArgs` passes no corresponding flag.

- **Per-Model effort catalogue — not built.** Effort is a single global setting in
  `ModelSettingsModal`, not rebuilt per Model inside a picker.

## Open

- **Agent list beyond Claude Code.** ModelPicker grouping by Agent (Cursor / Codex) is
  planned, not built. Claude Code is the only Agent CLI today — a
  maintenance choice documented in `CLAUDE.md`, not an architectural commitment.
- **Permission mode's blast-radius tints.** That the tint is redundant with the word is
  settled; which four colours, and how they read against the chrome's fixed-light surface,
  is not. They have to come out of the `--pg-*` token layer rather than be picked ad hoc.
- **Which Models actually have a fast variant, and the CLI flag that turns it on.** The
  control's shape is settled; the catalogue data behind `fast: boolean` is a fact about
  each Agent's CLI, so it gets filled in per Agent inside `agent-config.ts` rather than
  guessed here. The prototype marks Opus 5, Sonnet 5, and Composer 2.5 to exercise both
  states.

- **Attachment chips morphing into inline citations.** A cited attachment would leave the
  attachment bar and become an inline reference inside the prompt text, with the bar
  disappearing once empty. The interaction that triggers the morph, and what happens when
  the citation is edited or deleted in the text, are undesigned.

- **The annotations control.** Settled as a cursor that counts how many regions are
  attached, but there is no built counterpart to check the shape against — the whole
  annotate-into-prompt path is new surface.

- **Prompt assembly order is load-bearing for native `/skill` invocation.** Measured against
  Claude Code: a `/name` token is resolved by the CLI only when it is the *first* thing in
  the prompt. The same token placed a few lines down under a heading is never parsed — it
  reaches the model as ordinary prose, so the skill silently does not run. Every prompt the
  composer builds except the raw passthrough nests the picked skill inside a template, so
  the assembled prompt has to put every `/skill` token at the very top, ahead of all
  template sections, and append the app's own instructions *after* them. The ordering rule
  belongs to whichever layer assembles the final string, not to the individual prompt
  builders. The general question — how a host app should layer its own instructions
  underneath an Agent that already has a system prompt of its own — is unresearched; one
  rough direction is to stop shipping an app-level system prompt at all and express that
  guidance as internal skills the app invokes by name, which needs its own investigation
  before it counts as a design.

- **Argument hints in the SkillPicker.** In the TUI, `/model` shows `[model]` and `/tui`
  shows its accepted values next to the row, so the menu tells you what the command wants
  before you commit to it. Worth copying: the picker already needs each skill's description
  from the catalogue, and a hint string is the same kind of per-skill metadata. Open is
  where the hint comes from per Agent, and whether an unfilled hint blocks submission or is
  merely advisory.
