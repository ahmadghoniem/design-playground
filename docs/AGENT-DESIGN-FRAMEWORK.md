# Teaching Agents Product Design — Vercel's framework vs. design-playground

> A reading doc to map Vercel's ["Teaching agents product design"](https://vercel.com/blog/teaching-agents-product-design-at-vercel)
> onto *this* repo. It first states the one idea that reframes everything, then
> compares the two methods honestly (including where Vercel's framework does **not**
> fit), and ends with the few high-leverage things worth stealing.

---

## 0. The one-sentence reframe

**Vercel built a convergence engine. We built a divergence engine. They are
near-opposites, and that's the whole story.**

- **Vercel's `product-design` skill** exists to make every agent converge on the
  *one* accepted decision ("destructive actions use Verb + Noun", "no nested
  modals") and enforce it across a shipping product.
- **Our playground** exists to make one agent *diverge* — fan out 4 deliberately
  different takes on a component onto a canvas so a solo builder can pick. Our
  skills literally say *"Diverge first, converge later… expand the design space,
  not find the best version"* (`skills/design-variations/SKILL.md`).

So you can't adopt Vercel's framework wholesale — it would fight the product. But
several of its *mechanisms* (modes, reachable-state coverage, the lint/judgment
split, evals, and an evidence loop) plug into our gaps cleanly. The rest of this
doc separates the parts that map from the parts that don't.

---

## 1. Two mental models, side by side

| | **design-playground (today)** | **Vercel product-design** |
|---|---|---|
| Goal | Expand the option space | Collapse to the accepted option |
| Output | N variations on a canvas, human picks | One coherent change, agent decides |
| Where "taste" lives | The model + **opt-in** skill docs | Repo-canonical guidance + linters |
| Memory of decisions | **None** — pick is discarded after canvas | Decisions are committed artifacts + exemplars |
| Quality gate | Mechanical checklist (does it build?) | Judgment rubric + deterministic lints |
| Feedback loop | Re-run with a different prompt | Weekly: evidence → human → guidance/rule/eval |
| Lifecycle | Throwaway, local-dev-only | Durable, ships to prod |

The asymmetry in rows 3–5 is the opportunity. We have a great divergence loop and
**no convergence memory at all**.

---

## 2. How our method actually works (grounded in the code)

Three layers compose every generation:

**a) Prompt builders** — `prompts/*.prompt.ts`, one per kind: `iteration`,
`iteration-from-iteration`, `element-iteration`, `jsx-iteration`, `edit`,
`adopt`, `create-page`, `html-iteration`, `freeform-reference`. Each is a string
template (`fillTemplate`) that assembles: an optional skill section → request
metadata (component, source path, count, depth) → instructions → critical
requirements → a creative-freedom block → a quality checklist.

**b) The quality checklist** (`prompts/shared-sections.ts → getQualityChecklist`).
This is the only enforced "gate", and it is **entirely mechanical**:

```
- [ ] Props interface unchanged from original
- [ ] All imports resolve, no TS errors
- [ ] Metadata comment with @iteration/@parent
- [ ] File named PascalCase.iteration-{n}.tsx
- [ ] Registered in iterations/index.ts + tree.json
- [ ] Styling mode honored (tokens vs inline)
```

Every item answers *"did it build and register?"* — **none** answers *"is it a
good product decision?"* That judgment is delegated entirely to the model and to
opt-in skills.

**c) Skills** — `skills/<name>/SKILL.md`, injected via `formatSkillSection` only
when the user selects them. These are free-form *taste* documents:

