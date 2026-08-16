# Research — per-model default effort, and what "Reset to default" should do

Run for Pass 15, to settle the model picker's shape. Sources are Cursor's own community
forum (staff replies), OpenAI's Codex docs and issue tracker, and shipping reset-control
implementations. Everything below was read; nothing is inferred from silence.

> Delegation note: this was routed to the Cursor CLI first. It declined — `cursor-agent`'s
> documented tool set (code editing, command execution, git, filesystem) has no web search,
> so a citation-heavy survey would have come back as fabricated URLs in a real-looking
> table. It was run here with Exa instead. **Route research to whatever has search; route
> scoped code edits to Cursor.**

---

## 1. Per-model default effort is shipped architecture, not our invention

Codex models carry a **`default_reasoning_effort` on the model family**. `codex/pull/6749`
made `/status` fall back to `model_family.default_reasoning_effort` when the user has set no
explicit `model_reasoning_effort`, and set that default to `medium` for both `gpt-5*-codex`
and `gpt-5`, matching the API's own default.
→ https://github.com/openai/codex/pull/6749

Codex's ChatGPT desktop app surfaces the same idea one level up: a coarse Faster / Power /
Smarter control where **Power is defined as a model *and* its effort together**
(`gpt-5.6-sol` with medium reasoning), with an Advanced drawer for picking a specific model,
effort and speed.
→ https://developers.openai.com/codex/models

**Consequence for us:** a model row that reads `Opus 5 · High` is the industry shape. The
dimmed word is that model's own default, and picking the model applies it.

## 2. Cursor shipped this exact picker and got the *trigger* wrong — twice

Cursor's picker went through three shapes in four months, and the forum record is the useful
part:

- **Old:** a flat list with the effort baked into the model name (`gpt-5.5-medium`,
  `gpt-5.5-high`) — one row per combination.
- **Then:** model *families* listed once, with hover-to-edit for reasoning level and context
  size. Staff described this as the improvement.
  → https://forum.cursor.com/t/appreciation-for-the-model-selector-ui-changes-in-cursor-3-0/157250
- **Then:** the menu opens on the effort levels, and the **model list is demoted to a row at
  the bottom** — and for the default model the closed trigger shows *only the effort word*,
  not the model name.

That last step generated bug reports for three straight months, all making the same
complaint, and staff confirmed each time that it was intentional:

> "I've lost the 'at a glance' visibility of what model I'm on. All I get is High / Medium /
> Low, and the actual model I'm using is hidden away behind an extra click."
> → https://forum.cursor.com/t/bug-report-the-model-dropdown-is-showing-the-wrong-list-high-low-medium-instead-of-the-models/167238

> "The names and effort levels of models in use should always be listed and never be hidden."
> → https://forum.cursor.com/t/grok-4-5-not-shown-in-agent-window-model-selector-when-set/167462

> "What kind of BS is this? Model names gone!"
> → https://forum.cursor.com/t/what-kind-of-bs-ist-this-model-names-gone/167634

**The rule this buys us: the closed trigger must always name the model. The effort word is
an addition to it, never a substitute for it** — including for whatever model happens to be
the default. Our pill is `[mark] Opus 5 High ⌄`, which satisfies it.

Two smaller borrowings, both confirmed by staff in the same threads:
- **The model list's search field is focused on open**, so switching is type-then-Enter
  rather than scroll-and-aim.
- `Cmd+Shift+/` cycles effort for the current model without opening anything.
  → https://forum.cursor.com/t/model-reasoning-level-selection-instead-of-several-model-options/159581

## 3. The override-vs-default confusion is the real hazard

This is the question worth getting right, and Codex has two open issues showing both ways it
goes wrong:

- **`codex#17436` — the override silently becomes the new default.** Picking a model and
  effort in `/model` **writes back to the user-level `config.toml`**, so the next fresh
  session starts there. The maintainer closed it as working-as-intended; the reporter pushed
  back that the docs call the picker's selection *temporary* and that several developers in
  their org had hit the same surprise.
  → https://github.com/openai/codex/issues/17436
