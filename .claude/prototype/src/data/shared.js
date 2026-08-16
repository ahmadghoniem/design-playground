export const NODE_NAMES = {
  orig: 'PriceCard',
  iter: 'PriceCard.iteration-1',
  adopted: 'PriceCard.iteration-2',
  failed: 'PriceCard.iteration-3',
  text: 'text',
  img: 'stripe-pricing',
};

// Per-node Adopt/Keep affordance (right-rail GitBranch button, selection-gated).
// `on` = the action is available for that node kind.
export const ADOPT = {
  orig: { on: false, label: 'Adopt' },
  iter: { on: true, label: 'Keep' },
  adopted: { on: false, label: 'Kept' },
  failed: { on: false, label: 'Keep' },
};

/**
 * The effort ladder, ordered from cheapest to deepest. This is the shared *vocabulary* —
 * no model offers all of it. Each model declares the subset it actually supports.
 */
export const EFFORT_LADDER = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Med' },
  { id: 'high', label: 'High' },
  { id: 'max', label: 'Max' },
];

/**
 * Models are grouped under the coding agent that runs them, because the agent is the
 * thing you are actually choosing — the same model behaves differently under a different
 * harness. The heading names the agent, so the rows do not repeat it: under Claude Code
 * the row is `Opus 5`, never `Claude Opus 5`.
 *
 * Two per-model facts drive the picker:
 * - `efforts` — the levels this model actually supports. **The set differs per model**
 *   (a flagship offers five, a fast model two), so the effort picker is rebuilt from the
 *   chosen model rather than showing one fixed list with dead options in it.
 * - `effort` — this model's own default, always a member of `efforts`. Picking a model
 *   applies it, so the common case costs one click instead of two, and the effort picker
 *   moves to match. This is also what makes switching models safe: an effort the new
 *   model does not offer can never survive the switch.
 */
export const AGENTS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    models: [
      { id: 'opus-5', label: 'Opus 5', efforts: ['minimal', 'low', 'medium', 'high', 'max'], effort: 'high' },
      { id: 'sonnet-5', label: 'Sonnet 5', efforts: ['low', 'medium', 'high', 'max'], effort: 'high' },
      { id: 'haiku-4-5', label: 'Haiku 4.5', efforts: ['low', 'medium', 'high'], effort: 'medium' },
    ],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    models: [
      { id: 'composer-2-5', label: 'Composer 2.5', efforts: ['low', 'medium'], effort: 'low' },
      { id: 'grok-4-6', label: 'Grok 4.6', efforts: ['low', 'medium', 'high', 'max'], effort: 'high' },
    ],
  },
  {
    id: 'codex',
    name: 'Codex',
    models: [
      { id: 'gpt-5-6', label: 'GPT-5.6', efforts: ['minimal', 'low', 'medium', 'high'], effort: 'medium' },
      { id: 'gpt-5-6-sol', label: 'GPT-5.6 Sol', efforts: ['minimal', 'low', 'medium', 'high', 'max'], effort: 'high' },
    ],
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    models: [
      { id: 'gemini-3-pro', label: 'Gemini 3 Pro', efforts: ['minimal', 'low', 'medium', 'high', 'max'], effort: 'high' },
      { id: 'gemini-flash-3-7', label: 'Gemini Flash 3.7', efforts: ['low', 'medium', 'high'], effort: 'low' },
    ],
  },
];

/** Flat id → { …model, agent } lookup, so nothing has to walk the groups to resolve one. */
export const MODEL_INDEX = Object.fromEntries(
  AGENTS.flatMap((a) => a.models.map((m) => [m.id, { ...m, agent: a.name, agentId: a.id }])),
);

export const DEFAULT_MODEL = 'sonnet-5';

export const SKILLS = [
  { id: 'tailwind', label: 'tailwind', description: 'Tailwind CSS design system guidance' },
  { id: 'frontend-design', label: 'frontend-design', description: 'Distinctive UI design patterns' },
  { id: 'dataviz', label: 'dataviz', description: 'Charts and data visualization' },
  { id: 'visual-plan', label: 'visual-plan', description: 'Interactive visual planning' },
  {
    id: 'impeccable',
    label: 'impeccable',
    description: 'Design critique and polish commands',
    children: [
      { id: 'impeccable:critique', category: 'review', description: 'Run a design critique' },
      { id: 'impeccable:polish', category: 'refine', description: 'Polish spacing and typography' },
      { id: 'impeccable:audit', category: 'review', description: 'Accessibility audit' },
      { id: 'impeccable:animate', category: 'motion', description: 'Add purposeful motion' },
    ],
  },
];

// Codex-style approval modes for the Composer permissions pill.
/**
 * Approval modes. `label` is one short word because it has to fit the footer chip —
 * and the menu row shows that *same* word, never a longer synonym: OpenAI shipped
 * drift between its own pill and menu copy and users filed confusion reports over it.
 * The sentence that explains the mode lives in `hint`.
 *
 * `tone` tints the chip by blast radius, redundantly with the word — colour alone
 * would fail WCAG 1.4.1. `auto` and `full` stay separate states: every shipping tool
 * surveyed keeps reviewed-autonomy and no-review apart, so they are never merged.
 */
export const PERMISSIONS = [
  { id: 'ask', label: 'Ask', tone: 'gate', hint: 'Sign off before each change' },
  { id: 'auto', label: 'Auto', tone: 'part', hint: 'Edits and safe commands run' },
  { id: 'full', label: 'Full', tone: 'open', hint: 'Runs everything, no prompts' },
  { id: 'read', label: 'Read', tone: 'safe', hint: 'Look, never write' },
];

/**
 * Where the agent runs and what it runs on. Both are **read-only** in the composer's
 * context row: you choose a worktree by launching the app in it, and you change branch
 * with git. The row reports where you are; it is not a switcher.
 *
 * A branch is still the unit of parallel work — keeping an iteration creates one — but
 * the app does not offer a way to hop between them, so there is no catalogue of them here.
 */
export const CURRENT_WORKTREE = 'rewynd';
export const CURRENT_BRANCH = 'pg/quiet-numeric';