| Skill | What it encodes | Vercel analogue |
|---|---|---|
| `frontend-design` | Distinctiveness, anti-templating, type/motion | judgment reference |
| `make-interfaces-feel-better` | **16 concrete, checkable polish rules** (concentric radius, `scale(0.96)`, tabular-nums, 40×40 hit area, never `transition: all`) | **this is a linter written as prose** |
| `ux-variation-designer` | Structural/interaction divergence, not cosmetic | "start with the job" |
| `design-variations` | 8 divergence axes to rotate through | (no analogue — divergence is ours) |
| `nothing-design` | A full design system as a skill (tokens, 3-layer hierarchy, anti-patterns) | repo-canonical design system |
| `stick-to-design-system` / `no-bound-explore` | Styling-mode constraints (tokens-only vs inline-CSS freedom) | lint rule: no className overrides |

**d) Evals** — `evals/`. Strong pattern, **narrow scope**: it only tests
`discovery.prompt.ts`. It runs the prompt through the real
`spawnAgent('claude-code')`, then combines **deterministic structural checks**
(`structural-checks.ts`: kebab ids, paths-on-disk, skip-rule violations, a
`DESCRIPTION_BLOCKLIST`) with an **LLM-as-judge** (`judge.prompt.ts`: a 6-dimension
1–5 rubric + concrete prompt-wording fixes), against a ground-truth file
inventory. It even prescribes running across `haiku/sonnet/opus` to surface prompt
fragility. This is *exactly* Vercel's eval philosophy — just applied to one prompt.

---

## 3. Vercel's framework, distilled

Three pillars + an operating contract.

**Pillars**
1. **Agent skill** — judgment guidance, *routed* by surface and decision type
   (`references/` per surface, `exemplars/pr-{name}.md` with the reasoning), never
   duplicated. Routes to canonical sources instead of copying them.
2. **Linters** — deterministic rules with stable IDs (`rule/destructive-names-action`),
   each explaining *why* + a fix, some auto-fixing. "Code can count two or three
   static options, so a linter can recommend radio buttons."
3. **Review loop** — weekly, three phases kept separate: **collect** evidence →
   **judge/group** it → **human decides** whether it becomes guidance, a lint
   rule, an exemplar, an eval, or nothing. "Automation ends with the review
   packet. A human decides."

**Operating contract (8 principles):** start with the job not the pixels; outcome
before output; evidence not taste; separate facts from decisions; shipped code is
evidence not automatic precedent; smallest coherent intervention; decide before
decorating; **design every reachable state**. Plus: *verify the rendered surface,
not just the source.*