- **`codex#34535` — the override cannot win.** Selecting Extra High in the composer "briefly
  changes the displayed selection, but it immediately snaps back to High," because a
  project-scoped `model_reasoning_effort` shadows it. Traced to there being no thread-scoped
  effort field at all: the picker had nowhere to put a temporary choice except the persisted
  config.
  → https://github.com/openai/codex/issues/34535

**Both failures share one cause: the model's default effort and the user's current override
are stored in the same slot.** Keep them as two facts — a default that belongs to the model,
and a current value that belongs to the session — and neither failure is expressible.

That is also what makes the reset control meaningful: with two facts there is somewhere to
reset *to*.

## 4. Reset-when-already-at-default: three shipped patterns

| Product | Behaviour at default | Source |
|---|---|---|
| osu! (`RevertToDefaultButton`) | **Hidden** (`Alpha == 0`), appears on change — asserted in its own test | [ppy/osu test](https://github.com/ppy/osu/blob/45234b5b/osu.Game.Tests/Visual/Settings/TestSceneSettingsItem.cs) |
| AWS IDP accelerator | **Disabled** — `disabled={currentVersionName === 'default'}`, added as a fix | [commit 3c12b9d](https://github.com/aws-solutions-library-samples/accelerated-intelligent-document-processing-on-aws/commit/3c12b9d414314f63c0464bb588c8605e5a096f82) |
| Celonis "Restore default View" | **Unavailable** — "only available when there are user preferences on your current state; if the view is the default state, you cannot revert it" | [docs](https://documentation.celonis.com/en/restore-default-view.html) |
| NVIDIA Nsight Compute | **Disabled until modified** — the Restore button enables only when a row reads *User Modified* | [docs](https://docs.nvidia.com/nsight-compute/NsightCompute/index.html) |
| Onyx chat preferences | **Left live as a no-op** — "the icon stays rendered even when the field already matches the default" | [PR #10706](https://github.com/onyx-dot-app/onyx/pull/10706) |

Four of five gate it; the split is between **hiding** and **disabling**. Disabling wins for a
menu: a row that appears and disappears changes the menu's height and the position of every
row under it, so the thing you were aiming at moves.

## 5. Labelling

The UX Stack Exchange thread on this exact question converges on *"Reset to defaults"* /
*"Restore defaults"* as the recognisable phrasings, and on naming what is being reset when
there is room for it — "Leave no doubt what this button will do."
→ https://ux.stackexchange.com/questions/108885/more-appropriate-button-text-for-resetting-default-settings

The reason to spend the extra words here is `phpmyadmin#6325`, which is a decade-long
argument about a reset button with **two candidate defaults** (the shipped default vs. the
administrator's configured one) and no way to tell which one it meant. Users split on which
was correct, and the thread's own conclusion was that the label should say.
→ https://github.com/phpmyadmin/phpmyadmin/issues/6325

We have exactly that ambiguity: the app's default model, and the current model's default
effort. Naming the scope in the label is what keeps it from being the same argument.

---

## Recommendation — adopted

**Option (a): "Reset effort to default", scoped to the current model, disabled while the
effort already is that model's default.**

- **Scope.** It resets the *effort*, not the model. Resetting the model too would throw away
  the choice you actually came to the picker to make, and §3 shows the cost of one control
  standing for two different facts.
- **The label names the scope** ("effort", "default"), per §5; its accessible name goes
  further and names the model — *"Reset effort to Antigravity Gemini 3 Pro's default."*
- **Disabled, not hidden,** per §4 — hiding it reflows the menu under the pointer.
- **It is not the only way back.** Picking any model re-applies that model's default effort,
  so the override never survives a model switch. Reset is for the case where you overrode the
  effort and want it back *without* changing model — which is the only case where it is the
  fastest path.

Dropping the control entirely (option c) was considered and rejected on §3: once an override
can differ from a default, a user who cannot see how to get back to the default is the
`codex#34535` reporter. Keeping the old behaviour (option b — reset model *and* effort to a
hardcoded pair) is what §5's phpMyAdmin thread warns against, and it stopped being meaningful
the moment each model carried its own default.