**Request modes** (narrowest verb wins): **Shape** (frame, don't edit) ·
**Implement** (decide, then minimal change) · **Review** (report, don't edit) ·
**Copy** (language only) · **Harden** (resilience/responsive/a11y, preserve
direction).

**Key phrasings worth stealing:** prefer *observable decisions* over *broad
adjectives* — "Destructive actions use Verb + Noun" is usable; "Buttons should be
clear" is not. And the decision template: `Decision / Rationale / Evidence /
Exceptions / Good example / Bad example / Open decisions`.

---

## 4. Concept-by-concept mapping

| Vercel concept | Status here | Where it lives / would live |
|---|---|---|
| Agent skill (judgment) | ✅ Have it, but **opt-in & taste-based** | `skills/*/SKILL.md` |
| Routed by surface/decision | ❌ Skills are global, not surface-routed | could route in `prompts/shared-sections.ts` |
| Linters (deterministic) | ⚠️ Partial — exist as *prose* not code | `make-interfaces-feel-better` rules; styling-mode constraints |
| Mechanical checklist | ✅ Strong, but build-only | `getQualityChecklist()` |
| Request modes | ⚠️ Implicit | the *kinds*: iterate=Shape/diverge, edit=Implement, element-iteration=Harden/surgical, adopt=Implement |
| Design every reachable state | ❌ **Missing** — we only generate the happy path | — |
| Evals (judge + structural + holdouts) | ⚠️ Only for `discovery` | `evals/` — extend to generation |
| Exemplars + decision docs | ❌ **Missing entirely** | — |
| Review/evidence loop | ❌ **Missing** — the canvas pick is discarded | — |
| Observable > adjectives | ❌ Skills lean hard on adjectives (fine for divergence) | — |

---

## 5. The three real gaps (highest leverage first)

### Gap 1 — We throw away the convergence signal
When the user drags iteration-3 off the canvas and keeps it, **nothing records
that choice or why**. That is the single richest design signal in the app, and
it evaporates. Vercel's entire review loop exists to capture exactly this.

**Steal:** an "Accept / Promote" action on an iteration node that writes a tiny
decision doc (`docs/decisions/{component}-{n}.md`) using Vercel's template —
component, what changed, why this one won, a screenshot. Over time these become
**exemplars** that can be fed back into the iteration prompt ("here's what this
user has accepted before"), turning a stateless divergence tool into one that
learns the builder's taste. This is the highest-value, most on-brand add.

### Gap 2 — We never design the states that aren't the happy path
Every iteration prompt says "generate variations" of the component *as given*.
None ask for loading, empty, error, disabled, or responsive variants. Vercel's
"design every reachable state" is the cheapest quality upgrade available.

**Steal:** a **state axis** (like `design-variations`' divergence axes) or a
dedicated **Harden mode** that, instead of restyling, fills in the missing
reachable states of the selected component. Reuses all existing spawn/iteration
machinery.

### Gap 3 — Our best "linter" is trapped in prose
`make-interfaces-feel-better` is 16 mechanically checkable rules (concentric
radius, `scale(0.96)` exactly, no `transition: all`, tabular-nums, 40×40 hit
area). Today they're only honored if the user opts the skill in, and never
verified after generation.

**Steal:** promote the deterministic subset into actual post-generation checks —
the `evals/structural-checks.ts` pattern already proves we can statically analyze
generated `.tsx`. Run them over each new `iterations/*.tsx`, surface violations as
node badges. Keep the genuinely subjective rules (distinctiveness, "spend your
boldness in one place") as judgment in the skill — exactly Vercel's lint/skill
split.

---

## 6. Where Vercel's framework does NOT fit (don't force these)

- **Decision authority hierarchy / "evidence not taste."** Vercel optimizes
  *toward consensus*; we deliberately optimize *toward surprise* ("include at
  least one direction that feels uncomfortable"). Importing "evidence not taste"
  wholesale would neuter the divergence skills.
- **Surface-routed canonical guidance.** That assumes a stable, shipping product
  with recurring surfaces (modals, settings forms). The host app *is* that — but
  the playground is a lens over it, not the owner of those decisions. Routing
  belongs in the host, not here.
- **The weekly human review cadence.** Single-player, local-dev, throwaway. The
  lightweight version (Gap 1's per-accept decision doc) is the right scale; a
  weekly review packet is not.
- **"Observable over adjectives" for the divergence skills.** Adjectives are a
  *feature* there — they widen the space. Keep them. Apply the "observable"
  discipline only to the *quality gate*, not the creative prompt.

---

## 7. A phased way to try it

1. **Cheap & on-brand:** add the **state axis / Harden mode** (Gap 2). Pure prompt
   work, reuses existing kinds.
2. **The keystone:** add **Accept → decision doc + exemplar** (Gap 1), then feed
   accepted exemplars back into `iteration.prompt.ts` via a new
   `formatExemplarsSection`. This is the convergence memory the app lacks.
3. **Hardening:** lift the checkable `make-interfaces-feel-better` rules into a
   `lib/` static checker reusing `structural-checks.ts` patterns; show violations
   as canvas badges (Gap 3).
4. **Confidence:** extend the `evals/` harness from discovery to **generation** —
   before→after a component, judge against a quality rubric, with **holdouts** to
   test that a skill generalizes rather than memorizes.

The throughline: keep the divergence engine exactly as it is, and bolt on the
*convergence memory* Vercel's framework is fundamentally about — scoped down to a
solo, local, throwaway tool.

---

*Source: Vercel, "Teaching agents product design at Vercel." Cross-referenced
against `prompts/`, `skills/`, `evals/`, and `prompts/shared-sections.ts` in this
repo as of this writing.*
